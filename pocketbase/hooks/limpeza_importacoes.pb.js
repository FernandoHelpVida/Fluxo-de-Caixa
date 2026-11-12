// Limpeza de histórico de importações — hook do app HelpVida (Skip Cloud / JSVM).
// Rota autenticada: POST /backend/v1/helpvida/limpar-importacoes-com-erro
// Apaga registros da coleção "importacoes" com status "erro" e as
// inconsistências vinculadas em "inconsistencias_importacao".
// Regra desta instância: nada do escopo do arquivo pode ser referenciado
// dentro do callback — todo o código vive no próprio handler.

routerAdd('POST', '/backend/v1/helpvida/limpar-importacoes-com-erro', (e) => {
  const $appRef = $app

  if (!e.auth || !e.auth.id) {
    throw new ApiError(401, 'Sua sessão expirou. Faça login novamente para limpar o histórico.')
  }

  let apagadas = 0
  let inconsistencias = 0

  try {
    $appRef.runInTransaction((tx) => {
      const comErro = tx.findRecordsByFilter('importacoes', "status = 'erro'", '-created', 500, 0)
      comErro.forEach((importacao) => {
        let vinculadas = tx.findRecordsByFilter(
          'inconsistencias_importacao',
          "importacao = '" + importacao.id + "'",
          '',
          5000,
          0,
        )
        while (vinculadas.length) {
          vinculadas.forEach((issue) => tx.delete(issue))
          inconsistencias += vinculadas.length
          vinculadas = tx.findRecordsByFilter(
            'inconsistencias_importacao',
            "importacao = '" + importacao.id + "'",
            '',
            5000,
            0,
          )
        }
        tx.delete(importacao)
        apagadas += 1
      })
    })
  } catch (err) {
    console.error(
      'limpar-importacoes-com-erro: falha ao apagar registros: ' +
        (err && err.stack ? err.stack : err),
    )
    throw new BadRequestError(
      'Não foi possível apagar as tentativas com erro: ' +
        (err && err.message ? err.message : 'motivo desconhecido') +
        '.',
    )
  }

  return e.json(200, {
    apagadas: apagadas,
    inconsistencias_apagadas: inconsistencias,
    message:
      apagadas === 0
        ? 'Nenhuma tentativa com erro encontrada no histórico.'
        : apagadas +
          ' tentativa(s) com erro apagada(s) do histórico' +
          (inconsistencias
            ? ', junto com ' + inconsistencias + ' inconsistência(s) vinculada(s).'
            : '.'),
  })
})
