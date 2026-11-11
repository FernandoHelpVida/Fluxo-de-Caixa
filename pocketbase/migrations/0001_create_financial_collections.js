migrate(
  (app) => {
    const authenticated = "@request.auth.id != ''"

    const imports = new Collection({
      name: 'importacoes',
      type: 'base',
      listRule: authenticated,
      viewRule: authenticated,
      createRule: authenticated,
      updateRule: authenticated,
      deleteRule: authenticated,
      fields: [
        {
          name: 'arquivo',
          type: 'file',
          required: true,
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/octet-stream',
          ],
        },
        { name: 'nome_arquivo', type: 'text', required: true, max: 240 },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['processando', 'concluida', 'concluida_com_alertas', 'erro'],
          maxSelect: 1,
        },
        { name: 'total_linhas', type: 'number', onlyInt: true, min: 0 },
        { name: 'total_importadas', type: 'number', onlyInt: true, min: 0 },
        { name: 'total_ignoradas', type: 'number', onlyInt: true, min: 0 },
        { name: 'periodo_inicio', type: 'date' },
        { name: 'periodo_fim', type: 'date' },
        { name: 'mensagem', type: 'text', max: 1200 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_importacoes_created ON importacoes (created DESC)',
        'CREATE INDEX idx_importacoes_status ON importacoes (status)',
      ],
    })
    app.save(imports)

    const payables = new Collection({
      name: 'contas_pagar',
      type: 'base',
      listRule: authenticated,
      viewRule: authenticated,
      createRule: authenticated,
      updateRule: authenticated,
      deleteRule: authenticated,
      fields: [
        {
          name: 'importacao',
          type: 'relation',
          required: true,
          collectionId: imports.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'previsao', type: 'date', required: true },
        { name: 'razao_social', type: 'text', max: 300 },
        { name: 'vencimento', type: 'date' },
        { name: 'registro', type: 'text', max: 160 },
        { name: 'categoria', type: 'text', max: 240 },
        { name: 'conta_corrente', type: 'text', max: 180 },
        { name: 'nota_fiscal', type: 'text', max: 160 },
        { name: 'valor', type: 'number', required: true },
        { name: 'departamento', type: 'text', max: 240 },
        { name: 'periodo', type: 'text', required: true, min: 7, max: 7 },
        { name: 'linha_origem', type: 'number', onlyInt: true, min: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_contas_pagar_previsao ON contas_pagar (previsao)',
        'CREATE INDEX idx_contas_pagar_periodo ON contas_pagar (periodo)',
        'CREATE INDEX idx_contas_pagar_categoria ON contas_pagar (categoria)',
        'CREATE INDEX idx_contas_pagar_conta ON contas_pagar (conta_corrente)',
        'CREATE INDEX idx_contas_pagar_departamento ON contas_pagar (departamento)',
        'CREATE INDEX idx_contas_pagar_importacao ON contas_pagar (importacao)',
      ],
    })
    app.save(payables)

    const receivables = new Collection({
      name: 'contas_receber',
      type: 'base',
      listRule: authenticated,
      viewRule: authenticated,
      createRule: authenticated,
      updateRule: authenticated,
      deleteRule: authenticated,
      fields: [
        { name: 'data', type: 'date', required: true },
        { name: 'origem_cliente', type: 'text', required: true, max: 300 },
        { name: 'categoria', type: 'text', required: true, max: 240 },
        { name: 'valor', type: 'number', required: true, min: 0.01 },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['previsto', 'recebido'],
          maxSelect: 1,
        },
        { name: 'observacao', type: 'text', max: 600 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_contas_receber_data ON contas_receber (data)',
        'CREATE INDEX idx_contas_receber_status ON contas_receber (status)',
        'CREATE INDEX idx_contas_receber_categoria ON contas_receber (categoria)',
      ],
    })
    app.save(receivables)

    const balances = new Collection({
      name: 'disponibilidades',
      type: 'base',
      listRule: authenticated,
      viewRule: authenticated,
      createRule: authenticated,
      updateRule: authenticated,
      deleteRule: authenticated,
      fields: [
        { name: 'conta_corrente', type: 'text', required: true, max: 180 },
        { name: 'saldo', type: 'number' },
        { name: 'data', type: 'date', required: true },
        { name: 'observacao', type: 'text', max: 500 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_disponibilidades_conta_data ON disponibilidades (conta_corrente, data DESC)',
      ],
    })
    app.save(balances)

    const issues = new Collection({
      name: 'inconsistencias_importacao',
      type: 'base',
      listRule: authenticated,
      viewRule: authenticated,
      createRule: authenticated,
      updateRule: authenticated,
      deleteRule: authenticated,
      fields: [
        {
          name: 'importacao',
          type: 'relation',
          required: true,
          collectionId: imports.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'linha', type: 'number', onlyInt: true, min: 0 },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: [
            'linha_ignorada',
            'valor_invalido',
            'data_invalida',
            'cabecalho_invalido',
            'arquivo_invalido',
          ],
          maxSelect: 1,
        },
        { name: 'descricao', type: 'text', required: true, max: 500 },
        { name: 'conteudo', type: 'text', max: 1000 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_inconsistencias_importacao ON inconsistencias_importacao (importacao)',
        'CREATE INDEX idx_inconsistencias_tipo ON inconsistencias_importacao (tipo)',
      ],
    })
    app.save(issues)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('inconsistencias_importacao'))
    app.delete(app.findCollectionByNameOrId('disponibilidades'))
    app.delete(app.findCollectionByNameOrId('contas_receber'))
    app.delete(app.findCollectionByNameOrId('contas_pagar'))
    app.delete(app.findCollectionByNameOrId('importacoes'))
  },
)
