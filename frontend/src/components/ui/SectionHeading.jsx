import { cn } from '../../lib/cn.js'

export default function SectionHeading({ kicker, title, subtitle, right, className }) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div>
        {kicker && (
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
            {kicker}
          </div>
        )}
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink-100">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-ink-300 max-w-2xl">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </div>
  )
}
