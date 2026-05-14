import { cn } from '../../lib/cn.js'

const tones = {
  cyan: 'bg-cyan-500/10 text-cyan-300 border-cyan-400/25',
  emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/25',
  teal: 'bg-teal-500/10 text-teal-300 border-teal-400/25',
  amber: 'bg-amber-500/10 text-amber-300 border-amber-400/25',
  rose: 'bg-rose-500/10 text-rose-300 border-rose-400/25',
  slate: 'bg-ink-700/60 text-ink-200 border-ink-600/60',
  violet: 'bg-violet-500/10 text-violet-300 border-violet-400/25'
}

const statusToTone = {
  High: 'emerald',
  Medium: 'cyan',
  Low: 'amber',
  Failed: 'rose',
  Active: 'emerald',
  'On hold': 'slate',
  Approved: 'emerald',
  'Pending review': 'amber',
  'Awaiting evidence': 'amber',
  'In review': 'cyan',
  Rejected: 'rose',
  Verified: 'emerald',
  Flagged: 'amber',
  Known: 'slate',
  'AI Generated': 'violet'
}

export default function StatusChip({ children, tone, dot = false, className, ...rest }) {
  const t = tone || statusToTone[children] || 'slate'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide',
        tones[t],
        className
      )}
      {...rest}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', toneDot(t))} />}
      {children}
    </span>
  )
}

function toneDot(t) {
  return {
    cyan: 'bg-cyan-400',
    emerald: 'bg-emerald-400',
    teal: 'bg-teal-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    slate: 'bg-ink-300',
    violet: 'bg-violet-400'
  }[t]
}
