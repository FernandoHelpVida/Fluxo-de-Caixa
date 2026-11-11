import { formatCurrency } from '@/lib/format'

export function CategoryBars({ data }: { data: Array<{ label: string; value: number }> }) {
  const max = Math.max(...data.map((item) => item.value), 1)
  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={item.label}>
          <div className="mb-1.5 flex items-center justify-between gap-4 text-xs">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#EEF5F1] text-[9px] font-bold text-[#477166]">
                {index + 1}
              </span>
              <span className="truncate font-medium text-[#405B52]">
                {item.label || 'Sem categoria'}
              </span>
            </div>
            <span className="shrink-0 font-semibold text-[#294B40]">
              {formatCurrency(item.value)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#EDF2EF]">
            <div
              className="h-full rounded-full bg-[#178C72]"
              style={{ width: `${(item.value / max) * 100}%`, opacity: 1 - index * 0.09 }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
