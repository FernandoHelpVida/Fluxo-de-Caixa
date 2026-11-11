export const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
})

export const compactCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function formatCurrency(value: number): string {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0)
}

export function formatCompactCurrency(value: number): string {
  return compactCurrencyFormatter.format(Number.isFinite(value) ? value : 0)
}

export function parsePocketDate(value: string): Date {
  if (!value) return new Date(Number.NaN)
  const dateOnly = value.slice(0, 10)
  return new Date(`${dateOnly}T12:00:00`)
}

export function formatDate(value: string): string {
  const date = parsePocketDate(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

export function formatShortDate(value: string): string {
  const date = parsePocketDate(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
    .format(date)
    .replace('.', '')
}

export function formatDateTime(value: string): string {
  if (!value) return '—'
  const normalized = value.includes('T') ? value : value.replace(' ', 'T')
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function toInputDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function startOfWeek(date: Date): Date {
  const copy = new Date(date)
  const weekday = copy.getDay()
  const diff = weekday === 0 ? -6 : 1 - weekday
  copy.setDate(copy.getDate() + diff)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

export function getErrorMessage(
  error: unknown,
  fallback = 'Não foi possível concluir a operação.',
): string {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as {
      message?: string
      response?: { message?: string; data?: unknown }
    }
    // Resposta do PB: { code, message, data } — a mensagem do hook vem em data.message.
    const directData = candidate.response?.data
    if (typeof directData === 'string' && directData.trim()) return directData
    if (
      directData &&
      typeof directData === 'object' &&
      'message' in (directData as { message?: unknown }) &&
      typeof (directData as { message?: unknown }).message === 'string' &&
      (directData as { message: string }).message.trim()
    )
      return (directData as { message: string }).message
    const fieldMessage =
      directData && typeof directData === 'object' && !Array.isArray(directData)
        ? Object.values(directData as Record<string, { message?: string }>).find(
            (item) => item && typeof item === 'object' && 'message' in item,
          )?.message
        : undefined
    if (fieldMessage) return fieldMessage
    const MENSAGENS_GENERICAS = [
      'something went wrong while processing your request.',
      'failed to authenticate.',
    ]
    if (
      candidate.response?.message &&
      !MENSAGENS_GENERICAS.includes(candidate.response.message.toLowerCase())
    )
      return candidate.response.message
    if (
      candidate.message &&
      !MENSAGENS_GENERICAS.includes(candidate.message.toLowerCase()) &&
      !candidate.message.toLowerCase().includes('autocancelled')
    )
      return candidate.message
  }
  return fallback
}
