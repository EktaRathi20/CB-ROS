import { Bot, GitBranch, User } from 'lucide-react'
import { cn } from '../../lib/cn.js'

export default function VersionHistoryPanel({ items }) {
  return (
    <ol className="space-y-2">
      {items.map((v, i) => {
        const Icon = v.kind === 'ai' ? Bot : v.kind === 'human' ? User : GitBranch
        return (
          <li key={v.id} className="surface-raised p-3">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'grid h-7 w-7 place-items-center rounded-md ring-1',
                  v.kind === 'ai' && 'bg-violet-500/10 ring-violet-400/30 text-violet-300',
                  v.kind === 'human' && 'bg-cyan-500/10 ring-cyan-400/30 text-cyan-300',
                  v.kind === 'source' && 'bg-ink-700/40 ring-ink-700/70 text-ink-200'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-ink-100">{v.name}</div>
                  <div className="text-[11px] font-mono text-ink-400">{v.when}</div>
                </div>
                <div className="text-[11px] text-ink-300">by {v.author}</div>
              </div>
            </div>
            {i < items.length - 1 && <div className="mt-3 h-3 w-px bg-ink-700/70 ml-3.5" />}
          </li>
        )
      })}
    </ol>
  )
}
