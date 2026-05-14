import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Eye,
  FlaskConical,
  GitCompare
} from 'lucide-react'
import StatusChip from '../ui/StatusChip.jsx'
import { cn } from '../../lib/cn.js'

const columns = [
  { id: 'rank', label: '#', width: 'w-10' },
  { id: 'name', label: 'Candidate' },
  { id: 'type', label: 'Origin' },
  { id: 'activity', label: 'Activity' },
  { id: 'selectivity', label: 'Selectivity' },
  { id: 'stability', label: 'Stability' },
  { id: 'activationEnergy', label: 'Eₐ (kJ/mol)' },
  { id: 'uncertainty', label: 'Uncertainty' },
  { id: 'status', label: 'Status' }
]

export default function PredictionTable({
  rows,
  onCompare,
  compareSet,
  onOpen,
  pickSet,
  onTogglePick,
  visualizeId
}) {
  const [sort, setSort] = useState({ id: 'rank', dir: 'asc' })

  const sorted = useMemo(() => {
    const arr = [...rows]
    arr.sort((a, b) => {
      const va = a[sort.id]
      const vb = b[sort.id]
      if (typeof va === 'number') return sort.dir === 'asc' ? va - vb : vb - va
      return sort.dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
    return arr
  }, [rows, sort])

  const toggle = (id) =>
    setSort((s) => (s.id === id ? { id, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { id, dir: 'asc' }))

  return (
    <div className="surface">
      <div className="overflow-x-auto">
        <table className="min-w-[920px] w-full text-left">
          <thead>
            <tr className="border-b divider-soft text-[11px] uppercase tracking-wider text-ink-400">
              {onTogglePick && <th className="px-3 py-2.5 font-medium w-10">Pick</th>}
              {columns.map((c) => (
                <th key={c.id} className={cn('px-3 py-2.5 font-medium', c.width)}>
                  <button
                    className="inline-flex items-center gap-1 hover:text-ink-100"
                    onClick={() => toggle(c.id)}
                  >
                    {c.label}
                    {sort.id === c.id ? (
                      sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </button>
                </th>
              ))}
              <th className="px-3 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divider-soft">
            {sorted.map((c) => {
              const inCompare = compareSet?.has(c.id)
              const isPicked = pickSet?.has(c.id)
              const isVisualize = visualizeId && c.id === visualizeId
              const isAi = c.type === 'AI Generated'
              const isUser = c.type === 'User-defined'
              const versionLabel = versionTag(c)
              return (
                <tr
                  key={c.id}
                  className={cn(
                    'text-sm hover:bg-ink-800/40',
                    inCompare && 'bg-emerald-400/5',
                    isPicked && 'bg-cyan-400/5',
                    isVisualize && 'bg-violet-400/5'
                  )}
                >
                  {onTogglePick && (
                    <td className="px-3 py-3">
                      <PickCheckbox
                        checked={!!isPicked}
                        onChange={() => onTogglePick(c.id)}
                      />
                    </td>
                  )}
                  <td className="px-3 py-3 tabular text-ink-300">{c.rank}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      {versionLabel && (
                        <span className="inline-flex items-center rounded bg-ink-800/80 px-1.5 py-[1px] text-[10px] font-mono text-cyan-300 ring-1 ring-cyan-400/25">
                          {versionLabel}
                        </span>
                      )}
                      <span className="font-medium text-ink-100">{c.name}</span>
                      {isVisualize && (
                        <span title="Currently selected for visualization">
                          <Eye className="h-3 w-3 text-violet-300" />
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-ink-400 font-mono">{c.formula}</div>
                  </td>
                  <td className="px-3 py-3">
                    <StatusChip
                      tone={isAi ? 'violet' : isUser ? 'amber' : 'slate'}
                    >
                      {c.type}
                    </StatusChip>
                  </td>
                  <td className="px-3 py-3 tabular text-ink-100 font-mono">
                    {Math.round(c.activity * 100)}%
                  </td>
                  <td className="px-3 py-3 tabular text-ink-100 font-mono">
                    {Math.round(c.selectivity * 100)}%
                  </td>
                  <td className="px-3 py-3 tabular text-ink-100 font-mono">
                    {Math.round(c.stability * 100)}%
                  </td>
                  <td className="px-3 py-3 tabular text-ink-100 font-mono">{c.activationEnergy}</td>
                  <td className="px-3 py-3 tabular text-ink-100 font-mono">
                    ±{Math.round(c.uncertainty * 100)}%
                  </td>
                  <td className="px-3 py-3"><StatusChip dot>{c.status}</StatusChip></td>
                  <td className="px-3 py-3 text-right">
                    <RowActions
                      candidate={c}
                      inCompare={inCompare}
                      isPicked={isPicked}
                      isVisualize={isVisualize}
                      onCompare={onCompare}
                      onOpen={onOpen}
                      onTogglePick={onTogglePick}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function versionTag(c) {
  if (c.addedBy === 'user') return 'Manual'
  const v = c.version
  if (typeof v === 'number') return `V1.${v}`
  if (v && typeof v === 'object' && 'major' in v) return `V${v.major}.${v.minor}`
  return null
}

function PickCheckbox({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      title={checked ? 'Unpick' : 'Pick for experiment'}
      className={cn(
        'grid h-5 w-5 place-items-center rounded-md border transition-colors',
        checked
          ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-200'
          : 'border-ink-700/70 bg-ink-900/60 text-transparent hover:border-cyan-400/40'
      )}
    >
      <Check className="h-3 w-3" />
    </button>
  )
}

function RowActions({
  candidate,
  inCompare,
  isPicked,
  isVisualize,
  onCompare,
  onOpen,
  onTogglePick
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <IconAction
        Icon={GitCompare}
        active={inCompare}
        activeTone="emerald"
        title={inCompare ? 'Remove from compare' : 'Add to compare'}
        onClick={() => onCompare?.(candidate.id)}
      />
      {onTogglePick && (
        <IconAction
          Icon={FlaskConical}
          active={isPicked}
          activeTone="cyan"
          title={isPicked ? 'Remove from experiments' : 'Pick for experiment'}
          onClick={() => onTogglePick(candidate.id)}
        />
      )}
      <IconAction
        Icon={Eye}
        active={isVisualize}
        activeTone="violet"
        title={isVisualize ? 'Re-open visualization' : 'Visualize'}
        onClick={() => onOpen?.(candidate)}
      />
    </div>
  )
}

function IconAction({ Icon, active, activeTone = 'cyan', title, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={cn(
        'grid h-7 w-7 place-items-center rounded-md ring-1 transition-colors',
        active
          ? activeTone === 'emerald'
            ? 'bg-emerald-400/15 text-emerald-200 ring-emerald-400/40 hover:bg-emerald-400/25'
            : activeTone === 'violet'
            ? 'bg-violet-400/15 text-violet-200 ring-violet-400/40 hover:bg-violet-400/25'
            : 'bg-cyan-400/15 text-cyan-200 ring-cyan-400/40 hover:bg-cyan-400/25'
          : 'bg-ink-800 text-ink-200 ring-ink-700 hover:text-cyan-200 hover:ring-cyan-400/30'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  )
}
