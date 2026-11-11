// Consolidador da importação OMIE: substituição por período, gravação de
// lançamentos e relatório de inconsistências. Módulo puro — recebe $appLike
// (a instância do banco, $app ou tx) e não usa globais diretamente.

function consolidar(appLike, importId, result, periods) {
  let minDate = ''
  let maxDate = ''
  result.entries.forEach((entry) => {
    if (!minDate || entry.previsao < minDate) minDate = entry.previsao
    if (!maxDate || entry.previsao > maxDate) maxDate = entry.previsao
  })
  appLike.runInTransaction((tx) => {
    // 1) Substituição: remove os lançamentos dos períodos presentes no arquivo.
    Object.keys(periods).forEach((period) => {
      const filter = "periodo = '" + String(period).replace(/'/g, "''") + "'"
      let oldRows = tx.findRecordsByFilter('contas_pagar', filter, '', 5000, 0)
      while (oldRows.length) {
        oldRows.forEach((record) => tx.delete(record))
        oldRows = tx.findRecordsByFilter('contas_pagar', filter, '', 5000, 0)
      }
    })

    // 2) Lançamentos.
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

    // 3) Relatório de inconsistências.
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

    // 4) Status final da importação.
    const currentImport = tx.findRecordById('importacoes', importId)
    currentImport.set('status', result.issues.length ? 'concluida_com_alertas' : 'concluida')
    currentImport.set('total_linhas', result.totalRows)
    currentImport.set('total_importadas', result.entries.length)
    currentImport.set('total_ignoradas', result.issues.length)
    currentImport.set('periodo_inicio', minDate)
    currentImport.set('periodo_fim', maxDate)
    currentImport.set('mensagem', mensagemFinal(result))
    tx.save(currentImport)
  })
}

function mensagemFinal(result) {
  const message = result.issues.length
    ? result.entries.length +
      ' lançamentos consolidados e ' +
      result.issues.length +
      ' linhas sinalizadas.'
    : result.entries.length + ' lançamentos consolidados sem inconsistências.'
  return result.issues.length > 500
    ? message + ' O relatório exibe as primeiras 500 ocorrências.'
    : message
}

function resumo(result, periods) {
  const periodKeys = Object.keys(periods || {}).sort()
  return {
    total_linhas: result.totalRows,
    total_importadas: result.entries.length,
    total_ignoradas: result.issues.length,
    periodos: periodKeys,
    periodo_inicio: periodKeys.length ? periodKeys[0] : '',
    periodo_fim: periodKeys.length ? periodKeys[periodKeys.length - 1] : '',
    primeiros_lancamentos: result.entries.slice(0, 5),
    primeiras_inconsistencias: result.issues.slice(0, 5),
  }
}

module.exports = {
  consolidar: consolidar,
  resumo: resumo,
  mensagemFinal: mensagemFinal,
}
