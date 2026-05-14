import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import Button from '../components/ui/Button.jsx'
import ProjectSummaryCard from '../components/domain/ProjectSummaryCard.jsx'
import NewProjectDrawer from '../components/domain/NewProjectDrawer.jsx'
import { mapApiProject, projectApi } from '../services/api.js'
import { useAuth } from '../auth/AuthContext.jsx'

const statusFilters = ['All', 'Active', 'On hold']
const PAGE_SIZE = 20

export default function ProjectsListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [query, setQuery] = useState('')
  const [statusF, setStatusF] = useState('All')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [projects, setProjects] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  const creatorId = user?.id || user?.email || ''

  const fetchPage = useCallback(
    async ({ append = false, nextOffset = 0 } = {}) => {
      // creatorId is required by the API — bail out until we have a user.
      if (!creatorId) return

      const params = {
        creatorId,
        limit: PAGE_SIZE,
        offset: nextOffset
      }
      if (statusF !== 'All') params.status = statusF

      if (append) setLoadingMore(true)
      else setLoading(true)
      setError(null)

      try {
        const data = await projectApi.list(params)
        const list = (data?.projects || []).map(mapApiProject).filter(Boolean)
        setTotal(data?.total ?? list.length)
        setOffset(nextOffset + list.length)
        setProjects((prev) => (append ? [...prev, ...list] : list))
      } catch (err) {
        setError(err?.message || 'Failed to load projects.')
        if (!append) setProjects([])
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [statusF, creatorId]
  )

  // Reset + fetch whenever filters change.
  useEffect(() => {
    fetchPage({ append: false, nextOffset: 0 })
  }, [fetchPage])

  const filtered = projects.filter((p) => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      p.name?.toLowerCase().includes(q) ||
      p.target?.toLowerCase().includes(q)
    )
  })

  const canLoadMore = !loading && projects.length < total

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
            PROJECTS
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Your research portfolio</h1>
          <p className="mt-1 text-sm text-ink-300 max-w-2xl">
            Each project is a self-contained loop — discovery, validation, experiments, and learning.
            Open one to access its candidates and history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={() => fetchPage({ append: false, nextOffset: 0 })}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setDrawerOpen(true)}
          >
            New project
          </Button>
        </div>
      </div>

      <div className="surface flex flex-wrap items-center gap-3 p-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects or reactions…"
            className="w-full rounded-md bg-ink-900/60 pl-9 pr-3 py-2 text-sm text-ink-100 ring-1 ring-inset ring-ink-700/60 placeholder:text-ink-400 outline-none focus:ring-cyan-400/40"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-400">STATUS</span>
          {statusFilters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusF(f)}
              className={
                statusF === f
                  ? 'rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2.5 py-1 text-[11px] text-cyan-200'
                  : 'rounded-full border border-ink-700/70 bg-ink-800/60 px-2.5 py-1 text-[11px] text-ink-200 hover:border-cyan-400/30'
              }
            >
              {f}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[11px] font-mono text-ink-400">
          {loading ? 'Loading…' : `${filtered.length} of ${total}`}
        </span>
      </div>

      {error && (
        <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="surface p-10 text-center text-sm text-ink-300">
          Loading projects…
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface p-10 text-center text-sm text-ink-300">
          {projects.length === 0
            ? 'No projects yet — create one to get started.'
            : 'No projects match these filters.'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((p) => (
              <ProjectSummaryCard key={p.id} project={p} />
            ))}
          </div>

          {canLoadMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchPage({ append: true, nextOffset: offset })}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : `Load more (${total - projects.length} remaining)`}
              </Button>
            </div>
          )}
        </>
      )}

      <NewProjectDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={(project) => {
          setDrawerOpen(false)
          // Refresh the list so the new project shows up from the server.
          fetchPage({ append: false, nextOffset: 0 })
          if (project?.id) navigate(`/app/projects/${project.id}/discovery`)
        }}
      />
    </div>
  )
}
