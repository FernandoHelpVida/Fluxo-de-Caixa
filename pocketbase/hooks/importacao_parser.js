// Parser da pivot do OMIE para o app HelpVida.
// Módulo puro (sem acesso a $app): carregado pelo hook importacao.pb.js via require().
// Apenas detecta estrutura — nenhum dado da planilha pode ficar embarcado aqui.

function limparTexto(value) {
  return String(value || '')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\*\*/g, '')
    .replace(/\\\|/g, '|')
    .replace(/\s+/g, ' ')
    .trim()
}

function semAcentos(value) {
  return limparTexto(value)
    .toLowerCase()
    .replace(/[áàãâä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòõôö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function separarLinhaMarkdown(line) {
  let text = String(line || '').trim()
  if (text.charAt(0) === '|') text = text.slice(1)
  if (text.charAt(text.length - 1) === '|') text = text.slice(0, -1)
  const marker = '__PIPE_ESCAPADO__'
  return text
    .replace(/\\\|/g, marker)
    .split('|')
    .map((cell) => limparTexto(cell.replace(new RegExp(marker, 'g'), '|')))
}

function linhaSeparadora(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{2,}:?$/.test(cell.replace(/\s/g, '')))
}

// Exportação que rotula as colunas ("column_1", "Column 2"...) sem nomes reais.
function linhaCabecalhoGenerico(cells) {
  const filled = cells.filter((cell) => limparTexto(cell))
  return filled.length > 0 && filled.every((cell) => /^(column|coluna)[\s_]*\d+$/i.test(cell))
}

// ---- Reconhecimento de datas (múltiplos formatos) ----

const MESES_PT = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
}
const MESES_EN = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
}

function diasNoMes(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function formatarData(year, month, day) {
  if (
    year < 1900 ||
    year > 2200 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > diasNoMes(year, month)
  )
    return ''
  return (
    String(year) +
    '-' +
    String(month).padStart(2, '0') +
    '-' +
    String(day).padStart(2, '0') +
    ' 12:00:00.000Z'
  )
}

// "Wed Nov 25 2026 00:00:00 GMT+0000 (Coordinated Universal Time)",
// "Nov 25 2026", "25 Nov 2026", "Nov 25 2026, 00:00:00 (UTC -03:00)"
function dataInglesa(text) {
  const normalized = semAcentos(text)
  let match = normalized.match(/\b([a-z]{3}) ([a-z]{3}) (\d{1,2}) (\d{4})\b/)
  if (match && MESES_EN[match[2]])
    return formatarData(Number(match[4]), MESES_EN[match[2]], Number(match[3]))
  match = normalized.match(/\b([a-z]{3}) (\d{1,2}) (\d{4})\b/)
  if (match && MESES_EN[match[1]])
    return formatarData(Number(match[3]), MESES_EN[match[1]], Number(match[2]))
  match = normalized.match(/\b(\d{1,2}) ([a-z]{3}) (\d{4})\b/)
  if (match && MESES_EN[match[2]])
    return formatarData(Number(match[3]), MESES_EN[match[2]], Number(match[1]))
  return ''
}
// Datas serializadas da exportação: "2026-11-09", "2026-11-09 12:00:00.000Z".
function dataISO(text) {
  const match = String(text || '')
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return ''
  return formatarData(Number(match[1]), Number(match[2]), Number(match[3]))
}

function normalizarDataBase(raw) {
  const text = limparTexto(raw)
    .replace(/\u00a0/g, ' ')
    .replace(/\(.*?\)/g, ' ')
    .replace(/GMT[+-]\d{4}/gi, ' ')
  if (!text) return ''
  const inglesa = dataInglesa(text)
  if (inglesa) return inglesa

  // ISO primeiro: sem isso, "2026-11-09" casa no padrão dia-mês-ano pelo
  // final ("26-11-09") e vira 26/11/2009.
  const iso = dataISO(text)
  if (iso) return iso

  let match = text.match(/(?:^|\D)(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?=\D|$)/)
  if (match) {
    let year = Number(match[3])
    if (year < 100) year += year >= 70 ? 1900 : 2000
    return formatarData(year, Number(match[2]), Number(match[1]))
  }
  match = text.match(/(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/)
  if (match) return formatarData(Number(match[1]), Number(match[2]), Number(match[3]))

  const normalized = semAcentos(text)
  match = normalized.match(/(\d{1,2})(?: de)? ([a-z]+)(?: de)? (\d{4})/)
  if (match && MESES_PT[match[2]])
    return formatarData(Number(match[3]), MESES_PT[match[2]], Number(match[1]))
  match = normalized.match(/([a-z]+) (\d{1,2}),? (\d{4})/)
  if (match && MESES_PT[match[1]])
    return formatarData(Number(match[3]), MESES_PT[match[1]], Number(match[2]))

  const trimmed = text.trim()
  if (/^\d{5}(\.\d+)?$/.test(trimmed)) {
    const serial = Math.floor(Number(trimmed))
    if (serial > 20000 && serial < 100000) {
      const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000)
      return formatarData(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
    }
  }
  return ''
}

// Rótulo da pivot embutido na célula ("Contas a Pagar: Wed Nov 25 2026 ...").
// Só remove o prefixo se sobrar uma data reconhecível depois dos dois pontos.
function removerRotuloPivot(text) {
  const match = text.match(/^[^:]{1,60}:\s*(.+)$/)
  if (!match) return text
  const rest = match[1]
  if (dataInglesa(rest) || normalizarDataBase(rest)) return rest
  return text
}

function normalizarData(raw) {
  return normalizarDataBase(removerRotuloPivot(limparTexto(raw)))
}

// ---- Reconhecimento de valores ----

function normalizarValor(raw) {
  let text = limparTexto(raw).replace(/\u00a0/g, '')
  if (!text) return null
  // Células não numéricas ("N/D", "PLACAS", textos) não são valores.
  let negative = false
  if (/^\(.*\)$/.test(text)) {
    negative = true
    text = text.slice(1, -1)
  }
  text = text
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/[^0-9,.-]/g, '')
  if (!text || !/\d/.test(text)) return null
  if (text.charAt(text.length - 1) === '-') {
    negative = true
    text = text.slice(0, -1)
  }
  if (text.charAt(0) === '-') {
    negative = true
    text = text.slice(1)
  }
  const comma = text.lastIndexOf(',')
  const dot = text.lastIndexOf('.')
  if (comma >= 0 && dot >= 0) {
    text = comma > dot ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '')
  } else if (comma >= 0) {
    const decimals = text.length - comma - 1
    text =
      decimals > 0 && decimals <= 2
        ? text.replace(/\./g, '').replace(',', '.')
        : text.replace(/,/g, '')
  } else if (dot >= 0 && text.length - dot - 1 > 2) {
    text = text.replace(/\./g, '')
  }
  const value = Number(text)
  if (!Number.isFinite(value)) return null
  return negative ? -value : value
}

