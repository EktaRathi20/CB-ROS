import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Beaker, Bell, BookOpen, FolderKanban, GitBranch, Home } from 'lucide-react'
import { cn } from '../../lib/cn.js'
import { inboxApi } from '../../services/api.js'
import { useAuth } from '../../auth/AuthContext.jsx'

const workspaceItems = [
  { to: '/app',               label: 'Overview',           icon: Home,         end: true },
  { to: '/app/projects',      label: 'Projects',           icon: FolderKanban },
  { to: '/app/library',       label: 'Experiment Library', icon: BookOpen },
  { to: '/app/feedback',      label: 'Feedback',           icon: GitBranch },
  { to: '/app/notifications', label: 'Notifications',      icon: Bell, badge: 'pending' }
]

export default function SidebarNav() {
  const { user } = useAuth()
  const userKey = user?.id || user?.email || ''
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!userKey) {
      setPendingCount(0)
      return
    }
    let cancelled = false
    inboxApi
      .get({ userId: userKey, limit: 1 })
      .then((data) => {
        if (cancelled) return
        const count = data?.stats?.pending_review ?? (data?.pending?.length ?? 0)
        setPendingCount(count)
      })
      .catch(() => {
        if (!cancelled) setPendingCount(0)
      })
    return () => {
      cancelled = true
    }
  }, [userKey])

  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r divider-soft bg-ink-900/60 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-4 py-4 border-b divider-soft">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-teal-500 shadow-[0_0_24px_-4px_rgba(34,211,238,0.6)]">
          <Beaker className="h-4 w-4 text-ink-950" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight text-ink-100">CB-ROS</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        <div>
          <div className="px-2 pb-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-ink-400">
            Workspace
          </div>
          <ul className="space-y-0.5">
            {workspaceItems.map((item) => {
              const showBadge = item.badge === 'pending' && pendingCount > 0
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
                        isActive
                          ? 'bg-cyan-400/10 text-cyan-200 ring-1 ring-cyan-400/25'
                          : 'text-ink-300 hover:bg-ink-800/60 hover:text-ink-100'
                      )
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {showBadge && (
                      <span className="inline-flex items-center justify-center rounded-full bg-amber-400/20 text-amber-200 text-[10px] font-mono font-semibold ring-1 ring-amber-400/40 min-w-[18px] h-[18px] px-1">
                        {pendingCount}
                      </span>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      <div className="border-t divider-soft p-3 text-[10px] font-mono text-ink-400">
        <div className="flex items-center justify-between">
          <span>SOC 2 · Audit-on</span>
          <span>uptime 99.98%</span>
        </div>
      </div>
    </aside>
  )
}
