import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '../../lib/cn.js'

const accentMap = {
  cyan: 'from-cyan-400/20 to-cyan-400/0 text-cyan-300',
  emerald: 'from-emerald-400/20 to-emerald-400/0 text-emerald-300',
  teal: 'from-teal-400/20 to-teal-400/0 text-teal-300',
  amber: 'from-amber-400/20 to-amber-400/0 text-amber-300',
  rose: 'from-rose-400/20 to-rose-400/0 text-rose-300'
}

export default function MetricCard({ label, value, delta, accent = 'cyan', icon: Icon, hint, className }) {
  const isUp = typeof delta === 'string' && (delta.startsWith('+') || delta.startsWith('▲'))
  const isDown = typeof delta === 'string' && (delta.startsWith('−') || delta.startsWith('-') || delta.startsWith('▼'))
  return (
    <div className={cn('surface relative overflow-hidden p-4', className)}>
      <div
        className={cn(
          'pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-50 blur-2xl',
          accentMap[accent]
        )}
      />
      <div className="flex items-start justify-between">
        <div className="text-[11px] uppercase tracking-[0.14em] text-ink-300">{label}</div>
        {Icon && (
          <span className="grid h-7 w-7 place-items-center rounded-md bg-ink-800 ring-1 ring-ink-700/60">
            <Icon className={cn('h-3.5 w-3.5', accentMap[accent].split(' ').pop())} />
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end justify-between">
        <div className="text-2xl font-semibold tracking-tight text-ink-100 tabular">{value}</div>
        {delta && (
          <div
            className={cn(
              'inline-flex items-center gap-0.5 text-[11px] tabular',
              isUp && 'text-emerald-300',
              isDown && 'text-rose-300',
              !isUp && !isDown && 'text-ink-300'
            )}
          >
            {isUp && <ArrowUpRight className="h-3 w-3" />}
            {isDown && <ArrowDownRight className="h-3 w-3" />}
            {delta}
          </div>
        )}
      </div>
      {hint && <div className="mt-1 text-[11px] text-ink-400">{hint}</div>}
    </div>
  )
}
