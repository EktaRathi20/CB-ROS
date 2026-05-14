import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const prisma = new PrismaClient();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });

export interface RankedCandidate {
  formula: string;
  predicted_score: number;
  confidence: number;
  stability?: number;
  activity_score?: number;
  activation_energy?: number;
  operating_temp?: string;
  operating_pressure?: string;
  source?: string;
  reasoning: string;
}

export class LLMService {
  /**
   * Builds the discovery prompt. When `excludeFormulas` is provided, the LLM
   * is instructed to avoid those candidates (Step 4 diversity constraint).
   */
  static async buildDiscoveryPrompt(
    projectId: string,
    reactionInput?: string,
    conditions?: any,
    opts: {
      count?: number;
      excludeFormulas?: string[];
      iteration?: number;
      ragContext?: Array<{ formula: string; predicted: number; actual: number | null; status: string }>;
    } = {}
  ) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });

    const similarCandidates = await prisma.candidate.findMany({
      where: { project_id: projectId },
      take: 5,
      orderBy: { created_at: 'desc' },
      include: { experiments: true },
    });

    const failureInsights = await prisma.failureInsight.findMany({
      where: { project_id: projectId },
      take: 5,
    });

    const finalReaction = reactionInput || project?.reaction_input || 'Unknown Reaction';
    const finalConditions = conditions || project?.conditions || {};
    const reactants = project?.reactants || 'N/A';
    const products = project?.products || 'N/A';
    const count = opts.count ?? 5;
    const iteration = opts.iteration ?? 1;

    let prompt = `System Role: You are an expert catalyst scientist optimizing chemical reactions.\n\n`;
    prompt += `User Context:\n`;
    prompt += `- Reaction: ${finalReaction}\n`;
    prompt += `- Reactants: ${reactants}\n`;
    prompt += `- Products: ${products}\n`;
    prompt += `- Conditions: ${JSON.stringify(finalConditions)}\n`;
    if (project?.catalysis_type) prompt += `- Catalysis Type: ${project.catalysis_type}\n`;
    prompt += `- Iteration: ${iteration}\n\n`;

    if (similarCandidates.length > 0) {
      prompt += `Past Experiments (Top K):\n`;
      similarCandidates.forEach((c) => {
        const actual = c.experiments[0]?.actual_score ?? 'N/A';
        prompt += `- Candidate: ${c.formula}, Predicted: ${c.predicted_score}, Actual: ${actual}\n`;
      });
      prompt += `\n`;
    }

    if (failureInsights.length > 0) {
      prompt += `Failure Insights (Key Mistakes):\n`;
      failureInsights.forEach((fi) => {
        prompt += `- ${fi.pattern} (Severity: ${fi.severity})\n`;
      });
      prompt += `\n`;
    }

    if (opts.excludeFormulas && opts.excludeFormulas.length > 0) {
      prompt += `Already-surfaced candidates (DO NOT repeat or return close variants of):\n`;
      opts.excludeFormulas.forEach((f) => (prompt += `- ${f}\n`));
      prompt += `\n`;
    }

    // RAG: experiments from the latest training snapshot. These are real, peer-reviewed
    // outcomes that should anchor the LLM's recommendations.
    if (opts.ragContext && opts.ragContext.length > 0) {
      prompt += `Reviewed experiments from training corpus (predicted vs actual, with review outcome):\n`;
      opts.ragContext.forEach((r) => {
        const actual = r.actual !== null ? r.actual.toFixed(2) : 'N/A';
        prompt += `- ${r.formula}: predicted ${r.predicted.toFixed(2)}, actual ${actual} (${r.status})\n`;
      });
      prompt += `Bias your recommendations toward catalyst families that performed well; avoid those that were rejected.\n\n`;
    }

    prompt += `Task: Recommend ${count} DIVERSE catalyst candidates for this reaction. Aggregate from published literature, third-party databases, and recorded experimental data; rank by overall promise (yield × stability × feasibility).\n\n`;
    prompt += `Output: a single JSON object with key "candidates" mapped to an array of ${count} entries. Each entry MUST include:\n`;
    prompt += `  - formula           (string, e.g. "Pt-CeO2/Al2O3")\n`;
    prompt += `  - predicted_score   (number 0..1)\n`;
    prompt += `  - confidence        (number 0..1)\n`;
    prompt += `  - stability         (number 0..1)\n`;
    prompt += `  - activity_score    (number 0..1)\n`;
    prompt += `  - activation_energy (number, kJ/mol)\n`;
    prompt += `  - operating_temp    (string with unit, e.g. "240C")\n`;
    prompt += `  - operating_pressure(string with unit, e.g. "50 bar")\n`;
    prompt += `  - source            ("literature" | "third-party-db" | "historical" | "llm")\n`;
    prompt += `  - reasoning         (one short sentence)\n`;
    prompt += `Do NOT wrap output in markdown fences. Return JSON only.\n`;

    return prompt;
  }

  /**
   * Calls Gemini and returns an array of candidates.
   */
  static async callLLM(prompt: string): Promise<RankedCandidate[]> {
    try {
      const result = await model.generateContent(prompt + '\nIMPORTANT: Return ONLY valid JSON.');
      const text = (await result.response).text();
      const jsonStr = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      const list: RankedCandidate[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.candidates)
          ? parsed.candidates
          : [parsed];

      return list.filter((c) => c && typeof c.formula === 'string' && c.formula.length > 1);
    } catch (err: any) {
      console.error('Gemini API Call Failed:', err.message);
      return [
        {
          formula: 'Pt-CeO2/Al2O3',
          predicted_score: 0.85,
          confidence: 0.92,
          stability: 0.8,
          activity_score: 0.78,
          activation_energy: 65,
          operating_temp: '240C',
          operating_pressure: '50 bar',
          source: 'llm',
          reasoning: 'Fallback baseline — Gemini call failed.',
        },
      ];
    }
  }

  /**
   * Sanity-check a user-submitted candidate against the project's reaction
   * context. Soft validation: never blocks creation, just surfaces concerns
   * the FE can show as warnings.
   */
  static async validateUserCandidate(args: {
    reaction: string;
    reactants?: string;
    products?: string;
    catalysisType?: string;
    formula: string;
    predicted_score?: number;
    confidence?: number;
    stability?: number;
    activity_score?: number;
    activation_energy?: number;
    operating_temp?: string;
    operating_pressure?: string;
    reasoning?: string;
  }): Promise<{
    plausible: boolean;
    confidence: number;
    concerns: string[];
    suggestions: string[];
    rationale: string;
  }> {
    const prompt = `You are an expert catalyst scientist reviewing a user-submitted catalyst proposal.

Reaction context:
- Reaction: ${args.reaction}
- Reactants: ${args.reactants ?? 'N/A'}
- Products:  ${args.products ?? 'N/A'}
- Catalysis type: ${args.catalysisType ?? 'N/A'}

User proposed:
- Formula:           ${args.formula}
- Predicted score:   ${args.predicted_score ?? 'N/A'}
- Confidence:        ${args.confidence ?? 'N/A'}
- Stability:         ${args.stability ?? 'N/A'}
- Activity score:    ${args.activity_score ?? 'N/A'}
- Activation energy: ${args.activation_energy ?? 'N/A'} kJ/mol
- Operating temp:    ${args.operating_temp ?? 'N/A'}
- Operating pressure:${args.operating_pressure ?? 'N/A'}
- Reasoning:         ${args.reasoning ?? 'N/A'}

Cross-check the proposal against published literature and typical catalyst behavior for this
reaction class. Identify red flags such as: formula syntactically invalid, catalyst chemically
implausible for this reaction, activation energy outside the realistic 20-300 kJ/mol band,
operating conditions that would degrade the catalyst, scores not in 0..1, etc.

Respond with ONLY valid JSON in this shape (no markdown fences):
{
  "plausible": true,
  "confidence": 0.0..1.0,
  "concerns":   ["short bullet", "..."],
  "suggestions":["short bullet", "..."],
  "rationale":  "one short paragraph"
}`;

    try {
      const result = await model.generateContent(prompt + '\nIMPORTANT: Return ONLY valid JSON.');
      const text = (await result.response).text();
      const cleaned = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        plausible: parsed.plausible !== false,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        rationale: typeof parsed.rationale === 'string' ? parsed.rationale : '',
      };
    } catch (err: any) {
      console.warn('Candidate validation LLM call failed:', err.message);
      return {
        plausible: true,
        confidence: 0.0,
        concerns: ['LLM validator unavailable; candidate accepted without external sanity check.'],
        suggestions: [],
        rationale: 'Validation skipped — Gemini call failed.',
      };
    }
  }

  /**
   * Generates a Gemini text embedding normalized to 768 dims (matches the DB
   * `Candidate.embedding` column). Falls back to a deterministic pseudo-
   * embedding if every Gemini embedding model is unavailable so dedup still
   * works in dev.
   *
   * Authoritative model list comes from Google's ListModels endpoint for the
   * `v1beta` API. Newer models default to 3072 dims; we truncate-and-renorm
   * to 768 so the existing pgvector column stays compatible.
   */
  static async embed(text: string): Promise<number[]> {
    for (const modelId of LLMService.viableEmbeddingModels()) {
      try {
        const embedModel = genAI.getGenerativeModel({ model: modelId });
        const result = await embedModel.embedContent(text);
        const values = result.embedding?.values;
        if (!Array.isArray(values) || values.length === 0) {
          LLMService.disableEmbeddingModel(modelId, 'empty result');
          continue;
        }

        if (!LLMService.embeddingState.confirmed.has(modelId)) {
          console.info(`Embedding model "${modelId}" is live (returns ${values.length} dims; truncating to 768).`);
          LLMService.embeddingState.confirmed.add(modelId);
        }
        return LLMService.fitTo768(values);
      } catch (err: any) {
        LLMService.disableEmbeddingModel(modelId, err.message);
      }
    }
    return LLMService.deterministicEmbedding(text);
  }

  private static embeddingState: {
    models: string[];
    warnedOnce: boolean;
    confirmed: Set<string>;
  } = {
    // Names verified via Google's ListModels endpoint for this API key.
    // Order: newest stable → previous gen → preview.
    models: ['gemini-embedding-2', 'gemini-embedding-001', 'gemini-embedding-2-preview'],
    warnedOnce: false,
    confirmed: new Set(),
  };

  private static viableEmbeddingModels(): string[] {
    return LLMService.embeddingState.models;
  }

  private static disableEmbeddingModel(modelId: string, reason: string) {
    if (LLMService.embeddingState.models.includes(modelId)) {
      console.warn(`Embedding model "${modelId}" disabled for this run: ${reason}`);
    }
    LLMService.embeddingState.models = LLMService.embeddingState.models.filter((m) => m !== modelId);
    if (LLMService.embeddingState.models.length === 0 && !LLMService.embeddingState.warnedOnce) {
      console.info(
        'No Gemini embedding model usable; using deterministic-hash embeddings for this run.'
      );
      LLMService.embeddingState.warnedOnce = true;
    }
  }

  /**
   * Truncate (or pad) a vector to exactly 768 dims, then L2-normalize so
   * cosine/L2 distances stay in their usual range.
   */
  private static fitTo768(values: number[]): number[] {
    const out = new Array<number>(768);
    for (let i = 0; i < 768; i++) out[i] = values[i] ?? 0;
    const norm = Math.sqrt(out.reduce((s, x) => s + x * x, 0)) || 1;
    return out.map((x) => x / norm);
  }

  /**
   * Deterministic 768-d pseudo-embedding (dev fallback). Same input → same vector.
   */
  private static deterministicEmbedding(text: string): number[] {
    const v = new Array<number>(768).fill(0);
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      v[(c * 31 + i) % 768] += ((c % 13) - 6) / 7;
    }
    // Normalize
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return v.map((x) => x / norm);
  }
}
