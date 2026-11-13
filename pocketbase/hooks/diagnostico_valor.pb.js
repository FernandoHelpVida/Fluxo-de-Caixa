// ROTA TEMPORÁRIA DE DIAGNÓSTICO — remover após a correção do parsing de valores.
// GET /backend/v1/helpvida/diagnostico-valor/{id}
// Lê o registro de importacoes, converte o xlsx anexado em Markdown e devolve,
// para cada linha de dados, a célula de valor BRUTA (sem parsing) — para
// comparar célula por célula com o que foi gravado em contas_pagar.

routerAdd('GET', '/backend/v1/helpvida/diagnostico-valor/{id}', (e) => {
  const id = e.request.pathValue('id')
  let record
  try {
    record = $app.findRecordById('importacoes', id)
  } catch (_) {
    throw new BadRequestError('Importação não encontrada: ' + id)
  }

  let markdown = ''
  try {
    const converted = $documents.toMarkdown({ record: record, field: 'arquivo' })
    markdown = String((converted && converted.markdown) || '')
  } catch (err) {
    throw new BadRequestError(
      'Falha ao converter o arquivo anexado: ' + (err && err.message ? err.message : '?'),
    )
  }

  const lines = markdown.split(/\r?\n/)
  const celulas = []
  const outras = []
  lines.forEach((line, index) => {
    const text = String(line || '').trim()
    if (!/^\|.*\|$/.test(text)) return
    const cells = text
      .slice(1, -1)
      .split('|')
      .map((cell) => cell.trim())
    // células que não são a coluna de valor (índice 7) nem datas: mantém para contexto
    if (cells.length >= 9) {
      celulas.push({ linha: index + 1, valor: cells[7] })
    } else {
      outras.push({ linha: index + 1, cells: cells.join(' | ').slice(0, 200) })
    }
  })

  return e.json(200, {
    arquivo: record.getString('nome_arquivo'),
    total_linhas_markdown: lines.length,
    valores: celulas,
    outras: outras.slice(0, 10),
  })
})
