import { cn } from '@/lib/utils'

type BrandLogoProps = {
  compact?: boolean
  inverted?: boolean
  className?: string
}

export function BrandLogo({ compact = false, inverted = false, className }: BrandLogoProps) {
  return (
    <div
      className={cn('inline-flex items-center gap-2.5 select-none', className)}
      aria-label="HelpVida"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 52 52"
        className={cn(compact ? 'h-8 w-8' : 'h-11 w-11', 'shrink-0')}
      >
        <path
          d="M22 2h9l-1 15L42 8l5 8-14 7 15 5-3 9-14-7 2 16h-9l1-15-12 9-5-8 14-7-15-5 3-9 14 7z"
          fill="#D5AE00"
        />
      </svg>
      <div className="flex flex-col leading-none">
        <span
          className={cn(
            'font-brand font-bold italic tracking-[-0.055em]',
            compact ? 'text-[1.55rem]' : 'text-[2.2rem]',
            inverted ? 'text-white' : 'text-[#004F35]',
          )}
        >
          help<span className={inverted ? 'text-[#5AD3B4]' : 'text-[#139A7D]'}>vida</span>
        </span>
        {!compact && (
          <span
            className={cn(
              'ml-1 mt-1 text-[9px] font-semibold uppercase tracking-[0.22em]',
              inverted ? 'text-white/55' : 'text-[#427062]',
            )}
          >
            Gestão financeira
          </span>
        )}
      </div>
    </div>
  )
}
