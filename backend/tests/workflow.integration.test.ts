/**
 * End-to-end integration test for the CB-ROS workflow.
 *
 * Boots the Express app on a random port, seeds a Company + two Users, and
 * walks the full lifecycle in order: reaction resolution → project creation →
 * discovery iteration → candidate listing → primary feedback (submit) → peer
 * review (approve) → calibration log + failure insight → audit dashboard →
 * inbox → dashboard → retraining snapshot.
 *
 * Run:   npm run test:integration
 * Needs: DATABASE_URL set and prisma migrate dev applied. Gemini calls are
 *        intentionally forced into the offline fallback path so the test is
 *        deterministic and doesn't hit the network.
 */

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { PrismaClient } from '@prisma/client';

// Force LLM + embedding services into their offline fallback BEFORE the app is
// imported. The services capture the API key at module-load time.
delete process.env.GEMINI_API_KEY;
process.env.NODE_ENV = 'test';

const prisma = new PrismaClient();

const TAG = `int-${Date.now()}`;
const COMPANY_SLUG = `${TAG}-co`;
const ALICE_EMAIL = `${TAG}-alice@test.local`;
const BOB_EMAIL = `${TAG}-bob@test.local`;

let server: http.Server;
let baseUrl: string;
let projectId: string;
let firstCandidateId: string;
let submissionId: string;

type ApiResponse<T = any> = { status: number; body: T };

async function api<T = any>(path: string, init?: any): Promise<ApiResponse<T>> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...((init?.headers as Record<string, string>) ?? {}) },
  });
  const text = await res.text();
  let body: any;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body: body as T };
}

