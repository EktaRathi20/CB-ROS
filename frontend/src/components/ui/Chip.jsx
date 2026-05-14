import { cn } from '../../lib/cn.js'

export default function Chip({ children, active, onClick, icon: Icon, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
        active
          ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200'
          : 'border-ink-700/70 bg-ink-800/60 text-ink-200 hover:border-cyan-400/30 hover:text-cyan-200',
        className
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </button>
  )
}
