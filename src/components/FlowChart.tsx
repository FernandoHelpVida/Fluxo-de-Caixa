import { useMemo } from 'react'
import { formatCompactCurrency, formatCurrency } from '@/lib/format'
import type { FlowPoint } from '@/lib/finance-calculations'

function pointsToPath(
  values: number[],
  width: number,
  height: number,
  min: number,
  max: number,
): string {
  if (!values.length) return ''
  const range = max - min || 1
  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width
      const y = height - ((value - min) / range) * height
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

export function FlowBarChart({ data }: { data: FlowPoint[] }) {
  const max = Math.max(1, ...data.flatMap((item) => [item.entradas, item.saidas]))
  if (!data.length) return null
  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="min-w-[620px]">
        <div className="mb-5 flex items-center gap-5 text-xs text-[#6C7D77]">
          <span className="flex items-center gap-2">
            <i className="h-2.5 w-2.5 rounded-sm bg-[#139A7D]" /> Entradas
          </span>
          <span className="flex items-center gap-2">
            <i className="h-2.5 w-2.5 rounded-sm bg-[#D7B21C]" /> Saídas
          </span>
        </div>
        <div className="relative flex h-[230px] items-end gap-3 border-b border-[#DDE7E2] px-1">
          {[0.25, 0.5, 0.75, 1].map((tick) => (
            <div
              key={tick}
              className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[#E7EEEA]"
              style={{ bottom: `${tick * 100}%` }}
            >
              <span className="absolute -top-4 left-0 text-[9px] text-[#9AA6A2]">
                {formatCompactCurrency(max * tick)}
              </span>
            </div>
          ))}
          {data.map((item) => (
            <div
              key={item.key}
              className="group relative z-10 flex h-full min-w-0 flex-1 items-end justify-center gap-1.5 pt-7"
            >
              <div className="absolute left-1/2 top-0 z-20 hidden w-44 -translate-x-1/2 rounded-lg bg-[#123E31] p-2.5 text-[10px] text-white shadow-xl group-hover:block">
                <p className="mb-1 font-semibold">{item.fullLabel}</p>
                <p>Entradas: {formatCurrency(item.entradas)}</p>
                <p>Saídas: {formatCurrency(item.saidas)}</p>
              </div>
              <div
                className="w-[38%] max-w-7 rounded-t-md bg-[#139A7D] transition-opacity hover:opacity-80"
                style={{
                  height: `${Math.max(item.entradas ? 4 : 0, (item.entradas / max) * 100)}%`,
                }}
              />
              <div
                className="w-[38%] max-w-7 rounded-t-md bg-[#D7B21C] transition-opacity hover:opacity-80"
                style={{ height: `${Math.max(item.saidas ? 4 : 0, (item.saidas / max) * 100)}%` }}
              />
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-[#75847F]">
                {item.label}
              </span>
            </div>
          ))}
        </div>
        <div className="h-7" />
      </div>
    </div>
  )
}

export function BalanceLineChart({ data }: { data: FlowPoint[] }) {
  const geometry = useMemo(() => {
    const values = data.map((item) => item.saldoAcumulado)
    const min = Math.min(...values, 0)
    const max = Math.max(...values, 1)
    return { path: pointsToPath(values, 640, 180, min, max), min, max }
  }, [data])
  if (!data.length) return null
  return (
    <div className="w-full overflow-x-auto">
      <div className="relative min-w-[640px] pt-4">
        <svg
          viewBox="0 0 640 210"
          className="h-[240px] w-full overflow-visible"
          role="img"
          aria-label="Linha do saldo acumulado"
        >
          <defs>
            <linearGradient id="balanceArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#159A7D" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#159A7D" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 45, 90, 135, 180].map((y) => (
            <line key={y} x1="0" y1={y} x2="640" y2={y} stroke="#E7EEEA" strokeDasharray="3 4" />
          ))}
          <path d={`${geometry.path} L 640 180 L 0 180 Z`} fill="url(#balanceArea)" />
          <path
            d={geometry.path}
            fill="none"
            stroke="#0E8D70"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {data.map((item, index) => {
            const x = data.length === 1 ? 320 : (index / (data.length - 1)) * 640
            const y =
              180 -
              ((item.saldoAcumulado - geometry.min) / (geometry.max - geometry.min || 1)) * 180
            return (
              <circle
                key={item.key}
                cx={x}
                cy={y}
                r="4"
                fill="#fff"
                stroke="#0E8D70"
                strokeWidth="3"
              >
                <title>
                  {item.fullLabel}: {formatCurrency(item.saldoAcumulado)}
                </title>
              </circle>
            )
          })}
          {data.map((item, index) => {
            const x = data.length === 1 ? 320 : (index / (data.length - 1)) * 640
            return (
              <text
                key={`${item.key}-label`}
                x={x}
                y="207"
                textAnchor="middle"
                fontSize="10"
                fill="#75847F"
              >
                {item.label}
              </text>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
