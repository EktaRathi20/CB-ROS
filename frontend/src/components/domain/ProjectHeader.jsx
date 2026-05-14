import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  Atom,
  FlaskConical,
  GitBranch,
  Home,
  Leaf,
  Microscope,
  Pencil,
  ShieldCheck,
  Workflow
} from 'lucide-react'
import {
  formatVersion,
  useProjects,
  useProjectStore
} from '../../data/projectStore.jsx'
import { projectIdFromPath } from '../../data/workflow.js'
import { cn } from '../../lib/cn.js'
import StatusChip from '../ui/StatusChip.jsx'
import EditProjectDrawer from './EditProjectDrawer.jsx'
import { mapApiProject, projectApi } from '../../services/api.js'

const steps = [
  { segment: 'discovery',  n: 1, label: 'Discovery',  icon: Atom },
  { segment: 'candidates', n: 2, label: 'Candidates', icon: ShieldCheck },
  { segment: 'visualize',  n: 3, label: 'Visualize',  icon: Microscope }
]

const subNav = [
  { segment: '',            label: 'Project home',   icon: Home },
  { segment: 'experiments', label: 'Experiments',    icon: FlaskConical },
  { segment: 'audit',       label: 'Review & audit', icon: Workflow }
]

export default function ProjectHeader() {
  const { pathname } = useLocation()
  const projects = useProjects()
  const { projectData } = useProjectStore()
  const [editOpen, setEditOpen] = useState(false)
  const projectId = projectIdFromPath(pathname)

  // Try the local store first (legacy / locally-created projects). For API
  // projects we fetch on demand so the header still renders the multi-step nav.
  const localProject = projectId
    ? projects.find((p) => p.id === projectId)
    : null
  const [apiProject, setApiProject] = useState(null)

  useEffect(() => {
    if (!projectId || localProject) {
      setApiProject(null)
      return
    }
    let cancelled = false
    projectApi
      .get(projectId)
      .then((data) => {
        if (!cancelled) setApiProject(mapApiProject(data))
      })
      .catch(() => {
        if (!cancelled) setApiProject(null)
      })
    return () => {
      cancelled = true
    }
  }, [projectId, localProject])

  if (!projectId) return null
  const project = localProject || apiProject
  if (!project) return null

  const visualizeId = projectData[projectId]?.visualizeId ?? null
  // Local store wins for currentVersion when present (it tracks live edits /
  // discovery runs); otherwise derive from the API project's version_major.
  const currentVersion =
    projectData[projectId]?.currentVersion
    ?? (project.versionMajor
      ? { major: project.versionMajor, minor: 0 }
      : { major: 1, minor: 0 })

  const segMatch = pathname.match(/^\/app\/projects\/[^/]+\/([^/]+)/)
  const currentSeg = segMatch?.[1] ?? ''
  const stepIdx = steps.findIndex((s) => s.segment === currentSeg)
  const inWorkflow = stepIdx >= 0

  return (
    <div className="border-b divider-soft bg-ink-950/70 backdrop-blur-xl">
      <div className="pointer-events-none absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

      {/* Project context line */}
      <div className="mx-auto w-full max-w-[1500px] px-3 sm:px-6 lg:px-8 pt-3 pb-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Link
            to="/app/projects"
            className="inline-flex items-center gap-1 text-[11px] text-ink-300 hover:text-cyan-300"
          >
            <ArrowLeft className="h-3 w-3" /> All projects
          </Link>
          <span className="text-ink-700">·</span>
          <span className="text-sm font-semibold text-ink-100 truncate max-w-[40ch]">
            {project.name}
          </span>
          <span className="text-[12px] font-mono text-ink-300 truncate max-w-[40ch]">
            {project.target}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <StatusChip tone="cyan">
              <GitBranch className="h-3 w-3" />
              <span className="ml-1 font-mono">{formatVersion(currentVersion)}</span>
            </StatusChip>
            <StatusChip dot>{project.status}</StatusChip>
            {project.sustainability && (
              <StatusChip tone="emerald">
                <Leaf className="h-3 w-3" />
                <span className="ml-1">{project.sustainability}</span>
              </StatusChip>
            )}
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1 rounded-md border border-ink-700/60 bg-ink-900/40 px-2 py-1 text-[11px] text-ink-200 hover:border-cyan-400/30 hover:text-cyan-200"
              title="Edit project (bumps major version)"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Multi-step (workflow) */}
      <div className="border-t divider-soft">
        <div className="mx-auto w-full max-w-[1500px] px-3 sm:px-6 lg:px-8 py-2.5">
          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80 shrink-0">
              WORKFLOW
            </span>
            <ol className="flex items-center gap-1 overflow-x-auto">
              {steps.map((s, i) => {
                const Icon = s.icon
                const to = `/app/projects/${projectId}/${s.segment}`
                const isActive = inWorkflow && stepIdx === i
                const isPast = inWorkflow && i < stepIdx
                const isDisabled = s.segment === 'visualize' && !visualizeId
                const status = isDisabled
                  ? 'disabled'
                  : isActive
                  ? 'active'
                  : isPast
                  ? 'past'
                  : 'future'

                const content = (
                  <>
                    <span
                      className={cn(
                        'grid h-4 w-4 place-items-center rounded-full text-[9px] font-mono font-semibold shrink-0',
                        status === 'active' && 'bg-cyan-400/20 text-cyan-200 ring-1 ring-cyan-400/40',
                        status === 'past' && 'bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-400/30',
                        status === 'future' && 'bg-ink-800 text-ink-400 ring-1 ring-ink-700',
                        status === 'disabled' && 'bg-ink-800 text-ink-500 ring-1 ring-ink-700/60'
                      )}
                    >
                      {s.n}
                    </span>
                    <Icon className="h-3 w-3 shrink-0" />
                    <span className="text-[11px] font-medium">{s.label}</span>
                    {isActive && status !== 'disabled' && (
                      <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulseSoft shrink-0" />
                    )}
                  </>
                )

                const className = cn(
                  'group inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 transition-all',
                  status === 'active' &&
                    'border-cyan-400/40 bg-cyan-400/10 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]',
                  status === 'past' &&
                    'border-emerald-400/25 bg-emerald-400/5 text-emerald-200 hover:bg-emerald-400/10',
                  status === 'future' &&
                    'border-ink-700/60 bg-ink-900/40 text-ink-300 hover:border-cyan-400/25 hover:text-cyan-200',
                  status === 'disabled' &&
                    'border-ink-700/40 bg-ink-900/30 text-ink-500 cursor-not-allowed opacity-60'
                )

                return (
                  <li key={s.segment} className="flex items-center gap-1 shrink-0">
                    {status === 'disabled' ? (
                      <span
                        className={className}
                        title="Pick a candidate from the Candidates tab to enable visualization"
                        aria-disabled="true"
                      >
                        {content}
                      </span>
                    ) : (
                      <Link to={to} className={className}>
                        {content}
                      </Link>
                    )}
                    {i < steps.length - 1 && (
                      <Connector flowing={status === 'past' || status === 'active'} />
                    )}
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      </div>

      {/* Sub-nav tabs */}
      <div className="border-t divider-soft">
        <div className="mx-auto w-full max-w-[1500px] px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 overflow-x-auto">
            {subNav.map((item) => {
              const Icon = item.icon
              const to = item.segment
                ? `/app/projects/${projectId}/${item.segment}`
                : `/app/projects/${projectId}`
              const isActive = currentSeg === item.segment
              return (
                <Link
                  key={item.segment || 'home'}
                  to={to}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-2.5 text-[12px] border-b-2 transition-colors whitespace-nowrap',
                    isActive
                      ? 'border-cyan-400 text-cyan-200'
                      : 'border-transparent text-ink-300 hover:text-cyan-200'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      <EditProjectDrawer
        open={editOpen}
        project={project}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => {
          // Reflect the server's response in the header immediately so chips
          // and the project name update without a page reload.
          if (updated && !localProject) setApiProject(updated)
          setEditOpen(false)
        }}
      />
    </div>
  )
}

function Connector({ flowing }) {
  return (
    <span className="relative inline-flex h-px w-3 items-center shrink-0">
      <span
        className={cn(
          'absolute inset-x-0 top-1/2 -translate-y-1/2 h-px',
          flowing ? 'bg-emerald-400/60' : 'bg-ink-700'
        )}
      />
      <span
        className={cn(
          'absolute right-0 top-1/2 -translate-y-1/2 h-1 w-1 rotate-45 border-t border-r',
          flowing ? 'border-emerald-400/60' : 'border-ink-600'
        )}
      />
    </span>
  )
}
