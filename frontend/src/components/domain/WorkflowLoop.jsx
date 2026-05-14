import { ArrowRight, RotateCcw } from 'lucide-react'
import { workflowStages } from '../../data/workflow.js'
import { cn } from '../../lib/cn.js'

// Full 10-stage closed loop visualization. Two rows + a return arc that
// makes the cycle explicit. Each stage is keyboard accessible.
export default function WorkflowLoop({ className }) {
  const top = workflowStages.slice(0, 5)
  const bottom = workflowStages.slice(5).reverse() // right-to-left for visual flow back

  return (
    <div className={cn('surface relative overflow-hidden p-5 lg:p-7', className)}>
      <div className="pointer-events-none absolute inset-0 bg-radial-glow opacity-50" />
      <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-[length:28px_28px] opacity-40" />

      <div className="relative">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
              END-TO-END WORKFLOW
            </div>
            <h2 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight">
              One closed scientific loop · ten composable stages
            </h2>
            <p className="mt-2 text-sm text-ink-300 max-w-2xl">
              From a sketched reaction to a retrained model — every step is auditable, every
              failure is fuel.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-cyan-400/5 px-2.5 py-1 text-[11px] font-mono text-cyan-200">
            <RotateCcw className="h-3 w-3" /> loop · always running
          </div>
        </div>

        {/* Loop body */}
        <div className="relative mt-7">
          {/* Top row */}
          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            {top.map((s, i) => (
              <StageCard key={s.id} stage={s} accent="cyan" trailing={i < 4} />
            ))}
          </div>

          {/* Right corner: down arrow */}
          <div className="flex justify-end mt-2 mr-3 sm:mr-5 text-emerald-300">
            <CornerArrow direction="down-left" />
          </div>

          {/* Bottom row (right-to-left flow) */}
          <div className="grid grid-cols-5 gap-2 sm:gap-3 mt-2">
            {bottom.map((s, i) => (
              <StageCard key={s.id} stage={s} accent="emerald" trailing={i < 4} reverse />
            ))}
          </div>

          {/* Left corner: loop-back arrow */}
          <div className="flex items-center gap-2 mt-3 ml-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-mono text-cyan-100">
              <RotateCcw className="h-3 w-3" />
              Retraining feeds the next iteration of stage 01
            </span>
          </div>
        </div>

        {/* Beneath: legend / sub-bands */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
          <Band label="DISCOVER" range="01–03" tone="cyan" />
          <Band label="VALIDATE" range="04" tone="emerald" />
          <Band label="PREDICT" range="05" tone="teal" />
          <Band label="EXPERIMENT" range="06–08" tone="amber" />
          <Band label="LEARN" range="09–10" tone="rose" />
        </div>
      </div>
    </div>
  )
}

function StageCard({ stage, accent, trailing, reverse }) {
  const Icon = stage.icon
  return (
    <div className="relative">
      <div
        className={cn(
          'h-full rounded-xl border p-3 transition-colors',
          accent === 'cyan'
            ? 'border-cyan-400/25 bg-cyan-400/[0.04] hover:border-cyan-400/40'
            : 'border-emerald-400/25 bg-emerald-400/[0.04] hover:border-emerald-400/40'
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'grid h-6 w-6 place-items-center rounded-md ring-1 text-[10px] font-mono font-semibold',
              accent === 'cyan'
                ? 'bg-cyan-500/15 ring-cyan-400/30 text-cyan-200'
                : 'bg-emerald-500/15 ring-emerald-400/30 text-emerald-200'
            )}
          >
            {String(stage.n).padStart(2, '0')}
          </span>
          <Icon className={cn('h-3.5 w-3.5', accent === 'cyan' ? 'text-cyan-300' : 'text-emerald-300')} />
        </div>
        <div className="mt-2 text-[12px] font-semibold text-ink-100 leading-tight">
          {stage.label}
        </div>
        <p className="mt-1 text-[11px] text-ink-300 leading-snug line-clamp-2">{stage.desc}</p>
      </div>

      {/* Trailing arrow */}
      {trailing && (
        <span
          className={cn(
            'pointer-events-none absolute top-1/2 -translate-y-1/2',
            reverse ? 'left-[-12px] rotate-180' : 'right-[-12px]'
          )}
        >
          <FlowArrow accent={accent} />
        </span>
      )}
    </div>
  )
}

function FlowArrow({ accent }) {
  const color = accent === 'cyan' ? 'text-cyan-400/70' : 'text-emerald-400/70'
  return (
    <span className={cn('inline-flex items-center', color)}>
      <span className="h-px w-3 bg-current" />
      <ArrowRight className="h-3 w-3" />
    </span>
  )
}

function CornerArrow() {
  return (
    <svg width="60" height="36" viewBox="0 0 60 36" className="text-emerald-400/60">
      <path d="M2 2 L 50 2 Q 58 2 58 10 L 58 30" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <polygon points="58,34 54,28 62,28" fill="currentColor" />
    </svg>
  )
}

function Band({ label, range, tone }) {
  const tones = {
    cyan: 'border-cyan-400/30 bg-cyan-400/5 text-cyan-200',
    emerald: 'border-emerald-400/30 bg-emerald-400/5 text-emerald-200',
    teal: 'border-teal-400/30 bg-teal-400/5 text-teal-200',
    amber: 'border-amber-400/30 bg-amber-400/5 text-amber-200',
    rose: 'border-rose-400/30 bg-rose-400/5 text-rose-200'
  }
  return (
    <div className={cn('rounded-md border px-2.5 py-2 font-mono', tones[tone])}>
      <div className="text-[10px] uppercase tracking-[0.18em]">{label}</div>
      <div className="text-[12px]">stages {range}</div>
    </div>
  )
}
