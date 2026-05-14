import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Beaker, Building2, ChevronRight, Sparkles, Users } from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import StatusChip from '../components/ui/StatusChip.jsx'
import { companyApi, userApi } from '../services/api.js'

const FALLBACK_TONES = ['cyan', 'emerald', 'amber']

function deriveInitials(name = '') {
  const cleaned = name.replace(/^Dr\.?\s+/i, '').trim()
  const parts = cleaned.split(/[\s.]+/).filter(Boolean)
  if (!parts.length) return '··'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function decorateUser(u, idx, company) {
  return {
    ...u,
    initials: deriveInitials(u.name),
    tone: FALLBACK_TONES[idx % FALLBACK_TONES.length],
    company: u.company || company || null,
    org: u.company?.name || company?.name || 'Workspace'
  }
}

export default function SignInPage() {
  const { signInAs } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/app'

  // Two-step: pick a company, then a user from that company.
  const [selectedCompany, setSelectedCompany] = useState(null)

  // Step 1 state
  const [companies, setCompanies] = useState([])
  const [companiesLoading, setCompaniesLoading] = useState(true)
  const [companiesError, setCompaniesError] = useState(null)

  // Step 2 state
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState(null)

  // Load companies on mount.
  useEffect(() => {
    let cancelled = false
    setCompaniesLoading(true)
    companyApi
      .list()
      .then((data) => {
        if (cancelled) return
        setCompanies(Array.isArray(data) ? data : [])
        setCompaniesError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setCompaniesError(err?.message || 'Could not load companies.')
      })
      .finally(() => {
        if (!cancelled) setCompaniesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Load users whenever a company is picked.
  useEffect(() => {
    if (!selectedCompany) {
      setUsers([])
      setUsersError(null)
      return
    }
    let cancelled = false
    setUsersLoading(true)
    setUsersError(null)
    userApi
      .list({ companyId: selectedCompany.id })
      .then((data) => {
        if (cancelled) return
        const decorated = (Array.isArray(data) ? data : []).map((u, i) =>
          decorateUser(u, i, selectedCompany)
        )
        setUsers(decorated)
      })
      .catch((err) => {
        if (cancelled) return
        setUsersError(err?.message || 'Could not load users for this company.')
        setUsers([])
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedCompany])

  const pickCompany = (c) => setSelectedCompany(c)
  const backToCompanies = () => setSelectedCompany(null)

  const pickUser = (u) => {
    signInAs(u)
    navigate(from, { replace: true })
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-radial-glow" />
      <div className="grid-overlay pointer-events-none absolute inset-0 opacity-50" />

      <div className="relative mx-auto max-w-6xl px-6 py-8">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-teal-500 shadow-[0_0_24px_-6px_rgba(34,211,238,0.6)]">
            <Beaker className="h-4 w-4 text-ink-950" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">CB-ROS</div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-400">
              Catalyst & Bio Research OS
            </div>
          </div>
        </Link>
      </div>

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 px-6 pb-12">
        {/* Left: pitch */}
        <div className="hidden lg:flex flex-col justify-center">
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
            SIGN IN
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight leading-tight">
            Step into the workspace.
          </h1>
          <p className="mt-3 text-ink-300 leading-relaxed max-w-md">
            Sign in to access the full CB-ROS workspace — discovery, validation,
            visualization, experiments, and the feedback learning loop.
          </p>

          <div className="mt-8 surface relative overflow-hidden p-4 max-w-md">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
              <Sparkles className="h-3 w-3" />
              HOW IT WORKS
            </div>
            <ol className="mt-2 space-y-2 text-sm text-ink-200">
              <li className="flex items-start gap-2">
                <Step n={1} active={!selectedCompany} done={!!selectedCompany} />
                Pick your company from the workspace list.
              </li>
              <li className="flex items-start gap-2">
                <Step n={2} active={!!selectedCompany} done={false} />
                Pick your account from that company's users.
              </li>
            </ol>
          </div>
        </div>

        {/* Right: company → user picker */}
        <div className="flex flex-col justify-center">
          <div className="surface p-6">
            {selectedCompany ? (
              <UserStep
                company={selectedCompany}
                users={users}
                loading={usersLoading}
                error={usersError}
                onPick={pickUser}
                onBack={backToCompanies}
              />
            ) : (
              <CompanyStep
                companies={companies}
                loading={companiesLoading}
                error={companiesError}
                onPick={pickCompany}
              />
            )}
          </div>

          <div className="mt-4 text-center text-[11px] text-ink-400">
            <Link to="/" className="hover:text-cyan-300">← Back to home</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function CompanyStep({ companies, loading, error, onPick }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-ink-100">Pick a company</h2>
          <p className="mt-1 text-sm text-ink-300">
            Choose the workspace you belong to.
          </p>
        </div>
        <StatusChip dot tone="cyan">Step 1 of 2</StatusChip>
      </div>

      {loading && (
        <div className="mt-5 rounded-md border border-ink-700/60 bg-ink-900/50 px-3 py-3 text-[12px] text-ink-300">
          Loading companies…
        </div>
      )}

      {error && !loading && (
        <div className="mt-5 rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
          {error}
        </div>
      )}

      {!loading && !error && companies.length === 0 && (
        <div className="mt-5 rounded-md border border-ink-700/60 bg-ink-900/50 px-3 py-4 text-center text-[12px] text-ink-300">
          No companies available.
        </div>
      )}

      {!loading && !error && companies.length > 0 && (
        <ul className="mt-5 space-y-2">
          {companies.map((c) => {
            const userCount = c?._count?.users ?? 0
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onPick(c)}
                  className="group flex w-full items-center gap-3 rounded-md border border-ink-700/60 bg-ink-900/50 px-3 py-2.5 text-left transition-colors hover:border-cyan-400/30 hover:bg-ink-800/60"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-cyan-500/15 ring-1 ring-cyan-400/30 text-cyan-200">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-ink-100 truncate">{c.name}</div>
                    <div className="text-[11px] text-ink-400 font-mono truncate">
                      {c.slug} · {userCount} user{userCount === 1 ? '' : 's'}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ink-400 group-hover:text-cyan-300" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

function UserStep({ company, users, loading, error, onPick, onBack }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-[12px] text-cyan-300 hover:text-cyan-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Companies
        </button>
        <StatusChip dot tone="cyan">Step 2 of 2</StatusChip>
      </div>
      <div className="mt-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-cyan-500/15 ring-1 ring-cyan-400/30 text-cyan-200">
            <Building2 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink-100 truncate">{company.name}</h2>
            <div className="text-[11px] text-ink-400 font-mono truncate">{company.slug}</div>
          </div>
        </div>
        <p className="mt-3 text-sm text-ink-300">
          Pick your account to continue.
        </p>
      </div>

      {loading && (
        <div className="mt-5 rounded-md border border-ink-700/60 bg-ink-900/50 px-3 py-3 text-[12px] text-ink-300">
          Loading users…
        </div>
      )}

      {error && !loading && (
        <div className="mt-5 rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
          {error}
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <div className="mt-5 rounded-md border border-ink-700/60 bg-ink-900/50 px-3 py-4 text-center text-[12px] text-ink-300 flex flex-col items-center gap-2">
          <Users className="h-5 w-5 text-ink-400" />
          No users in this company.
        </div>
      )}

      {!loading && !error && users.length > 0 && (
        <ul className="mt-5 space-y-2">
          {users.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => onPick(u)}
                className="group flex w-full items-center gap-3 rounded-md border border-ink-700/60 bg-ink-900/50 px-3 py-2.5 text-left transition-colors hover:border-cyan-400/30 hover:bg-ink-800/60"
              >
                <Avatar initials={u.initials} tone={u.tone} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink-100 truncate">{u.name}</div>
                  <div className="text-[11px] text-ink-400 font-mono truncate">
                    {u.email}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-ink-400 group-hover:text-cyan-300" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function Step({ n, active, done }) {
  return (
    <span
      className={
        'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-mono font-semibold ring-1 ' +
        (done
          ? 'bg-emerald-400/15 text-emerald-200 ring-emerald-400/30'
          : active
          ? 'bg-cyan-400/15 text-cyan-200 ring-cyan-400/40'
          : 'bg-ink-800 text-ink-400 ring-ink-700/60')
      }
    >
      {n}
    </span>
  )
}
