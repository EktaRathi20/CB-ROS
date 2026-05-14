import { Bot, CheckCircle2, FileEdit, FlaskConical, GitBranch, ShieldAlert } from 'lucide-react'
import { cn } from '../../lib/cn.js'

const iconFor = (action) => {
  if (/approved/i.test(action)) return CheckCircle2
  if (/generated/i.test(action)) return Bot
  if (/logged/i.test(action)) return FlaskConical
  if (/retrained/i.test(action)) return GitBranch
  if (/rejected/i.test(action)) return ShieldAlert
  return FileEdit
}

const toneFor = (action) => {
  if (/approved/i.test(action)) return 'emerald'
  if (/generated|retrained/i.test(action)) return 'cyan'
  if (/logged/i.test(action)) return 'teal'
  if (/rejected|failed/i.test(action)) return 'rose'
  return 'slate'
}

const toneBg = {
  emerald: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30',
  cyan: 'bg-cyan-500/15 text-cyan-300 ring-cyan-400/30',
  teal: 'bg-teal-500/15 text-teal-300 ring-teal-400/30',
  rose: 'bg-rose-500/15 text-rose-300 ring-rose-400/30',
  slate: 'bg-ink-700/40 text-ink-200 ring-ink-700/70'
}

export default function AuditTimeline({ events }) {
  return (
    <ol className="relative space-y-3">
      <span className="absolute left-3.5 top-2 bottom-2 w-px bg-ink-700/70" />
      {events.map((e) => {
        const Icon = iconFor(e.action)
        const tone = toneFor(e.action)
        return (
          <li key={e.id} className="relative pl-10">
            <span className={cn('absolute left-0 top-0 grid h-7 w-7 place-items-center rounded-full ring-1', toneBg[tone])}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="surface-raised p-3">
              <div className="flex items-center justify-between gap-2 text-[11px] text-ink-400 font-mono">
                <span>{e.t}</span>
                <span>{e.user}</span>
              </div>
              <div className="mt-1 text-sm text-ink-100">
                <span className="font-medium">{e.action}</span>{' '}
                <span className="text-ink-300">— {e.target}</span>
              </div>
              {e.note && <div className="mt-1 text-[11px] text-ink-300">{e.note}</div>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
