import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, Landmark, Plus, Trash2, WalletCards } from 'lucide-react'
import { EmptyState, ErrorState, PageLoader } from '@/components/PageStates'
import { StatCard } from '@/components/StatCard'
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
import { currentAvailability, latestAvailabilityByAccount } from '@/lib/finance-calculations'
import { formatCurrency, formatDate, getErrorMessage, toInputDate } from '@/lib/format'
import { createAvailability, deleteAvailability, listAvailabilities } from '@/services/finance'
import type { Availability } from '@/types/finance'

const OTHER = '__other__'
const initialForm = {
  conta: 'BTG Pactual',
  outraConta: '',
  saldo: '',
  data: toInputDate(new Date()),
  observacao: '',
}

export default function Availabilities() {
  const { toast } = useToast()
  const [rows, setRows] = useState<Availability[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRows(await listAvailabilities())
    } catch (reason) {
      setError(getErrorMessage(reason, 'Falha ao consultar as disponibilidades.'))
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
      await createAvailability({
        conta_corrente: form.conta === OTHER ? form.outraConta : form.conta,
        saldo: Number(form.saldo.replace(',', '.')),
        data: form.data,
        observacao: form.observacao,
      })
      setOpen(false)
      setForm(initialForm)
      await load()
      toast({
        title: 'Saldo informado',
        description: 'A posição disponível foi atualizada no fluxo.',
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
  async function remove(row: Availability) {
    if (!window.confirm('Excluir este registro de saldo?')) return
    try {
      await deleteAvailability(row.id)
      await load()
      toast({ title: 'Registro excluído' })
    } catch (reason) {
      toast({
        variant: 'destructive',
        title: 'Falha ao excluir',
        description: getErrorMessage(reason),
      })
    }
  }

  const latest = useMemo(() => latestAvailabilityByAccount(rows), [rows])
  const total = useMemo(() => currentAvailability(rows), [rows])
  if (loading && !rows.length) return <PageLoader label="Consultando saldos disponíveis…" />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <p className="max-w-2xl text-sm leading-relaxed text-[#6F817A]">
          Registre uma nova posição sempre que houver conciliação. O fluxo considera o saldo mais
          recente de cada conta.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#087158] hover:bg-[#065B47]">
              <Plus className="h-4 w-4" /> Informar saldo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={submit}>
              <DialogHeader>
                <DialogTitle className="font-display text-xl text-[#21483C]">
                  Nova posição bancária
                </DialogTitle>
                <DialogDescription>
                  Informe o saldo conciliado da conta na data selecionada.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-5">
                <div className="space-y-2">
                  <Label>Conta corrente</Label>
                  <Select
                    value={form.conta}
                    onValueChange={(value) => setForm({ ...form, conta: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BTG Pactual">BTG Pactual</SelectItem>
                      <SelectItem value="Banco do Brasil">Banco do Brasil</SelectItem>
                      <SelectItem value={OTHER}>Outra conta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.conta === OTHER && (
                  <div className="space-y-2">
                    <Label htmlFor="other">Nome da conta</Label>
                    <Input
                      id="other"
                      required
                      value={form.outraConta}
                      onChange={(event) => setForm({ ...form, outraConta: event.target.value })}
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="balance">Saldo</Label>
                    <Input
                      id="balance"
                      type="number"
                      step="0.01"
                      required
                      value={form.saldo}
                      onChange={(event) => setForm({ ...form, saldo: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Data</Label>
                    <Input
                      id="date"
                      type="date"
                      required
                      value={form.data}
                      onChange={(event) => setForm({ ...form, data: event.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Observação</Label>
                  <Textarea
                    id="note"
                    value={form.observacao}
                    onChange={(event) => setForm({ ...form, observacao: event.target.value })}
                    placeholder="Ex.: saldo conciliado no extrato"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="bg-[#087158] hover:bg-[#065B47]">
                  {saving ? 'Salvando…' : 'Salvar posição'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Disponibilidade total"
          value={formatCurrency(total)}
          helper={`${latest.length} contas na posição atual`}
          icon={WalletCards}
          tone="green"
        />
        {latest.slice(0, 2).map((row, index) => (
          <StatCard
            key={row.id}
            label={row.conta_corrente}
            value={formatCurrency(row.saldo)}
            helper={`Posição de ${formatDate(row.data)}`}
            icon={index === 0 ? Landmark : Building2}
            tone={index === 0 ? 'teal' : 'slate'}
          />
        ))}
      </div>
      <Card className="overflow-hidden border-[#E1E9E5]">
        {rows.length === 0 ? (
          <EmptyState
            icon={WalletCards}
            title="Nenhum saldo informado"
            description="Cadastre os saldos iniciais das contas para fechar a projeção do fluxo."
            action={<Button onClick={() => setOpen(true)}>Informar saldo</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-[#F3F7F5] text-[10px] uppercase tracking-wider text-[#71837C]">
                <tr>
                  <th className="px-5 py-3.5">Conta corrente</th>
                  <th className="px-5 py-3.5">Data da posição</th>
                  <th className="px-5 py-3.5">Observação</th>
                  <th className="px-5 py-3.5 text-right">Saldo</th>
                  <th className="w-14 px-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-[#EDF2EF]">
                    <td className="px-5 py-4 font-semibold text-[#36564C]">{row.conta_corrente}</td>
                    <td className="px-5 py-4 text-[#61746D]">{formatDate(row.data)}</td>
                    <td className="max-w-md px-5 py-4 text-[#71817B]">{row.observacao || '—'}</td>
                    <td
                      className={`whitespace-nowrap px-5 py-4 text-right font-semibold ${row.saldo >= 0 ? 'text-[#16795F]' : 'text-red-600'}`}
                    >
                      {formatCurrency(row.saldo)}
                    </td>
                    <td className="px-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-[#899690] hover:text-red-600"
                        onClick={() => remove(row)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