async function teardown() {
  const company = await prisma.company.findUnique({ where: { slug: COMPANY_SLUG }, select: { id: true } });
  if (!company) return;

  const userIds = (await prisma.user.findMany({
    where: { company_id: company.id },
    select: { id: true },
  })).map(u => u.id);

  const projectIds = userIds.length
    ? (await prisma.project.findMany({
        where: { creator_id: { in: userIds } },
        select: { id: true },
      })).map(p => p.id)
    : [];

  const candidateIds = projectIds.length
    ? (await prisma.candidate.findMany({
        where: { project_id: { in: projectIds } },
        select: { id: true },
      })).map(c => c.id)
    : [];

  const submissionIds = candidateIds.length
    ? (await prisma.experimentSubmission.findMany({
        where: { candidate_id: { in: candidateIds } },
        select: { id: true },
      })).map(s => s.id)
    : [];

  if (submissionIds.length) {
    await prisma.experimentReview.deleteMany({ where: { submission_id: { in: submissionIds } } });
  }
  if (candidateIds.length) {
    await prisma.experimentSubmission.deleteMany({ where: { candidate_id: { in: candidateIds } } });
    await prisma.calibrationLog.deleteMany({ where: { candidate_id: { in: candidateIds } } });
    await prisma.candidate.deleteMany({ where: { id: { in: candidateIds } } });
  }
  if (projectIds.length) {
    await prisma.failureInsight.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.trainingSnapshot.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
  }
  if (userIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.company.delete({ where: { id: company.id } });
}

describe('CB-ROS — end-to-end workflow', { concurrency: false }, () => {
  before(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required to run integration tests');
    }
    await teardown();

    const company = await prisma.company.create({
      data: { name: 'Integration Test Co', slug: COMPANY_SLUG },
    });
    await prisma.user.createMany({
      data: [
        { name: 'Alice Tester', email: ALICE_EMAIL, company_id: company.id },
        { name: 'Bob Reviewer', email: BOB_EMAIL,   company_id: company.id },
      ],
    });

    const mod = await import('../src/index.js');
    const app = (mod as any).default;
    server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    try { await teardown(); } catch (err) { console.warn('teardown error:', err); }
    if (server) await new Promise<void>(resolve => server.close(() => resolve()));
    await prisma.$disconnect();
  });

  test('seed visibility — GET /api/companies + /api/users return the seeded rows', async () => {
    const cos = await api<any[]>('/api/companies');
    assert.equal(cos.status, 200);
    assert.ok(cos.body.some((c: any) => c.slug === COMPANY_SLUG), 'seeded company should be listed');

    const users = await api<any[]>(`/api/users?companyId=${COMPANY_SLUG}`);
    assert.equal(users.status, 200);
    const emails = users.body.map((u: any) => u.email);
    assert.ok(emails.includes(ALICE_EMAIL));
    assert.ok(emails.includes(BOB_EMAIL));
  });

  test('Step 1+2 — POST /api/reactions/resolve standardises the input', async () => {
    const { status, body } = await api('/api/reactions/resolve', {
      method: 'POST',
      body: JSON.stringify({ reaction: 'CO2 + H2 -> CH3OH' }),
    });
    assert.equal(status, 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert.ok(body, 'response body present');
  });

  test('Step 3 (project) — POST /api/projects creates and links to creator', async () => {
    const { status, body } = await api('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: `${TAG} CO2 Reduction`,
        reactants: 'CO2 + H2',
        products: 'CH3OH',
        temp: '250C',
        pressure: '50 bar',
        catalysisType: 'Heterogeneous',
        creatorId: ALICE_EMAIL,
        maxIterations: 3,
      }),
    });
    assert.equal(status, 201, `expected 201, got ${status}: ${JSON.stringify(body)}`);
    assert.equal(body.creator?.email, ALICE_EMAIL);
    assert.equal(body.iterations_used, 0);
    assert.equal(body.max_iterations, 3);
    projectId = body.id;
  });

  test('Project guardrail — PATCH /api/projects/:id rejects edits to immutable fields', async () => {
    const { status, body } = await api(`/api/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify({ reactants: 'something else' }),
    });
    assert.equal(status, 400);
    assert.ok(Array.isArray(body.immutable_fields));
  });

  test('Step 4 (discovery) — POST /api/discovery generates and persists candidates for iteration 1', async () => {
    const beforeCount = await prisma.candidate.count({ where: { project_id: projectId } });
    const { status, body } = await api('/api/discovery', {
      method: 'POST',
      body: JSON.stringify({ projectId, count: 3 }),
    });
    assert.equal(status, 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
    assert.equal(body.iteration, 1);
    assert.ok(body.returned >= 1, `expected >= 1 returned candidate, got ${body.returned}`);
    assert.ok(Array.isArray(body.candidates));

    const afterCount = await prisma.candidate.count({ where: { project_id: projectId } });
    assert.equal(afterCount - beforeCount, body.returned, 'persisted count should match `returned`');

    const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    assert.equal(project.iterations_used, 1);
  });

  test('Step 4 (listing) — GET /api/projects/:id/candidates returns can_submit=true for fresh candidates', async () => {
    const { status, body } = await api(`/api/projects/${projectId}/candidates`);
    assert.equal(status, 200);
    assert.ok(body.candidates.length >= 1);
    for (const c of body.candidates) {
      assert.equal(c.submission_status, 'none');
      assert.equal(c.can_submit, true);
      assert.ok(c.formula && c.formula.length > 1);
      assert.ok(typeof c.predicted_score === 'number');
    }
  });

  test('Step 5 (submit) — POST /api/experiments creates a pending submission tied to the submitter', async () => {
    const candidate = await prisma.candidate.findFirstOrThrow({
      where: { project_id: projectId },
      orderBy: { predicted_score: 'desc' },
    });
    firstCandidateId = candidate.id;

    const { status, body } = await api('/api/experiments', {
      method: 'POST',
      body: JSON.stringify({
        candidateId: candidate.id,
        predictedScore: candidate.predicted_score,
        // Far from the prediction so the calibration delta exceeds the
        // 0.2 threshold and a FailureInsight is generated on approval.
        actualScore: 0.10,
        outcome: 'failure',
        observations: 'Catalyst deactivated within 2h.',
        submittedBy: ALICE_EMAIL,
      }),
    });
    assert.equal(status, 201, `expected 201, got ${status}: ${JSON.stringify(body)}`);
    assert.equal(body.status, 'pending');
    assert.equal(body.candidate_id, candidate.id);
    submissionId = body.id;
  });

  test('Step 5 (idempotency) — second submit on same candidate returns 409 with existing submission id', async () => {
    const { status, body } = await api('/api/experiments', {
      method: 'POST',
      body: JSON.stringify({
        candidateId: firstCandidateId,
        predictedScore: 0.5,
        actualScore: 0.5,
        submittedBy: ALICE_EMAIL,
      }),
    });
    assert.equal(status, 409);
    assert.equal(body.existing_submission_id, submissionId);
    assert.equal(body.existing_status, 'pending');
  });

  test('Layer 7 (self-review) — submitter cannot review their own submission', async () => {
    const { status } = await api(`/api/experiments/${submissionId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ reviewer: ALICE_EMAIL, decision: 'approve' }),
    });
    assert.equal(status, 400);
  });

  test('Layer 7 (validation) — reject without comment is rejected', async () => {
    const { status } = await api(`/api/experiments/${submissionId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ reviewer: BOB_EMAIL, decision: 'reject' }),
    });
    assert.equal(status, 400);
  });

  test('Step 5 (peer review approve) — Layer 6 calibration + failure-insight loop runs', async () => {
    const { status, body } = await api(`/api/experiments/${submissionId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({
        reviewer: BOB_EMAIL,
        decision: 'approve',
        comment: 'Independent run confirms the result.',
      }),
    });
    assert.equal(status, 201, `expected 201, got ${status}: ${JSON.stringify(body)}`);
    assert.equal(body.decision, 'approve');

    const submission = await prisma.experimentSubmission.findUniqueOrThrow({ where: { id: submissionId } });
    assert.equal(submission.status, 'approved');

    const calibration = await prisma.calibrationLog.findFirstOrThrow({
      where: { candidate_id: firstCandidateId },
    });
    assert.ok(calibration.delta > 0, 'calibration delta must be positive');
    assert.equal(calibration.actual_score, 0.10);

    const insights = await prisma.failureInsight.findMany({
      where: { project_id: projectId },
      orderBy: { created_at: 'desc' },
    });
    assert.ok(insights.length >= 1, 'large delta should create at least one FailureInsight');
    assert.ok(['medium', 'high'].includes(insights[0].severity));
  });

  test('Audit — GET /api/projects/:id/audit aggregates unique candidates and shows the recorded review', async () => {
    const { status, body } = await api(`/api/projects/${projectId}/audit`);
    assert.equal(status, 200);
    assert.ok(body.unique_candidates >= 1);
    assert.ok(Array.isArray(body.candidates));

    const reviewed = body.candidates.find((c: any) => c.id === firstCandidateId);
    assert.ok(reviewed, 'reviewed candidate must appear in the audit');
    assert.equal(reviewed.experiments[0].status, 'approved');
    assert.equal(reviewed.experiments[0].reviews.length, 1);
    assert.equal(reviewed.experiments[0].reviews[0].decision, 'approve');
    assert.equal(reviewed.experiments[0].reviews[0].reviewer.email, BOB_EMAIL);
  });

  test('Inbox — GET /api/inbox?userId=Bob shows the submission Bob reviewed', async () => {
    const { status, body } = await api(`/api/inbox?userId=${encodeURIComponent(BOB_EMAIL)}`);
    assert.equal(status, 200);
    assert.equal(body.user.email, BOB_EMAIL);
    assert.ok(Array.isArray(body.recently_reviewed));
    const reviewed = body.recently_reviewed.find((s: any) => s.id === submissionId);
    assert.ok(reviewed, 'Bob should see the submission in recently_reviewed');
    assert.equal(reviewed.my_review?.decision, 'approve');
  });

  test('Dashboard — GET /api/dashboard?userId=Alice surfaces the seeded activity', async () => {
    const { status, body } = await api(`/api/dashboard?userId=${encodeURIComponent(ALICE_EMAIL)}`);
    assert.equal(status, 200);
    assert.equal(body.user.email, ALICE_EMAIL);
    assert.ok(body.stats.active_projects.value >= 1);
    assert.ok(body.stats.candidates_generated_7d.value >= 1);
    assert.ok(body.stats.validated_candidates.value >= 1);
    assert.ok(Array.isArray(body.projects));
    assert.ok(body.projects.some((p: any) => p.id === projectId));
  });

  test('Layer 6 (retrain) — POST /api/projects/:id/retrain creates a TrainingSnapshot', async () => {
    const before = await prisma.trainingSnapshot.count({ where: { project_id: projectId } });

    const { status, body } = await api(`/api/projects/${projectId}/retrain`, {
      method: 'POST',
      body: JSON.stringify({ scope: 'project', triggeredBy: ALICE_EMAIL }),
    });
    assert.equal(status, 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);

    const after = await prisma.trainingSnapshot.count({ where: { project_id: projectId } });
    assert.equal(after, before + 1, 'a new snapshot row should be created');
  });

  test('Step 4 (iteration cap) — POST /api/discovery returns 409 once max_iterations is reached', async () => {
    // Fast-forward iterations_used to its cap so the next call is the boundary.
    await prisma.project.update({
      where: { id: projectId },
      data: { iterations_used: { set: 3 } },
    });
    const { status, body } = await api('/api/discovery', {
      method: 'POST',
      body: JSON.stringify({ projectId, count: 1 }),
    });
    assert.equal(status, 409, `expected 409, got ${status}: ${JSON.stringify(body)}`);
    assert.match(String(body.error ?? ''), /cap reached/i);
  });
});
