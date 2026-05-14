import { cn } from '../../lib/cn.js'

export default function ScientificStatCard({ label, value, unit, sub, accent = 'cyan', className }) {
  return (
    <div className={cn('surface p-4', className)}>
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] uppercase tracking-[0.15em] text-ink-400 font-mono">{label}</div>
        <div className={cn('h-1.5 w-1.5 rounded-full',
          accent === 'cyan' && 'bg-cyan-400',
          accent === 'emerald' && 'bg-emerald-400',
          accent === 'amber' && 'bg-amber-400',
          accent === 'rose' && 'bg-rose-400',
          accent === 'teal' && 'bg-teal-400'
        )} />
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <div className="text-xl font-semibold text-ink-100 tabular">{value}</div>
        {unit && <div className="text-xs text-ink-300 font-mono">{unit}</div>}
      </div>
      {sub && <div className="mt-1 text-[11px] text-ink-400 font-mono">{sub}</div>}
    </div>
  )
}
