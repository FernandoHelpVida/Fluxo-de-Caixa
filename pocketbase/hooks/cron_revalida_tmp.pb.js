/// <reference path="../pb_data/types.d.ts" />
// ROTINA TEMPORÁRIA de revalidação — roda UMA vez quando o hook é carregado
// (top-level do arquivo, permitido pelo runtime): chama a rota reprocessar via
// HTTP interno e LOGA o resultado. Remover após validar a correção de parsing.
try {
  const importRecord = $app.findFirstRecordByFilter('importacoes', "id = 'wlhm8mwt9td41td'")
  if (!importRecord) {
    console.error('[revalida] registro wlhm8mwt9td41td não encontrado')
  } else {
    const token = String($os.getenv('HELPVIDA_REPROCESS_TOKEN') || '')
    const resposta = $http.send({
      url:
        'http://127.0.0.1:8080/api/backend/v1/helpvida/reprocessar/' +
        importRecord.id +
        '?token=' +
        encodeURIComponent(token),
      method: 'GET',
      headers: { 'x-reprocess-token': token },
      timeout: 120,
    })
    console.log(
      '[revalida] status=' + resposta.status + ' body=' + String(resposta.raw || '').slice(0, 2000),
    )
  }
} catch (err) {
  console.error('[revalida] falhou: ' + (err && err.message ? err.message : String(err)))
}
