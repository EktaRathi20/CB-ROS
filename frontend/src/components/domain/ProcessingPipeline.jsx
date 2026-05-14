import { useEffect, useRef, useState } from 'react'
import {
  Atom,
  Beaker,
  Check,
  Cpu,
  Database,
  GitBranch,
  Loader2,
  ShieldCheck,
  Sparkles,
  Workflow,
  X
} from 'lucide-react'
import Button from '../ui/Button.jsx'
import { cn } from '../../lib/cn.js'

// Default scientific pipeline. Each step has a duration (ms),
// a target counter value, and a list of "log lines" that stream in.
const defaultSteps = [
  {
    id: 'parse',
    icon: Atom,
    title: 'Parsing reaction',
    target: 1,
    unit: 'reaction',
    duration: 700,
    logs: [
      'Tokenizing reactants and products',
      'Balancing CO₂ + 3H₂ → CH₃OH + H₂O',
      'Reaction graph constructed · 4 species'
    ]
  },
  {
    id: 'sources',
    icon: Database,
    title: 'Querying knowledge sources',
    target: 412,
    unit: 'records scanned',
    duration: 1100,
    logs: [
      'PubChem · 118.4M records · 32ms',
      'Materials Project · 154K records · 47ms',
      'Open Catalyst (OCP) · 267M records · 61ms',
      'Crossref literature · 143M · 88ms'
    ]
  },
  {
    id: 'retrieve',
    icon: Beaker,
    title: 'Retrieving known catalysts',
    target: 12,
    unit: 'candidates',
    duration: 700,
    logs: [
      'Cu-Zn-Al-01 · industrial baseline · matched',
      'Cu-Pd-04 · bimetallic · matched',
      'MOF-Cu-BDC · framework · matched (with caveat)'
    ]
  },
  {
    id: 'generate',
    icon: Sparkles,
    title: 'Generating novel candidates',
    target: 8,
    unit: 'AI variants',
    duration: 1300,
    logs: [
      'GenModel v3.1 · sampling latent space',
      'Cu/Zn Variant v1.2 · Mg dopant proposed',
      'In-Zn-Ox-07 · oxygen vacancy 4.2/nm²',
      'EnzMix-B7 · enzyme cocktail composed'
    ]
  },
  {
    id: 'validate',
    icon: ShieldCheck,
    title: 'Applicability-domain check',
    target: 100,
    unit: '% certified',
    duration: 700,
    logs: [
      'Structural sanity · OK',
      'Physics-aware filters · OK',
      '2 candidates flagged edge-of-domain'
    ]
  },
  {
    id: 'predict',
    icon: Cpu,
    title: 'Predicting metrics',
    target: 4,
    unit: 'metrics × 8',
    duration: 1000,
    logs: [
      'Activity surrogate · DFT-D3 inference',
      'Selectivity · learned ranker',
      'Stability · 4h projection',
      'Activation energy · ±7 kJ/mol band'
    ]
  },
  {
    id: 'rank',
    icon: GitBranch,
    title: 'Ranking & calibrating uncertainty',
    target: 8,
    unit: 'ranked',
    duration: 600,
    logs: [
      'Score = w·activity + selectivity + stability − Eₐ',
      'Top: Cu/Zn Variant v1.2 · score 89',
      'Calibration drift 0.07 (within band)'
    ]
  }
]

