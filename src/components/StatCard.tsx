import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

type Tone = 'teal' | 'green' | 'yellow' | 'slate'

const toneClasses: Record<Tone, { icon: string; line: string }> = {
  teal: { icon: 'bg-[#E1F3EE] text-[#07886B]', line: 'bg-[#0F9D7E]' },
  green: { icon: 'bg-[#E7F2EA] text-[#347B4E]', line: 'bg-[#438B5C]' },
  yellow: { icon: 'bg-[#FBF4D9] text-[#A78200]', line: 'bg-[#D5AE00]' },
  slate: { icon: 'bg-[#EDF1EF] text-[#587068]', line: 'bg-[#789087]' },
}

export function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'teal',
  trend,
  to,
  hint,
}: {
  label: string
  value: string
  helper: string
  icon: LucideIcon
  tone?: Tone
  trend?: 'positive' | 'negative' | 'neutral'
  /** Rota de destino: quando informado, o card inteiro vira um link clicável. */
  to?: string
  /** Texto curto exibido no hover, ex.: "Consultar movimento completo". */
  hint?: string
}) {
  const classes = toneClasses[tone]

  const content = (
    <>
      <div className={cn('absolute inset-x-0 top-0 h-[3px]', classes.line)} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#73847D]">
            {label}
          </p>
          <p className="mt-3 truncate font-display text-[1.7rem] font-semibold tracking-[-0.04em] text-[#173D31]">
            {value}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-[#83908C]">
            {trend === 'positive' && <ArrowUpRight className="h-3.5 w-3.5 text-[#159174]" />}
            {trend === 'negative' && <ArrowDownRight className="h-3.5 w-3.5 text-[#C56255]" />}
            <span className="truncate">{helper}</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className={cn('rounded-xl p-2.5', classes.icon)}>
            <Icon className="h-5 w-5" strokeWidth={1.8} />
          </div>
          {to && (
            <span
              className={cn(
                'flex items-center gap-0.5 rounded-full bg-[#F1F6F3] px-2 py-0.5 text-[10px] font-semibold text-[#477166] transition-opacity',
                'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
              )}
            >
              {hint || 'Consultar movimento'}
              <ChevronRight className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>
    </>
  )

  if (!to) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-[#E1E9E5] bg-white p-5 shadow-[0_12px_36px_rgba(18,62,49,0.045)]">
        {content}
      </div>
    )
  }

  return (
    <Link
      to={to}
      aria-label={`${label} — ${hint || 'consultar movimento completo'}`}
      title={hint || 'Consultar movimento completo'}
      className={cn(
        'group relative block overflow-hidden rounded-2xl border border-[#E1E9E5] bg-white p-5',
        'shadow-[0_12px_36px_rgba(18,62,49,0.045)] outline-none',
        'cursor-pointer transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-[#BFD8CF] hover:shadow-[0_16px_40px_rgba(18,62,49,0.09)]',
        'focus-visible:ring-2 focus-visible:ring-[#0F9D7E] focus-visible:ring-offset-2',
        'active:translate-y-0',
      )}
    >
      {content}
      <span
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 h-0 w-0 border-l-[34px] border-t-[34px] border-l-transparent border-t-[#EDF5F1] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
      />
      <ChevronRight
        aria-hidden
        className="pointer-events-none absolute right-1 top-1.5 h-4 w-4 text-[#0F9D7E] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
      />
    </Link>
  )
}
