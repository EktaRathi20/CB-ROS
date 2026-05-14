import { PrismaClient } from '@prisma/client';
import { LLMService, RankedCandidate } from './llm.js';
import { VectorService } from './vector.js';
import { RetrainingService } from './retraining.js';

const prisma = new PrismaClient();

const DUPLICATE_DISTANCE = 0.15;       // skip outright (per-project)
const NEAR_DUPLICATE_DISTANCE = 0.35;  // diversity penalty zone

const STEP_TOTAL = 7;
const STEPS: Array<{ index: number; label: string }> = [
  { index: 1, label: 'Parsing reaction' },
  { index: 2, label: 'Querying knowledge base' },
  { index: 3, label: 'Retrieving candidates' },
  { index: 4, label: 'Generating AI variants' },
  { index: 5, label: 'Applicability check' },
  { index: 6, label: 'Predicting metrics' },
  { index: 7, label: 'Ranking & calibration' },
];

export type DiscoveryEvent =
  | { type: 'step'; index: number; total: number; label: string; status: 'running' | 'done' | 'error'; duration_ms?: number }
  | { type: 'log'; ts: string; message: string }
  | { type: 'result'; iteration: number; requested: number; returned: number; candidates: any[] }
  | { type: 'error'; message: string }
  | { type: 'done' };

export type DiscoveryEventHandler = (event: DiscoveryEvent) => void | Promise<void>;

