import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownToLine, CheckCircle2, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { EmptyState, ErrorState, PageLoader } from '@/components/PageStates'
import { StatCard } from '@/components/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate, getErrorMessage, toInputDate } from '@/lib/format'
import {
  createReceivable,
  deleteReceivable,
  listReceivables,
  updateReceivableStatus,
} from '@/services/finance'
import type { Receivable, ReceivableStatus } from '@/types/finance'

const initialForm = {
  data: toInputDate(new Date()),
  origem_cliente: '',
  categoria: '',
  valor: '',
  status: 'previsto' as ReceivableStatus,
  observacao: '',
}

export default function Receivables() {
  const { toast } = useToast()
  const [rows, setRows] = useState<Receivable[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(initialForm)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRows(await listReceivables())
    } catch (reason) {
      setError(getErrorMessage(reason, 'Falha ao consultar as entradas.'))
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])
  useEffect(() => {
    const listener = () => void load()
    window.addEventListener('helpvida:refresh', listener)
    return () => window.removeEventListener('helpvida:refresh', listener)
  }, [load])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await createReceivable({ ...form, valor: Number(form.valor.replace(',', '.')) })
      setOpen(false)
      setForm(initialForm)
      await load()
      toast({
        title: 'Entrada cadastrada',
        description: 'A previsão já foi incluída no fluxo de caixa.',
      })
    } catch (reason) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível salvar',
        description: getErrorMessage(reason),
      })
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(row: Receivable) {
    try {
      await updateReceivableStatus(row.id, row.status === 'previsto' ? 'recebido' : 'previsto')
      await load()
      toast({ title: 'Status atualizado' })
    } catch (reason) {
      toast({
        variant: 'destructive',
        title: 'Falha ao atualizar',
        description: getErrorMessage(reason),
      })
    }
  }

  async function remove(row: Receivable) {
    if (!window.confirm(`Excluir a entrada de ${row.origem_cliente}?`)) return
    try {
      await deleteReceivable(row.id)
      await load()
      toast({ title: 'Entrada excluída' })
    } catch (reason) {
      toast({
        variant: 'destructive',
        title: 'Falha ao excluir',
        description: getErrorMessage(reason),
      })
    }
  }

  const totals = useMemo(
    () => ({
      previsto: rows
        .filter((row) => row.status === 'previsto')
        .reduce((sum, row) => sum + row.valor, 0),
      recebido: rows
        .filter((row) => row.status === 'recebido')
        .reduce((sum, row) => sum + row.valor, 0),
    }),
    [rows],
  )
  if (loading && !rows.length) return <PageLoader label="Consultando contas a receber…" />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-[#6F817A]">
            Cadastre manualmente as entradas previstas e acompanhe a realização.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#087158] hover:bg-[#065B47]">
              <Plus className="h-4 w-4" /> Nova entrada
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px]">
            <form onSubmit={submit}>
              <DialogHeader>
                <DialogTitle className="font-display text-xl text-[#21483C]">
                  Nova conta a receber
                </DialogTitle>
                <DialogDescription>
                  Informe a previsão de entrada para incluí-la no fluxo consolidado.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    required
                    type="date"
                    value={form.data}
                    onChange={(event) => setForm({ ...form, data: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value: ReceivableStatus) => setForm({ ...form, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="previsto">Previsto</SelectItem>
                      <SelectItem value="recebido">Recebido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="source">Origem / cliente</Label>
                  <Input
                    id="source"
                    required
                    value={form.origem_cliente}
                    onChange={(event) => setForm({ ...form, origem_cliente: event.target.value })}
                    placeholder="Ex.: repasse assistencial"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Input
                    id="category"
                    required
                    value={form.categoria}
                    onChange={(event) => setForm({ ...form, categoria: event.target.value })}
                    placeholder="Ex.: receita operacional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">Valor</Label>
                  <Input
                    id="value"
                    required
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    type="number"
                    value={form.valor}
                    onChange={(event) => setForm({ ...form, valor: event.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="note">Observação</Label>
                  <Textarea
                    id="note"
                    value={form.observacao}
                    onChange={(event) => setForm({ ...form, observacao: event.target.value })}
                    placeholder="Detalhes opcionais"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="bg-[#087158] hover:bg-[#065B47]">
                  {saving ? 'Salvando…' : 'Cadastrar entrada'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Entradas previstas"
          value={formatCurrency(totals.previsto)}
          helper={`${rows.filter((row) => row.status === 'previsto').length} lançamentos em aberto`}
          icon={ArrowDownToLine}
          tone="teal"
        />
        <StatCard
          label="Entradas recebidas"
          value={formatCurrency(totals.recebido)}
          helper={`${rows.filter((row) => row.status === 'recebido').length} lançamentos realizados`}
          icon={CheckCircle2}
          tone="green"
        />
      </div>
      <Card className="overflow-hidden border-[#E1E9E5]">
        {rows.length === 0 ? (
          <EmptyState
            icon={ArrowDownToLine}
            title="Nenhuma entrada cadastrada"
            description="Cadastre a primeira conta a receber para compor o fluxo."
            action={<Button onClick={() => setOpen(true)}>Nova entrada</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-xs">
              <thead className="bg-[#F3F7F5] text-[10px] uppercase tracking-wider text-[#71837C]">
                <tr>
                  <th className="px-5 py-3.5">Data</th>
                  <th className="px-5 py-3.5">Origem / cliente</th>
                  <th className="px-5 py-3.5">Categoria</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Valor</th>
                  <th className="w-14 px-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-[#EDF2EF]">
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-[#36564C]">
                      {formatDate(row.data)}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-[#36564C]">{row.origem_cliente}</p>
                      <p className="mt-0.5 max-w-md truncate text-[10px] text-[#899690]">
                        {row.observacao || 'Sem observação'}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-[#61746D]">{row.categoria}</td>
                    <td className="px-5 py-4">
                      <Badge
                        className={
                          row.status === 'recebido'
                            ? 'bg-[#E5F4ED] text-[#2F7654] hover:bg-[#E5F4ED]'
                            : 'bg-[#FFF4CF] text-[#8C6F00] hover:bg-[#FFF4CF]'
                        }
                      >
                        {row.status === 'recebido' ? 'Recebido' : 'Previsto'}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-[#16795F]">
                      {formatCurrency(row.valor)}
                    </td>
                    <td className="px-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => changeStatus(row)}>
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Marcar como{' '}
                            {row.status === 'previsto' ? 'recebido' : 'previsto'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => remove(row)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
