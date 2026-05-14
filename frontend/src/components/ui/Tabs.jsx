import { useState } from 'react'
import { cn } from '../../lib/cn.js'

export default function Tabs({ tabs, value, onChange, className, size = 'md' }) {
  const [internal, setInternal] = useState(value ?? tabs[0]?.id)
  const active = value ?? internal
  const set = (id) => {
    if (onChange) onChange(id)
    else setInternal(id)
  }
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-lg bg-ink-800/70 p-1 ring-1 ring-inset ring-ink-700/70', className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => set(t.id)}
          className={cn(
            'rounded-md transition-colors',
            size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
            active === t.id
              ? 'bg-ink-600/60 text-ink-100 ring-1 ring-cyan-400/30'
              : 'text-ink-300 hover:text-ink-100'
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
