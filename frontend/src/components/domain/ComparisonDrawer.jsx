import { X } from 'lucide-react'
import { cn } from '../../lib/cn.js'
import ConfidenceBar from '../ui/ConfidenceBar.jsx'
import StatusChip from '../ui/StatusChip.jsx'

export default function ComparisonDrawer({ open, candidates, onClose, onRemove }) {
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity z-40',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full max-w-[920px] surface-raised border-l border-ink-700/60 transition-transform duration-300 overflow-y-auto',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b divider-soft bg-ink-900/80 px-5 py-3 backdrop-blur">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">SIDE-BY-SIDE</div>
            <h2 className="text-base font-semibold text-ink-100">Compare candidates ({candidates.length})</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-ink-300 hover:bg-ink-800 hover:text-ink-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {candidates.length === 0 ? (
            <div className="surface p-8 text-center text-sm text-ink-300">
              Select two or more candidates to compare side-by-side.
            </div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(candidates.length, 3)}, minmax(0, 1fr))` }}>
              {candidates.slice(0, 3).map((c) => (
                <div key={c.id} className="surface p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-ink-100">{c.name}</div>
                      <div className="text-[11px] font-mono text-ink-400">{c.formula}</div>
                    </div>
                    <button
                      className="rounded-md p-1 text-ink-300 hover:text-rose-300 hover:bg-rose-500/10"
                      onClick={() => onRemove(c.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <StatusChip tone={c.type === 'AI Generated' ? 'violet' : 'slate'}>
                      {c.type}
                    </StatusChip>
                    <StatusChip dot>{c.status}</StatusChip>
                  </div>
                  <div className="mt-4 space-y-3">
                    <ConfidenceBar label="Activity" value={c.activity} tone="cyan" uncertainty={c.uncertainty} />
                    <ConfidenceBar label="Selectivity" value={c.selectivity} tone="emerald" uncertainty={c.uncertainty} />
                    <ConfidenceBar label="Stability" value={c.stability} tone="teal" uncertainty={c.uncertainty} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <Stat label="Eₐ" value={`${c.activationEnergy} kJ/mol`} />
                    <Stat label="Score" value={c.score} />
                    <Stat label="Rank" value={`#${c.rank}`} />
                    <Stat label="Source" value={c.source} truncate />
                  </div>
                  <p className="mt-3 text-[11px] text-ink-300 leading-relaxed">{c.notes}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

function Stat({ label, value, truncate }) {
  return (
    <div className="rounded-md bg-ink-800/70 px-2.5 py-1.5 ring-1 ring-ink-700/70">
      <div className="text-[10px] uppercase tracking-wider text-ink-400">{label}</div>
      <div className={cn('text-ink-100', truncate && 'truncate')}>{value}</div>
    </div>
  )
}
