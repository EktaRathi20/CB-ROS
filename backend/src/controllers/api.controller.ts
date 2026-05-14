import { Request, Response } from 'express';

import { ExperimentService } from '../services/experiment.js';
import { DiscoveryService } from '../services/discovery.js';
import { ReactionService } from '../services/reaction.js';
import { LLMService } from '../services/llm.js';
import { VectorService } from '../services/vector.js';
import { RetrainingService } from '../services/retraining.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Resolve a UUID or email to a User.id. Returns null when input is empty. */
async function resolveUserIdInput(input?: string | null): Promise<string | null> {
  if (!input) return null;
  const isUuid = /^[0-9a-fA-F-]{36}$/.test(input);
  const user = await prisma.user.findFirst({
    where: isUuid ? { id: input } : { email: input },
    select: { id: true },
  });
  return user?.id ?? null;
}

export class ProjectController {
  /**
   * @openapi
   * /api/projects:
   *   post:
   *     summary: Create a new research project
   *     tags: [Projects]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, reactants, products, creatorId]
   *             properties:
   *               name: { type: string }
   *               reactants: { type: string, example: "CO2 + H2" }
   *               products: { type: string, example: "CH3OH + H2O" }
   *               temp: { type: string, example: "240C" }
   *               pressure: { type: string, example: "50 bar" }
   *               catalysisType: { type: string }
   *               creatorId:
   *                 type: string
   *                 description: User UUID or email of the project creator (must match an existing User)
   *                 example: "r.iyer@example.com"
   *               sustainabilityTag: { type: string }
   *               status: { type: string }
   *               notes: { type: string }
   *               maxIterations: { type: integer, example: 3 }
   *     responses:
   *       201: { description: Project created }
   *       400: { description: Invalid creatorId }
   */
  static async create(req: Request, res: Response) {
    const {
      name, reactants, products, temp, pressure,
      catalysisType, creatorId, sustainabilityTag, status, notes, maxIterations,
    } = req.body;

    if (!creatorId) {
      return res.status(400).json({ error: 'creatorId (user UUID or email) is required' });
    }
    const resolvedCreatorId = await resolveUserIdInput(creatorId);
    if (!resolvedCreatorId) {
      return res.status(400).json({ error: `creatorId "${creatorId}" does not match any user` });
    }

    try {
      const reactionPreview = `${reactants} -> ${products} @ ${temp ?? '-'}, ${pressure ?? '-'}`;
      const project = await prisma.project.create({
        data: {
          name,
          reactants,
          products,
          temp,
          pressure,
          catalysis_type: catalysisType,
          creator_id: resolvedCreatorId,
          sustainability_tag: sustainabilityTag,
          status: status || 'Active',
          notes,
          max_iterations: typeof maxIterations === 'number' ? maxIterations : 3,
          reaction_input: reactionPreview,
          conditions: { temp, pressure },
        },
        include: {
          creator: { select: { id: true, name: true, email: true } },
        },
      });
      res.status(201).json(project);
    } catch (error: any) {
      console.error('Project Creation Error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * @openapi
   * /api/projects:
   *   get:
   *     summary: List a creator's projects (newest first)
   *     description: Always scoped to a specific creator — `creatorId` is required.
   *     tags: [Projects]
   *     parameters:
   *       - in: query
   *         name: creatorId
   *         required: true
   *         schema: { type: string }
   *         description: User UUID or email of the project creator
   *       - in: query
   *         name: status
   *         schema: { type: string }
   *         description: Filter by project status (e.g. Active)
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20, maximum: 100 }
   *       - in: query
   *         name: offset
   *         schema: { type: integer, default: 0 }
   *     responses:
   *       200: { description: Paginated project list }
   *       400: { description: creatorId missing or unrecognised }
   */
  static async list(req: Request, res: Response) {
    const limitRaw = Number(req.query.limit);
    const offsetRaw = Number(req.query.offset);
    const limit = Math.min(100, Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 20);
    const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;

    const creatorIdInput = typeof req.query.creatorId === 'string' ? req.query.creatorId : undefined;
    const statusFilter = typeof req.query.status === 'string' ? req.query.status : undefined;

    if (!creatorIdInput) {
      return res.status(400).json({ error: 'creatorId (user UUID or email) is required' });
    }
    const creatorIdFilter = await resolveUserIdInput(creatorIdInput);
    if (!creatorIdFilter) {
      return res.status(400).json({ error: `creatorId "${creatorIdInput}" does not match any user` });
    }

    try {
      const where = {
        creator_id: creatorIdFilter,
        ...(statusFilter ? { status: statusFilter } : {}),
      };

      const [total, projects] = await Promise.all([
        prisma.project.count({ where }),
        prisma.project.findMany({
          where,
          orderBy: { created_at: 'desc' },
          take: limit,
          skip: offset,
          include: {
            creator: { select: { id: true, name: true, email: true } },
            _count: { select: { candidates: true, failure_insights: true } },
          },
        }),
      ]);

      res.json({ total, limit, offset, count: projects.length, projects });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * @openapi
   * /api/projects/{id}:
   *   get:
   *     summary: Get a project's metadata (no candidate list)
   *     description: Returns the project row, the linked creator user, aggregate counts (candidates generated, failure insights), and the timestamp of the most recent candidate so the UI can render the "Project Home" header. Use /api/projects/{id}/candidates or /api/projects/{id}/audit to fetch candidate data.
   *     tags: [Projects]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Project metadata }
   *       404: { description: Project not found }
   */
  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const [project, lastCandidate] = await Promise.all([
        prisma.project.findUnique({
          where: { id },
          include: {
            creator: { select: { id: true, name: true, email: true } },
            _count: { select: { candidates: true, failure_insights: true } },
          },
        }),
        prisma.candidate.findFirst({
          where: { project_id: id },
          orderBy: { created_at: 'desc' },
          select: { created_at: true },
        }),
      ]);

      if (!project) return res.status(404).json({ error: 'Project not found' });

      // V{major}.{minor} — major bumps on edit, minor bumps per discovery run.
      const version = `V${project.version_major}.${project.iterations_used}`;

      res.json({
        ...project,
        version,
        last_run_at: lastCandidate?.created_at ?? null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * @openapi
   * /api/projects/{id}:
   *   patch:
   *     summary: Edit a project. Bumps the major version and resets discovery iterations to 0.
   *     description: |
   *       Reactants, products, and catalysis type are immutable — sending any of those
   *       fields returns 400. Editable: name, temp, pressure, sustainabilityTag, status,
   *       notes, maxIterations, creatorId.
   *
   *       Each successful edit increments `version_major` by 1 and resets
   *       `iterations_used` to 0, giving the user a fresh `max_iterations` budget for
   *       discovery against the new conditions.
   *     tags: [Projects]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name: { type: string }
   *               temp: { type: string }
   *               pressure: { type: string }
   *               sustainabilityTag: { type: string }
   *               status: { type: string }
   *               notes: { type: string }
   *               maxIterations: { type: integer }
   *               creatorId: { type: string, description: "User UUID or email" }
   *     responses:
   *       200: { description: Updated project }
   *       400: { description: Tried to edit an immutable field, or invalid creatorId }
   *       404: { description: Project not found }
   */
  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const body = req.body ?? {};

    const IMMUTABLE = ['reactants', 'products', 'catalysisType', 'catalysis_type'] as const;
    const blocked = IMMUTABLE.filter((f) => Object.prototype.hasOwnProperty.call(body, f));
    if (blocked.length > 0) {
      return res.status(400).json({
        error: 'Reactants, products, and catalysis type cannot be edited after creation',
        immutable_fields: blocked,
      });
    }

    let resolvedCreatorId: string | undefined;
    if (Object.prototype.hasOwnProperty.call(body, 'creatorId')) {
      const r = await resolveUserIdInput(body.creatorId);
      if (!r) {
        return res.status(400).json({ error: `creatorId "${body.creatorId}" does not match any user` });
      }
      resolvedCreatorId = r;
    }

    try {
      const existing = await prisma.project.findUnique({ where: { id }, select: { id: true } });
      if (!existing) return res.status(404).json({ error: 'Project not found' });

      const update: Record<string, unknown> = {
        version_major: { increment: 1 },
        iterations_used: 0, // fresh discovery budget for the new version
      };
      if (typeof body.name === 'string') update.name = body.name;
      if (typeof body.temp === 'string') update.temp = body.temp;
      if (typeof body.pressure === 'string') update.pressure = body.pressure;
      if (typeof body.sustainabilityTag === 'string') update.sustainability_tag = body.sustainabilityTag;
      if (typeof body.status === 'string') update.status = body.status;
      if (typeof body.notes === 'string') update.notes = body.notes;
      if (typeof body.maxIterations === 'number') update.max_iterations = body.maxIterations;
      if (resolvedCreatorId) update.creator_id = resolvedCreatorId;

      // Refresh the cached reaction_input preview if temp/pressure changed
      const willTouchConditions = 'temp' in update || 'pressure' in update;
      if (willTouchConditions) {
        const current = await prisma.project.findUnique({
          where: { id },
          select: { reactants: true, products: true, temp: true, pressure: true },
        });
        const newTemp = (update.temp as string | undefined) ?? current?.temp ?? '-';
        const newPressure = (update.pressure as string | undefined) ?? current?.pressure ?? '-';
        update.reaction_input = `${current?.reactants} -> ${current?.products} @ ${newTemp}, ${newPressure}`;
        update.conditions = { temp: newTemp, pressure: newPressure };
      }

      const project = await prisma.project.update({
        where: { id },
        data: update,
        include: {
          creator: { select: { id: true, name: true, email: true } },
          _count: { select: { candidates: true, failure_insights: true } },
        },
      });

      res.json({
        ...project,
        version: `V${project.version_major}.${project.iterations_used}`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export class ReactionController {
  /**
   * @openapi
   * /api/reactions/resolve:
   *   post:
   *     summary: Step 1+2 — parse reaction input and infer missing side via PubChem/Gemini
   *     tags: [Reactions]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [reaction]
   *             properties:
   *               reaction:
   *                 type: string
   *                 example: "H2 -> H2O"
   *     responses:
   *       200: { description: Resolved reaction with verification }
   */
  static async resolve(req: Request, res: Response) {
    const { reaction } = req.body;
    if (!reaction || typeof reaction !== 'string') {
      return res.status(400).json({ error: 'reaction (string) is required' });
    }
    try {
      const resolved = await ReactionService.resolve(reaction);
      res.status(200).json(resolved);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export class DiscoveryController {
  /**
   * @openapi
   * /api/discovery:
   *   post:
   *     summary: Step 3+4 — run one catalyst-discovery iteration
   *     description: Returns N diverse, deduplicated catalyst candidates for the project. Subsequent calls return new candidates (diversity-aware) up to the project's max_iterations.
   *     tags: [Discovery]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [projectId]
   *             properties:
   *               projectId: { type: string }
   *               count: { type: integer, example: 5 }
   *               reactionInput: { type: string }
   *               conditions: { type: object }
   *     responses:
   *       200: { description: Iteration result with candidates }
   */
  static async start(req: Request, res: Response) {
    const { projectId, reactionInput, conditions, count } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });
    try {
      const result = await DiscoveryService.runIteration(projectId, {
        count: typeof count === 'number' ? count : 5,
        reactionInput,
        conditions,
      });
      res.status(200).json(result);
    } catch (error: any) {
      res.status(error.message?.includes('cap reached') ? 409 : 500).json({ error: error.message });
    }
  }

  /**
   * @openapi
   * /api/discovery/stream:
   *   post:
   *     summary: Step 3+4 — same as /api/discovery, but streams progress events as Server-Sent Events
   *     description: |
   *       Returns `text/event-stream`. Each line of the form `data: <json>\\n\\n` is one event:
   *       `step` (running|done|error), `log`, `result`, `error`, or `done`. Connection closes after
   *       the iteration finishes or errors.
   *     tags: [Discovery]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [projectId]
   *             properties:
   *               projectId: { type: string }
   *               count: { type: integer, example: 5 }
   *               reactionInput: { type: string }
   *               conditions: { type: object }
   *     responses:
   *       200: { description: SSE stream (text/event-stream) }
   */
  static async startStream(req: Request, res: Response) {
    const { projectId, reactionInput, conditions, count } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });

    // Open the SSE stream
    res.status(200).set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx response buffering
    });
    res.flushHeaders?.();
    // Disable Nagle's algorithm on the underlying TCP socket so each small
    // SSE chunk goes out immediately instead of being batched. Without this,
    // sub-1KB writes sit in the kernel buffer and the client sees nothing
    // until the response ends.
    res.socket?.setNoDelay(true);
    // Force-flush an opening SSE comment so the response body actually starts.
    res.write(': ready\n\n');

    // IMPORTANT: use res.on('close') not req.on('close'). The request's 'close'
    // can fire as soon as express.json() finishes consuming the body stream,
    // which would falsely flag the client as disconnected and silence every
    // subsequent send().
    let clientGone = false;
    res.on('close', () => {
      console.log('[STREAM] response close event — client really disconnected');
      clientGone = true;
    });

    const send = (event: unknown) => {
      if (clientGone) {
        console.log('[STREAM] skipping send — clientGone already true');
        return;
      }
      const payload = JSON.stringify(event);
      console.log(`[SSE] ${payload.length > 200 ? payload.slice(0, 200) + '…' : payload}`);
      const ok = res.write(`data: ${payload}\n\n`);
      if (!ok) console.log('[STREAM] res.write returned false (backpressure)');
    };

    // Comment line keeps long-lived connections alive through proxies
    const heartbeat = setInterval(() => {
      if (clientGone) return;
      res.write(': keep-alive\n\n');
    }, 15000);

    try {
      console.log('[STREAM] runIteration starting for project', projectId);
      await DiscoveryService.runIteration(projectId, {
        count: typeof count === 'number' ? count : 5,
        reactionInput,
        conditions,
        onEvent: (event) => send(event),
      });
      console.log('[STREAM] runIteration finished cleanly');
      send({ type: 'done' });
    } catch (error: any) {
      console.error('[STREAM] runIteration threw:', error?.message ?? error);
      send({ type: 'error', message: error?.message ?? 'discovery failed' });
    } finally {
      console.log('[STREAM] finally — clientGone=', clientGone);
      clearInterval(heartbeat);
      if (!clientGone) res.end();
    }
  }

  /**
   * @openapi
   * /api/projects/{id}/candidates:
   *   get:
   *     summary: List candidates for a project (optionally filtered by iteration)
   *     description: |
   *       Each candidate includes its latest submission (if any) plus a `can_submit`
   *       flag. The flag is `false` once an experiment has been submitted for that
   *       candidate, so the UI can disable the "Send to experiment" button and
   *       render a status badge (Pending review / Approved / Rejected / Changes requested).
   *     tags: [Discovery]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *       - in: query
   *         name: iteration
   *         schema: { type: integer }
   *     responses:
   *       200: { description: Candidate table with submission status }
   */
  static async listCandidates(req: Request, res: Response) {
    const { id } = req.params;
    const iteration = req.query.iteration ? Number(req.query.iteration) : undefined;
    try {
      const candidates = await prisma.candidate.findMany({
        where: { project_id: id, ...(iteration ? { iteration_number: iteration } : {}) },
        orderBy: [{ iteration_number: 'asc' }, { predicted_score: 'desc' }],
        include: {
          experiments: {
            orderBy: { created_at: 'desc' },
            take: 1,
            include: {
              submitted_by: { select: { id: true, name: true, email: true } },
              _count: { select: { reviews: true } },
            },
          },
          _count: { select: { experiments: true } },
        },
      });

      const enriched = candidates.map((c) => {
        const latest = c.experiments[0] ?? null;
        return {
          ...c,
          experiments: undefined, // strip; replace with explicit fields below
          latest_submission: latest,
          submission_status: latest?.status ?? 'none',
          can_submit: c._count.experiments === 0,
        };
      });

      res.json({ project_id: id, count: enriched.length, candidates: enriched });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * @openapi
   * /api/projects/{id}/candidates:
   *   post:
   *     summary: Add a user-proposed catalyst candidate to a project
   *     description: |
   *       Lets a scientist submit their own catalyst hypothesis instead of relying on the
   *       discovery iteration. Pipeline:
   *       1. Sync validation of types/ranges (formula required, scores in 0..1, etc.)
   *       2. Reject if a candidate with the same formula already exists in this project
   *       3. Soft validation via Gemini — checks plausibility against the project's
   *          reaction; never blocks creation but returns concerns/suggestions
   *       4. Persist with `source: "user"` so it's distinguishable from AI / literature picks
   *       5. Generate + store an embedding so it participates in diversity dedup
   *
   *       The created row appears in the same `GET /api/projects/{id}/candidates` listing
   *       alongside AI/historical candidates.
   *     tags: [Discovery]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [formula]
   *             properties:
   *               formula:           { type: string,  example: "Pt-CeO2/Al2O3" }
   *               predicted_score:   { type: number,  minimum: 0, maximum: 1 }
   *               confidence:        { type: number,  minimum: 0, maximum: 1 }
   *               stability:         { type: number,  minimum: 0, maximum: 1 }
   *               activity_score:    { type: number,  minimum: 0, maximum: 1 }
   *               activation_energy: { type: number,  description: "kJ/mol" }
   *               operating_temp:     { type: string, example: "240C" }
   *               operating_pressure: { type: string, example: "50 bar" }
   *               reasoning:          { type: string }
   *               createdBy:          { type: string, description: "User UUID or email (for attribution in metadata)" }
   *     responses:
   *       201: { description: Candidate created — body includes the row plus a `validation` block from Gemini }
   *       400: { description: Validation error }
   *       404: { description: Project not found }
   *       409: { description: Duplicate formula already exists in this project }
   */
  static async createUserCandidate(req: Request, res: Response) {
    const { id: projectId } = req.params;
    const body = req.body ?? {};

    // 1. Sync validation
    if (typeof body.formula !== 'string' || body.formula.trim().length < 2) {
      return res.status(400).json({ error: 'formula is required (string, length >= 2)' });
    }
    const inRange = (v: any) => typeof v === 'number' && v >= 0 && v <= 1;
    const optInRange = (v: any) => v === undefined || v === null || inRange(v);
    if (!optInRange(body.predicted_score)) return res.status(400).json({ error: 'predicted_score must be a number in [0, 1]' });
    if (!optInRange(body.confidence))      return res.status(400).json({ error: 'confidence must be a number in [0, 1]' });
    if (!optInRange(body.stability))       return res.status(400).json({ error: 'stability must be a number in [0, 1]' });
    if (!optInRange(body.activity_score))  return res.status(400).json({ error: 'activity_score must be a number in [0, 1]' });
    if (body.activation_energy != null && (typeof body.activation_energy !== 'number' || body.activation_energy < 0)) {
      return res.status(400).json({ error: 'activation_energy must be a non-negative number (kJ/mol)' });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true, name: true, reaction_input: true,
        reactants: true, products: true, catalysis_type: true,
        iterations_used: true,
      },
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // 2. Per-project formula dedup
    const formula = body.formula.trim();
    const dup = await prisma.candidate.findFirst({
      where: { project_id: projectId, formula: { equals: formula, mode: 'insensitive' } },
      select: { id: true, formula: true, source: true },
    });
    if (dup) {
      return res.status(409).json({
        error: `A candidate with formula "${dup.formula}" already exists in this project (id=${dup.id}, source=${dup.source ?? 'unknown'}).`,
        existing_candidate_id: dup.id,
      });
    }

    // Optional creator attribution (kept in metadata since Candidate has no created_by FK)
    let createdById: string | null = null;
    if (body.createdBy) {
      createdById = await resolveUserIdInput(body.createdBy);
      if (!createdById) {
        return res.status(400).json({ error: `createdBy "${body.createdBy}" does not match any user` });
      }
    }

    // 3. Soft LLM plausibility check
    const validation = await LLMService.validateUserCandidate({
      reaction: project.reaction_input ?? '',
      reactants: project.reactants ?? undefined,
      products: project.products ?? undefined,
      catalysisType: project.catalysis_type ?? undefined,
      formula,
      predicted_score: body.predicted_score,
      confidence: body.confidence,
      stability: body.stability,
      activity_score: body.activity_score,
      activation_energy: body.activation_energy,
      operating_temp: body.operating_temp,
      operating_pressure: body.operating_pressure,
      reasoning: body.reasoning,
    });

    // 4. Persist
    const created = await prisma.candidate.create({
      data: {
        project_id: projectId,
        // User-submitted candidates land in iteration 0 so they're distinguishable
        // from AI iterations 1..N and don't consume the iteration cap.
        iteration_number: 0,
        formula,
        predicted_score: typeof body.predicted_score === 'number' ? body.predicted_score : 0.5,
        confidence:      typeof body.confidence === 'number'      ? body.confidence      : 0.5,
        stability:       typeof body.stability === 'number'       ? body.stability       : null,
        activity_score:  typeof body.activity_score === 'number'  ? body.activity_score  : null,
        activation_energy: typeof body.activation_energy === 'number' ? body.activation_energy : null,
        operating_temp:    typeof body.operating_temp === 'string'    ? body.operating_temp    : null,
        operating_pressure:typeof body.operating_pressure === 'string'? body.operating_pressure: null,
        source: 'user',
        metadata: {
          reasoning: typeof body.reasoning === 'string' ? body.reasoning : null,
          created_by_user_id: createdById,
          validation,
        },
      },
    });

    // 5. Embedding (best-effort; storage is non-fatal)
    try {
      const embedding = await VectorService.generateEmbedding(`${formula} ${body.reasoning ?? ''}`);
      await VectorService.storeCandidateWithEmbedding(created.id, embedding);
    } catch (err: any) {
      console.warn('User candidate embedding failed:', err.message);
    }

    res.status(201).json({ ...created, validation });
  }

  /**
   * @openapi
   * /api/projects/{id}/retrain:
   *   post:
   *     summary: Retrain — refresh the project's RAG corpus and recalibrate predictions
   *     description: |
   *       Aggregates every reviewed experiment in scope (project or company),
   *       computes the signed prediction bias, and writes a TrainingSnapshot.
   *
   *       The next discovery iteration automatically uses the snapshot to:
   *       1. Inject the corpus's reviewed outcomes into the Gemini prompt (RAG).
   *       2. Apply `bias_correction` to every LLM-predicted score before persisting.
   *
   *       No Gemini fine-tuning is performed — this is in-context learning + a
   *       calibration adjustment layer, both driven by the data already in the DB.
   *     tags: [Discovery]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               scope:
   *                 type: string
   *                 enum: [project, company]
   *                 default: project
   *               triggeredBy:
   *                 type: string
   *                 description: User UUID or email (attribution for the snapshot)
   *     responses:
   *       200: { description: Snapshot created with calibration + corpus stats }
   *       404: { description: Project not found }
   */
  static async retrain(req: Request, res: Response) {
    const { id: projectId } = req.params;
    const body = req.body ?? {};

    const scope: 'project' | 'company' =
      body.scope === 'company' ? 'company' : 'project';

    let triggeredById: string | null = null;
    if (body.triggeredBy) {
      triggeredById = await resolveUserIdInput(body.triggeredBy);
      if (!triggeredById) {
        return res.status(400).json({ error: `triggeredBy "${body.triggeredBy}" does not match any user` });
      }
    }

    try {
      const result = await RetrainingService.retrain(projectId, { scope, triggeredById });
      res.status(200).json(result);
    } catch (error: any) {
      const status = /not found/i.test(error.message) ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  }
}

export class ExperimentController {
  /**
   * @openapi
   * /api/experiments:
   *   post:
   *     summary: Step 5 — submit experimental feedback for a candidate
   *     tags: [Experiments]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [candidateId, predictedScore]
   *             properties:
   *               candidateId: { type: string }
   *               predictedScore: { type: number }
   *               actualScore: { type: number }
   *               outcome: { type: string, example: "success" }
   *               observations: { type: string }
   *               submittedBy:
   *                 type: string
   *                 description: User UUID or email
   *     responses:
   *       201: { description: Submission created }
   */
  static async submit(req: Request, res: Response) {
    const { candidateId, predictedScore, actualScore, outcome, observations, submittedBy } = req.body;
    try {
      const result = await ExperimentService.submitExperiment(
        candidateId,
        predictedScore,
        actualScore,
        { outcome, observations, submittedBy }
      );
      res.status(201).json(result);
    } catch (error: any) {
      const code = error?.code;
      if (code === 'CANDIDATE_NOT_FOUND') return res.status(404).json({ error: error.message });
      if (code === 'USER_NOT_FOUND') return res.status(400).json({ error: error.message });
      if (code === 'ALREADY_SUBMITTED') {
        return res.status(409).json({
          error: error.message,
          existing_submission_id: error.existing_submission_id,
          existing_status: error.existing_status,
        });
      }
      if (/required/i.test(error.message)) return res.status(400).json({ error: error.message });
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * @openapi
   * /api/experiments/{id}/reviews:
   *   post:
   *     summary: Step 5 — peer review (secondary feedback) on a submission
   *     tags: [Experiments]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [reviewer, decision]
   *             properties:
   *               reviewer: { type: string, description: "User UUID or email" }
   *               decision:
   *                 type: string
   *                 enum: [approve, reject, request_changes]
   *                 description: |
   *                   `approve` runs the calibration loop and marks the submission approved.
   *                   `reject` marks it rejected. `request_changes` flips status to
   *                   `changes_requested` so the submitter knows to revise. A non-empty
   *                   `comment` is required for `reject` and `request_changes`.
   *               comment: { type: string }
   *     responses:
   *       201: { description: Review recorded }
   *       400: { description: Missing/invalid fields, or comment missing on reject/request_changes }
   */
  static async addReview(req: Request, res: Response) {
    const { id } = req.params;
    const { reviewer, decision, comment } = req.body;
    const VALID_DECISIONS = ['approve', 'reject', 'request_changes'];
    if (!reviewer || !VALID_DECISIONS.includes(decision)) {
      return res
        .status(400)
        .json({ error: `reviewer and decision (${VALID_DECISIONS.join('|')}) are required` });
    }
    try {
      const review = await ExperimentService.addReview(id, reviewer, decision, comment);
      res.status(201).json(review);
    } catch (error: any) {
      if (error?.code === 'COMMENT_REQUIRED') return res.status(400).json({ error: error.message });
      const status = /not found|cannot review/.test(error.message) ? 400 : 500;
      res.status(status).json({ error: error.message });
    }
  }

  /**
   * @openapi
   * /api/experiments:
   *   get:
   *     summary: Workspace-wide experiment library
   *     description: |
   *       Returns every experiment submission across every project, regardless of
   *       which user submitted it. Includes header stats (total, pending, active
   *       scientists) and the list of distinct submitters so the UI can render
   *       its filters.
   *     tags: [Experiments]
   *     parameters:
   *       - in: query
   *         name: status
   *         schema: { type: string, enum: [pending, approved, rejected] }
   *       - in: query
   *         name: submittedBy
   *         schema: { type: string }
   *         description: User UUID or email
   *       - in: query
   *         name: projectId
   *         schema: { type: string }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20, maximum: 100 }
   *       - in: query
   *         name: offset
   *         schema: { type: integer, default: 0 }
   *     responses:
   *       200: { description: Paginated submission list with stats }
   */
  static async library(req: Request, res: Response) {
    const limitRaw = Number(req.query.limit);
    const offsetRaw = Number(req.query.offset);
    const limit = Math.min(100, Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 20);
    const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;

    const statusFilter = typeof req.query.status === 'string' ? req.query.status : undefined;
    const projectIdFilter = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
    const submittedByInput = typeof req.query.submittedBy === 'string' ? req.query.submittedBy : undefined;

    let submittedByFilter: string | undefined;
    if (submittedByInput) {
      const resolved = await resolveUserIdInput(submittedByInput);
      if (!resolved) {
        return res.status(400).json({ error: `submittedBy "${submittedByInput}" does not match any user` });
      }
      submittedByFilter = resolved;
    }

    try {
      const where = {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(submittedByFilter ? { submitted_by_id: submittedByFilter } : {}),
        ...(projectIdFilter ? { candidate: { project_id: projectIdFilter } } : {}),
      };

      const [
        total,
        pendingCount,
        activeScientists,
        scientists,
        submissions,
      ] = await Promise.all([
        prisma.experimentSubmission.count({ where }),
        prisma.experimentSubmission.count({ where: { ...where, status: 'pending' } }),
        prisma.experimentSubmission
          .findMany({
            where,
            select: { submitted_by_id: true },
            distinct: ['submitted_by_id'],
          })
          .then((rows) => rows.filter((r) => r.submitted_by_id).length),
        // Filter list for the UI's "SCIENTIST" pills — every user, regardless of
        // whether they've submitted yet. Filtering only happens when the client
        // passes `?submittedBy=<id|email>`. `stats.active_scientists` separately
        // tells the UI how many of these users actually have submissions.
        prisma.user.findMany({
          select: { id: true, name: true, email: true },
          orderBy: { name: 'asc' },
        }),
        prisma.experimentSubmission.findMany({
          where,
          orderBy: { created_at: 'desc' },
          take: limit,
          skip: offset,
          include: {
            submitted_by: { select: { id: true, name: true, email: true } },
            candidate: {
              select: {
                id: true,
                formula: true,
                predicted_score: true,
                stability: true,
                activity_score: true,
                activation_energy: true,
                operating_temp: true,
                operating_pressure: true,
                project: { select: { id: true, name: true } },
              },
            },
            _count: { select: { reviews: true } },
          },
        }),
      ]);

      res.json({
        stats: {
          total_submissions: total,
          pending_review: pendingCount,
          active_scientists: activeScientists,
        },
        filters: {
          scientists,
        },
        pagination: { total, limit, offset, count: submissions.length },
        submissions,
      });
    } catch (error: any) {
      console.error('Experiment library error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export class AuditController {
  /**
   * @openapi
   * /api/projects/{id}/audit:
   *   get:
   *     summary: Step 5 — Audit dashboard for a project (unique candidates + reviews)
   *     tags: [Audit]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Aggregated audit data }
   */
  static async dashboard(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const audit = await ExperimentService.getAuditDashboard(id);
      res.status(200).json(audit);
    } catch (error: any) {
      const status = /not found/i.test(error.message) ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  }
}

export class CompanyController {
  /**
   * @openapi
   * /api/companies:
   *   get:
   *     summary: List mock companies (login step 1)
   *     description: |
   *       Returns the workspace's companies. The login flow is two-step —
   *       scientists pick a company first, then a user inside it.
   *     tags: [Companies]
   *     responses:
   *       200: { description: Company list }
   */
  static async list(_req: Request, res: Response) {
    try {
      const companies = await prisma.company.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { users: true } },
        },
      });
      res.json(companies);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export class UserController {
  /**
   * @openapi
   * /api/users:
   *   get:
   *     summary: List mock users, optionally scoped to a company
   *     description: |
   *       Use `?companyId=<uuid|slug>` to fetch only users belonging to a company —
   *       this powers the second step of the login picker (company → user).
   *     tags: [Users]
   *     parameters:
   *       - in: query
   *         name: companyId
   *         schema: { type: string }
   *         description: Company UUID or slug (e.g. `abc-research`)
   *     responses:
   *       200: { description: User list }
   *       400: { description: Unknown companyId }
   */
  static async list(req: Request, res: Response) {
    const companyIdInput = typeof req.query.companyId === 'string' ? req.query.companyId : undefined;

    let companyIdFilter: string | undefined;
    if (companyIdInput) {
      const isUuid = /^[0-9a-fA-F-]{36}$/.test(companyIdInput);
      const company = await prisma.company.findFirst({
        where: isUuid ? { id: companyIdInput } : { slug: companyIdInput },
        select: { id: true },
      });
      if (!company) {
        return res.status(400).json({ error: `companyId "${companyIdInput}" does not match any company` });
      }
      companyIdFilter = company.id;
    }

    try {
      const users = await prisma.user.findMany({
        where: companyIdFilter ? { company_id: companyIdFilter } : {},
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          company: { select: { id: true, name: true, slug: true } },
        },
      });
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export class InboxController {
  /**
   * @openapi
   * /api/inbox:
   *   get:
   *     summary: Notifications inbox for the logged-in user
   *     description: |
   *       Returns two buckets scoped to the user's company:
   *       1. **pending** — submissions from OTHER scientists in the same company that are
   *          still awaiting a review and that this user has NOT yet reviewed.
   *       2. **recently_reviewed** — submissions where this user has already left a review,
   *          newest first.
   *     tags: [Inbox]
   *     parameters:
   *       - in: query
   *         name: userId
   *         required: true
   *         schema: { type: string }
   *         description: User UUID or email of the logged-in user
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20, maximum: 100 }
   *     responses:
   *       200: { description: Inbox payload with both buckets }
   *       400: { description: userId missing or unrecognised }
   */
  static async list(req: Request, res: Response) {
    const userIdInput = typeof req.query.userId === 'string' ? req.query.userId : undefined;
    if (!userIdInput) {
      return res.status(400).json({ error: 'userId (UUID or email) is required' });
    }

    const isUuid = /^[0-9a-fA-F-]{36}$/.test(userIdInput);
    const me = await prisma.user.findFirst({
      where: isUuid ? { id: userIdInput } : { email: userIdInput },
      include: { company: true },
    });
    if (!me) {
      return res.status(400).json({ error: `userId "${userIdInput}" does not match any user` });
    }

    const limitRaw = Number(req.query.limit);
    const limit = Math.min(100, Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 20);

    const submissionInclude = {
      submitted_by: {
        select: {
          id: true, name: true, email: true,
          company: { select: { id: true, name: true, slug: true } },
        },
      },
      candidate: {
        select: {
          id: true, formula: true, predicted_score: true,
          stability: true, activity_score: true, activation_energy: true,
          operating_temp: true, operating_pressure: true,
          project: { select: { id: true, name: true } },
        },
      },
      reviews: {
        orderBy: { created_at: 'desc' as const },
        include: {
          reviewer: { select: { id: true, name: true, email: true } },
        },
      },
      _count: { select: { reviews: true } },
    };

    try {
      const [pendingCount, pending, recentlyReviewed] = await Promise.all([
        // Stat: total pending awaiting me
        prisma.experimentSubmission.count({
          where: {
            status: 'pending',
            submitted_by_id: { not: me.id },
            submitted_by: { is: { company_id: me.company_id } },
            reviews: { none: { reviewer_id: me.id } },
          },
        }),
        // Bucket 1 — pending review
        prisma.experimentSubmission.findMany({
          where: {
            status: 'pending',
            submitted_by_id: { not: me.id },
            submitted_by: { is: { company_id: me.company_id } },
            reviews: { none: { reviewer_id: me.id } },
          },
          orderBy: { created_at: 'desc' },
          take: limit,
          include: submissionInclude,
        }),
        // Bucket 2 — recently reviewed by me (any company-mate's submission)
        prisma.experimentSubmission.findMany({
          where: {
            submitted_by: { is: { company_id: me.company_id } },
            reviews: { some: { reviewer_id: me.id } },
          },
          orderBy: { created_at: 'desc' },
          take: limit,
          include: submissionInclude,
        }),
      ]);

      // Annotate each "recently reviewed" item with the current user's own review
      // so the FE can render the "Approved" / "Rejected" pill without searching.
      const recentlyReviewedWithMyReview = recentlyReviewed.map((sub) => {
        const myReview = sub.reviews.find((r) => r.reviewer_id === me.id) ?? null;
        return { ...sub, my_review: myReview };
      });

      res.json({
        user: {
          id: me.id, name: me.name, email: me.email,
          company: me.company,
        },
        stats: {
          pending_review: pendingCount,
          recently_reviewed_by_me: recentlyReviewedWithMyReview.length,
        },
        pending,
        recently_reviewed: recentlyReviewedWithMyReview,
      });
    } catch (error: any) {
      console.error('Inbox error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export class DashboardController {
  /**
   * @openapi
   * /api/dashboard:
   *   get:
   *     summary: Workspace home dashboard for the logged-in user
   *     description: |
   *       Returns everything the dashboard screen needs in a single call:
   *       - Header stats (active projects, candidates generated, validated count,
   *         pending review tasks awaiting **this user**, avg model confidence) with
   *         7-day deltas where applicable.
   *       - Active project portfolio cards (top N) for the user's company.
   *       - Pending-review feed of submissions awaiting this user's sign-off.
   *
   *       All data is scoped to the logged-in user's company; nothing crosses
   *       company boundaries.
   *     tags: [Dashboard]
   *     parameters:
   *       - in: query
   *         name: userId
   *         required: true
   *         schema: { type: string }
   *         description: User UUID or email
   *       - in: query
   *         name: projectsLimit
   *         schema: { type: integer, default: 6, maximum: 50 }
   *       - in: query
   *         name: pendingLimit
   *         schema: { type: integer, default: 5, maximum: 50 }
   *     responses:
   *       200: { description: Dashboard payload }
   *       400: { description: userId missing or unrecognised }
   */
  static async get(req: Request, res: Response) {
    const userIdInput = typeof req.query.userId === 'string' ? req.query.userId : undefined;
    if (!userIdInput) {
      return res.status(400).json({ error: 'userId (UUID or email) is required' });
    }
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(userIdInput);
    const me = await prisma.user.findFirst({
      where: isUuid ? { id: userIdInput } : { email: userIdInput },
      include: { company: true },
    });
    if (!me) {
      return res.status(400).json({ error: `userId "${userIdInput}" does not match any user` });
    }

    const projectsLimit = clampInt(req.query.projectsLimit, 6, 1, 50);
    const pendingLimit = clampInt(req.query.pendingLimit, 5, 1, 50);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 86_400_000);

    // Every project whose creator belongs to this user's company.
    const inCompany = { creator: { is: { company_id: me.company_id } } } as const;

    try {
      // "Reactions in queue" needs a JS-side filter (Prisma can't compare two
      // columns in `where`), so it runs as its own query and isn't part of the
      // big Promise.all batch.
      const queuableProjectsP = prisma.project.findMany({
        where: { ...inCompany, status: 'Active' },
        select: { iterations_used: true, max_iterations: true },
      });

      const [
        activeProjectsCount,
        activeProjects7dAgo,
        candidatesLast7d,
        candidatesPrior7d,
        validatedNow,
        validated7dAgo,
        pendingReviewForMeNow,
        pendingReviewForMe7dAgo,
        confidenceLast7d,
        confidencePrior7d,
        projects,
        pendingReviews,
        queuableProjects,
      ] = await Promise.all([
        // Active projects
        prisma.project.count({ where: { ...inCompany, status: 'Active' } }),
        prisma.project.count({
          where: { ...inCompany, status: 'Active', created_at: { lt: weekAgo } },
        }),
        // Candidates generated
        prisma.candidate.count({
          where: { project: inCompany, created_at: { gte: weekAgo } },
        }),
        prisma.candidate.count({
          where: { project: inCompany, created_at: { gte: twoWeeksAgo, lt: weekAgo } },
        }),
        // Validated candidates (those whose latest experiment was approved)
        prisma.candidate.count({
          where: {
            project: inCompany,
            experiments: { some: { status: 'approved' } },
          },
        }),
        prisma.candidate.count({
          where: {
            project: inCompany,
            experiments: { some: { status: 'approved', created_at: { lt: weekAgo } } },
          },
        }),
        // Pending review tasks awaiting THIS user
        prisma.experimentSubmission.count({
          where: {
            status: 'pending',
            submitted_by_id: { not: me.id },
            submitted_by: { is: { company_id: me.company_id } },
            reviews: { none: { reviewer_id: me.id } },
          },
        }),
        prisma.experimentSubmission.count({
          where: {
            status: 'pending',
            created_at: { lt: weekAgo },
            submitted_by_id: { not: me.id },
            submitted_by: { is: { company_id: me.company_id } },
            reviews: { none: { reviewer_id: me.id } },
          },
        }),
        // Avg model confidence (last 7d vs prior 7d)
        prisma.candidate.aggregate({
          where: { project: inCompany, created_at: { gte: weekAgo } },
          _avg: { confidence: true },
        }),
        prisma.candidate.aggregate({
          where: { project: inCompany, created_at: { gte: twoWeeksAgo, lt: weekAgo } },
          _avg: { confidence: true },
        }),
        // Active project portfolio
        prisma.project.findMany({
          where: { ...inCompany, status: { not: 'Archived' } },
          orderBy: { created_at: 'desc' },
          take: projectsLimit,
          include: {
            creator: { select: { id: true, name: true, email: true } },
            candidates: {
              orderBy: { created_at: 'desc' },
              take: 1,
              select: { created_at: true },
            },
            _count: { select: { candidates: true } },
          },
        }),
        // Pending reviews awaiting me
        prisma.experimentSubmission.findMany({
          where: {
            status: 'pending',
            submitted_by_id: { not: me.id },
            submitted_by: { is: { company_id: me.company_id } },
            reviews: { none: { reviewer_id: me.id } },
          },
          orderBy: { created_at: 'desc' },
          take: pendingLimit,
          include: {
            submitted_by: { select: { id: true, name: true, email: true } },
            candidate: {
              select: {
                id: true, formula: true,
                project: { select: { id: true, name: true, version_major: true, iterations_used: true } },
              },
            },
          },
        }),
        queuableProjectsP,
      ]);

      // Reactions in queue = active projects that still have discovery
      // iterations available. Prisma can't compare two columns in `where`,
      // so we filter the small list of active projects in JS.
      const reactionsInQueueProper = queuableProjects.filter(
        (p) => p.iterations_used < p.max_iterations
      ).length;

      // Per-candidate validated/submission counts for portfolio cards
      const projectIds = projects.map((p) => p.id);
      const candidateAggregates = await prisma.candidate.findMany({
        where: { project_id: { in: projectIds } },
        select: {
          project_id: true,
          experiments: {
            orderBy: { created_at: 'desc' },
            take: 1,
            select: { status: true },
          },
        },
      });
      const aggregateByProject: Record<string, { submitted: number; approved: number; total: number }> = {};
      for (const c of candidateAggregates) {
        const key = c.project_id;
        const a = aggregateByProject[key] ?? { submitted: 0, approved: 0, total: 0 };
        a.total += 1;
        if (c.experiments[0]) {
          a.submitted += 1;
          if (c.experiments[0].status === 'approved') a.approved += 1;
        }
        aggregateByProject[key] = a;
      }

      const portfolio = projects.map((p) => {
        const agg = aggregateByProject[p.id] ?? { submitted: 0, approved: 0, total: p._count.candidates };
        let stage: 'discovery' | 'validation' | 'predictions' | 'complete';
        if (agg.total === 0 || agg.submitted === 0) stage = 'discovery';
        else if (agg.approved < agg.total) stage = 'validation';
        else if (agg.approved === agg.total && agg.total > 0) stage = 'complete';
        else stage = 'predictions';

        const progressPct = p.max_iterations > 0
          ? Math.round((p.iterations_used / p.max_iterations) * 100)
          : 0;

        return {
          id: p.id,
          name: p.name,
          reactants: p.reactants,
          products: p.products,
          temp: p.temp,
          pressure: p.pressure,
          catalysis_type: p.catalysis_type,
          sustainability_tag: p.sustainability_tag,
          status: p.status,
          version: `V${p.version_major}.${p.iterations_used}`,
          stage,
          lead: p.creator,
          candidates_count: agg.total,
          validated_count: agg.approved,
          iterations_used: p.iterations_used,
          max_iterations: p.max_iterations,
          progress_pct: progressPct,
          last_activity_at: p.candidates[0]?.created_at ?? p.created_at,
        };
      });

      const avgConfNow = confidenceLast7d._avg.confidence ?? null;
      const avgConfPrior = confidencePrior7d._avg.confidence ?? null;

      res.json({
        user: {
          id: me.id, name: me.name, email: me.email,
          company: me.company,
        },
        stats: {
          active_projects:           statBlock(activeProjectsCount, activeProjectsCount - activeProjects7dAgo),
          reactions_in_queue:        statBlock(reactionsInQueueProper, null),
          candidates_generated_7d:   statBlock(candidatesLast7d, candidatesLast7d - candidatesPrior7d),
          validated_candidates:      statBlock(validatedNow, validatedNow - validated7dAgo),
          pending_review_tasks:      statBlock(pendingReviewForMeNow, pendingReviewForMeNow - pendingReviewForMe7dAgo),
          avg_model_confidence: {
            value: avgConfNow !== null ? Math.round(avgConfNow * 1000) / 10 : null, // % to 1dp
            delta:
              avgConfNow !== null && avgConfPrior !== null
                ? Math.round((avgConfNow - avgConfPrior) * 1000) / 10
                : null,
            unit: '%',
          },
        },
        projects: portfolio,
        pending_reviews: pendingReviews.map((s) => ({
          submission_id: s.id,
          candidate_id: s.candidate.id,
          formula: s.candidate.formula,
          project: s.candidate.project,
          submitted_by: s.submitted_by,
          submitted_at: s.created_at,
          status: s.status,
          outcome: s.outcome,
        })),
      });
    } catch (error: any) {
      console.error('Dashboard error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

function statBlock(value: number, delta: number | null) {
  return { value, delta };
}
function clampInt(v: any, def: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

const DUMMY_REACTIONS = [
  { name: 'Hydrogen Evolution Reaction', reactants: 'H2O', products: 'H2 + O2', temp: '25C', pressure: '1 bar', catalysisType: 'Electrocatalysis', creator: 'Dr. A. Smith' },
  { name: 'CO2 Reduction',               reactants: 'CO2 + H2', products: 'CH3OH', temp: '250C', pressure: '50 bar', catalysisType: 'Heterogeneous', creator: 'Dr. B. Jones' },
  { name: 'Ammonia Synthesis',           reactants: 'N2 + H2', products: 'NH3', temp: '450C', pressure: '200 bar', catalysisType: 'Metal catalysis', creator: 'Dr. R. Iyer' },
];

export class DemoController {
  /**
   * @openapi
   * /api/demo:
   *   get:
   *     summary: End-to-end demonstration of all 5 spec steps
   *     tags: [Demo]
   *     responses:
   *       200: { description: Full lifecycle timeline }
   */
  static async runFullDemo(_req: Request, res: Response) {
    const timeline: any[] = [];
    const log = (msg: string) => console.log(`[DEMO] ${msg}`);
    try {
      const reaction = DUMMY_REACTIONS[Math.floor(Math.random() * DUMMY_REACTIONS.length)];
      log(`Step 0: starting demo for ${reaction.name}`);
      timeline.push({ step: 'Initialization', message: `Demo for ${reaction.name}` });

      // Step 1+2: resolve the reaction (skips inference because both sides are present)
      log('Step 1+2: resolving reaction via PubChem');
      const resolved = await ReactionService.resolve(`${reaction.reactants} -> ${reaction.products}`);
      timeline.push({ step: 'Reaction Resolved', data: resolved });
      log(`Step 1+2: ✅ resolved (${resolved.verification.length} compounds verified)`);

      // Project — link to a real seeded user instead of free-text creator name
      log('Step 3: creating Project row');
      const creatorUser = await prisma.user.findFirst({
        where: { name: reaction.creator },
        select: { id: true },
      });
      const project = await prisma.project.create({
        data: {
          name: `${reaction.name} Demo ${Date.now()}`,
          reactants: reaction.reactants,
          products: reaction.products,
          temp: reaction.temp,
          pressure: reaction.pressure,
          catalysis_type: reaction.catalysisType,
          creator_id: creatorUser?.id ?? null,
          reaction_input: `${reaction.reactants} -> ${reaction.products} @ ${reaction.temp}`,
          conditions: { temp: reaction.temp, pressure: reaction.pressure },
          max_iterations: 3,
        },
      });
      timeline.push({ step: 'Project Created', data: { id: project.id, name: project.name } });
      log(`Step 3: ✅ project ${project.id} created`);

      // Step 3+4: three iterations × 5 candidates each
      for (let i = 0; i < 3; i++) {
        log(`Step 4: starting discovery iteration ${i + 1}/3`);
        try {
          const iteration = await DiscoveryService.runIteration(project.id, { count: 5 });
          log(`Step 4: ✅ iteration ${iteration.iteration} returned ${iteration.returned} candidates`);
          timeline.push({
            step: `Discovery Iteration ${iteration.iteration}`,
            returned: iteration.returned,
            candidates: iteration.candidates.map((c) => ({
              formula: c.formula,
              predicted_score: c.predicted_score,
              stability: c.stability,
              activation_energy: c.activation_energy,
            })),
          });
        } catch (err: any) {
          console.error(`[DEMO] Iteration ${i + 1} failed:`, err);
          timeline.push({ step: `Discovery Iteration ${i + 1}`, error: err.message });
          // continue to next iteration / next step instead of aborting
        }
      }

      // Step 5: audit, primary feedback, peer review
      log('Step 5: building audit dashboard');
      const audit = await ExperimentService.getAuditDashboard(project.id);
      timeline.push({ step: 'Audit Dashboard', unique_candidates: audit.unique_candidates });
      log(`Step 5: ✅ ${audit.unique_candidates} unique candidates aggregated`);

      const firstCandidate = audit.candidates[0];
      if (!firstCandidate) {
        timeline.push({ step: 'Halt', message: 'No candidates produced — skipping submit/review' });
        return res.status(200).json({ success: false, reason: 'no_candidates', timeline });
      }

      // Pick a random user to submit, and a different one to peer-review.
      const allUsers = await prisma.user.findMany({ select: { email: true } });
      const submitterEmail =
        allUsers.length > 0
          ? allUsers[Math.floor(Math.random() * allUsers.length)].email
          : 'r.iyer@example.com';
      const reviewerPool = allUsers.filter((u) => u.email !== submitterEmail);
      const reviewerEmail =
        reviewerPool.length > 0
          ? reviewerPool[Math.floor(Math.random() * reviewerPool.length)].email
          : 'b.jones@example.com';

      log(`Step 5: submitting experiment for ${firstCandidate.formula} as ${submitterEmail}`);
      const submission = await ExperimentService.submitExperiment(
        firstCandidate.id,
        firstCandidate.predicted_score,
        Math.round((Math.random() * 0.4 + 0.5) * 100) / 100,
        {
          submittedBy: submitterEmail,
          outcome: 'success',
          observations: 'Initial lab run met expected yield with stable catalyst.',
        }
      );
      timeline.push({ step: 'Experiment Submitted', data: { id: submission.id, submitted_by: submitterEmail } });
      log(`Step 5: ✅ submission ${submission.id} created`);

      log(`Step 5: peer-approving submission as ${reviewerEmail}`);
      const review = await ExperimentService.addReview(
        submission.id,
        reviewerEmail,
        'approve',
        'Confirmed yield in independent run.'
      );
      timeline.push({ step: 'Peer Review', data: { id: review.id, decision: review.decision } });
      log(`Step 5: ✅ review ${review.id} recorded`);

      const insights = await prisma.failureInsight.findMany({ where: { project_id: project.id } });
      timeline.push({ step: 'Knowledge Base', failure_insights: insights.length });
      log(`Demo complete: ${insights.length} failure insights stored`);

      res.status(200).json({ success: true, timeline });
    } catch (error: any) {
      console.error('[DEMO] failed at top level:', error);
      res.status(500).json({ success: false, error: error.message, timeline });
    }
  }
}
