import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CircleDollarSign, FileSpreadsheet } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { FilterBar } from '@/components/FilterBar'
import { EmptyState, ErrorState, PageLoader } from '@/components/PageStates'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EMPTY_FILTERS } from '@/hooks/useFinanceData'
import { formatCurrency, formatDate, getErrorMessage } from '@/lib/format'
import { listAllPayables, listPayablesPage } from '@/services/finance'
import type { FinanceFilters, Payable } from '@/types/finance'

const PER_PAGE = 20

function filtersFromParams(params: URLSearchParams): FinanceFilters {
  return {
    inicio: params.get('inicio') || '',
    fim: params.get('fim') || '',
    categoria: params.get('categoria') || '',
    conta: params.get('conta') || '',
    departamento: params.get('departamento') || '',
  }
}

export default function Payables() {
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState<FinanceFilters>(() => filtersFromParams(searchParams))
  const incomingFilters = searchParams.toString()
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<Payable[]>([])
  const [allRows, setAllRows] = useState<Payable[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [result, all] = await Promise.all([
        listPayablesPage(page, PER_PAGE, filters),
        listAllPayables(EMPTY_FILTERS),
      ])
      setRows(result.items)
      setTotalPages(result.totalPages)
      setTotalItems(result.totalItems)
      setAllRows(all)
    } catch (reason) {
      setError(getErrorMessage(reason, 'Falha ao consultar as contas a pagar.'))
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => {
    void load()
  }, [load])
  useEffect(() => {
    const listener = () => void load()
    window.addEventListener('helpvida:refresh', listener)
    return () => window.removeEventListener('helpvida:refresh', listener)
  }, [load])
  useEffect(() => {
    setPage(1)
  }, [filters])
  // Quando o Dashboard navega com filtros novos, aplica-os por cima do estado local.
  useEffect(() => {
    setFilters(filtersFromParams(searchParams))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingFilters])

  const options = useMemo(
    () => ({
      categories: [...new Set(allRows.map((row) => row.categoria).filter(Boolean))].sort(),
      accounts: [...new Set(allRows.map((row) => row.conta_corrente).filter(Boolean))].sort(),
      departments: [...new Set(allRows.map((row) => row.departamento).filter(Boolean))].sort(),
    }),
    [allRows],
  )
  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    if (!term) return rows
    return rows.filter((row) =>
      [row.razao_social, row.nota_fiscal, row.registro, row.categoria].some((value) =>
        value?.toLocaleLowerCase('pt-BR').includes(term),
      ),
    )
  }, [rows, search])
  const pageTotal = visible.reduce((total, row) => total + Math.abs(row.valor), 0)

  if (loading && !rows.length) return <PageLoader label="Consultando contas a pagar…" />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="space-y-5 animate-fade-in">
      <FilterBar
        filters={filters}
        options={options}
        onChange={setFilters}
        onReset={() => {
          setFilters(EMPTY_FILTERS)
          setSearch('')
        }}
        showSearch
        search={search}
        onSearchChange={setSearch}
      />
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-[#36564C]">
            {totalItems.toLocaleString('pt-BR')} lançamentos encontrados
          </p>
          <p className="text-xs text-[#84928D]">Valor da página: {formatCurrency(pageTotal)}</p>
        </div>
        <Button asChild variant="outline" className="gap-2 border-[#D7E3DE]">
          <Link to="/importacao">
            <FileSpreadsheet className="h-4 w-4" /> Nova importação
          </Link>
        </Button>
      </div>
      <Card className="overflow-hidden border-[#E1E9E5] shadow-[0_10px_32px_rgba(18,62,49,0.04)]">
        {visible.length === 0 ? (
          <EmptyState
            icon={CircleDollarSign}
            title="Nenhuma conta encontrada"
            description="Importe a pivot do OMIE ou ajuste os filtros para visualizar os lançamentos."
            action={
              <Button asChild>
                <Link to="/importacao">Importar planilha</Link>
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-xs">
              <thead className="bg-[#F3F7F5] text-[10px] uppercase tracking-[0.08em] text-[#71837C]">
                <tr>
                  <th className="px-5 py-3.5">Previsão</th>
                  <th className="px-4 py-3.5">Razão social</th>
                  <th className="px-4 py-3.5">Vencimento</th>
                  <th className="px-4 py-3.5">Categoria</th>
                  <th className="px-4 py-3.5">Conta corrente</th>
                  <th className="px-4 py-3.5">Departamento</th>
                  <th className="px-4 py-3.5">NF / registro</th>
                  <th className="px-5 py-3.5 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-[#EDF2EF] transition-colors hover:bg-[#F8FAF9]"
                  >
                    <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-[#34584D]">
                      {formatDate(row.previsao)}
                    </td>
                    <td className="max-w-[250px] px-4 py-3.5">
                      <p className="truncate font-medium text-[#36564C]">
                        {row.razao_social || 'Não informado'}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#8A9893]">
                        {row.registro || 'Sem registro'}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-[#64766F]">
                      {formatDate(row.vencimento)}
                    </td>
                    <td className="max-w-[190px] px-4 py-3.5">
                      <Badge
                        variant="secondary"
                        className="max-w-full truncate bg-[#EDF5F1] font-medium text-[#3D6A5C]"
                      >
                        {row.categoria || 'Sem categoria'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-[#526A62]">{row.conta_corrente || '—'}</td>
                    <td className="px-4 py-3.5 text-[#526A62]">{row.departamento || '—'}</td>
                    <td className="px-4 py-3.5 text-[#64766F]">
                      {row.nota_fiscal || row.registro || '—'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-[#284C40]">
                      {formatCurrency(Math.abs(row.valor))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#7C8B86]">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => value - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((value) => value + 1)}
            >
              Próxima <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
