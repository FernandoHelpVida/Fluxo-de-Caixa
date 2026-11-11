import { useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, CalendarRange, Scale } from 'lucide-react'
import { BalanceLineChart, FlowBarChart } from '@/components/FlowChart'
import { ErrorState, PageLoader } from '@/components/PageStates'
import { StatCard } from '@/components/StatCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFinanceData } from '@/hooks/useFinanceData'
import {
  buildDailyFlow,
  buildWeeklyFlow,
  currentAvailability,
  sumValues,
} from '@/lib/finance-calculations'
import { addDays, formatCurrency, formatDate, toInputDate } from '@/lib/format'

export default function Flow() {
  const [anchor, setAnchor] = useState(toInputDate(new Date()))
  const { payables, receivables, availabilities, loading, error, reload } = useFinanceData()
  const available = useMemo(() => currentAvailability(availabilities), [availabilities])
  const daily = useMemo(
    () => buildDailyFlow(payables, receivables, available, new Date(`${anchor}T12:00:00`), 14),
    [payables, receivables, available, anchor],
  )
  const weekly = useMemo(
    () => buildWeeklyFlow(payables, receivables, available, new Date(`${anchor}T12:00:00`), 8),
    [payables, receivables, available, anchor],
  )

  if (loading) return <PageLoader label="Montando o fluxo consolidado…" />
  if (error) return <ErrorState message={error} onRetry={reload} />

  const totalIn = sumValues(daily, (item) => item.entradas)
  const totalOut = sumValues(daily, (item) => item.saidas)
  const finalBalance = daily[daily.length - 1]?.saldoAcumulado ?? available

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#E1EAE5] bg-white p-4 shadow-[0_8px_30px_rgba(18,62,49,0.04)] sm:flex-row sm:items-end">
        <label>
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#6E7F79]">
            Data de referência
          </span>
          <Input
            type="date"
            className="h-10 w-full border-[#DCE6E1] sm:w-48"
            value={anchor}
            onChange={(event) => setAnchor(event.target.value)}
          />
        </label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAnchor(toInputDate(addDays(new Date(`${anchor}T12:00:00`), -7)))}
          >
            Semana anterior
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(toInputDate(new Date()))}>
            Hoje
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAnchor(toInputDate(addDays(new Date(`${anchor}T12:00:00`), 7)))}
          >
            Próxima semana
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Entradas em 14 dias"
          value={formatCurrency(totalIn)}
          helper="Previstas e recebidas"
          icon={ArrowDownToLine}
          tone="teal"
        />
        <StatCard
          label="Saídas em 14 dias"
          value={formatCurrency(totalOut)}
          helper="Por previsão de pagamento"
          icon={ArrowUpFromLine}
          tone="yellow"
        />
        <StatCard
          label="Movimento líquido"
          value={formatCurrency(totalIn - totalOut)}
          helper="Entradas menos saídas"
          icon={Scale}
          tone="slate"
          trend={totalIn - totalOut >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          label="Saldo ao fim"
          value={formatCurrency(finalBalance)}
          helper={`Em ${formatDate(daily[daily.length - 1]?.key || anchor)}`}
          icon={CalendarRange}
          tone="green"
        />
      </div>

      <Tabs defaultValue="diario" className="space-y-5">
        <TabsList className="h-11 bg-[#E9F0EC] p-1">
          <TabsTrigger
            value="diario"
            className="px-5 data-[state=active]:bg-white data-[state=active]:text-[#087158]"
          >
            Visão diária
          </TabsTrigger>
          <TabsTrigger
            value="semanal"
            className="px-5 data-[state=active]:bg-white data-[state=active]:text-[#087158]"
          >
            Visão semanal
          </TabsTrigger>
        </TabsList>
        <TabsContent value="diario" className="space-y-5">
          <Card className="border-[#E1E9E5]">
            <CardHeader>
              <CardTitle className="font-display text-lg text-[#244A3E]">
                Entradas e saídas por dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FlowBarChart data={daily} />
            </CardContent>
          </Card>
          <Card className="border-[#E1E9E5]">
            <CardHeader className="pb-0">
              <CardTitle className="font-display text-lg text-[#244A3E]">
                Evolução do saldo projetado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BalanceLineChart data={daily} />
            </CardContent>
          </Card>
          <FlowTable data={daily} />
        </TabsContent>
        <TabsContent value="semanal" className="space-y-5">
          <Card className="border-[#E1E9E5]">
            <CardHeader>
              <CardTitle className="font-display text-lg text-[#244A3E]">
                Consolidação por semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FlowBarChart data={weekly} />
            </CardContent>
          </Card>
          <Card className="border-[#E1E9E5]">
            <CardHeader className="pb-0">
              <CardTitle className="font-display text-lg text-[#244A3E]">
                Saldo acumulado semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BalanceLineChart data={weekly} />
            </CardContent>
          </Card>
          <FlowTable data={weekly} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function FlowTable({ data }: { data: ReturnType<typeof buildDailyFlow> }) {
  return (
    <Card className="overflow-hidden border-[#E1E9E5]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-[#F4F8F6] text-[10px] uppercase tracking-wider text-[#71837C]">
            <tr>
              <th className="px-5 py-3.5">Período</th>
              <th className="px-5 py-3.5 text-right">Entradas</th>
              <th className="px-5 py-3.5 text-right">Saídas</th>
              <th className="px-5 py-3.5 text-right">Resultado</th>
              <th className="px-5 py-3.5 text-right">Saldo acumulado</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.key} className="border-t border-[#EDF2EF]">
                <td className="px-5 py-3.5 font-semibold text-[#3D5B52]">{item.fullLabel}</td>
                <td className="px-5 py-3.5 text-right text-[#0B8067]">
                  {formatCurrency(item.entradas)}
                </td>
                <td className="px-5 py-3.5 text-right text-[#9A7410]">
                  {formatCurrency(item.saidas)}
                </td>
                <td
                  className={`px-5 py-3.5 text-right font-semibold ${item.saldo >= 0 ? 'text-[#0B8067]' : 'text-[#B55448]'}`}
                >
                  {formatCurrency(item.saldo)}
                </td>
                <td className="px-5 py-3.5 text-right font-semibold text-[#294B40]">
                  {formatCurrency(item.saldoAcumulado)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
