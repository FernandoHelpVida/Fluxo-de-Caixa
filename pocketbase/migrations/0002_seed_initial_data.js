migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'fernandofernandes@helpvida.com.br')
    } catch (_) {
      const user = new Record(users)
      user.setEmail('fernandofernandes@helpvida.com.br')
      user.setPassword('Skip@Pass')
      user.setVerified(true)
      user.set('name', 'Fernando Fernandes')
      app.save(user)
    }

    const asPocketDate = (offset) => {
      const date = new Date()
      date.setUTCHours(12, 0, 0, 0)
      date.setUTCDate(date.getUTCDate() + offset)
      return date.toISOString()
    }

    if (app.countRecords('contas_receber') === 0) {
      const collection = app.findCollectionByNameOrId('contas_receber')
      const rows = [
        {
          offset: 2,
          origem: 'Repasse assistencial — competência atual',
          categoria: 'Receitas operacionais',
          valor: 184500,
          status: 'previsto',
          observacao: 'Previsão informada pela equipe financeira.',
        },
        {
          offset: 6,
          origem: 'Contrato corporativo',
          categoria: 'Serviços de saúde',
          valor: 68000,
          status: 'previsto',
          observacao: 'Parcela mensal prevista.',
        },
        {
          offset: -2,
          origem: 'Reembolso de convênio',
          categoria: 'Reembolsos',
          valor: 32750,
          status: 'recebido',
          observacao: 'Crédito conciliado.',
        },
      ]
      rows.forEach((item) => {
        const record = new Record(collection)
        record.set('data', asPocketDate(item.offset))
        record.set('origem_cliente', item.origem)
        record.set('categoria', item.categoria)
        record.set('valor', item.valor)
        record.set('status', item.status)
        record.set('observacao', item.observacao)
        app.save(record)
      })
    }

    if (app.countRecords('disponibilidades') === 0) {
      const collection = app.findCollectionByNameOrId('disponibilidades')
      const rows = [
        { conta: 'BTG Pactual', saldo: 426840.72, observacao: 'Saldo inicial para o fluxo.' },
        { conta: 'Banco do Brasil', saldo: 218390.18, observacao: 'Saldo inicial para o fluxo.' },
      ]
      rows.forEach((item) => {
        const record = new Record(collection)
        record.set('conta_corrente', item.conta)
        record.set('saldo', item.saldo)
        record.set('data', asPocketDate(0))
        record.set('observacao', item.observacao)
        app.save(record)
      })
    }
  },
  (app) => {
    const receivables = app.findRecordsByFilter(
      'contas_receber',
      "origem_cliente = 'Repasse assistencial — competência atual' || origem_cliente = 'Contrato corporativo' || origem_cliente = 'Reembolso de convênio'",
      '',
      50,
      0,
    )
    receivables.forEach((record) => app.delete(record))

    const balances = app.findRecordsByFilter(
      'disponibilidades',
      "observacao = 'Saldo inicial para o fluxo.'",
      '',
      50,
      0,
    )
    balances.forEach((record) => app.delete(record))

    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'fernandofernandes@helpvida.com.br')
      app.delete(user)
    } catch (_) {}
  },
)
