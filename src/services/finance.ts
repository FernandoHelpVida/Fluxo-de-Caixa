import pb from '@/lib/pocketbase/client'
import type {
  Availability,
  FinanceFilters,
  ImportIssue,
  ImportRecord,
  ImportResult,
  Payable,
  Receivable,
  ReceivableStatus,
} from '@/types/finance'

const PAGE_SIZE = 500

function escapeFilter(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function dateBoundary(value: string, end = false): string {
  return `${value} ${end ? '23:59:59.999' : '00:00:00.000'}Z`
}

export function buildPayableFilter(filters: FinanceFilters): string {
  const parts: string[] = []
  if (filters.inicio) parts.push(`previsao >= '${dateBoundary(filters.inicio)}'`)
  if (filters.fim) parts.push(`previsao <= '${dateBoundary(filters.fim, true)}'`)
  if (filters.categoria) parts.push(`categoria = '${escapeFilter(filters.categoria)}'`)
  if (filters.conta) parts.push(`conta_corrente = '${escapeFilter(filters.conta)}'`)
  if (filters.departamento) parts.push(`departamento = '${escapeFilter(filters.departamento)}'`)
  return parts.join(' && ')
}

export async function listAllPayables(filters: FinanceFilters): Promise<Payable[]> {
  const filter = buildPayableFilter(filters)
  const records = await pb.collection('contas_pagar').getFullList({
    batch: PAGE_SIZE,
    filter: filter || undefined,
    sort: 'previsao,razao_social',
  })
  return records as unknown as Payable[]
}

export async function listPayablesPage(
  page: number,
  perPage: number,
  filters: FinanceFilters,
): Promise<{ items: Payable[]; page: number; totalPages: number; totalItems: number }> {
  const filter = buildPayableFilter(filters)
  const result = await pb.collection('contas_pagar').getList(page, perPage, {
    filter: filter || undefined,
    sort: 'previsao,razao_social',
  })
  return {
    items: result.items as unknown as Payable[],
    page: result.page,
    totalPages: result.totalPages,
    totalItems: result.totalItems,
  }
}

export async function listReceivables(): Promise<Receivable[]> {
  const records = await pb
    .collection('contas_receber')
    .getFullList({ batch: PAGE_SIZE, sort: 'data' })
  return records as unknown as Receivable[]
}

export async function createReceivable(input: {
  data: string
  origem_cliente: string
  categoria: string
  valor: number
  status: ReceivableStatus
  observacao?: string
}): Promise<Receivable> {
  const record = await pb.collection('contas_receber').create(input)
  return record as unknown as Receivable
}

export async function updateReceivableStatus(
  id: string,
  status: ReceivableStatus,
): Promise<Receivable> {
  const record = await pb.collection('contas_receber').update(id, { status })
  return record as unknown as Receivable
}

export async function deleteReceivable(id: string): Promise<void> {
  await pb.collection('contas_receber').delete(id)
}

export async function listAvailabilities(): Promise<Availability[]> {
  const records = await pb
    .collection('disponibilidades')
    .getFullList({ batch: PAGE_SIZE, sort: '-data,-created' })
  return records as unknown as Availability[]
}

export async function createAvailability(input: {
  conta_corrente: string
  saldo: number
  data: string
  observacao?: string
}): Promise<Availability> {
  const record = await pb.collection('disponibilidades').create(input)
  return record as unknown as Availability
}

export async function deleteAvailability(id: string): Promise<void> {
  await pb.collection('disponibilidades').delete(id)
}

export async function listImports(): Promise<ImportRecord[]> {
  const records = await pb.collection('importacoes').getList(1, 30, { sort: '-created' })
  return records.items as unknown as ImportRecord[]
}

export async function listImportIssues(importId: string): Promise<ImportIssue[]> {
  const records = await pb.collection('inconsistencias_importacao').getFullList({
    batch: PAGE_SIZE,
    filter: `importacao = '${escapeFilter(importId)}'`,
    sort: 'linha,created',
  })
  return records as unknown as ImportIssue[]
}

export async function limparImportacoesComErro(): Promise<{ apagadas: number }> {
  if (!pb.authStore.isValid)
    throw new Error('Sua sessão expirou. Faça login novamente para limpar o histórico.')
  return (await pb.send('/backend/v1/helpvida/limpar-importacoes-com-erro', {
    method: 'POST',
  })) as { apagadas: number }
}

export async function importOmieSpreadsheet(file: File): Promise<ImportResult> {
  if (!pb.authStore.isValid)
    throw new Error('Sua sessão expirou. Faça login novamente para importar a planilha.')
  const form = new FormData()
  form.set('arquivo', file)
  try {
    return (await pb.send('/backend/v1/helpvida/importar', {
      method: 'POST',
      body: form,
    })) as ImportResult
  } catch (reason) {
    const candidate = reason as { status?: number; response?: { status?: number } }
    const status = candidate?.status ?? candidate?.response?.status
    if (status === 401) {
      pb.authStore.clear()
      window.dispatchEvent(new Event('helpvida:refresh'))
      throw new Error('Sua sessão expirou. Faça login novamente para importar a planilha.')
    }
    throw reason
  }
}
