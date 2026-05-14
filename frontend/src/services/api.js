import { httpService } from './http.js'

export const userApi = {
  list: (params = {}) => {
    const query = {}
    if (params.companyId) query.companyId = params.companyId
    return httpService.get('/users', { params: query })
  }
}

export const companyApi = {
  list: () => httpService.get('/companies')
}

export const inboxApi = {
  get: (params = {}) => {
    const query = {}
    if (params.userId) query.userId = params.userId
    if (params.limit != null) query.limit = params.limit
    return httpService.get('/inbox', { params: query })
  }
}

export const dashboardApi = {
  get: (params = {}) => {
    const query = {}
    if (params.userId) query.userId = params.userId
    if (params.projectsLimit != null) query.projectsLimit = params.projectsLimit
    if (params.pendingLimit != null) query.pendingLimit = params.pendingLimit
    return httpService.get('/dashboard', { params: query })
  }
}

export const projectApi = {
  create: (payload) => httpService.post('/projects', payload),
  list: (params = {}) => {
    const query = {}
    if (params.creatorId) query.creatorId = params.creatorId
    if (params.status) query.status = params.status
    if (params.limit != null) query.limit = params.limit
    if (params.offset != null) query.offset = params.offset
    return httpService.get('/projects', { params: query })
  },
  get: (id) => httpService.get(`/projects/${id}`),
  getAudit: (id) => httpService.get(`/projects/${id}/audit`),
  update: (id, payload) => httpService.patch(`/projects/${id}`, payload),
  retrain: (id, payload) => httpService.post(`/projects/${id}/retrain`, payload)
}

export const candidateApi = {
  listForProject: (projectId) =>
    httpService.get(`/projects/${projectId}/candidates`),
  create: (projectId, payload) =>
    httpService.post(`/projects/${projectId}/candidates`, payload)
}

export const experimentApi = {
  list: (params = {}) => {
    const query = {}
    if (params.status) query.status = params.status
    if (params.submittedBy) query.submittedBy = params.submittedBy
    if (params.projectId) query.projectId = params.projectId
    if (params.limit != null) query.limit = params.limit
    if (params.offset != null) query.offset = params.offset
    return httpService.get('/experiments', { params: query })
  },
  create: (payload) => httpService.post('/experiments', payload),
  addReview: (id, payload) =>
    httpService.post(`/experiments/${id}/reviews`, payload)
}

