import { cn } from '../../lib/cn.js'

const sizes = { xs: 'h-6 w-6 text-[10px]', sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-xs', lg: 'h-11 w-11 text-sm' }

export default function Avatar({ initials = '·', online, size = 'sm', tone = 'cyan', className }) {
  return (
    <span className={cn('relative inline-flex items-center justify-center rounded-full font-semibold text-ink-100 ring-1 ring-ink-700/70',
      sizes[size],
      tone === 'cyan' && 'bg-gradient-to-br from-cyan-500/30 to-teal-500/20',
      tone === 'emerald' && 'bg-gradient-to-br from-emerald-500/30 to-teal-500/20',
      tone === 'amber' && 'bg-gradient-to-br from-amber-500/30 to-rose-500/20',
      className
    )}>
      {initials}
      {online != null && (
        <span
          className={cn(
            'absolute -bottom-0 -right-0 h-2 w-2 rounded-full ring-2 ring-ink-900',
            online ? 'bg-emerald-400' : 'bg-ink-500'
          )}
        />
      )}
    </span>
  )
}
