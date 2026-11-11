// Importação OMIE — roteador do app HelpVida.
// O parser (puro, sem $app) vive em importacao_parser.js e é carregado via require().

routerAdd(
  'POST',
  '/backend/v1/helpvida/importar',
  (e) => {
    const parser = require(`${__hooks}/importacao_parser.js`)

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
    const originalName = parser.limparTexto(file.name || 'planilha-omie.xlsx')
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

      const result = parser.processarMarkdown(converted.markdown)
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
      if (error instanceof BadRequestError) throw error
      const publicMessage =
        error && error.message
          ? error.message
          : 'Não foi possível processar a planilha. Confira o arquivo e tente novamente.'
      try {
        const latest = $app.findRecordById('importacoes', importRecord.id)
        if (latest.getString('status') === 'processando')
          atualizarImportacaoComErro(
            latest,
            'Falha ao ler ou consolidar a planilha. Confira o formato do arquivo e tente novamente.',
          )
      } catch (_) {}
      throw new BadRequestError(
        'Não foi possível processar a planilha. Confira o arquivo e tente novamente.',
      )
    }
  },
  $apis.requireAuth(),
)
