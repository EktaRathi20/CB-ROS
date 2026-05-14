import { cn } from '../../lib/cn.js'

const variants = {
  primary:
    'bg-gradient-to-b from-cyan-400 to-cyan-600 text-ink-950 hover:from-cyan-300 hover:to-cyan-500 shadow-[0_0_0_1px_rgba(34,211,238,0.5),0_8px_24px_-12px_rgba(34,211,238,0.5)]',
  secondary:
    'bg-ink-800 text-ink-100 ring-1 ring-inset ring-ink-700 hover:bg-ink-750 hover:ring-ink-600',
  ghost:
    'text-ink-200 hover:text-ink-100 hover:bg-ink-800/60',
  outline:
    'text-ink-100 ring-1 ring-inset ring-ink-700 hover:ring-cyan-400/40 hover:text-cyan-200',
  danger:
    'bg-rose-500/10 text-rose-300 ring-1 ring-inset ring-rose-400/30 hover:bg-rose-500/20'
}

const sizes = {
  xs: 'h-7 px-2.5 text-[11px]',
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-10 px-4 text-sm'
}

export default function Button({
  as: Tag = 'button',
  variant = 'secondary',
  size = 'sm',
  icon: Icon,
  iconRight: IconRight,
  className,
  children,
  ...rest
}) {
  return (
    <Tag
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
      {IconRight && <IconRight className="h-3.5 w-3.5" />}
    </Tag>
  )
}
