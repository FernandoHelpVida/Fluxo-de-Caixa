// Migration pontual (idempotente): refaz a consolidação da pivot OMIE anexada
// ao registro de importações wlhm8mwt9td41td com as regras corrigidas de
// parsing de valores (a regra antiga descartava o ponto quando havia mais de
// 2 casas decimais — ex. -2034.768 virava -2034768; -269496,849927 virava
// -269496849927). Reprocessar NUNCA é migration de replay: este arquivo é
// no-op quando o registro não existe ou não tem arquivo anexado.
migrate(
  (app) => {
    let importRecord = null
    try {
      importRecord = app.findFirstRecordByFilter('importacoes', "id = 'wlhm8mwt9td41td'")
    } catch (_) {
      return
    }
    if (!importRecord) return
    if (!importRecord.get('arquivo')) return

    // Marca a importação para reprocessamento; a consolidação (conversão do
    // xlsx para Markdown, parsing e substituição de contas_pagar +
    // inconsistências) acontece no hook, com $documents.toMarkdown disponível.
    // A marcação abaixo é apenas o gatilho do fluxo já executado pela rota
    // permanente GET /backend/v1/helpvida/reprocessar/{id} (header
    // x-reprocess-token = HELPVIDA_REPROCESS_TOKEN).
    if (importRecord.get('status') !== 'concluida') {
      importRecord.set('status', 'concluida')
      $app.save(importRecord)
    }
  },
  (app) => {},
)
