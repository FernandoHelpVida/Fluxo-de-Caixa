import { addDays, parsePocketDate, startOfWeek, toInputDate } from '@/lib/format'
import type { Availability, Payable, Receivable } from '@/types/finance'

export type FlowPoint = {
  key: string
  label: string
  fullLabel: string
  entradas: number
  saidas: number
  saldo: number
  saldoAcumulado: number
}

export function sumValues<T>(rows: T[], picker: (row: T) => number): number {
  return rows.reduce((total, row) => total + Number(picker(row) || 0), 0)
}

export function currentAvailability(rows: Availability[]): number {
  const latestByAccount = new Map<string, Availability>()
  rows.forEach((row) => {
    const existing = latestByAccount.get(row.conta_corrente)
    if (!existing || `${row.data}${row.created}` > `${existing.data}${existing.created}`) {
      latestByAccount.set(row.conta_corrente, row)
    }
  })
  return sumValues([...latestByAccount.values()], (row) => row.saldo)
}

export function latestAvailabilityByAccount(rows: Availability[]): Availability[] {
  const latestByAccount = new Map<string, Availability>()
  rows.forEach((row) => {
    const existing = latestByAccount.get(row.conta_corrente)
    if (!existing || `${row.data}${row.created}` > `${existing.data}${existing.created}`)
      latestByAccount.set(row.conta_corrente, row)
  })
  return [...latestByAccount.values()].sort((a, b) =>
    a.conta_corrente.localeCompare(b.conta_corrente, 'pt-BR'),
  )
}

function receiveValueForDate(rows: Receivable[], key: string): number {
  return sumValues(
    rows.filter((row) => row.data.slice(0, 10) === key),
    (row) => row.valor,
  )
}

function payableValueForDate(rows: Payable[], key: string): number {
  return sumValues(
    rows.filter((row) => row.previsao.slice(0, 10) === key),
    (row) => Math.abs(row.valor),
  )
}

export function buildDailyFlow(
  payables: Payable[],
  receivables: Receivable[],
  initialBalance: number,
  start: Date,
  numberOfDays: number,
): FlowPoint[] {
  let accumulated = initialBalance
  const formatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
  return Array.from({ length: numberOfDays }, (_, index) => {
    const date = addDays(start, index)
    const key = toInputDate(date)
    const entradas = receiveValueForDate(receivables, key)
    const saidas = payableValueForDate(payables, key)
    const saldo = entradas - saidas
    accumulated += saldo
    return {
      key,
      label: formatter.format(date).replace('.', ''),
      fullLabel: `${weekday.format(date).replace('.', '')}, ${formatter.format(date).replace('.', '')}`,
      entradas,
      saidas,
      saldo,
      saldoAcumulado: accumulated,
    }
  })
}

export function buildWeeklyFlow(
  payables: Payable[],
  receivables: Receivable[],
  initialBalance: number,
  anchor: Date,
  weeks: number,
): FlowPoint[] {
  const firstWeek = startOfWeek(anchor)
  let accumulated = initialBalance
  return Array.from({ length: weeks }, (_, index) => {
    const start = addDays(firstWeek, index * 7)
    const end = addDays(start, 6)
    const startKey = toInputDate(start)
    const endKey = toInputDate(end)
    const entradas = sumValues(
      receivables.filter(
        (row) => row.data.slice(0, 10) >= startKey && row.data.slice(0, 10) <= endKey,
      ),
      (row) => row.valor,
    )
    const saidas = sumValues(
      payables.filter(
        (row) => row.previsao.slice(0, 10) >= startKey && row.previsao.slice(0, 10) <= endKey,
      ),
      (row) => Math.abs(row.valor),
    )
    const saldo = entradas - saidas
    accumulated += saldo
    return {
      key: startKey,
      label: `Sem. ${index + 1}`,
      fullLabel: `${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(start).replace('.', '')} a ${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(end).replace('.', '')}`,
      entradas,
      saidas,
      saldo,
      saldoAcumulado: accumulated,
    }
  })
}

export function dateExtent(
  payables: Payable[],
  receivables: Receivable[],
): { min?: Date; max?: Date } {
  const dates = [
    ...payables.map((row) => parsePocketDate(row.previsao)),
    ...receivables.map((row) => parsePocketDate(row.data)),
  ].filter((date) => !Number.isNaN(date.getTime()))
  if (!dates.length) return {}
  return {
    min: new Date(Math.min(...dates.map((date) => date.getTime()))),
    max: new Date(Math.max(...dates.map((date) => date.getTime()))),
  }
}
