import { AlertTriangle, Info, Sparkles } from 'lucide-react'
import { cn } from '../../lib/cn.js'

const sevToTone = {
  high: { ring: 'ring-rose-400/30', bg: 'bg-rose-500/10', text: 'text-rose-300', Icon: AlertTriangle, label: 'High severity' },
  medium: { ring: 'ring-amber-400/30', bg: 'bg-amber-500/10', text: 'text-amber-300', Icon: AlertTriangle, label: 'Medium severity' },
  info: { ring: 'ring-cyan-400/30', bg: 'bg-cyan-500/10', text: 'text-cyan-300', Icon: Sparkles, label: 'Insight' }
}

export default function FailureInsightCard({ item, action }) {
  const t = sevToTone[item.severity] || sevToTone.info
  const Icon = t.Icon
  return (
    <div className={cn('surface p-4 ring-1', t.ring)}>
      <div className="flex items-start gap-3">
        <span className={cn('grid h-8 w-8 place-items-center rounded-md', t.bg, t.text)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('text-[10px] font-mono uppercase tracking-[0.16em]', t.text)}>{t.label}</span>
            <span className="text-[10px] text-ink-400 font-mono">· model v3.1</span>
          </div>
          <h4 className="mt-0.5 text-sm font-semibold text-ink-100">{item.title}</h4>
          <p className="mt-1 text-[12px] text-ink-300 leading-relaxed">{item.detail}</p>
        </div>
      </div>
      {action && <div className="mt-3 flex justify-end">{action}</div>}
    </div>
  )
}