// ---- Detecção dinâmica de cabeçalho / colunas ----

function identificarCampo(header) {
  const value = semAcentos(header)
  if (!value) return ''
  if (value.indexOf('previs') >= 0 || value === 'data prevista') return 'previsao'
  if (
    value.indexOf('razao social') >= 0 ||
    value === 'fornecedor' ||
    value.indexOf('nome fornecedor') >= 0 ||
    value === 'favorecido'
  )
    return 'razao_social'
  if (value.indexOf('vencimento') >= 0 || value === 'data venc') return 'vencimento'
  if (
    value === 'registro' ||
    value.indexOf('numero titulo') >= 0 ||
    value === 'titulo' ||
    value === 'id titulo' ||
    value === 'documento'
  )
    return 'registro'
  if (value.indexOf('categoria') >= 0 || value.indexOf('classificacao') >= 0 || value === 'grupo')
    return 'categoria'
  if (
    value.indexOf('conta corrente') >= 0 ||
    value === 'conta bancaria' ||
    value === 'banco' ||
    value === 'conta'
  )
    return 'conta_corrente'
  if (
    value.indexOf('nota fiscal') >= 0 ||
    value === 'nf' ||
    value === 'n f' ||
    value.indexOf('numero nf') >= 0 ||
    value.indexOf('numero nota') >= 0
  )
    return 'nota_fiscal'
  if (
    value === 'valor' ||
    value.indexOf('valor a pagar') >= 0 ||
    value.indexOf('valor titulo') >= 0 ||
    value.indexOf('valor previsto') >= 0 ||
    value.indexOf('valor liquido') >= 0 ||
    value.indexOf('valor pago') >= 0 ||
    value.indexOf('valor original') >= 0
  )
    return 'valor'
  // Rótulo real da pivot do OMIE: a coluna de valores chama "A Pagar ou Receber".
  // "Contas a Pagar" é o título da pivot, não uma coluna — não pode virar valor.
  if (value.indexOf('contas a pagar') < 0) {
    if (
      value.indexOf('a pagar ou receber') >= 0 ||
      value.indexOf('pagar ou receber') >= 0 ||
      value.indexOf('a pagar') >= 0 ||
      value.indexOf('a receber') >= 0
    )
      return 'valor'
  }
  if (
    value.indexOf('departamento') >= 0 ||
    value.indexOf('centro de custo') >= 0 ||
    value === 'setor'
  )
    return 'departamento'
  if (value === 'data' || value === 'data pagamento') return 'previsao'
  return ''
}

