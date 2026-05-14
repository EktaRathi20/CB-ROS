import { cn } from '../../lib/cn.js'

export default function ConfidenceBar({ value = 0, label, tone = 'cyan', uncertainty, compact, className }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)))
  const barClass = {
    cyan: 'bar-cyan',
    emerald: 'bar-emerald',
    amber: 'bar-amber',
    rose: 'bar-rose'
  }[tone]
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex items-center justify-between text-[11px] text-ink-300 mb-1">
          <span className="uppercase tracking-wider">{label}</span>
          <span className="tabular text-ink-100">{pct}%</span>
        </div>
      )}
      <div className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-ink-800/80 ring-1 ring-inset ring-ink-700/60')}>
        <div className={cn('h-full', barClass)} style={{ width: `${pct}%` }} />
        {uncertainty != null && (
          <div
            className="absolute top-0 h-full bg-white/8"
            style={{
              left: `${Math.max(0, pct - uncertainty * 100)}%`,
              width: `${Math.min(100 - Math.max(0, pct - uncertainty * 100), uncertainty * 200)}%`
            }}
            title={`±${Math.round(uncertainty * 100)}% uncertainty`}
          />
        )}
      </div>
      {!compact && uncertainty != null && (
        <div className="mt-1 text-[10px] text-ink-400">±{Math.round(uncertainty * 100)}% uncertainty band</div>
      )}
    </div>
  )
}
