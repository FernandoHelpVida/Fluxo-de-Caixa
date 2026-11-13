import { ChangeEvent, DragEvent, useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  History,
  LoaderCircle,
  RefreshCw,
  Trash2,
  UploadCloud,
  XCircle,
} from 'lucide-react'
import { EmptyState, ErrorState, PageLoader } from '@/components/PageStates'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useToast } from '@/hooks/use-toast'
import { formatDate, formatDateTime, getErrorMessage } from '@/lib/format'
import {
  importOmieSpreadsheet,
  limparImportacoesComErro,
  listImportIssues,
  listImports,
} from '@/services/finance'
import type { ImportIssue, ImportRecord } from '@/types/finance'

const statusConfig = {
  processando: {
    label: 'Processando',
    icon: LoaderCircle,
    className: 'bg-blue-50 text-blue-700 border-blue-100',
  },
  concluida: {
    label: 'Concluída',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  concluida_com_alertas: {
    label: 'Com alertas',
    icon: AlertCircle,
    className: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  erro: { label: 'Erro', icon: XCircle, className: 'bg-red-50 text-red-700 border-red-100' },
}

export default function ImportPage() {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [imports, setImports] = useState<ImportRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [limpando, setLimpando] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<ImportRecord | null>(null)
  const [issues, setIssues] = useState<ImportIssue[]>([])
  const [issuesLoading, setIssuesLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setImports(await listImports())
    } catch (reason) {
      setError(getErrorMessage(reason, 'Falha ao consultar o histórico de importações.'))
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

  async function processFile(file?: File) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast({
        variant: 'destructive',
        title: 'Formato não aceito',
        description: 'Selecione uma planilha no formato .xlsx.',
      })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: 'O limite por importação é de 10 MB.',
      })
      return
    }
    setUploading(true)
    try {
      const result = await importOmieSpreadsheet(file)
      await load()
      toast({
        title:
          result.status === 'concluida'
            ? 'Importação concluída'
            : 'Importação concluída com alertas',
        description:
          `${result.total_importadas} lançamentos consolidados do período` +
          (result.substituidas
            ? ` (${result.substituidas} importação(ões) anterior(es) do período substituída(s))`
            : ' (nenhuma importação anterior do período para substituir)') +
          ` e ${result.total_ignoradas} linhas sinalizadas.`,
      })
      window.dispatchEvent(new Event('helpvida:refresh'))
    } catch (reason) {
      await load()
      toast({
        variant: 'destructive',
        title: 'Falha na importação',
        description: getErrorMessage(reason, 'Confira a estrutura da planilha e tente novamente.'),
      })
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function fileChange(event: ChangeEvent<HTMLInputElement>) {
    void processFile(event.target.files?.[0])
  }
  async function limparComErro() {
    setLimpando(true)
    try {
      const result = await limparImportacoesComErro()
      await load()
      toast({
        title: 'Histórico limpo',
        description:
          result.apagadas === 0
            ? 'Nenhuma tentativa com erro encontrada no histórico.'
            : `${result.apagadas} tentativa(s) com erro apagada(s) do histórico.`,
      })
    } catch (reason) {
      toast({
        variant: 'destructive',
        title: 'Falha ao limpar o histórico',
        description: getErrorMessage(reason, 'Tente novamente em instantes.'),
      })
    } finally {
      setLimpando(false)
    }
  }
  function drop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    void processFile(event.dataTransfer.files?.[0])
  }
  async function openIssues(item: ImportRecord) {
    setSelected(item)
    setIssuesLoading(true)
    try {
      setIssues(await listImportIssues(item.id))
    } catch (reason) {
      toast({
        variant: 'destructive',
        title: 'Falha ao consultar inconsistências',
        description: getErrorMessage(reason),
      })
    } finally {
      setIssuesLoading(false)
    }
  }

  if (loading && !imports.length)
    return <PageLoader label="Consultando histórico de importações…" />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="space-y-6 animate-fade-in">
      <Alert className="border-[#D9E7E1] bg-[#EFF7F3] text-[#34594D]">
        <RefreshCw className="h-4 w-4 text-[#0A8267]" />
        <AlertTitle className="font-semibold">Substituição inteligente por período</AlertTitle>
        <AlertDescription className="text-[#5E756D]">
          Cada nova importação substitui os meses presentes no arquivo: os lançamentos e o histórico
          daquele período são sobrescritos, nunca acumulados. Se houver erro de leitura, os
          lançamentos atuais são preservados.
        </AlertDescription>
      </Alert>
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-[#E1E9E5] shadow-[0_10px_32px_rgba(18,62,49,0.04)]">
          <CardHeader>
            <CardTitle className="font-display text-xl text-[#244A3E]">
              Enviar pivot do OMIE
            </CardTitle>
            <p className="text-sm text-[#71817B]">
              O tratamento normaliza datas, valores e textos, além de remover totais e subtotais.
            </p>
          </CardHeader>
          <CardContent>
            <div
              onDragEnter={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={drop}
              className={`flex min-h-[280px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition-colors ${dragging ? 'border-[#0A8B6D] bg-[#EEF8F4]' : 'border-[#CFE0D8] bg-[#FAFCFB]'}`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={fileChange}
                className="hidden"
              />
              <div className="mb-5 rounded-2xl bg-[#E5F3EE] p-4">
                {uploading ? (
                  <LoaderCircle className="h-8 w-8 animate-spin text-[#087158]" />
                ) : (
                  <UploadCloud className="h-8 w-8 text-[#087158]" />
                )}
              </div>
              <h3 className="font-display text-lg font-semibold text-[#2D5145]">
                {uploading
                  ? 'Lendo e consolidando a planilha…'
                  : 'Arraste a planilha para esta área'}
              </h3>
              <p className="mt-2 max-w-sm text-sm text-[#7C8B86]">
                {uploading
                  ? 'Aguarde. Não feche esta página durante o processamento.'
                  : 'ou selecione o arquivo exportado do OMIE'}
              </p>
              {uploading ? (
                <Progress value={68} className="mt-6 h-2 max-w-sm" />
              ) : (
                <Button
                  className="mt-6 bg-[#087158] hover:bg-[#065B47]"
                  onClick={() => inputRef.current?.click()}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Selecionar arquivo .xlsx
                </Button>
              )}
              <p className="mt-4 text-[11px] text-[#9AA6A2]">Formato .xlsx · até 10 MB</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E1E9E5] shadow-[0_10px_32px_rgba(18,62,49,0.04)]">
          <CardHeader>
            <CardTitle className="font-display text-xl text-[#244A3E]">
              O que será tratado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              'Datas de previsão e vencimento em formatos diferentes',
              'Valores com vírgula, ponto, símbolo e negativos',
              'Linhas de total e subtotal da pivot',
              'Agrupamentos repetidos por categoria e departamento',
              'Inconsistências mantidas em relatório auditável',
            ].map((item, index) => (
              <div key={item} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E8F3EE] text-xs font-bold text-[#087158]">
                  {index + 1}
                </span>
                <p className="pt-1 text-sm leading-relaxed text-[#526A62]">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card className="overflow-hidden border-[#E1E9E5]">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 font-display text-lg text-[#244A3E]">
              <History className="h-5 w-5 text-[#0B8067]" /> Histórico de importações
            </CardTitle>
            <p className="mt-1 text-xs text-[#81908B]">
              Últimos arquivos processados e seus resultados
            </p>
          </div>
          {imports.some((item) => item.status === 'erro') && (
            <Button
              variant="outline"
              size="sm"
              disabled={limpando}
              className="border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => void limparComErro()}
            >
              {limpando ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Limpar tentativas com erro
            </Button>
          )}
        </CardHeader>
        {imports.length === 0 ? (
          <EmptyState
            icon={FileSpreadsheet}
            title="Nenhuma importação realizada"
            description="Envie a primeira pivot do OMIE para consolidar as contas a pagar."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-left text-xs">
              <thead className="bg-[#F3F7F5] text-[10px] uppercase tracking-wider text-[#71837C]">
                <tr>
                  <th className="px-5 py-3.5">Arquivo</th>
                  <th className="px-5 py-3.5">Processado em</th>
                  <th className="px-5 py-3.5">Período</th>
                  <th className="px-5 py-3.5">Registros</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Inconsistências</th>
                </tr>
              </thead>
              <tbody>
                {imports.map((item) => {
                  const config = statusConfig[item.status]
                  const Icon = config.icon
                  return (
                    <tr key={item.id} className="border-t border-[#EDF2EF]">
                      <td className="px-5 py-4">
                        <p className="max-w-[260px] truncate font-semibold text-[#36564C]">
                          {item.nome_arquivo}
                        </p>
                        <p className="mt-0.5 max-w-[300px] truncate text-[10px] text-[#899690]">
                          {item.mensagem}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[#61746D]">
                        {formatDateTime(item.created)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[#61746D]">
                        {item.periodo_inicio
                          ? `${formatDate(item.periodo_inicio)} a ${formatDate(item.periodo_fim)}`
                          : '—'}
                      </td>
                      <td className="px-5 py-4 font-semibold text-[#36564C]">
                        {item.total_importadas || 0}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="outline" className={config.className}>
                          <Icon
                            className={`mr-1 h-3 w-3 ${item.status === 'processando' ? 'animate-spin' : ''}`}
                          />{' '}
                          {config.label}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!item.total_ignoradas && item.status !== 'erro'}
                          className="text-[#9A7410]"
                          onClick={() => openIssues(item)}
                        >
                          {item.total_ignoradas || 0}{' '}
                          {item.total_ignoradas === 1 ? 'ocorrência' : 'ocorrências'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null)
            setIssues([])
          }
        }}
      >
        <SheetContent className="w-full overflow-hidden sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="font-display text-xl text-[#244A3E]">
              Relatório de inconsistências
            </SheetTitle>
            <SheetDescription>
              {selected?.nome_arquivo} · {selected?.total_ignoradas || 0} linhas sinalizadas
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="mt-6 h-[calc(100vh-150px)] pr-4">
            {issuesLoading ? (
              <div className="flex justify-center py-16">
                <LoaderCircle className="h-6 w-6 animate-spin text-[#087158]" />
              </div>
            ) : issues.length ? (
              <div className="space-y-3">
                {issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="rounded-xl border border-[#E4EBE7] bg-[#FAFCFB] p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className="border-amber-200 bg-amber-50 text-amber-700"
                      >
                        {issue.tipo.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-[10px] text-[#87958F]">
                        {issue.linha ? `Linha ${issue.linha}` : 'Arquivo'}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-[#3D5B52]">{issue.descricao}</p>
                    {issue.conteudo && (
                      <p className="mt-2 break-words rounded-lg bg-white p-2 font-mono text-[10px] leading-relaxed text-[#75847F]">
                        {issue.conteudo}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="Sem inconsistências detalhadas"
                description={selected?.mensagem || 'Nenhuma ocorrência foi registrada.'}
              />
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  )
}