function mapaCabecalho(cells) {
  const map = {}
  cells.forEach((cell, index) => {
    const field = identificarCampo(cell)
    if (field && map[field] === undefined) map[field] = index
  })
  return map
}

function cabecalhoValido(map) {
  return map.valor !== undefined && (map.previsao !== undefined || map.vencimento !== undefined)
}

// ---- Inferência por conteúdo (quando os nomes das colunas não ajudam) ----

function estatisticasColunas(rows, limit) {
  const sample = rows.slice(0, limit || 30)
  const columns = []
  const width = sample.reduce((max, row) => Math.max(max, row.cells.length), 0)
  for (let index = 0; index < width; index += 1) {
    let dates = 0
    let negatives = 0
    let values = 0
    let filled = 0
    sample.forEach((row) => {
      const cell = row.cells[index]
      const text = limparTexto(cell)
      if (!text) return
      filled += 1
      if (normalizarData(cell)) dates += 1
      const number = normalizarValor(cell)
      if (number !== null && number !== 0) {
        values += 1
        if (number < 0) negatives += 1
      }
    })
    if (filled === 0) continue
    columns.push({
      index: index,
      dates: dates / filled,
      values: values / filled,
      negatives: negatives / Math.max(values, 1),
    })
  }
  return columns
}

// Tabela de dados sem cabeçalho nomeado: exige ao menos 1 coluna de data e 1 de
// valor reconhecíveis pelo conteúdo e devolve o mapa de posições.
// Data vence sobre número: células de data contêm dígitos, por isso uma coluna
// com maioria de datas é tratada como data mesmo que também "parseie" como número.
function inferirMapaPorConteudo(rows) {
  const stats = estatisticasColunas(rows, 30)
  const dateColumns = stats.filter((col) => col.dates >= 0.6)
  const valueColumns = stats.filter((col) => col.values >= 0.6 && col.dates < 0.6)
  if (!dateColumns.length || !valueColumns.length) return null
  const valueColumn = valueColumns
    .slice()
    .sort((a, b) => b.negatives - a.negatives || a.index - b.index)[0]
  const orderedDates = dateColumns.slice().sort((a, b) => a.index - b.index)
  const map = { valor: valueColumn.index, previsao: orderedDates[0].index }
  const secondDate = orderedDates[1]
  if (secondDate) map.vencimento = secondDate.index
  return map
}

function linhaSemRotuloSoValor(row, map) {
  if (!row || !row.cells) return false
  const filled = []
  for (let index = 0; index < row.cells.length; index += 1) {
    if (map && map.valor === index) continue
    if (limparTexto(row.cells[index])) filled.push(index)
  }
  return filled.length === 0
}

function linhaDeTotal(cells) {
  return cells
    .slice(0, Math.min(cells.length, 5))
    .map(semAcentos)
    .some(
      (value) =>
        value === 'total' ||
        value === 'subtotal' ||
        value === 'total geral' ||
        value.indexOf('subtotal ') === 0 ||
        value.indexOf('total geral ') === 0 ||
        value.indexOf('total ') === 0,
    )
}

function extrairTabelas(markdown) {
  const lines = String(markdown || '').split(/\r?\n/)
  const tables = []
  let current = []
  lines.forEach((line, index) => {
    if (/^\s*\|.*\|\s*$/.test(line)) {
      current.push({ line: index + 1, cells: separarLinhaMarkdown(line) })
    } else if (current.length) {
      tables.push(current)
      current = []
    }
  })
  if (current.length) tables.push(current)
  return tables
}

function descreverTabelas(tables) {
  if (!tables.length) return 'nenhuma tabela foi encontrada no arquivo'
  const parts = tables
    .slice(0, 5)
    .map((rows) => {
      const width = rows.reduce((max, row) => Math.max(max, row.cells.length), 0)
      return 'tabela com ' + width + ' colunas e ' + rows.length + ' linhas'
    })
    .join('; ')
  return tables.length > 5 ? parts + '; e outras' : parts
}

// ---- Processamento principal ----

