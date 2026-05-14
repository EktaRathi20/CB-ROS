import { Check } from 'lucide-react'
import { cn } from '../../lib/cn.js'

export default function Stepper({ steps }) {
  return (
    <ol className="flex items-stretch gap-2 overflow-x-auto">
      {steps.map((s, i) => {
        const done = s.status === 'done'
        const active = s.status === 'active'
        return (
          <li key={s.id} className="flex items-center gap-2 min-w-fit">
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs',
                done && 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
                active && 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200 animate-pulseSoft',
                !done && !active && 'border-ink-700/70 bg-ink-800/60 text-ink-300'
              )}
            >
              <span
                className={cn(
                  'inline-grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold',
                  done && 'bg-emerald-400/20 text-emerald-300',
                  active && 'bg-cyan-400/20 text-cyan-200',
                  !done && !active && 'bg-ink-700 text-ink-300'
                )}
              >
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              {s.label}
            </div>
            {i < steps.length - 1 && <span className="h-px w-4 bg-ink-700" />}
          </li>
        )
      })}
    </ol>
  )
}
