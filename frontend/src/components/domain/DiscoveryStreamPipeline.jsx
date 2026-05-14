import { useEffect, useRef } from 'react'
import {
  AlertCircle,
  Check,
  Loader2,
  Workflow,
  X
} from 'lucide-react'
import Button from '../ui/Button.jsx'
import { cn } from '../../lib/cn.js'

// Stream-driven view of /api/discovery/stream. State lives in the parent
// (DiscoveryPage); this is a controlled component.
//
// Props
//   steps:       [{ id, name, status: 'running'|'done'|'error' }]
//   logs:        [{ id, text, t }]
//   resultCount: number  - results received so far
//   expectedCount: number? - what we asked for (used as denominator)
//   error:       string? - error message
//   elapsed:     number  - seconds since start
//   onCancel:    () => void
export default function DiscoveryStreamPipeline({
  steps = [],
  logs = [],
  resultCount = 0,
  expectedCount = null,
  error = null,
  elapsed = 0,
  onCancel
}) {
  const consoleRef = useRef(null)

  // Auto-scroll the live console to the bottom as logs arrive.
  useEffect(() => {
    const el = consoleRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs.length])

  return (
    <div className="surface relative overflow-hidden">
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
              CB-ROS DISCOVERY · LIVE STREAM
            </div>
            {error ? (
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-rose-400/10 px-2 py-0.5 text-[10px] font-mono text-rose-200 ring-1 ring-rose-400/30">
                <AlertCircle className="h-3 w-3" /> error
              </span>
            ) : (
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] font-mono text-cyan-200 ring-1 ring-cyan-400/30">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulseSoft" /> running
              </span>
            )}
          </div>
          <h3 className="mt-1 text-base font-semibold text-ink-100">
            Discovery in progress
          </h3>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-ink-400">
          {onCancel && (
            <Button variant="ghost" size="xs" icon={X} onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Counters strip */}
      <div className="relative px-5 pt-4 grid grid-cols-3 gap-2">
        <Counter label="Elapsed" value={`${elapsed.toFixed(1)}s`} />
        <Counter
          label="Candidates"
          value={
            expectedCount != null
              ? `${resultCount} / ${expectedCount}`
              : String(resultCount)
          }
          accent={resultCount > 0 ? 'emerald' : undefined}
        />
        <Counter
          label="Status"
          value={error ? 'error' : 'streaming'}
          accent={error ? 'rose' : 'cyan'}
        />
      </div>

      {/* Progress bar — only meaningful when we know the expected count */}
      {expectedCount != null && (
        <div className="relative px-5 pt-3">
          <div className="h-1.5 w-full rounded-full bg-ink-800 overflow-hidden ring-1 ring-inset ring-ink-700/60">
            <div
              className="h-full bar-cyan transition-[width] duration-300 ease-out"
              style={{
                width: `${Math.min(100, (resultCount / Math.max(1, expectedCount)) * 100)}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Steps grid — only when the server emits 2+ steps. With a single
          step the grid is just visual noise; the console tells the story. */}
      {steps.length > 1 && (
        <div className="relative px-5 pt-5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
            {steps.map((s, i) => {
              const status = s.status === 'done'
                ? 'done'
                : s.status === 'error'
                ? 'error'
                : 'active'
              return (
                <div
                  key={s.id || `${s.name}-${i}`}
                  className={cn(
                    'relative rounded-lg border p-3 transition-all overflow-hidden',
                    status === 'active' && 'border-cyan-400/40 bg-cyan-400/5 shadow-[0_0_0_1px_rgba(34,211,238,0.25),0_8px_24px_-12px_rgba(34,211,238,0.35)]',
                    status === 'done' && 'border-emerald-400/30 bg-emerald-400/5',
                    status === 'error' && 'border-rose-400/30 bg-rose-400/5'
                  )}
                >
                  {status === 'active' && (
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden">
                      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-cyan-400/20 to-transparent animate-scan" />
                    </div>
                  )}

                  <div className="relative flex items-center gap-2">
                    <span
                      className={cn(
                        'grid h-6 w-6 place-items-center rounded-md ring-1',
                        status === 'active' && 'bg-cyan-500/15 ring-cyan-400/40 text-cyan-200',
                        status === 'done' && 'bg-emerald-500/15 ring-emerald-400/40 text-emerald-200',
                        status === 'error' && 'bg-rose-500/15 ring-rose-400/40 text-rose-200'
                      )}
                    >
                      {status === 'active' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : status === 'done' ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
                    </span>
                    <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-300 truncate">
                      {String(i + 1).padStart(2, '0')} · {s.name || s.id || 'step'}
                    </div>
                  </div>
                  {s.detail && (
                    <div className="relative mt-2 text-[11px] text-ink-300 line-clamp-2">
                      {s.detail}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Live console — primary surface when there's no rich step grid */}
      <div className="relative mx-5 my-5 rounded-lg border border-ink-700/60 bg-ink-950/60 p-3">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.16em] text-ink-400">
          <span>console · live</span>
          <span className="inline-flex items-center gap-1">
            <span className={cn(
              'h-1.5 w-1.5 rounded-full',
              error ? 'bg-rose-400' : 'bg-emerald-400 animate-pulseSoft'
            )} />
            {error ? 'stopped' : 'streaming'}
          </span>
        </div>
        <div
          ref={consoleRef}
          className="mt-2 max-h-72 overflow-y-auto space-y-0.5 font-mono text-[11px] text-ink-300"
        >
          {logs.length === 0 ? (
            <div className="text-ink-500">Awaiting first event…</div>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="flex items-start gap-2">
                <span className="text-ink-500 shrink-0">
                  [{new Date(l.t).toLocaleTimeString([], { hour12: false })}]
                </span>
                <span className={cn(
                  'shrink-0',
                  l.level === 'error' ? 'text-rose-300' : 'text-cyan-300'
                )}>›</span>
                <span className={l.level === 'error' ? 'text-rose-200' : 'text-ink-200'}>
                  {l.text}
                </span>
              </div>
            ))
          )}
          {error && (
            <div className="mt-2 rounded-md border border-rose-400/30 bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-200">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Counter({ label, value, accent }) {
  const ring =
    accent === 'emerald'
      ? 'ring-emerald-400/30'
      : accent === 'cyan'
      ? 'ring-cyan-400/30'
      : accent === 'rose'
      ? 'ring-rose-400/30'
      : 'ring-ink-700/60'
  const text =
    accent === 'emerald'
      ? 'text-emerald-200'
      : accent === 'cyan'
      ? 'text-cyan-200'
      : accent === 'rose'
      ? 'text-rose-200'
      : 'text-ink-100'
  return (
    <div className={cn('rounded-md bg-ink-900/50 px-3 py-2 ring-1 ring-inset', ring)}>
      <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-400">
        {label}
      </div>
      <div className={cn('mt-0.5 text-sm font-semibold tabular', text)}>{value}</div>
    </div>
  )
}
