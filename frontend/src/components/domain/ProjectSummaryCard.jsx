import { ArrowRight, Activity, Beaker, Leaf } from 'lucide-react'
import { Link } from 'react-router-dom'
import StatusChip from '../ui/StatusChip.jsx'
import { cn } from '../../lib/cn.js'
import {
  formatVersion,
  useProjectCandidates,
  useProjectRuns,
  useProjectVersion
} from '../../data/projectStore.jsx'

export default function ProjectSummaryCard({ project }) {
  const projectCandidates = useProjectCandidates(project.id)
  const runs = useProjectRuns(project.id)
  const currentVersion = useProjectVersion(project.id)
  // Prefer API-provided counts when present (server is source of truth);
  // fall back to the local store for legacy / locally-created projects.
  const candidateCount = project.candidatesCount ?? projectCandidates.length
  const validatedCount = project.validatedCount
    ?? projectCandidates.filter((c) => c.status === 'High').length
  const stageLabel = candidateCount === 0 ? 'Discovery' : `${formatVersion(currentVersion)} · ${project.stage}`

  return (
    <Link
      to={`/app/projects/${project.id}`}
      className={cn(
        'surface group relative block overflow-hidden p-4 transition-colors hover:border-cyan-400/30'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-cyan-300/80">
            <Beaker className="h-3 w-3" />
            {stageLabel}
          </div>
          <h4 className="mt-1 text-sm font-semibold text-ink-100 truncate">{project.name}</h4>
          <div className="mt-1 text-[11px] font-mono text-ink-400 truncate">{project.target}</div>
        </div>
        <StatusChip dot>{project.status}</StatusChip>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <Mini label="Candidates" value={candidateCount} />
        <Mini label="Validated" value={validatedCount} />
        <Mini label="Lead" value={project.leadPI || '—'} truncate />
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-ink-300">
          <span>{candidateCount === 0 ? 'No discovery runs yet' : `${runs.length} run${runs.length === 1 ? '' : 's'}`}</span>
          <span className="tabular text-ink-100">{project.progress ?? 0}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full rounded-full bg-ink-800 overflow-hidden">
          <div className="h-full bar-cyan" style={{ width: `${project.progress ?? 0}%` }} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-ink-400">
        <div className="inline-flex items-center gap-1">
          <Leaf className="h-3 w-3 text-emerald-400" />
          {project.sustainability}
        </div>
        <div className="inline-flex items-center gap-1">
          <Activity className="h-3 w-3" />
          {project.lastActivity}
        </div>
      </div>

      <div className="absolute bottom-3 right-3 text-cyan-300 opacity-0 transition-opacity group-hover:opacity-100">
        <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  )
}

function Mini({ label, value, truncate }) {
  return (
    <div className="rounded-md bg-ink-800/70 px-2 py-1.5 ring-1 ring-ink-700/60">
      <div className="text-[10px] uppercase tracking-wider text-ink-400">{label}</div>
      <div className={cn('text-ink-100 tabular', truncate && 'truncate')}>{value}</div>
    </div>
  )
}