function processarMarkdown(markdown) {
  const tables = extrairTabelas(markdown)
  const entries = []
  const issues = []
  let totalRows = 0
  let foundHeader = false

  tables.forEach((rows) => {
    if (foundHeader) return
    let headerIndex = -1
    let map = {}
    let porConteudo = false

    // 1) Cabeçalho nomeado em qualquer linha da tabela.
    for (let index = 0; index < rows.length; index += 1) {
      const candidate = mapaCabecalho(rows[index].cells)
      if (cabecalhoValido(candidate)) {
        headerIndex = index
        map = candidate
        foundHeader = true
        break
      }
    }

    // 2) Sem cabeçalho nomeado: inferir colunas de data e valor pelo conteúdo
    //    (caso da pivot exportada com colunas genéricas column_1, column_2...).
    if (!foundHeader) {
      const inferred = inferirMapaPorConteudo(rows)
      if (inferred) {
        headerIndex = -1
        map = inferred
        porConteudo = true
        foundHeader = true
      }
    }

    if (!foundHeader) return

    const carried = { razao_social: '', categoria: '', conta_corrente: '', departamento: '' }
    for (let index = headerIndex + 1; index < rows.length; index += 1) {
      const row = rows[index]
      if (linhaCabecalhoGenerico(row.cells)) continue
      if (linhaSeparadora(row.cells)) continue
      if (!porConteudo && cabecalhoValido(mapaCabecalho(row.cells))) continue
      if (!row.cells.some((cell) => limparTexto(cell))) continue
      totalRows += 1
      const content = row.cells.join(' | ').slice(0, 950)
      // Linha de total sem rótulo ("Total do período" pode vir só com o valor).
      if (linhaDeTotal(row.cells) || linhaSemRotuloSoValor(row, map)) {
        issues.push({
          line: row.line,
          type: 'linha_ignorada',
          description: 'Linha de subtotal ou total removida da consolidação.',
          content: content,
        })
        continue
      }

      const cellAt = (field) => (map[field] === undefined ? '' : limparTexto(row.cells[map[field]]))
      Object.keys(carried).forEach((field) => {
        const value = cellAt(field)
        if (value) carried[field] = value
      })

      const previsaoRaw = cellAt('previsao') || cellAt('vencimento')
      const previsao = normalizarData(previsaoRaw)
      if (!previsao) {
        issues.push({
          line: row.line,
          type: 'data_invalida',
          description:
            'Data de previsão ou vencimento não reconhecida no valor "' +
            previsaoRaw.slice(0, 60) +
            '".',
          content: content,
        })
        continue
      }
      const vencimentoRaw = cellAt('vencimento')
      const vencimento = vencimentoRaw ? normalizarData(vencimentoRaw) : ''
      if (vencimentoRaw && !vencimento) {
        issues.push({
          line: row.line,
          type: 'data_invalida',
          description:
            'Data de vencimento não reconhecida no valor "' + vencimentoRaw.slice(0, 60) + '".',
          content: content,
        })
        continue
      }
      const valor = normalizarValor(cellAt('valor'))
      if (valor === null || valor === 0) {
        issues.push({
          line: row.line,
          type: 'valor_invalido',
          description:
            'Valor vazio, igual a zero ou em formato inválido no valor "' +
            cellAt('valor').slice(0, 40) +
            '".',
          content: content,
        })
        continue
      }
      entries.push({
        previsao: previsao,
        razao_social: cellAt('razao_social') || carried.razao_social,
        vencimento: vencimento || previsao,
        registro: cellAt('registro'),
        categoria: cellAt('categoria') || carried.categoria,
        conta_corrente: cellAt('conta_corrente') || carried.conta_corrente,
        nota_fiscal: cellAt('nota_fiscal'),
        valor: valor,
        departamento: cellAt('departamento') || carried.departamento,
        periodo: previsao.slice(0, 7),
        line: row.line,
      })
    }
  })

  if (!foundHeader) {
    issues.push({
      line: 0,
      type: 'cabecalho_invalido',
      description:
        'Não foi encontrada uma tabela com colunas de data e valor (a planilha precisa de pelo menos uma coluna em que a maioria das células seja data e outra em que a maioria seja número). Estrutura encontrada: ' +
        descreverTabelas(tables) +
        '. Confira se o arquivo contém os lançamentos da pivot do OMIE.',
      content: '',
    })
  }
  return { entries: entries, issues: issues, totalRows: totalRows, foundHeader: foundHeader }
}

module.exports = {
  limparTexto: limparTexto,
  normalizarData: normalizarData,
  normalizarValor: normalizarValor,
  extrairTabelas: extrairTabelas,
  descreverTabelas: descreverTabelas,
  processarMarkdown: processarMarkdown,
}
