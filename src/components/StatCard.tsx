import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
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
}: {
  label: string
  value: string
  helper: string
  icon: LucideIcon
  tone?: Tone
  trend?: 'positive' | 'negative' | 'neutral'
}) {
  const classes = toneClasses[tone]
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#E1E9E5] bg-white p-5 shadow-[0_12px_36px_rgba(18,62,49,0.045)]">
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
        <div className={cn('rounded-xl p-2.5', classes.icon)}>
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </div>
      </div>
    </div>
  )
}
