import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface RetrainResult {
  snapshot_id: string;
  scope: 'project' | 'company';
  experiments_indexed: number;
  approved_count: number;
  rejected_count: number;
  changes_requested_count: number;
  avg_drift_before: number | null;
  avg_drift_after: number | null;
  bias_correction: number;
  recommendations: string[];
}

export class RetrainingService {
  /**
   * Aggregates all reviewed experiments in scope, computes calibration
   * statistics (signed bias + absolute drift), and writes a TrainingSnapshot
   * row. The snapshot is consumed by the next discovery iteration:
   *  - RAG: candidate IDs are stored in metadata so the prompt can pull in
   *    "highly relevant past experiments" for retrieval-augmented generation.
   *  - Calibration: bias_correction shifts every LLM-predicted score.
   */
  static async retrain(
    projectId: string,
    opts: { scope?: 'project' | 'company'; triggeredById?: string | null } = {}
  ): Promise<RetrainResult> {
    const scope = opts.scope ?? 'project';

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        creator_id: true,
        creator: { select: { company_id: true } },
      },
    });
    if (!project) throw new Error('Project not found');

    // 1. Determine which projects' experiments belong to the corpus
    let projectScope: { id: string }[] = [{ id: projectId }];
    if (scope === 'company' && project.creator?.company_id) {
      projectScope = await prisma.project.findMany({
        where: { creator: { is: { company_id: project.creator.company_id } } },
        select: { id: true },
      });
    }
    const projectIds = projectScope.map((p) => p.id);

    // 2. Pull every submission with a review (decided experiments only)
    const submissions = await prisma.experimentSubmission.findMany({
      where: {
        candidate: { project_id: { in: projectIds } },
        status: { in: ['approved', 'rejected', 'changes_requested'] },
      },
      select: {
        id: true,
        status: true,
        predicted_score: true,
        actual_score: true,
        candidate_id: true,
      },
    });

    const approved = submissions.filter((s) => s.status === 'approved');
    const rejected = submissions.filter((s) => s.status === 'rejected');
    const changesRequested = submissions.filter((s) => s.status === 'changes_requested');

    // 3. Calibration math from experiments that have an actual_score
    const usable = submissions.filter(
      (s) => typeof s.actual_score === 'number'
    ) as Array<typeof submissions[number] & { actual_score: number }>;

    let avgDriftBefore: number | null = null;
    let biasCorrection = 0;
    let avgDriftAfter: number | null = null;

    if (usable.length > 0) {
      const signedDeltas = usable.map((s) => s.predicted_score - s.actual_score);
      const absDeltas = signedDeltas.map(Math.abs);
      avgDriftBefore = mean(absDeltas);
      const meanBias = mean(signedDeltas);
      // Apply -bias as the correction so future predicted - bias ≈ actual on average
      biasCorrection = -meanBias;
      const correctedAbsDeltas = usable.map((s) =>
        Math.abs(s.predicted_score - meanBias - s.actual_score)
      );
      avgDriftAfter = mean(correctedAbsDeltas);
    }

    // 4. Build the corpus list (candidate IDs) that have embeddings — these
    //    will be used at discovery time as RAG retrieval scope.
    const corpusCandidateIds = Array.from(
      new Set(submissions.map((s) => s.candidate_id))
    );

    // 5. Generate plain-text recommendations from the data
    const recommendations: string[] = [];
    if (usable.length === 0) {
      recommendations.push('No labelled experiments yet — calibration not adjusted. Run a few discoveries → submit results → review, then retrain.');
    } else {
      if (Math.abs(biasCorrection) > 0.05) {
        recommendations.push(
          biasCorrection < 0
            ? `Predictions average ${(Math.abs(biasCorrection) * 100).toFixed(1)}% high vs lab — applying downward correction.`
            : `Predictions average ${(Math.abs(biasCorrection) * 100).toFixed(1)}% low vs lab — applying upward correction.`
        );
      } else {
        recommendations.push('Calibration is already tight (|bias| ≤ 5%); minor adjustment only.');
      }
      if (avgDriftBefore !== null && avgDriftAfter !== null && avgDriftAfter < avgDriftBefore) {
        const improvementPct = ((avgDriftBefore - avgDriftAfter) / avgDriftBefore) * 100;
        recommendations.push(`Expected drift improvement: ${improvementPct.toFixed(0)}% (${avgDriftBefore.toFixed(3)} → ${avgDriftAfter.toFixed(3)}).`);
      }
      if (rejected.length >= 3 && rejected.length / submissions.length > 0.3) {
        recommendations.push(`${rejected.length}/${submissions.length} experiments were rejected — consider tightening operating-condition constraints.`);
      }
      if (corpusCandidateIds.length >= 5) {
        recommendations.push(`Indexed ${corpusCandidateIds.length} candidates for retrieval — next discovery run will use them as RAG context.`);
      }
    }

    // 6. Persist the snapshot
    const snapshot = await prisma.trainingSnapshot.create({
      data: {
        project_id: projectId,
        triggered_by_id: opts.triggeredById ?? null,
        scope,
        experiments_indexed: submissions.length,
        approved_count: approved.length,
        rejected_count: rejected.length,
        changes_requested_count: changesRequested.length,
        avg_drift_before: avgDriftBefore,
        avg_drift_after: avgDriftAfter,
        bias_correction: biasCorrection,
        metadata: {
          corpus_candidate_ids: corpusCandidateIds,
          project_scope: projectIds,
          recommendations,
        },
      },
    });

    return {
      snapshot_id: snapshot.id,
      scope,
      experiments_indexed: submissions.length,
      approved_count: approved.length,
      rejected_count: rejected.length,
      changes_requested_count: changesRequested.length,
      avg_drift_before: avgDriftBefore,
      avg_drift_after: avgDriftAfter,
      bias_correction: biasCorrection,
      recommendations,
    };
  }

  /**
   * Returns the most recent training snapshot for a project (or null).
   * Used by `DiscoveryService.runIteration` to apply bias correction and
   * pull RAG retrieval scope.
   */
  static async getLatestSnapshot(projectId: string) {
    return prisma.trainingSnapshot.findFirst({
      where: { project_id: projectId },
      orderBy: { created_at: 'desc' },
    });
  }
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
