routerAdd(
  'POST',
  '/backend/v1/helpvida/importar',
  (e) => {
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

    function identificarCampo(header) {
      const value = semAcentos(header)
      if (!value) return ''
      if (
        value.indexOf('previs') >= 0 ||
        value === 'data prevista' ||
        value === 'previsao pagamento'
      )
        return 'previsao'
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
        value === 'id titulo'
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
        value.indexOf('numero nf') >= 0
      )
        return 'nota_fiscal'
      if (
        value === 'valor' ||
        value.indexOf('valor a pagar') >= 0 ||
        value.indexOf('valor titulo') >= 0 ||
        value.indexOf('valor previsto') >= 0 ||
        value.indexOf('valor liquido') >= 0
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

    function normalizarData(raw) {
      const text = limparTexto(raw).replace(/\u00a0/g, ' ')
      if (!text) return ''
      let match = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?:\s|$)/)
      if (match) {
        let year = Number(match[3])
        if (year < 100) year += year >= 70 ? 1900 : 2000
        return formatarData(year, Number(match[2]), Number(match[1]))
      }
      match = text.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})(?:[T\s]|$)/)
      if (match) return formatarData(Number(match[1]), Number(match[2]), Number(match[3]))

      const normalized = semAcentos(text)
      const months = {
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
      match = normalized.match(/^(\d{1,2})(?: de)? ([a-z]+)(?: de)? (\d{4})/)
      if (match && months[match[2]])
        return formatarData(Number(match[3]), months[match[2]], Number(match[1]))

      if (/^\d{5}(?:\.0+)?$/.test(text)) {
        const serial = Math.floor(Number(text))
        if (serial > 20000 && serial < 100000) {
          const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000)
          return formatarData(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
        }
      }
      return ''
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
            value.indexOf('total geral ') === 0,
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
        let headerIndex = -1
        let map = {}
        for (let index = 0; index < rows.length; index += 1) {
          const candidate = mapaCabecalho(rows[index].cells)
          if (cabecalhoValido(candidate)) {
            headerIndex = index
            map = candidate
            foundHeader = true
            break
          }
        }
        if (headerIndex < 0) return

        const carried = { razao_social: '', categoria: '', conta_corrente: '', departamento: '' }
        for (let index = headerIndex + 1; index < rows.length; index += 1) {
          const row = rows[index]
          if (linhaSeparadora(row.cells)) continue
          if (cabecalhoValido(mapaCabecalho(row.cells))) continue
          if (!row.cells.some((cell) => limparTexto(cell))) continue
          totalRows += 1
          const content = row.cells.join(' | ').slice(0, 950)
          if (linhaDeTotal(row.cells)) {
            issues.push({
              line: row.line,
              type: 'linha_ignorada',
              description: 'Linha de subtotal ou total removida da consolidação.',
              content: content,
            })
            continue
          }
          const get = (field) =>
            map[field] === undefined ? '' : limparTexto(row.cells[map[field]])
          Object.keys(carried).forEach((field) => {
            const value = get(field)
            if (value) carried[field] = value
          })
          const previsaoRaw = get('previsao') || get('vencimento')
          const previsao = normalizarData(previsaoRaw)
          if (!previsao) {
            issues.push({
              line: row.line,
              type: 'data_invalida',
              description: 'Data de previsão ou vencimento fora do padrão esperado.',
              content: content,
            })
            continue
          }
          const vencimentoRaw = get('vencimento')
          const vencimento = vencimentoRaw ? normalizarData(vencimentoRaw) : previsao
          if (vencimentoRaw && !vencimento) {
            issues.push({
              line: row.line,
              type: 'data_invalida',
              description: 'Data de vencimento fora do padrão esperado.',
              content: content,
            })
            continue
          }
          const valor = normalizarValor(get('valor'))
          if (valor === null || valor === 0) {
            issues.push({
              line: row.line,
              type: 'valor_invalido',
              description: 'Valor vazio, igual a zero ou em formato inválido.',
              content: content,
            })
            continue
          }
          entries.push({
            previsao: previsao,
            razao_social: get('razao_social') || carried.razao_social,
            vencimento: vencimento || previsao,
            registro: get('registro'),
            categoria: get('categoria') || carried.categoria,
            conta_corrente: get('conta_corrente') || carried.conta_corrente,
            nota_fiscal: get('nota_fiscal'),
            valor: valor,
            departamento: get('departamento') || carried.departamento,
            periodo: previsao.slice(0, 7),
            line: row.line,
          })
        }
      })

      if (!foundHeader)
        issues.push({
          line: 0,
          type: 'cabecalho_invalido',
          description:
            'Não foi encontrada uma tabela com colunas de data e valor. Confira os cabeçalhos da pivot do OMIE.',
          content: '',
        })
      return { entries: entries, issues: issues, totalRows: totalRows, foundHeader: foundHeader }
    }

    function atualizarImportacaoComErro(record, message) {
      record.set('status', 'erro')
      record.set(
        'mensagem',
        String(message || 'Não foi possível processar a planilha.').slice(0, 1150),
      )
      $app.save(record)
    }

    const files = e.findUploadedFiles('arquivo')
    if (!files || files.length === 0)
      throw new BadRequestError('Selecione uma planilha .xlsx para importar.')
    const file = files[0]
    const originalName = limparTexto(file.name || 'planilha-omie.xlsx')
    if (originalName && !/\.xlsx$/i.test(originalName))
      throw new BadRequestError('O arquivo precisa estar no formato .xlsx.')

    const imports = $app.findCollectionByNameOrId('importacoes')
    const importRecord = new Record(imports)
    importRecord.set('arquivo', file)
    importRecord.set('nome_arquivo', originalName || 'planilha-omie.xlsx')
    importRecord.set('status', 'processando')
    importRecord.set('mensagem', 'Arquivo recebido. Leitura e consolidação em andamento.')
    $app.save(importRecord)

    try {
      const converted = $documents.toMarkdown({ record: importRecord, field: 'arquivo' })
      if (converted.truncated) {
        atualizarImportacaoComErro(
          importRecord,
          'A planilha excedeu o limite de leitura e não foi importada para evitar uma consolidação parcial.',
        )
        throw new BadRequestError(
          'A planilha é muito extensa para esta versão. Nenhum lançamento foi substituído.',
        )
      }

      const result = processarMarkdown(converted.markdown)
      if (!result.foundHeader || result.entries.length === 0) {
        const firstIssue = result.issues[0] || {
          line: 0,
          type: 'arquivo_invalido',
          description: 'A planilha não contém lançamentos válidos.',
          content: '',
        }
        const issue = new Record($app.findCollectionByNameOrId('inconsistencias_importacao'))
        issue.set('importacao', importRecord.id)
        issue.set('linha', firstIssue.line)
        issue.set('tipo', firstIssue.type)
        issue.set('descricao', firstIssue.description)
        issue.set('conteudo', firstIssue.content)
        $app.save(issue)
        atualizarImportacaoComErro(importRecord, firstIssue.description)
        throw new BadRequestError(firstIssue.description)
      }

      const periods = {}
      let minDate = result.entries[0].previsao
      let maxDate = result.entries[0].previsao
      result.entries.forEach((entry) => {
        periods[entry.periodo] = true
        if (entry.previsao < minDate) minDate = entry.previsao
        if (entry.previsao > maxDate) maxDate = entry.previsao
      })

      $app.runInTransaction((tx) => {
        Object.keys(periods).forEach((period) => {
          let oldRows = tx.findRecordsByFilter(
            'contas_pagar',
            "periodo = '" + period + "'",
            '',
            5000,
            0,
          )
          while (oldRows.length) {
            oldRows.forEach((record) => tx.delete(record))
            oldRows = tx.findRecordsByFilter(
              'contas_pagar',
              "periodo = '" + period + "'",
              '',
              5000,
              0,
            )
          }
        })

        const payableCollection = tx.findCollectionByNameOrId('contas_pagar')
        result.entries.forEach((entry) => {
          const record = new Record(payableCollection)
          record.set('importacao', importRecord.id)
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
          issue.set('importacao', importRecord.id)
          issue.set('linha', item.line)
          issue.set('tipo', item.type)
          issue.set('descricao', item.description)
          issue.set('conteudo', item.content)
          tx.save(issue)
        })

        const currentImport = tx.findRecordById('importacoes', importRecord.id)
        currentImport.set('status', result.issues.length ? 'concluida_com_alertas' : 'concluida')
        currentImport.set('total_linhas', result.totalRows)
        currentImport.set('total_importadas', result.entries.length)
        currentImport.set('total_ignoradas', result.issues.length)
        currentImport.set('periodo_inicio', minDate)
        currentImport.set('periodo_fim', maxDate)
        const message = result.issues.length
          ? result.entries.length +
            ' lançamentos consolidados e ' +
            result.issues.length +
            ' linhas sinalizadas.'
          : result.entries.length + ' lançamentos consolidados sem inconsistências.'
        currentImport.set(
          'mensagem',
          result.issues.length > 500
            ? message + ' O relatório exibe as primeiras 500 ocorrências.'
            : message,
        )
        tx.save(currentImport)
      })

      return e.json(201, {
        id: importRecord.id,
        status: result.issues.length ? 'concluida_com_alertas' : 'concluida',
        total_linhas: result.totalRows,
        total_importadas: result.entries.length,
        total_ignoradas: result.issues.length,
        periodo_inicio: minDate,
        periodo_fim: maxDate,
      })
    } catch (error) {
      const publicMessage =
        error && error.message
          ? error.message
          : 'Não foi possível processar a planilha. Confira o arquivo e tente novamente.'
      try {
        const latest = $app.findRecordById('importacoes', importRecord.id)
        if (latest.getString('status') === 'processando')
          atualizarImportacaoComErro(
            latest,
            error && error.status === 422
              ? publicMessage
              : 'Falha ao ler ou consolidar a planilha.',
          )
      } catch (_) {}
      if (error && (error.status === 400 || error.status === 422))
        throw new BadRequestError(publicMessage)
      throw new BadRequestError(
        'Não foi possível processar a planilha. Confira o arquivo e tente novamente.',
      )
    }
  },
  $apis.requireAuth(),
)
