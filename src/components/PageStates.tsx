import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, Inbox, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PageLoader({ label = 'Carregando dados financeiros…' }: { label?: string }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-2xl border border-[#E2EAE6] bg-white">
      <LoaderCircle className="h-7 w-7 animate-spin text-[#0A8A6E]" />
      <p className="text-sm text-[#71817B]">{label}</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-red-100 bg-white px-6 text-center">
      <div className="mb-4 rounded-full bg-red-50 p-3">
        <AlertTriangle className="h-6 w-6 text-red-600" />
      </div>
      <h3 className="font-display text-lg font-semibold text-[#28483E]">
        Não foi possível carregar
      </h3>
      <p className="mt-1 max-w-md text-sm text-[#71817B]">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 rounded-2xl bg-[#EDF6F2] p-4">
        <Icon className="h-7 w-7 text-[#0A856A]" />
      </div>
      <h3 className="font-display text-lg font-semibold text-[#28483E]">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-relaxed text-[#71817B]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
