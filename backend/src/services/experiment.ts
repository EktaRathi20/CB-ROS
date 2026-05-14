import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ExperimentService {
  /**
   * Submit an experiment result with scientist attribution and observations
   * (Step 5 — primary feedback).
   */
  static async submitExperiment(
    candidateId: string,
    predictedScore: number,
    actualScore: number,
    extras: { submittedBy?: string; outcome?: string; observations?: string } = {}
  ) {
    if (!candidateId) {
      throw new Error('candidateId is required');
    }
    const candidateExists = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { id: true },
    });
    if (!candidateExists) {
      const err: any = new Error(`Candidate "${candidateId}" not found`);
      err.code = 'CANDIDATE_NOT_FOUND';
      throw err;
    }

    // One experiment per candidate. Once submitted (in any state — pending,
    // approved, rejected, changes_requested) the candidate is locked from
    // re-submission.
    const existing = await prisma.experimentSubmission.findFirst({
      where: { candidate_id: candidateId },
      select: { id: true, status: true },
    });
    if (existing) {
      const err: any = new Error(
        `Candidate already has an experiment submission (id=${existing.id}, status=${existing.status})`
      );
      err.code = 'ALREADY_SUBMITTED';
      err.existing_submission_id = existing.id;
      err.existing_status = existing.status;
      throw err;
    }

    const submittedById = await ExperimentService.resolveUserId(extras.submittedBy);
    if (extras.submittedBy && !submittedById) {
      const err: any = new Error(`submittedBy "${extras.submittedBy}" does not match any user`);
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    return prisma.experimentSubmission.create({
      data: {
        candidate_id: candidateId,
        submitted_by_id: submittedById,
        predicted_score: predictedScore,
        actual_score: actualScore,
        outcome: extras.outcome ?? null,
        observations: extras.observations ?? null,
        status: 'pending',
      },
    });
  }

  /**
   * Step 5 — secondary feedback. A different user reviews a submission with
   * one of three decisions:
   *   - approve         → status `approved` + calibration loop runs
   *   - reject          → status `rejected`
   *   - request_changes → status `changes_requested` (submitter must revise)
   *
   * Auto-finalizes the submission status when the reviewer is not the submitter.
   * `comment` is required for both `reject` and `request_changes`.
   */
  static async addReview(
    submissionId: string,
    reviewerInput: string,
    decision: 'approve' | 'reject' | 'request_changes',
    comment?: string
  ) {
    if ((decision === 'reject' || decision === 'request_changes') && !comment?.trim()) {
      const err: any = new Error(`A comment is required when decision is "${decision}"`);
      err.code = 'COMMENT_REQUIRED';
      throw err;
    }

    const reviewerId = await ExperimentService.resolveUserId(reviewerInput);
    if (!reviewerId) throw new Error('Unknown reviewer');

    const submission = await prisma.experimentSubmission.findUnique({
      where: { id: submissionId },
    });
    if (!submission) throw new Error('Submission not found');
    if (submission.submitted_by_id && submission.submitted_by_id === reviewerId) {
      throw new Error('A user cannot review their own submission');
    }

    const review = await prisma.experimentReview.upsert({
      where: { submission_id_reviewer_id: { submission_id: submissionId, reviewer_id: reviewerId } },
      create: {
        submission_id: submissionId,
        reviewer_id: reviewerId,
        decision,
        comment: comment ?? null,
      },
      update: { decision, comment: comment ?? null },
    });

    if (decision === 'approve' && submission.status !== 'approved') {
      await ExperimentService.approveExperiment(submissionId);
    } else if (decision === 'reject' && submission.status !== 'rejected') {
      await prisma.experimentSubmission.update({
        where: { id: submissionId },
        data: { status: 'rejected' },
      });
    } else if (decision === 'request_changes' && submission.status !== 'changes_requested') {
      await prisma.experimentSubmission.update({
        where: { id: submissionId },
        data: { status: 'changes_requested' },
      });
    }

    return review;
  }

  /**
   * Approve flow: compute calibration drift, generate failure insights when
   * drift is significant, mark submission approved.
   */
  static async approveExperiment(submissionId: string) {
    const submission = await prisma.experimentSubmission.findUnique({
      where: { id: submissionId },
      include: { candidate: true },
    });

    if (!submission || submission.actual_score === null) throw new Error('Invalid submission');

    const delta = Math.abs(submission.predicted_score - submission.actual_score);

    await prisma.calibrationLog.create({
      data: {
        candidate_id: submission.candidate_id,
        predicted_score: submission.predicted_score,
        actual_score: submission.actual_score,
        delta,
      },
    });

    if (delta > 0.2) {
      await prisma.failureInsight.create({
        data: {
          project_id: submission.candidate.project_id,
          pattern: `Significant prediction drift for ${submission.candidate.formula}. Observed stability issues not captured by model.`,
          severity: delta > 0.5 ? 'high' : 'medium',
        },
      });
    }

    await prisma.experimentSubmission.update({
      where: { id: submissionId },
      data: { status: 'approved' },
    });

    return { delta, status: 'approved' };
  }

  /**
   * Step 5 — Audit Dashboard: deduped candidate list across all iterations
   * for a project, plus their submissions and peer reviews.
   */
  static async getAuditDashboard(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        iterations_used: true,
        max_iterations: true,
        reactants: true,
        products: true,
      },
    });
    if (!project) throw new Error('Project not found');

    const candidates = await prisma.candidate.findMany({
      where: { project_id: projectId },
      orderBy: [{ iteration_number: 'asc' }, { predicted_score: 'desc' }],
      include: {
        experiments: {
          include: {
            submitted_by: { select: { id: true, name: true, email: true } },
            reviews: {
              include: {
                reviewer: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
    });

    // Dedup by formula — first occurrence wins (Step 4 spec)
    const seen = new Set<string>();
    const unique = candidates.filter((c) => {
      const key = c.formula.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      project,
      total_candidates: candidates.length,
      unique_candidates: unique.length,
      iteration_count: project.iterations_used,
      candidates: unique,
    };
  }

  /**
   * Accepts either a User UUID or an email. Returns the resolved User.id, or
   * null if input was empty.
   */
  private static async resolveUserId(idOrEmail?: string): Promise<string | null> {
    if (!idOrEmail) return null;
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(idOrEmail);
    const user = await prisma.user.findFirst({
      where: isUuid ? { id: idOrEmail } : { email: idOrEmail },
      select: { id: true },
    });
    return user?.id ?? null;
  }
}
