import { useMemo, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarDays,
  CircleDollarSign,
  FileSpreadsheet,
  WalletCards,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { CategoryBars } from '@/components/CategoryBars'
import { FilterBar } from '@/components/FilterBar'
import { BalanceLineChart, FlowBarChart } from '@/components/FlowChart'
import { ErrorState, PageLoader } from '@/components/PageStates'
import { StatCard } from '@/components/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EMPTY_FILTERS, useFinanceData } from '@/hooks/useFinanceData'
import { buildDailyFlow, currentAvailability, sumValues } from '@/lib/finance-calculations'
import { formatCurrency, formatDate, parsePocketDate, startOfWeek, toInputDate } from '@/lib/format'
import type { FinanceFilters } from '@/types/finance'

export default function Dashboard() {
  const [filters, setFilters] = useState<FinanceFilters>(EMPTY_FILTERS)
  const { payables, receivables, availabilities, loading, error, reload } = useFinanceData(filters)

  const options = useMemo(
    () => ({
      categories: [...new Set(payables.map((row) => row.categoria).filter(Boolean))].sort(),
      accounts: [...new Set(payables.map((row) => row.conta_corrente).filter(Boolean))].sort(),
      departments: [...new Set(payables.map((row) => row.departamento).filter(Boolean))].sort(),
    }),
    [payables],
  )

  const values = useMemo(() => {
    const totalPayable = sumValues(payables, (row) => Math.abs(row.valor))
    const totalReceivable = sumValues(
      receivables.filter((row) => row.status === 'previsto'),
      (row) => row.valor,
    )
    const available = currentAvailability(availabilities)
    const monday = startOfWeek(new Date())
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)
    const weekStart = toInputDate(monday)
    const weekEnd = toInputDate(sunday)
    const weekOut = sumValues(
      payables.filter(
        (row) => row.previsao.slice(0, 10) >= weekStart && row.previsao.slice(0, 10) <= weekEnd,
      ),
      (row) => Math.abs(row.valor),
    )
    const weekIn = sumValues(
      receivables.filter(
        (row) => row.data.slice(0, 10) >= weekStart && row.data.slice(0, 10) <= weekEnd,
      ),
      (row) => row.valor,
    )
    return {
      totalPayable,
      totalReceivable,
      available,
      weekPosition: available + weekIn - weekOut,
      weekIn,
      weekOut,
    }
  }, [payables, receivables, availabilities])

  const chartData = useMemo(() => {
    const dated = [
      ...payables.map((row) => parsePocketDate(row.previsao)),
      ...receivables.map((row) => parsePocketDate(row.data)),
    ].filter((date) => !Number.isNaN(date.getTime()))
    const earliest = dated.length
      ? new Date(Math.min(...dated.map((date) => date.getTime())))
      : new Date()
    const start = filters.inicio ? parsePocketDate(filters.inicio) : earliest
    return buildDailyFlow(payables, receivables, values.available, start, 10)
  }, [payables, receivables, values.available, filters.inicio])

  const categories = useMemo(() => {
    const map = new Map<string, number>()
    payables.forEach((row) =>
      map.set(
        row.categoria || 'Sem categoria',
        (map.get(row.categoria || 'Sem categoria') || 0) + Math.abs(row.valor),
      ),
    )
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [payables])

  const nextPayables = useMemo(
    () => [...payables].sort((a, b) => a.previsao.localeCompare(b.previsao)).slice(0, 5),
    [payables],
  )

  if (loading) return <PageLoader label="Consolidando a posição financeira…" />
  if (error) return <ErrorState message={error} onRetry={reload} />

  return (
    <div className="space-y-6 animate-fade-in">
      <FilterBar
        filters={filters}
        options={options}
        onChange={setFilters}
        onReset={() => setFilters(EMPTY_FILTERS)}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total a pagar"
          value={formatCurrency(values.totalPayable)}
          helper={`${payables.length} lançamentos consolidados`}
          icon={ArrowUpFromLine}
          tone="yellow"
          trend="negative"
        />
        <StatCard
          label="A receber"
          value={formatCurrency(values.totalReceivable)}
          helper={`${receivables.filter((row) => row.status === 'previsto').length} entradas previstas`}
          icon={ArrowDownToLine}
          tone="teal"
          trend="positive"
        />
        <StatCard
          label="Saldo disponível"
          value={formatCurrency(values.available)}
          helper={`${new Set(availabilities.map((row) => row.conta_corrente)).size} contas informadas`}
          icon={WalletCards}
          tone="green"
        />
        <StatCard
          label="Posição da semana"
          value={formatCurrency(values.weekPosition)}
          helper={`${formatCurrency(values.weekIn)} entra · ${formatCurrency(values.weekOut)} sai`}
          icon={CalendarDays}
          tone="slate"
          trend={values.weekPosition >= 0 ? 'positive' : 'negative'}
        />
      </div>

      {payables.length === 0 && (
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#E6D88C] bg-[#FFFBE9] p-5 sm:flex-row sm:items-center">
          <div className="flex gap-3">
            <div className="rounded-xl bg-[#F5E9A6] p-2.5">
              <FileSpreadsheet className="h-5 w-5 text-[#947700]" />
            </div>
            <div>
              <p className="font-semibold text-[#584C17]">
                Importe a pivot do OMIE para completar a visão
              </p>
              <p className="mt-1 text-sm text-[#7B7040]">
                As entradas e disponibilidades já estão prontas; faltam os títulos a pagar.
              </p>
            </div>
          </div>
          <Button asChild className="shrink-0 bg-[#756000] hover:bg-[#5E4E00]">
            <Link to="/importacao">Importar planilha</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card className="border-[#E1E9E5] shadow-[0_10px_32px_rgba(18,62,49,0.04)]">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="font-display text-lg text-[#244A3E]">
                Movimentação dos próximos dias
              </CardTitle>
              <p className="mt-1 text-xs text-[#81908B]">Entradas e saídas por data de previsão</p>
            </div>
            <Badge variant="outline" className="border-[#D8E6E0] text-[#547067]">
              10 dias
            </Badge>
          </CardHeader>
          <CardContent>
            <FlowBarChart data={chartData} />
          </CardContent>
        </Card>
        <Card className="border-[#E1E9E5] shadow-[0_10px_32px_rgba(18,62,49,0.04)]">
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-lg text-[#244A3E]">
              Saídas por categoria
            </CardTitle>
            <p className="text-xs text-[#81908B]">Maiores compromissos no período filtrado</p>
          </CardHeader>
          <CardContent>
            {categories.length ? (
              <CategoryBars data={categories} />
            ) : (
              <p className="py-20 text-center text-sm text-[#87958F]">Sem saídas no período.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Card className="border-[#E1E9E5] shadow-[0_10px_32px_rgba(18,62,49,0.04)]">
          <CardHeader className="pb-1">
            <CardTitle className="font-display text-lg text-[#244A3E]">Saldo projetado</CardTitle>
            <p className="text-xs text-[#81908B]">Disponibilidades + entradas − saídas</p>
          </CardHeader>
          <CardContent>
            <BalanceLineChart data={chartData} />
          </CardContent>
        </Card>
        <Card className="border-[#E1E9E5] shadow-[0_10px_32px_rgba(18,62,49,0.04)]">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="font-display text-lg text-[#244A3E]">
                Próximos pagamentos
              </CardTitle>
              <p className="text-xs text-[#81908B]">Por data de previsão</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-[#087158]">
              <Link to="/contas-a-pagar">Ver todos</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {nextPayables.length ? (
              nextPayables.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center gap-3 border-b border-[#EEF2F0] py-3 last:border-none"
                >
                  <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-[#F1F6F3] text-[9px] font-bold uppercase text-[#477166]">
                    <span>{formatDate(row.previsao).slice(0, 2)}</span>
                    <span className="font-medium">
                      {new Intl.DateTimeFormat('pt-BR', { month: 'short' })
                        .format(parsePocketDate(row.previsao))
                        .replace('.', '')}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[#36564C]">
                      {row.razao_social || 'Fornecedor não informado'}
                    </p>
                    <p className="truncate text-[10px] text-[#899690]">
                      {row.categoria || 'Sem categoria'}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#294A40]">
                    {formatCurrency(Math.abs(row.valor))}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex min-h-52 flex-col items-center justify-center text-center">
                <CircleDollarSign className="mb-3 h-7 w-7 text-[#B7C5C0]" />
                <p className="text-sm text-[#7D8C87]">Nenhum pagamento importado.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
