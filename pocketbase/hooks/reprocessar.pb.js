// Reprocessamento da pivot OMIE — hook do app HelpVida (Skip Cloud / JSVM).
// GET /backend/v1/helpvida/reprocessar/{id}
//   Header OU query "token" deve conter o segredo HELPVIDA_REPROCESS_TOKEN.
// Lê o arquivo xlsx já anexado a um registro de "importacoes", converte em
// Markdown e refaz a consolidação (contas_pagar + inconsistências) com as
// REGRAS DE PARSING ATUAIS — mesma correção do parsing de valores aplicada em
// importacao.pb.js (separador sozinho é sempre decimal; nunca milhar).
//
// IMPORTANTE (JSVM): cada callback executa isolado — nada do escopo do arquivo
// é acessível dentro do callback, e require() de módulos externos falhou em
// produção com "Invalid module". Por isso o buildPipeline é duplicado aqui,
// idêntico ao de importacao.pb.js.
//
// Uso (uma vez, para validar a correção): GET .../reprocessar/wlhm8mwt9td41td?token=...

routerAdd('GET', '/backend/v1/helpvida/reprocessar/{id}', (e) => {
  const esperado = String($os.getenv('HELPVIDA_REPROCESS_TOKEN') || '')
  if (!esperado) {
    throw new ForbiddenError('Reprocessamento desabilitado: token não configurado.')
  }
  const informado =
    e.request.header.get('x-reprocess-token') || e.request.url.query().get('token') || ''
  if (informado !== esperado) {
    throw new ForbiddenError('Token de reprocessamento inválido.')
  }

  const id = e.request.pathValue('id')
  let importRecord
  try {
    importRecord = $app.findRecordById('importacoes', id)
  } catch (_) {
    throw new BadRequestError('Importação não encontrada: ' + id)
  }
  if (!importRecord.getString('arquivo')) {
    throw new BadRequestError('A importação informada não possui arquivo anexado.')
  }

  // ---------- pipeline, definido dentro do próprio callback ----------
  function buildPipeline() {
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

    function linhaCabecalhoGenerico(cells) {
      const filled = cells.filter((cell) => limparTexto(cell))
      return filled.length > 0 && filled.every((cell) => /^(column|coluna)[\s_]*\d+$/i.test(cell))
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

    function dataISO(text) {
      const match = String(text || '')
        .trim()
        .match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (!match) return ''
      return formatarData(Number(match[1]), Number(match[2]), Number(match[3]))
    }

    function dataComHora(raw) {
      const text = String(raw || '').trim()
      if (!/\d{1,2}:\d{2}/.test(text)) return ''
      const match = text.match(/^(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\b/)
      return match ? match[1] : ''
    }

    function normalizarDataBase(raw) {
      const text = limparTexto(raw)
        .replace(/\u00a0/g, ' ')
        .replace(/\(.*?\)/g, ' ')
        .replace(/GMT[+-]\d{4}/gi, ' ')
      if (!text) return ''
      const inglesa = dataInglesa(text) || dataInglesa(dataComHora(text))
      if (inglesa) return inglesa
      const iso = dataISO(text) || dataISO(dataComHora(text))
      if (iso) return iso
      let match = text.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/)
      if (match) {
        let year = Number(match[3])
        if (year < 100) year += year >= 70 ? 1900 : 2000
        return formatarData(year, Number(match[2]), Number(match[1]))
      }
      match = text.match(/(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/)
      if (match) return formatarData(Number(match[1]), Number(match[2]), Number(match[3]))
      return ''
    }

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

    function normalizarValor(raw) {
      let text = limparTexto(raw).replace(/\u00a0/g, '')
      if (!text) return null
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
      // Mesma regra de importacao.pb.js: quando vírgula e ponto coexistem, o
      // ÚLTIMO é o decimal e o outro é milhar; um separador sozinho é SEMPRE
      // decimal — nunca milhar. A pivot do OMIE traz números puros do xlsx com
      // ponto decimal de 3 a 6 casas (ex. -2034.768), e descartar o ponto com
      // mais de 2 casas multiplicava o valor por 1000.
      const comma = text.lastIndexOf(',')
      const dot = text.lastIndexOf('.')
      if (comma >= 0 && dot >= 0) {
        text = comma > dot ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '')
      } else if (comma >= 0) {
        text = text.replace(',', '.')
      }
      const value = Number(text)
      if (!Number.isFinite(value)) return null
      return negative ? -value : value
    }

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
      if (
        value.indexOf('categoria') >= 0 ||
        value.indexOf('classificacao') >= 0 ||
        value === 'grupo'
      )
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
      if (
        value.indexOf('a pagar ou receber') >= 0 ||
        value.indexOf('pagar ou receber') >= 0 ||
        value.indexOf('a pagar') >= 0 ||
        value.indexOf('a receber') >= 0
      )
        return 'valor'
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
        if (filled === 0) return
        columns.push({
          index: index,
          dates: dates / filled,
          values: values / filled,
          negatives: negatives / Math.max(values, 1),
        })
      }
      return columns
    }

    function inferirMapaPorConteudo(rows) {
      const stats = estatisticasColunas(rows, 30)
      if (!stats) return null
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
        .slice(0, 5)
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

    function processarMarkdown(markdown) {
      const tables = extrairTabelas(markdown)
      const entries = []
      const issues = []
      let totalRows = 0
      let foundHeader = false

      tables.forEach((rows) => {
        if (rows.length < 2) return
        let headerIndex = -1
        let map = null
        let porConteudo = false

        for (let index = 0; index < rows.length; index += 1) {
          const candidate = mapaCabecalho(rows[index].cells)
          if (cabecalhoValido(candidate)) {
            headerIndex = index
            map = candidate
            break
          }
        }
        if (!map) {
          const inferred = inferirMapaPorConteudo(rows)
          if (inferred) {
            headerIndex = -1
            map = inferred
            porConteudo = true
          }
        }
        if (!map) return
        foundHeader = true

        const carried = { razao_social: '', categoria: '', conta_corrente: '', departamento: '' }
        const start = porConteudo ? 0 : headerIndex + 1
        for (let index = start; index < rows.length; index += 1) {
          const row = rows[index]
          if (linhaCabecalhoGenerico(row.cells)) continue
          if (linhaSeparadora(row.cells)) continue
          if (!porConteudo && cabecalhoValido(mapaCabecalho(row.cells))) continue
          if (!row.cells.some((cell) => limparTexto(cell))) continue
          totalRows += 1
          if (linhaDeTotal(row.cells) || linhaSemRotuloSoValor(row, map)) continue
          const cellAt = (field) =>
            map[field] === undefined ? '' : limparTexto(row.cells[map[field]])
          Object.keys(carried).forEach((field) => {
            const value = cellAt(field)
            if (value) carried[field] = value
          })

          const previsaoRaw = cellAt('previsao') || cellAt('vencimento')
          const previsao = previsaoRaw ? normalizarData(previsaoRaw) : ''
          if (!previsao) continue
          const vencimentoRaw = cellAt('vencimento')
          const vencimento = vencimentoRaw ? normalizarData(vencimentoRaw) : ''
          if (vencimentoRaw && !vencimento) continue
          const valor = normalizarValor(cellAt('valor'))
          if (valor === null || valor === 0) continue
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

      return { entries: entries, issues: issues, totalRows: totalRows, foundHeader: foundHeader }
    }

    // Substituição do histórico (igual a importacao.pb.js).
    function apagarImportacoesAnteriores(tx, periodos, novoId) {
      let apagadas = 0
      const meses = periodos.map((period) => period.slice(0, 7))
      const antigos = tx.findRecordsByFilter('importacoes', '', '-created', 500, 0)
      antigos.forEach((antiga) => {
        if (antiga.id === novoId) return
        if (antiga.get('status') === 'processando') return
        const inicio = String(antiga.get('periodo_inicio') || '')
        const fim = String(antiga.get('periodo_fim') || '')
        if (!inicio || !fim) return
        const inicioMes = inicio.slice(0, 7)
        const fimMes = fim.slice(0, 7)
        let cobre = false
        meses.forEach((mes) => {
          if (mes >= inicioMes && mes <= fimMes) cobre = true
        })
        if (!cobre) return
        let vinculadas = tx.findRecordsByFilter(
          'inconsistencias_importacao',
          "importacao = '" + antiga.id + "'",
          '',
          5000,
          0,
        )
        while (vinculadas.length) {
          vinculadas.forEach((issue) => tx.delete(issue))
          vinculadas = tx.findRecordsByFilter(
            'inconsistencias_importacao',
            "importacao = '" + antiga.id + "'",
            '',
            5000,
            0,
          )
        }
        tx.delete(antiga)
        apagadas += 1
      })
      return apagadas
    }

    function consolidar(appLike, importId, result) {
      let minDate = ''
      let maxDate = ''
      result.entries.forEach((entry) => {
        if (!minDate || entry.previsao < minDate) minDate = entry.previsao
        if (!maxDate || entry.previsao > maxDate) maxDate = entry.previsao
      })
      const periodos = {}
      result.entries.forEach((entry) => {
        periodos[entry.periodo] = true
      })

      // Declarada fora da transação para que o valor chegue ao retorno.
      let substituidas = 0
      appLike.runInTransaction((tx) => {
        substituidas = apagarImportacoesAnteriores(tx, Object.keys(periodos), importId)

        Object.keys(periodos).forEach((period) => {
          const filter = "periodo = '" + String(period).replace(/'/g, "''") + "'"
          let oldRows = tx.findRecordsByFilter('contas_pagar', filter, '', 5000, 0)
          while (oldRows.length) {
            oldRows.forEach((record) => tx.delete(record))
            oldRows = tx.findRecordsByFilter('contas_pagar', filter, '', 5000, 0)
          }
        })

        const payableCollection = tx.findCollectionByNameOrId('contas_pagar')
        result.entries.forEach((entry) => {
          const record = new Record(payableCollection)
          record.set('importacao', importId)
          record.set('previsao', entry.previsao)
          record.set('razao_social', entry.razao_social)
          record.set('vencimento', entry.vencimento)
          record.set('registro', entry.registro)
          record.set('categoria', entry.categoria)
          record.set('conta_corrente', entry.conta_corrente)
          record.set('nota_fiscal', entry.nota_fiscal)
          record.set('valor', entry.valor)
          record.set('departamento', entry.departamento)
          record.set('periodo', entry.periodo)
          record.set('linha_origem', entry.line)
          tx.save(record)
        })

        const issueCollection = tx.findCollectionByNameOrId('inconsistencias_importacao')
        result.issues.slice(0, 500).forEach((item) => {
          const issue = new Record(issueCollection)
          issue.set('importacao', importId)
          issue.set('linha', item.line)
          issue.set('tipo', item.type)
          issue.set('descricao', item.description)
          issue.set('conteudo', item.content)
          tx.save(issue)
        })

        const currentImport = tx.findRecordById('importacoes', importId)
        currentImport.set('status', result.issues.length ? 'concluida_com_alertas' : 'concluida')
        currentImport.set('total_linhas', result.totalRows)
        currentImport.set('total_importadas', result.entries.length)
        currentImport.set('total_ignoradas', result.issues.length)
        currentImport.set('periodo_inicio', minDate)
        currentImport.set('periodo_fim', maxDate)
        currentImport.set(
          'mensagem',
          result.issues.length
            ? result.entries.length +
                ' lançamentos consolidados e ' +
                result.issues.length +
                ' linhas sinalizadas.'
            : result.entries.length + ' lançamentos consolidados sem inconsistências.',
        )
        tx.save(currentImport)
      })
      return { minDate: minDate, maxDate: maxDate, substituidas: substituidas }
    }

    function converterMarkdown(record) {
      const converted = $documents.toMarkdown({ record: record, field: 'arquivo' })
      return String((converted && converted.markdown) || '')
    }

    function executar(appLike, importRecord, markdown) {
      const result = processarMarkdown(markdown)
      if (!result.foundHeader) {
        const principal =
          result.issues.length > 0 && result.issues[0].description
            ? result.issues[0].description
            : 'Não foi encontrada uma tabela com colunas de data e valor.'
        throw new BadRequestError(principal)
      }
      if (!result.entries.length) {
        throw new BadRequestError(
          'A pivot foi lida, mas nenhum lançamento válido foi encontrado. Confira os dados da planilha.',
        )
      }
      const datas = consolidar(appLike, importRecord.id, result)
      return {
        id: importRecord.id,
        status: result.issues.length ? 'concluida_com_alertas' : 'concluida',
        total_linhas: result.totalRows,
        total_importadas: result.entries.length,
        total_ignoradas: result.issues.length,
        periodo_inicio: datas.minDate,
        periodo_fim: datas.maxDate,
        substituidas: datas.substituidas,
      }
    }

    return {
      converterMarkdown: converterMarkdown,
      executar: executar,
    }
  }

  // ---------- corpo da rota ----------
  const pipeline = buildPipeline()
  let markdown = ''
  try {
    markdown = pipeline.converterMarkdown(importRecord)
  } catch (err) {
    throw new BadRequestError(
      'Falha ao converter o arquivo anexado: ' + (err && err.message ? err.message : '?'),
    )
  }
  if (!markdown.trim()) {
    throw new BadRequestError('A planilha anexada está vazia ou não pôde ser convertida.')
  }

  try {
    const resultado = pipeline.executar($app, importRecord, markdown)
    return e.json(200, {
      id: resultado.id,
      status: resultado.status,
      total_linhas: resultado.total_linhas,
      total_importadas: resultado.total_importadas,
      total_ignoradas: resultado.total_ignoradas,
      periodo_inicio: resultado.periodo_inicio,
      periodo_fim: resultado.periodo_fim,
      substituidas: resultado.substituidas,
      message: 'Reprocessamento concluído: ' + resultado.total_importadas + ' lançamentos.',
    })
  } catch (err) {
    let mensagem = 'Erro ao reprocessar a planilha.'
    if (err && err.message) mensagem = String(err.message).slice(0, 500)
    try {
      importRecord.set('status', 'erro')
      importRecord.set('mensagem', mensagem)
      $app.save(importRecord)
    } catch (_) {}
    throw err
  }
})
