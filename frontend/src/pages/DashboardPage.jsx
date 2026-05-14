import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  Beaker,
  ChevronRight,
  Cpu,
  ExternalLink,
  FlaskConical,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Workflow
} from 'lucide-react'
import MetricCard from '../components/ui/MetricCard.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import StatusChip from '../components/ui/StatusChip.jsx'
import Button from '../components/ui/Button.jsx'
import ProjectSummaryCard from '../components/domain/ProjectSummaryCard.jsx'
import { dashboardApi } from '../services/api.js'
import { useAuth } from '../auth/AuthContext.jsx'

// Order of stat tiles. Each entry maps an API key to its display label,
// icon, accent, and (optionally) a unit suffix override.
const STAT_TILES = [
  { key: 'active_projects',         label: 'Active projects',          icon: Beaker,      accent: 'cyan' },
  { key: 'reactions_in_queue',      label: 'Reactions in queue',       icon: Workflow,    accent: 'cyan' },
  { key: 'candidates_generated_7d', label: 'Candidates generated (7d)', icon: Sparkles,    accent: 'emerald' },
  { key: 'validated_candidates',    label: 'Validated candidates',     icon: ShieldCheck, accent: 'emerald' },
  { key: 'pending_review_tasks',    label: 'Pending review tasks',     icon: FlaskConical, accent: 'amber' },
  { key: 'avg_model_confidence',    label: 'Avg. model confidence',    icon: Cpu,         accent: 'teal' }
]

export default function DashboardPage() {
  const { user } = useAuth()
  const userKey = user?.id || user?.email || ''
  const greetingName = user?.name || 'there'

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDashboard = useCallback(() => {
    if (!userKey) return
    setLoading(true)
    setError(null)
    dashboardApi
      .get({ userId: userKey, projectsLimit: 6, pendingLimit: 5 })
      .then((res) => setData(res || null))
      .catch((err) => {
        setError(err?.message || 'Failed to load dashboard.')
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [userKey])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const stats = data?.stats || {}
  const projects = (data?.projects || []).map(mapDashboardProject).filter(Boolean)
  const pending = data?.pending_reviews || []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
            OVERVIEW
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Hello, {greetingName}.
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={fetchDashboard}
            disabled={loading}
          >
            Refresh
          </Button>
          <Link to="/app/projects">
            <Button variant="primary" size="sm" iconRight={ChevronRight}>
              Open a project
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
          {error}
        </div>
      )}

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {STAT_TILES.map((s) => {
          const stat = stats[s.key]
          return (
            <MetricCard
              key={s.key}
              label={s.label}
              value={loading && !stat ? '…' : formatValue(stat?.value, stat?.unit)}
              delta={formatDelta(stat?.delta, stat?.unit)}
              accent={s.accent}
              icon={s.icon}
            />
          )
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Projects */}
        <div className="xl:col-span-2 space-y-4">
          <SectionHeading
            kicker="ACTIVE PROJECTS"
            title="Your research portfolio"
            right={
              <Link to="/app/projects" className="text-xs text-cyan-300 hover:underline">
                view all
              </Link>
            }
          />
          {loading && projects.length === 0 ? (
            <div className="surface p-10 text-center text-sm text-ink-300">
              Loading projects…
            </div>
          ) : projects.length === 0 ? (
            <div className="surface p-10 text-center text-sm text-ink-300">
              No projects yet — head to the Projects tab to create one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {projects.map((p) => (
                <ProjectSummaryCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </div>

        {/* Pending review */}
        <div className="space-y-4">
          <SectionHeading
            kicker="PENDING REVIEW"
            title="Awaiting your sign-off"
            right={
              <Link to="/app/notifications" className="text-xs text-cyan-300 hover:underline">
                inbox
              </Link>
            }
          />
          <div className="surface divide-y divider-soft">
            {loading && pending.length === 0 ? (
              <div className="px-4 py-6 text-sm text-ink-300">Loading…</div>
            ) : pending.length === 0 ? (
              <div className="px-4 py-6 text-sm text-ink-300">
                Inbox zero. Nothing waiting on you right now.
              </div>
            ) : (
              pending.map((r) => <PendingRow key={r.submission_id} item={r} />)
            )}
            <div className="px-5 py-4">
              <Link
                to="/app/notifications"
                className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:underline"
              >
                Open the inbox <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PendingRow({ item }) {
  const submitter = item.submitted_by?.name || 'Unknown'
  const projectName = item.project?.name || ''
  const projectId = item.project?.id
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-ink-100 truncate">
          {item.formula || 'Submission'}
        </div>
        <div className="mt-0.5 text-[11px] text-ink-400 font-mono truncate">
          {submitter}
          {projectName && (
            <>
              {' · '}
              {projectId ? (
                <Link
                  to={`/app/projects/${projectId}/audit`}
                  className="inline-flex items-center gap-0.5 text-cyan-300 hover:underline"
                >
                  {projectName}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : (
                projectName
              )}
            </>
          )}
          {item.submitted_at && <span> · {timeAgo(item.submitted_at)}</span>}
        </div>
      </div>
      <StatusChip dot tone="amber">{item.status || 'pending'}</StatusChip>
    </div>
  )
}

// ----- helpers ------------------------------------------------------------

function mapDashboardProject(p) {
  if (!p) return null
  return {
    id: p.id,
    name: p.name,
    target: `${p.reactants ?? ''} → ${p.products ?? ''}`.trim(),
    reactants: p.reactants || '',
    products: p.products || '',
    status: p.status || 'Active',
    stage: titleCase(p.stage) || 'Discovery',
    progress: typeof p.progress_pct === 'number' ? p.progress_pct : 0,
    candidatesCount: p.candidates_count ?? 0,
    validatedCount: p.validated_count ?? 0,
    iterationsUsed: p.iterations_used ?? 0,
    maxIterations: p.max_iterations ?? null,
    leadPI: p.lead?.name || '',
    sustainability: p.sustainability_tag || 'Untagged',
    versionLabel: p.version || null,
    lastActivity: timeAgo(p.last_activity_at) || '—'
  }
}

function formatValue(value, unit) {
  if (value == null) return '—'
  const str = typeof value === 'number' ? value.toLocaleString() : String(value)
  return unit ? `${str}${unit}` : str
}

function formatDelta(delta, unit) {
  if (delta == null) return null
  if (typeof delta !== 'number') return String(delta)
  if (delta === 0) return '0'
  const sign = delta > 0 ? '+' : '−'
  const abs = Math.abs(delta)
  return `${sign}${abs}${unit || ''}`
}

function titleCase(s) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function timeAgo(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
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
