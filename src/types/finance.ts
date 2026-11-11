export type BaseRecord = {
  id: string
  created: string
  updated: string
}

export type ImportStatus = 'processando' | 'concluida' | 'concluida_com_alertas' | 'erro'

export type ImportRecord = BaseRecord & {
  arquivo: string
  nome_arquivo: string
  status: ImportStatus
  total_linhas: number
  total_importadas: number
  total_ignoradas: number
  periodo_inicio: string
  periodo_fim: string
  mensagem: string
}

export type Payable = BaseRecord & {
  importacao: string
  previsao: string
  razao_social: string
  vencimento: string
  registro: string
  categoria: string
  conta_corrente: string
  nota_fiscal: string
  valor: number
  departamento: string
  periodo: string
  linha_origem: number
}

export type ReceivableStatus = 'previsto' | 'recebido'

export type Receivable = BaseRecord & {
  data: string
  origem_cliente: string
  categoria: string
  valor: number
  status: ReceivableStatus
  observacao: string
}

export type Availability = BaseRecord & {
  conta_corrente: string
  saldo: number
  data: string
  observacao: string
}

export type ImportIssueType =
  | 'linha_ignorada'
  | 'valor_invalido'
  | 'data_invalida'
  | 'cabecalho_invalido'
  | 'arquivo_invalido'

export type ImportIssue = BaseRecord & {
  importacao: string
  linha: number
  tipo: ImportIssueType
  descricao: string
  conteudo: string
}

export type FinanceFilters = {
  inicio: string
  fim: string
  categoria: string
  conta: string
  departamento: string
}

export type ImportResult = {
  id: string
  status: ImportStatus
  total_linhas: number
  total_importadas: number
  total_ignoradas: number
  periodo_inicio: string
  periodo_fim: string
}
