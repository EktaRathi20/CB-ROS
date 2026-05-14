import { useEffect, useRef, useState } from 'react'
import { Building2, ChevronDown, LogOut, Mail } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../ui/Avatar.jsx'
import { useAuth } from '../../auth/AuthContext.jsx'

export default function TopHeader() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const handleSignOut = () => {
    signOut()
    navigate('/signin', { replace: true })
  }

  const workspaceName = user?.company?.name || user?.org || 'Workspace'

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-3 border-b divider-soft bg-ink-950/70 px-3 sm:px-5 backdrop-blur-xl">
      {user && (
        <div className="hidden md:flex items-center gap-2 rounded-md bg-ink-800/70 px-2 py-1 ring-1 ring-ink-700/60 text-xs">
          <Building2 className="h-3.5 w-3.5 text-cyan-300" />
          <span className="text-ink-300">Workspace</span>
          <span className="text-ink-100 font-medium truncate max-w-[18ch]">{workspaceName}</span>
        </div>
      )}

      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md bg-ink-800/60 px-2 py-1 ring-1 ring-ink-700/60 hover:ring-cyan-400/30"
        >
          <Avatar initials={user?.initials || '·'} online tone={user?.tone || 'cyan'} size="xs" />
          <div className="hidden lg:block leading-tight text-left">
            <div className="text-xs text-ink-100 font-medium">{user?.name || 'Guest'}</div>
            <div className="text-[10px] text-ink-400 font-mono truncate max-w-[18ch]">
              {user ? workspaceName : 'not signed in'}
            </div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-ink-300" />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-64 surface-raised border border-ink-700/60 shadow-panel z-40">
            <div className="px-3 py-3 border-b divider-soft">
              <div className="flex items-center gap-2">
                <Avatar initials={user?.initials || '·'} online tone={user?.tone || 'cyan'} size="sm" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink-100 truncate">{user?.name}</div>
                  <div className="text-[11px] text-ink-400 truncate">{workspaceName}</div>
                </div>
              </div>
              {user?.email && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono text-ink-300">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{user.email}</span>
                </div>
              )}
              {user?.company?.slug && (
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-400">
                  <Building2 className="h-3 w-3" />
                  <span className="truncate font-mono">{user.company.slug}</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-rose-300 hover:bg-rose-500/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