export default function ProcessingPipeline({ steps = defaultSteps, onComplete, onCancel }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [stepProgress, setStepProgress] = useState(0) // 0..1 within active step
  const [counters, setCounters] = useState(() => steps.map(() => 0))
  const [logs, setLogs] = useState([])
  const startedAt = useRef(Date.now())
  const rafRef = useRef(null)
  const completedRef = useRef(false)

  // Drive the active step's progress with rAF for smooth animation
  useEffect(() => {
    if (activeIndex >= steps.length) return
    const step = steps[activeIndex]
    const start = performance.now()

    const tick = (now) => {
      const t = Math.min(1, (now - start) / step.duration)
      setStepProgress(t)
      setCounters((prev) => {
        const next = [...prev]
        next[activeIndex] = Math.round(step.target * t)
        return next
      })
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        // Drop the final log lines for this step
        setLogs((prev) => [
          ...prev,
          ...step.logs.map((l, i) => ({
            id: `${step.id}-${i}`,
            stepId: step.id,
            text: l,
            t: Date.now()
          }))
        ])
        // Advance to next step
        if (activeIndex + 1 < steps.length) {
          setActiveIndex(activeIndex + 1)
          setStepProgress(0)
        } else {
          if (!completedRef.current) {
            completedRef.current = true
            // tiny delay so user sees the final tick fill
            setTimeout(() => onComplete?.(), 350)
          }
        }
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [activeIndex, steps, onComplete])

  const overallProgress =
    (activeIndex + (activeIndex < steps.length ? stepProgress : 0)) / steps.length
  const elapsed = ((Date.now() - startedAt.current) / 1000).toFixed(1)

  return (
    <div className="surface relative overflow-hidden">
      {/* Top scanning beam */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent animate-pulseSoft" />
      <div className="pointer-events-none absolute inset-0 opacity-40 bg-grid-faint bg-[length:24px_24px]" />
      <div className="pointer-events-none absolute -top-24 left-1/4 h-48 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

      {/* Header */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-cyan-500/15 ring-1 ring-cyan-400/30 text-cyan-300">
              <Workflow className="h-3.5 w-3.5" />
            </span>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
              CB-ROS DISCOVERY PIPELINE
            </div>
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] font-mono text-cyan-200 ring-1 ring-cyan-400/30">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulseSoft" /> running
            </span>
          </div>
          <h3 className="mt-1 text-base font-semibold text-ink-100">
            Processing reaction · CO₂ + 3H₂ → CH₃OH
          </h3>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-ink-400">
          <span>elapsed {elapsed}s</span>
          <Button variant="ghost" size="xs" icon={X} onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="relative px-5 pt-4">
        <div className="flex items-center justify-between text-[11px] font-mono text-ink-400">
          <span>
            Step {Math.min(activeIndex + 1, steps.length)} of {steps.length}
          </span>
          <span className="text-ink-200 tabular">{Math.round(overallProgress * 100)}%</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-ink-800 overflow-hidden ring-1 ring-inset ring-ink-700/60">
          <div
            className="h-full bar-cyan transition-[width] duration-150 ease-out"
            style={{ width: `${overallProgress * 100}%` }}
          />
        </div>
      </div>

      {/* Steps grid */}
      <div className="relative px-5 py-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
        {steps.map((s, i) => {
          const status = i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending'
          const Icon = s.icon
          return (
            <div
              key={s.id}
              className={cn(
                'relative rounded-lg border p-3 transition-all overflow-hidden',
                status === 'pending' && 'border-ink-700/60 bg-ink-900/40',
                status === 'active' && 'border-cyan-400/40 bg-cyan-400/5 shadow-[0_0_0_1px_rgba(34,211,238,0.25),0_8px_24px_-12px_rgba(34,211,238,0.35)]',
                status === 'done' && 'border-emerald-400/30 bg-emerald-400/5'
              )}
            >
              {/* Animated scan strip on active step */}
              {status === 'active' && (
                <div className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-cyan-400/20 to-transparent animate-scan" />
                </div>
              )}

              <div className="relative flex items-center gap-2">
                <span
                  className={cn(
                    'grid h-6 w-6 place-items-center rounded-md ring-1',
                    status === 'pending' && 'bg-ink-800 ring-ink-700/60 text-ink-400',
                    status === 'active' && 'bg-cyan-500/15 ring-cyan-400/40 text-cyan-200',
                    status === 'done' && 'bg-emerald-500/15 ring-emerald-400/40 text-emerald-200'
                  )}
                >
                  {status === 'active' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : status === 'done' ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Icon className="h-3 w-3" />
                  )}
                </span>
                <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-300 truncate">
                  {String(i + 1).padStart(2, '0')} · {s.title}
                </div>
              </div>

              <div className="relative mt-2">
                <div className="text-base font-semibold tabular text-ink-100">
                  {counters[i].toLocaleString()}
                </div>
                <div className="text-[10px] font-mono text-ink-400 truncate">{s.unit}</div>
              </div>

              <div className="relative mt-2 h-1 w-full rounded-full bg-ink-800 overflow-hidden">
                <div
                  className={cn(
                    'h-full',
                    status === 'done' ? 'bar-emerald' : 'bar-cyan'
                  )}
                  style={{
                    width:
                      status === 'done'
                        ? '100%'
                        : status === 'active'
                        ? `${stepProgress * 100}%`
                        : '0%'
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Live console */}
      <div className="relative mx-5 mb-5 rounded-lg border border-ink-700/60 bg-ink-950/60 p-3">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.16em] text-ink-400">
          <span>console · live</span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulseSoft" />
            streaming
          </span>
        </div>
        <div className="mt-2 max-h-32 overflow-y-auto space-y-0.5 font-mono text-[11px] text-ink-300">
          {logs.length === 0 ? (
            <div className="text-ink-500">Awaiting first event…</div>
          ) : (
            logs.map((l, i) => (
              <div
                key={l.id}
                className="flex items-start gap-2 animate-[pulseSoft_0.4s_ease-out]"
                style={{ animationIterationCount: 1, animationFillMode: 'both' }}
              >
                <span className="text-ink-500 shrink-0">
                  [{new Date(l.t).toLocaleTimeString([], { hour12: false })}]
                </span>
                <span className="text-cyan-300 shrink-0">›</span>
                <span className="text-ink-200">{l.text}</span>
              </div>
            ))
          )}
          {/* blinking caret */}
          {activeIndex < steps.length && (
            <div className="flex items-start gap-2">
              <span className="text-ink-500">[…]</span>
              <span className="text-cyan-300">›</span>
              <span className="text-ink-300">
                {steps[activeIndex].title.toLowerCase()}
                <span className="ml-0.5 inline-block h-3 w-1.5 align-middle bg-cyan-400 animate-pulseSoft" />
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function ProcessingComplete({ onView, onAgain, summary }) {
  return (
    <div className="surface relative overflow-hidden p-5">
      <div className="pointer-events-none absolute inset-0 bg-radial-glow opacity-50" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-400/40 text-emerald-200">
            <Check className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-emerald-300">
              DISCOVERY COMPLETE
            </div>
            <div className="text-sm font-semibold text-ink-100">
              {summary || '20 candidates surfaced · ranked'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onAgain}>
            Run again
          </Button>
          <Button variant="primary" size="sm" onClick={onView}>
            View results
          </Button>
        </div>
      </div>
    </div>
  )
}