function deriveInitials(name = '') {
  const cleaned = name.replace(/^Dr\.?\s+/i, '').trim()
  const parts = cleaned.split(/[\s.]+/).filter(Boolean)
  if (!parts.length) return '··'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function pct(score) {
  if (score == null || Number.isNaN(Number(score))) return null
  const n = Number(score)
  // Scores from the API are 0..1 — display as 0..100 in the UI.
  return Math.round(n * 100)
}

export function mapApiSubmission(s) {
  if (!s) return null
  const candidate = s.candidate || {}
  const submitter = s.submitted_by || {}
  const projectId = candidate.project?.id || null
  const projectName = candidate.project?.name || ''
  const formula = candidate.formula || ''
  const predictedPct = pct(s.predicted_score ?? candidate.predicted_score)
  const actualPct = pct(s.actual_score)

  const summary = formula
    ? `${formula} — predicted ${predictedPct ?? '—'}% / actual ${actualPct ?? '—'}%`
    : `Experiment ${s.id?.slice(0, 8) || ''}`

  return {
    id: s.id,
    runId: `EX-${(s.id || '').slice(0, 8).toUpperCase()}`,
    projectId,
    projectName,
    candidateId: s.candidate_id || candidate.id || null,
    candidateName: formula,
    candidateFormula: formula,
    summary,
    notes: s.observations || '',
    outcome: s.outcome || '',
    predictedScore: s.predicted_score ?? null,
    actualScore: s.actual_score ?? null,
    metrics: {
      yield: actualPct,
      selectivity: predictedPct,
      stability: pct(candidate.stability)
    },
    candidateMeta: {
      activityScore: candidate.activity_score ?? null,
      activationEnergy: candidate.activation_energy ?? null,
      operatingTemp: candidate.operating_temp || '',
      operatingPressure: candidate.operating_pressure || ''
    },
    submittedBy: {
      id: submitter.id || s.submitted_by_id || '',
      name: submitter.name || 'Unknown',
      email: submitter.email || '',
      role: submitter.role || '',
      initials: deriveInitials(submitter.name || '')
    },
    submittedAt: s.created_at || null,
    status: normalizeSubmissionStatus(s.status),
    reviews: Array.isArray(s.reviews) ? s.reviews.map(mapApiReview).filter(Boolean) : [],
    reviewCount:
      s._count?.reviews
      ?? (Array.isArray(s.reviews) ? s.reviews.length : 0)
  }
}

// API uses snake_case; the UI filter set uses dash-case. Normalize both
// styles to the dash form so filters match either spelling.
function normalizeSubmissionStatus(raw) {
  const v = (raw || 'pending').toString().toLowerCase().replace(/_/g, '-')
  return v
}

// Map an API review (as embedded in the audit response or per-submission
// fetch) to the shape consumed by SubmissionCard's ReviewItem renderer.
export function mapApiReview(r) {
  if (!r) return null
  const reviewer = r.reviewer || {}
  const apiDecision = (r.decision || '').toLowerCase()
  // API uses 'request_changes'; the UI uses the short 'changes' form.
  const decision =
    apiDecision === 'request_changes' || apiDecision === 'changes_requested'
      ? 'changes'
      : apiDecision
  return {
    id: r.id,
    reviewerId: r.reviewer_id || reviewer.id || '',
    reviewerName: reviewer.name || 'Reviewer',
    reviewerInitials: deriveInitials(reviewer.name || ''),
    decision,
    comment: r.comment || '',
    reviewedAt: r.created_at || null
  }
}

// Adapt the API project shape to the one consumed by the existing UI
// components (ProjectSummaryCard, project store hooks, etc.).
export function mapApiProject(p) {
  if (!p) return null
  return {
    id: p.id,
    name: p.name,
    target: p.reaction_input || `${p.reactants ?? ''} → ${p.products ?? ''}`,
    reactants: p.reactants || '',
    products: p.products || '',
    temperature: p.temp || p.conditions?.temp || '',
    pressure: p.pressure || p.conditions?.pressure || '',
    catalysisType: p.catalysis_type || '',
    status: p.status || 'Active',
    stage: 'Discovery',
    progress: p.max_iterations
      ? Math.min(100, Math.round(((p.iterations_used || 0) / p.max_iterations) * 100))
      : 0,
    candidatesCount: p._count?.candidates ?? 0,
    failureInsightsCount: p._count?.failure_insights ?? 0,
    iterationsUsed: p.iterations_used ?? 0,
    maxIterations: p.max_iterations ?? null,
    leadPI: p.creator?.name || '',
    creator: p.creator || null,
    creatorId: p.creator_id || p.creator?.id || '',
    sustainability: p.sustainability_tag || 'Untagged',
    notes: p.notes || '',
    createdAt: p.created_at || null,
    lastActivity: formatRelative(p.last_run_at || p.created_at),
    versionLabel: p.version || (p.version_major ? `V${p.version_major}.0` : null),
    versionMajor: p.version_major ?? null,
    lastRunAt: p.last_run_at || null
  }
}

function formatRelative(iso) {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const diff = Date.now() - then
  const min = Math.round(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day}d ago`
  return new Date(iso).toLocaleDateString()
}

// Map a single API candidate to the shape consumed by PredictionTable /
// ComparisonDrawer. The table key fields are: rank, name, formula, type,
// activity, selectivity, stability, activationEnergy, uncertainty, status,
// version. Anything else here is for downstream pages.
export function mapApiCandidate(c, index = 0) {
  if (!c) return null
  const predicted = clamp01(c.predicted_score)
  const confidence = clamp01(c.confidence)
  const stability = clamp01(c.stability)
  const activity = clamp01(c.activity_score)
  const iter = Number.isFinite(c.iteration_number) ? c.iteration_number : 0
  const sourceLower = (c.source || '').toLowerCase()
  const isManual = sourceLower === 'manual' || sourceLower === 'user'
  const isAi = sourceLower === 'llm' || sourceLower === 'ai' || sourceLower === 'gen'
  const type = isManual ? 'User-defined' : isAi ? 'AI Generated' : 'Known'

  return {
    id: c.id,
    name: c.formula || `Candidate ${(c.id || '').slice(0, 6)}`,
    formula: c.formula || '—',
    type,
    rank: index + 1,
    activity,
    // API has no separate selectivity field; the model's predicted_score is
    // the closest stand-in until that's exposed.
    selectivity: predicted,
    stability,
    activationEnergy: c.activation_energy ?? 0,
    uncertainty: 1 - confidence,
    status: scoreToStatus(predicted),
    version: { major: 1, minor: iter },
    addedBy: isManual ? 'user' : 'system',
    operatingTemp: c.operating_temp || '',
    operatingPressure: c.operating_pressure || '',
    source: c.source || '',
    reasoning: c.metadata?.reasoning || '',
    createdAt: c.created_at || null,
    iterationNumber: iter,
    predictedScore: predicted,
    confidence
  }
}

function clamp01(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 1) return Math.min(1, n / 100) // tolerate 0..100 inputs
  return n
}

function scoreToStatus(score) {
  if (score >= 0.8) return 'High'
  if (score >= 0.5) return 'Medium'
  if (score > 0) return 'Low'
  return 'Failed'
}

export default {
  user: userApi,
  project: projectApi,
  candidate: candidateApi,
  experiment: experimentApi
}
