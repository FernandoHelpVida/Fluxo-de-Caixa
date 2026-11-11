// Importação OMIE — roteador do app HelpVida.
// O parser (puro, sem $app) vive em importacao_parser.js e é carregado via require().
// A consolidação (persistência) vive em importacao_processar.js.

routerAdd(
  'POST',
  '/backend/v1/helpvida/importar',
  (e) => {
    const parser = require(`${__hooks}/importacao_parser.js`)
    const processar = require(`${__hooks}/importacao_processar.js`)

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

    let result = null
    let minDate = ''
    let maxDate = ''
    let resposta = null
    try {
      const converted = $documents.toMarkdown({ record: importRecord, field: 'arquivo' })
      if (converted.truncated) {
        importRecord.set('status', 'erro')
        importRecord.set(
          'mensagem',
          'A planilha excedeu o limite de leitura e não foi importada para evitar uma consolidação parcial.',
        )
        $app.save(importRecord)
        resposta = e.json(400, {
          status: 'erro',
          message:
            'A planilha é muito extensa para esta versão. Nenhum lançamento foi substituído.',
        })
        return resposta
      }

      result = parser.processarMarkdown(converted.markdown)
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
        importRecord.set('status', 'erro')
        importRecord.set('mensagem', String(firstIssue.description).slice(0, 1150))
        $app.save(importRecord)
        resposta = e.json(400, { status: 'erro', message: firstIssue.description })
        return resposta
      }

      const periods = {}
      minDate = result.entries[0].previsao
      maxDate = result.entries[0].previsao
      result.entries.forEach((entry) => {
        periods[entry.periodo] = true
        if (entry.previsao < minDate) minDate = entry.previsao
        if (entry.previsao > maxDate) maxDate = entry.previsao
      })

      processar.consolidar($app, importRecord.id, result, periods)
    } catch (error) {
      try {
        const latest = $app.findRecordById('importacoes', importRecord.id)
        if (latest.getString('status') === 'processando') {
          latest.set('status', 'erro')
          latest.set(
            'mensagem',
            'Falha ao ler ou consolidar a planilha. Confira o formato do arquivo e tente novamente.',
          )
          $app.save(latest)
        }
      } catch (_) {}
      throw new BadRequestError(
        'Não foi possível processar a planilha. Confira o arquivo e tente novamente.',
      )
    }

    return e.json(201, {
      id: importRecord.id,
      status: result.issues.length ? 'concluida_com_alertas' : 'concluida',
      total_linhas: result.totalRows,
      total_importadas: result.entries.length,
      total_ignoradas: result.issues.length,
      periodo_inicio: minDate,
      periodo_fim: maxDate,
    })
  },
  $apis.requireAuth(),
)