export class DiscoveryService {
  /**
   * Step 3 + Step 4: run one discovery iteration for a project. Returns N
   * unique, diversity-ranked catalyst candidates. Skips formulas already
   * surfaced for this project across earlier iterations.
   *
   * Pass `onEvent` to receive granular progress events (used by the SSE
   * streaming endpoint). Without it the function behaves identically to
   * before.
   */
  static async runIteration(
    projectId: string,
    opts: {
      count?: number;
      reactionInput?: string;
      conditions?: any;
      onEvent?: DiscoveryEventHandler;
    } = {}
  ) {
    const count = opts.count ?? 5;
    const onEvent = opts.onEvent;

    const emit = async (e: DiscoveryEvent) => {
      if (!onEvent) return;
      try {
        await onEvent(e);
      } catch (err) {
        // never let an event sink break the discovery flow
        console.warn('Discovery event sink threw:', err);
      }
    };
    const log = (message: string) =>
      emit({ type: 'log', ts: new Date().toISOString(), message });

    const stepRunner = async <T>(stepIndex: number, work: () => Promise<T>): Promise<T> => {
      const meta = STEPS[stepIndex - 1];
      await emit({ type: 'step', index: meta.index, total: STEP_TOTAL, label: meta.label, status: 'running' });
      const t0 = Date.now();
      try {
        const out = await work();
        await emit({
          type: 'step',
          index: meta.index,
          total: STEP_TOTAL,
          label: meta.label,
          status: 'done',
          duration_ms: Date.now() - t0,
        });
        return out;
      } catch (err) {
        await emit({
          type: 'step',
          index: meta.index,
          total: STEP_TOTAL,
          label: meta.label,
          status: 'error',
          duration_ms: Date.now() - t0,
        });
        throw err;
      }
    };

    // ----- Pre-flight -----
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error(`Project ${projectId} not found`);
    if (project.iterations_used >= project.max_iterations) {
      throw new Error(
        `Iteration cap reached (${project.iterations_used}/${project.max_iterations}). Review the audit dashboard before running again.`
      );
    }
    const iterationNumber = project.iterations_used + 1;

    // ----- Step 1 — Parsing reaction -----
    await stepRunner(1, async () => {
      log(`Reactants: ${project.reactants ?? '?'} | Products: ${project.products ?? '?'}`);
    });

    // ----- Step 2 — Querying knowledge base + latest training snapshot -----
    const { priorFormulas, priorFormulaSet, snapshot, ragContext } = await stepRunner(2, async () => {
      const prior = await prisma.candidate.findMany({
        where: { project_id: projectId },
        select: { formula: true },
      });
      const failures = await prisma.failureInsight.count({ where: { project_id: projectId } });
      const priorFormulas = prior.map((p) => p.formula);
      const priorFormulaSet = new Set(priorFormulas.map((f) => f.toLowerCase()));
      log(`Loaded ${priorFormulas.length} prior candidates, ${failures} failure insights`);

      // RAG: pull the latest training snapshot, if any. The corpus_candidate_ids
      // it stores point at experiments we should consider "learned from".
      const snapshot = await RetrainingService.getLatestSnapshot(projectId);
      let ragContext: { formula: string; predicted: number; actual: number | null; status: string }[] = [];
      if (snapshot) {
        const meta = snapshot.metadata as { corpus_candidate_ids?: string[] };
        const ids = Array.isArray(meta?.corpus_candidate_ids) ? meta.corpus_candidate_ids : [];
        if (ids.length > 0) {
          const corpus = await prisma.candidate.findMany({
            where: { id: { in: ids } },
            select: {
              formula: true,
              experiments: {
                orderBy: { created_at: 'desc' },
                take: 1,
                select: { predicted_score: true, actual_score: true, status: true },
              },
            },
          });
          ragContext = corpus
            .filter((c) => c.experiments[0])
            .slice(0, 8)
            .map((c) => ({
              formula: c.formula,
              predicted: c.experiments[0].predicted_score,
              actual: c.experiments[0].actual_score,
              status: c.experiments[0].status,
            }));
        }
        log(
          `Training snapshot ${snapshot.id.slice(0, 8)}… loaded — ${ragContext.length} RAG examples, ` +
            `bias_correction=${snapshot.bias_correction.toFixed(3)}`
        );
      } else {
        log('No training snapshot yet — skipping RAG retrieval and calibration adjustment');
      }

      return { priorFormulas, priorFormulaSet, failureCount: failures, snapshot, ragContext };
    });

    // ----- Step 3 — Retrieving candidates (prompt assembly) -----
    const overSample = Math.max(count + 3, Math.ceil(count * 1.6));
    const prompt = await stepRunner(3, async () => {
      const p = await LLMService.buildDiscoveryPrompt(
        projectId,
        opts.reactionInput,
        opts.conditions,
        {
          count: overSample,
          excludeFormulas: priorFormulas,
          iteration: iterationNumber,
          ragContext,
        }
      );
      log(`Prompt assembled (${p.length} chars, requesting ${overSample} variants)`);
      return p;
    });

    // ----- Step 4 — Generating AI variants -----
    const raw = await stepRunner(4, async () => {
      const out = await LLMService.callLLM(prompt);
      log(`Gemini returned ${out.length} candidate proposals`);
      return out;
    });

    // ----- Step 5 — Applicability check -----
    const fresh = await stepRunner(5, async () => {
      const list = raw.filter((c) => !priorFormulaSet.has(c.formula.toLowerCase()));
      log(`${list.length}/${raw.length} candidates passed dedup against prior iterations`);
      return list;
    });

    // ----- Step 6 — Predicting metrics (embedding + neighbor distance) -----
    const ranked = await stepRunner(6, async () => {
      const acc: Array<{ cand: RankedCandidate; embedding: number[]; finalScore: number }> = [];
      for (let i = 0; i < fresh.length; i++) {
        const cand = fresh[i];
        log(`Embedding ${i + 1}/${fresh.length}: ${cand.formula}`);
        const embedding = await VectorService.generateEmbedding(`${cand.formula} ${cand.reasoning ?? ''}`);
        const neighbors = await VectorService.findSimilarInProject(projectId, embedding, 1);
        const nearest = neighbors[0]?.distance ?? Infinity;

        if (nearest < DUPLICATE_DISTANCE) continue;

        let diversityFactor = 1;
        if (nearest < NEAR_DUPLICATE_DISTANCE) diversityFactor = nearest / NEAR_DUPLICATE_DISTANCE;

        let intraBatchPenalty = 1;
        for (const r of acc) {
          const dist = cosineDistance(embedding, r.embedding);
          if (dist < DUPLICATE_DISTANCE) {
            intraBatchPenalty = 0;
            break;
          }
          if (dist < NEAR_DUPLICATE_DISTANCE) {
            intraBatchPenalty = Math.min(intraBatchPenalty, dist / NEAR_DUPLICATE_DISTANCE);
          }
        }
        if (intraBatchPenalty === 0) continue;

        const finalScore = (cand.predicted_score ?? 0.5) * diversityFactor * intraBatchPenalty;
        acc.push({ cand, embedding, finalScore });
      }
      log(`Scored ${acc.length}/${fresh.length} diverse candidates after vector dedup`);
      return acc;
    });

    // ----- Step 7 — Ranking & calibration (sort + bias correction + persist) -----
    const stored = await stepRunner(7, async () => {
      ranked.sort((a, b) => b.finalScore - a.finalScore);
      const selected = ranked.slice(0, count);

      // Apply training snapshot's bias correction to predicted_score before persisting.
      const bias = snapshot?.bias_correction ?? 0;
      if (bias !== 0) {
        log(`Applying calibration bias_correction=${bias.toFixed(3)} from latest training snapshot`);
      }

      const persisted = await Promise.all(
        selected.map(async ({ cand, embedding }) => {
          const created = await prisma.candidate.create({
            data: {
              project_id: projectId,
              iteration_number: iterationNumber,
              formula: cand.formula,
              predicted_score: clamp01((cand.predicted_score ?? 0.5) + bias),
              confidence: clamp01(cand.confidence),
              stability: optClamp01(cand.stability),
              activity_score: optClamp01(cand.activity_score),
              activation_energy: numberOrNull(cand.activation_energy),
              operating_temp: cand.operating_temp ?? null,
              operating_pressure: cand.operating_pressure ?? null,
              source: cand.source ?? 'llm',
              metadata: {
                reasoning: cand.reasoning,
                ...(bias !== 0 ? { calibration: { bias_correction: bias, raw_predicted: cand.predicted_score } } : {}),
                ...(snapshot ? { training_snapshot_id: snapshot.id } : {}),
              },
            },
          });
          await VectorService.storeCandidateWithEmbedding(created.id, embedding);
          return created;
        })
      );

      await prisma.project.update({
        where: { id: projectId },
        data: { iterations_used: iterationNumber },
      });

      log(`Persisted ${persisted.length} candidates as iteration ${iterationNumber}`);
      return persisted;
    });

    const result = {
      iteration: iterationNumber,
      requested: count,
      returned: stored.length,
      candidates: stored,
    };

    await emit({ type: 'result', ...result });
    return result;
  }

  /**
   * Backwards-compatible wrapper used by /api/discovery and the demo flow.
   */
  static async triggerDiscovery(
    projectId: string,
    reactionInput: string,
    conditions: any,
    count = 5
  ) {
    return DiscoveryService.runIteration(projectId, { count, reactionInput, conditions });
  }

  /**
   * Legacy single-candidate path retained for the demo flow.
   */
  static async processDiscovery(
    projectId: string,
    reactionInput: string,
    conditions: any
  ) {
    const result = await DiscoveryService.runIteration(projectId, {
      count: 1,
      reactionInput,
      conditions,
    });
    return result.candidates[0];
  }
}

function clamp01(n: any): number {
  const v = typeof n === 'number' && !Number.isNaN(n) ? n : 0.5;
  return Math.max(0, Math.min(1, v));
}
function optClamp01(n: any): number | null {
  if (typeof n !== 'number' || Number.isNaN(n)) return null;
  return Math.max(0, Math.min(1, n));
}
function numberOrNull(n: any): number | null {
  return typeof n === 'number' && !Number.isNaN(n) ? n : null;
}
function cosineDistance(a: number[], b: number[]): number {
  let dot = 0,
    na = 0,
    nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  return 1 - dot / denom;
}
