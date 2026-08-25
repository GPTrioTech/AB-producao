/**
 * PRODUÇÃO A&B — Backend consolidado V23.1
 * Base: arquivo ativo enviado em 20/08/2026.
 * Alterações V23.1: Form Interno pré-preenchido, datas de staff,
 * aprovação manual antes de Menu Final/OS e limpeza de campos não aplicáveis.
 */

const ABA_EVENTOS = 'EVENTOS';
const ABA_MENU = 'MENU_ANEXO_II';
const ABA_TERCEIROS = 'TERCEIROS_REGISTRO';
const ABA_RESPOSTAS = 'RESPOSTAS';
const ABA_LOG = 'LOG';
const ABA_ADITIVOS = 'ADITIVOS_APLICADOS';
const ABA_FORM_REGISTRY = 'FORM_REGISTRY';

const PROP_CENTRAL_RESPOSTAS_ID = 'CENTRAL_RESPOSTAS_ID';
const PROP_PAINEL_SPREADSHEET_ID = 'PAINEL_SPREADSHEET_ID';
const HANDLER_CENTRAL_FORMS = 'onCentralFormSubmit';
const HANDLER_LIMPEZA_FORMS = 'limparFormsEscalaveisExpirados';
const DIAS_RETENCAO_FORM_INTERNO = 14;

const EVENT_HEADERS = [
  'ID_EVENTO',
  'LINK_CONTRATO',
  'LINK_PASTA_EVENTO',
  'RESP_PRODUCAO',
  'DATA_DEGUSTACAO',
  'HORARIO_DEGUSTACAO',
  'LOCAL_DEGUSTACAO',
  'PAX_DEGUSTACAO',
  'STATUS',
  'LINK_ESCOLHA_DOC',
  'LINK_ESCOLHA_PDF',
  'LINK_FORM_CLIENTE',
  'LINK_RELATORIO_DOC',
  'LINK_RELATORIO_PDF',
  'LINK_FORM_INTERNO',
  'LINK_MENU_FINAL_DOC',
  'LINK_MENU_FINAL_PDF',
  'LINK_OS_DOC',
  'LINK_OS_PDF',
  'JSON_CABECALHO',
  'JSON_FIXOS',
  'AVISOS_REVISAO',
  'ERRO',
  'PROCESSADO_EM',
  'FORM_CLIENTE_ID',
  'FORM_INTERNO_ID',
  'LINKS_ADITIVOS',
  'JSON_ADITIVOS',
  'VALOR_ADITIVOS',
  'VALOR_TOTAL_CONSOLIDADO',
];

const EVENT_COL = Object.freeze(
  EVENT_HEADERS.reduce((acc, header, index) => {
    acc[header] = index + 1;
    return acc;
  }, {}),
);

const MENU_HEADERS = [
  'ID_EVENTO',
  'GRUPO',
  'CATEGORIA',
  'ITEM',
  'QTD_DEGUSTACAO',
  'QTD_MENU_FINAL',
  'TIPO',
];

const TERCEIROS_HEADERS = [
  'ID_EVENTO',
  'TIPO',
  'CATEGORIA',
  'ITEM',
  'INCLUIR_MENU_FINAL',
  'INCLUIR_OS',
];

const RESPOSTAS_HEADERS = [
  'ID_EVENTO',
  'TIPO_FORMULARIO',
  'PERGUNTA',
  'RESPOSTA',
  'DATA_RESPOSTA',
];

const ADITIVOS_HEADERS = [
  'ID_EVENTO',
  'ORDEM',
  'DATA_ADITIVO',
  'ARQUIVO',
  'REFERENCIA_CONTRATO',
  'TIPO_ALTERACAO',
  'EFEITO_MENU',
  'RESUMO',
  'VALOR_ADICIONAL',
];

const FORM_REGISTRY_HEADERS = [
  'FORM_ID',
  'ID_EVENTO',
  'TIPO',
  'STATUS',
  'LINK_FORM',
  'CENTRAL_SPREADSHEET_ID',
  'RESPONSE_SHEET_ID',
  'RESPONSE_SHEET_NAME',
  'META_JSON',
  'RESPOSTAS_PROCESSADAS_JSON',
  'CRIADO_EM',
  'ULTIMO_PROCESSAMENTO_EM',
  'EXPIRA_EM',
  'ERRO',
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('MVP A&B')
    .addItem('0. Preparar estrutura', 'prepararEstrutura')
    .addItem(
      '0B. Preparar produção escalável',
      'prepararProducaoEscalavel',
    )
    .addItem(
      'Diagnosticar arquitetura de Forms',
      'diagnosticarArquiteturaForms',
    )
    .addSeparator()
    .addItem('1. Extrair contrato da linha', 'extrairContratoLinhaAtiva')
    .addItem(
      '2. Aprovar e gerar Escolha + Formulário',
      'gerarEscolhaEFormularioLinhaAtiva',
    )
    .addItem(
      '3. Gerar Menu Final + OS da última resposta interna',
      'gerarMenuFinalEOsUltimaRespostaLinhaAtiva',
    )
    .addItem(
      'Recriar Formulário Interno da última resposta do cliente',
      'recriarFormularioInternoUltimaRespostaClienteLinhaAtiva',
    )
    .addSeparator()
    .addItem(
      'Diagnosticar formulário interno da linha',
      'diagnosticarFormularioInternoLinhaAtiva',
    )
    .addItem(
      'Limpar FORM_META legados concluídos',
      'limparFormMetaLegadosConcluidos',
    )
    .addSeparator()
    .addItem(
      'Abrir Mini Software', 
      'abrirMiniSoftwareAB'
    )
    .addItem('Testar configurações', 'testarConfiguracoes')
    .addToUi();
}

function prepararEstrutura() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  PropertiesService
    .getScriptProperties()
    .setProperty(
      PROP_PAINEL_SPREADSHEET_ID,
      ss.getId(),
    );

  criarOuAtualizarAba(ss, ABA_EVENTOS, EVENT_HEADERS);
  criarOuAtualizarAba(ss, ABA_MENU, MENU_HEADERS);
  criarOuAtualizarAba(ss, ABA_TERCEIROS, TERCEIROS_HEADERS);
  criarOuAtualizarAba(ss, ABA_RESPOSTAS, RESPOSTAS_HEADERS);
  criarOuAtualizarAba(ss, ABA_ADITIVOS, ADITIVOS_HEADERS);
  criarOuAtualizarAba(ss, ABA_FORM_REGISTRY, FORM_REGISTRY_HEADERS);
  criarOuAtualizarAba(ss, ABA_LOG, [
    'DATA',
    'NIVEL',
    'ID_EVENTO',
    'ETAPA',
    'MENSAGEM',
  ]);

  const eventos = ss.getSheetByName(ABA_EVENTOS);
  eventos.setFrozenRows(1);
  eventos
    .getRange(2, EVENT_COL.STATUS, 1000, 1)
    .setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(
          [
            'NOVO',
            'PROCESSANDO_CONTRATO',
            'AGUARDANDO_REVISAO',
            'AGUARDANDO_CLIENTE',
            'RELATORIO_GERADO',
            'AGUARDANDO_POS_DEGUSTACAO',
            'MENU_FINAL_E_OS_GERADOS',
            'ERRO',
          ],
          true,
        )
        .build(),
    );

  [
    ABA_MENU,
    ABA_TERCEIROS,
    ABA_RESPOSTAS,
    ABA_ADITIVOS,
    ABA_FORM_REGISTRY,
    ABA_LOG,
  ].forEach((nome) => {
    ss.getSheetByName(nome).setFrozenRows(1);
  });

  SpreadsheetApp.getUi().alert(
    'Estrutura criada. Preencha uma linha na aba EVENTOS.',
  );
}


function prepararProducaoEscalavel() {
  executarComTratamento('PREPARAR_PRODUCAO_ESCALAVEL', () => {
    const infra = garantirInfraFormsEscalavel();

    SpreadsheetApp.getUi().alert(
      [
        'Arquitetura escalável preparada com sucesso.',
        '',
        `Planilha central: ${infra.central.getUrl()}`,
        `Aba de registro: ${ABA_FORM_REGISTRY}`,
        '',
        'Novos Forms usarão 1 gatilho central em vez de 1 gatilho por Form.',
      ].join('\n'),
    );
  });
}

function garantirInfraFormsEscalavel() {
  const props =
    PropertiesService.getScriptProperties();

  let painel = null;

  const painelId = texto(
    props.getProperty(
      PROP_PAINEL_SPREADSHEET_ID,
    ),
  );

  if (painelId) {
    try {
      painel =
        SpreadsheetApp.openById(
          painelId,
        );
    } catch (_) {
      painel = null;
    }
  }

  if (!painel) {
    painel =
      SpreadsheetApp.getActiveSpreadsheet();

    if (!painel) {
      throw new Error(
        'Não foi possível identificar a planilha PAINEL. Abra a planilha principal e execute novamente "0B. Preparar produção escalável".',
      );
    }

    props.setProperty(
      PROP_PAINEL_SPREADSHEET_ID,
      painel.getId(),
    );
  }

  criarOuAtualizarAba(
    painel,
    ABA_FORM_REGISTRY,
    FORM_REGISTRY_HEADERS,
  );

  let centralId = texto(
    props.getProperty(
      PROP_CENTRAL_RESPOSTAS_ID,
    ),
  );

  let central = null;

  if (centralId) {
    try {
      central =
        SpreadsheetApp.openById(
          centralId,
        );
    } catch (_) {
      central = null;
    }
  }

  if (!central) {
    central = SpreadsheetApp.create(
      'CENTRAL - RESPOSTAS FORMS A&B',
    );

    const primeira =
      central.getSheets()[0];

    primeira
      .setName('CONTROLE')
      .getRange('A1')
      .setValue(
        'Arquivo técnico. Não editar manualmente. ' +
        'As abas temporárias de respostas são gerenciadas pelo Apps Script.',
      );

    props.setProperty(
      PROP_CENTRAL_RESPOSTAS_ID,
      central.getId(),
    );

    moverArquivoParaPastaDoPainel(
      central.getId(),
    );
  }

  garantirGatilhoCentralForms(
    central.getId(),
  );

  garantirGatilhoLimpezaForms();

  return {
    central,
  };
}


function obterPlanilhaPainel() {
  const props =
    PropertiesService.getScriptProperties();

  const id = texto(
    props.getProperty(
      PROP_PAINEL_SPREADSHEET_ID,
    ),
  );

  if (id) {
    try {
      return SpreadsheetApp.openById(
        id,
      );
    } catch (_) {
      // Tenta o arquivo ativo abaixo.
    }
  }

  const active =
    SpreadsheetApp.getActiveSpreadsheet();

  if (!active) {
    throw new Error(
      'PAINEL_SPREADSHEET_ID não configurado. Execute "0B. Preparar produção escalável" pela planilha principal.',
    );
  }

  props.setProperty(
    PROP_PAINEL_SPREADSHEET_ID,
    active.getId(),
  );

  return active;
}

function moverArquivoParaPastaDoPainel(
  fileId,
) {
  try {
    const painelFile =
      DriveApp.getFileById(
        obterPlanilhaPainel()
          .getId(),
      );

    const parents =
      painelFile.getParents();

    if (!parents.hasNext()) {
      return;
    }

    DriveApp.getFileById(fileId)
      .moveTo(parents.next());
  } catch (_) {
    // Não impede a implantação se a pasta pai não puder ser resolvida.
  }
}

function garantirGatilhoCentralForms(
  centralSpreadsheetId,
) {
  const existe =
    ScriptApp.getProjectTriggers()
      .some(
        (trigger) =>
          trigger.getHandlerFunction() ===
            HANDLER_CENTRAL_FORMS &&
          trigger.getTriggerSourceId() ===
            centralSpreadsheetId,
      );

  if (existe) {
    return;
  }

  ScriptApp
    .newTrigger(
      HANDLER_CENTRAL_FORMS,
    )
    .forSpreadsheet(
      centralSpreadsheetId,
    )
    .onFormSubmit()
    .create();
}

function garantirGatilhoLimpezaForms() {
  const existe =
    ScriptApp.getProjectTriggers()
      .some(
        (trigger) =>
          trigger.getHandlerFunction() ===
            HANDLER_LIMPEZA_FORMS,
      );

  if (existe) {
    return;
  }

  ScriptApp
    .newTrigger(
      HANDLER_LIMPEZA_FORMS,
    )
    .timeBased()
    .everyDays(1)
    .atHour(4)
    .create();
}

function diagnosticarArquiteturaForms() {
  executarComTratamento('DIAGNOSTICO_ARQUITETURA_FORMS', () => {
    const linhas = [];

    const props =
      PropertiesService.getScriptProperties();

    const centralId = texto(
      props.getProperty(
        PROP_CENTRAL_RESPOSTAS_ID,
      ),
    );

    const registry =
      obterPlanilhaPainel()
        .getSheetByName(
          ABA_FORM_REGISTRY,
        );

    linhas.push(
      registry
        ? '✅ FORM_REGISTRY existe.'
        : '❌ FORM_REGISTRY não existe.',
    );

    let central = null;

    if (centralId) {
      try {
        central =
          SpreadsheetApp.openById(
            centralId,
          );

        linhas.push(
          `✅ Planilha central acessível: ${central.getName()}`,
        );
      } catch (error) {
        linhas.push(
          `❌ CENTRAL_RESPOSTAS_ID existe, mas o arquivo não abriu: ${error.message || error}`,
        );
      }
    } else {
      linhas.push(
        '❌ CENTRAL_RESPOSTAS_ID não configurado.',
      );
    }

    const triggers =
      ScriptApp.getProjectTriggers();

    const triggerCentral =
      centralId &&
      triggers.some(
        (trigger) =>
          trigger.getHandlerFunction() ===
            HANDLER_CENTRAL_FORMS &&
          trigger.getTriggerSourceId() ===
            centralId,
      );

    linhas.push(
      triggerCentral
        ? '✅ Gatilho central de respostas existe.'
        : '❌ Gatilho central de respostas não encontrado.',
    );

    const triggerLimpeza =
      triggers.some(
        (trigger) =>
          trigger.getHandlerFunction() ===
            HANDLER_LIMPEZA_FORMS,
      );

    linhas.push(
      triggerLimpeza
        ? '✅ Gatilho diário de limpeza existe.'
        : '❌ Gatilho diário de limpeza não encontrado.',
    );

    const legados =
      triggers.filter(
        (trigger) =>
          trigger.getHandlerFunction() ===
            'onAnyFormSubmit',
      );

    linhas.push(
      `Gatilhos legados visíveis nesta conta: ${legados.length}`,
    );

    const propriedades =
      props.getProperties();

    const formMetaCount =
      Object.keys(propriedades)
        .filter(
          (key) =>
            key.startsWith(
              'FORM_META_',
            ),
        )
        .length;

    linhas.push(
      `FORM_META legados nas propriedades: ${formMetaCount}`,
    );

    if (
      registry &&
      registry.getLastRow() > 1
    ) {
      const registros =
        lerRegistrosForms();

      const ativos =
        registros.filter(
          (item) =>
            ![
              'ARQUIVADO',
              'ERRO_ARQUIVAMENTO',
            ].includes(
              item.STATUS,
            ),
        );

      linhas.push(
        `Registros no FORM_REGISTRY: ${registros.length}`,
      );

      linhas.push(
        `Forms ainda ativos/retidos: ${ativos.length}`,
      );
    } else {
      linhas.push(
        'Registros no FORM_REGISTRY: 0',
      );
    }

    linhas.push(
      '',
      triggerCentral && central
        ? 'DIAGNÓSTICO: arquitetura escalável pronta.'
        : 'DIAGNÓSTICO: execute "0B. Preparar produção escalável".',
    );

    SpreadsheetApp.getUi().alert(
      linhas.join('\n'),
    );
  });
}

function criarOuAtualizarAba(ss, nome, headers) {
  let sheet = ss.getSheetByName(nome);
  if (!sheet) {
    sheet = ss.insertSheet(nome);
  }

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#5A0B16')
    .setFontColor('#FFFFFF')
    .setWrap(true);

  sheet.autoResizeColumns(1, headers.length);
  return sheet;
}

function testarConfiguracoes() {
  const props = PropertiesService.getScriptProperties();
  const obrigatorias = [
    'OPENAI_API_KEY',
    'OPENAI_MODEL',
    'TEMPLATE_ESCOLHA_ID',
    'TEMPLATE_RELATORIO_ID',
    'TEMPLATE_MENU_FINAL_ID',
    'TEMPLATE_OS_ID',
  ];

  const faltantes = obrigatorias.filter(
    (key) => !props.getProperty(key),
  );

  if (faltantes.length) {
    throw new Error(
      `Faltam propriedades do script: ${faltantes.join(', ')}`,
    );
  }

  obrigatorias
    .filter((key) => key.endsWith('_ID'))
    .forEach((key) => {
      DriveApp.getFileById(props.getProperty(key)).getName();
    });

  SpreadsheetApp.getUi().alert('Configurações válidas.');
}

function extrairContratoLinhaAtiva() {
  executarComTratamento('EXTRACAO', () => {
    const contexto = obterContextoLinhaAtiva();
    const { sheet, row, evento } = contexto;

    validarCamposIniciais(evento);
    atualizarEvento(sheet, row, {
      STATUS: 'PROCESSANDO_CONTRATO',
      ERRO: '',
    });

    const idEvento =
      evento.ID_EVENTO || gerarIdEvento();

    atualizarEvento(sheet, row, { ID_EVENTO: idEvento });

    const contrato = obterPdfContrato(evento.LINK_CONTRATO);
    const aditivos = obterAditivosComoPdf(evento.LINKS_ADITIVOS);

    const documentos = [
      {
        tipo: 'CONTRATO_BASE',
        ordem: 0,
        blob: contrato,
      },
      ...aditivos,
    ];

    const extraido = extrairContratoComIA(documentos);
    const normalizado = normalizarExtracao(extraido);

    limparDadosEvento(idEvento);
    gravarMenu(idEvento, normalizado.menu);
    gravarTerceiros(idEvento, normalizado.terceiros);
    gravarAditivosAplicados(idEvento, normalizado.aditivos);

    atualizarEvento(sheet, row, {
      STATUS: 'AGUARDANDO_REVISAO',
      JSON_CABECALHO: JSON.stringify(normalizado.cabecalho),
      JSON_FIXOS: JSON.stringify(normalizado.fixos),
      JSON_ADITIVOS: JSON.stringify(normalizado.aditivos),
      VALOR_ADITIVOS:
        normalizado.aditivos.valor_total_aditivos || 0,
      VALOR_TOTAL_CONSOLIDADO:
        normalizado.aditivos.valor_total_consolidado || 0,
      AVISOS_REVISAO: normalizado.avisos.join('\n'),
      PROCESSADO_EM: new Date(),
    });

    registrarLog(
      'INFO',
      idEvento,
      'EXTRACAO',
      'Contrato e aditivos consolidados. Aguardando revisão humana.',
    );

    SpreadsheetApp.getUi().alert(
      'Extração concluída. Revise as abas MENU_ANEXO_II e TERCEIROS_REGISTRO antes de gerar os documentos.',
    );
  });
}

function gerarEscolhaEFormularioLinhaAtiva() {
  executarComTratamento('GERAR_ESCOLHA_FORM', () => {
    const contexto = obterContextoLinhaAtiva();
    const { sheet, row, evento } = contexto;

    if (!evento.ID_EVENTO) {
      throw new Error('A linha ainda não possui ID_EVENTO.');
    }

    if (
      ![
        'AGUARDANDO_REVISAO',
        'AGUARDANDO_CLIENTE',
        'ERRO',
      ].includes(evento.STATUS)
    ) {
      throw new Error(
        'O evento precisa estar em AGUARDANDO_REVISAO, AGUARDANDO_CLIENTE ou ERRO para uma nova tentativa.',
      );
    }

    const dados = carregarDadosEvento(evento.ID_EVENTO);
    const problemas = validarDadosAntesDoFormulario(dados);

    if (problemas.length) {
      const mensagem =
        'Corrija a aba MENU_ANEXO_II antes de continuar:\n\n' +
        problemas.join('\n');

      atualizarEvento(sheet, row, {
        STATUS: 'AGUARDANDO_REVISAO',
        ERRO: mensagem,
      });

      registrarLog(
        'AVISO',
        evento.ID_EVENTO,
        'VALIDACAO_MENU',
        mensagem,
      );

      SpreadsheetApp.getUi().alert(mensagem);
      return;
    }

    const pasta = DriveApp.getFolderById(
      extrairIdGoogle(evento.LINK_PASTA_EVENTO),
    );

    const documentoEscolha = gerarDocumentoEscolha(
      evento,
      dados,
      pasta,
    );

    const formulario = criarFormularioCliente(
      evento,
      dados,
      pasta,
    );

    atualizarEvento(sheet, row, {
      STATUS: 'AGUARDANDO_CLIENTE',
      ERRO: '',
      LINK_ESCOLHA_DOC: documentoEscolha.docUrl,
      LINK_ESCOLHA_PDF: documentoEscolha.pdfUrl,
      LINK_FORM_CLIENTE: formulario.url,
      FORM_CLIENTE_ID: formulario.id,
    });

    registrarLog(
      'INFO',
      evento.ID_EVENTO,
      'GERAR_ESCOLHA_FORM',
      'Documento Escolha de Menu e formulário do cliente gerados.',
    );

    SpreadsheetApp.getUi().alert(
      'Escolha de Menu e formulário gerados. Revise o PDF e depois envie o link do formulário ao cliente.',
    );
  });
}

function obterContextoLinhaAtiva() {
  const sheet = SpreadsheetApp.getActiveSheet();

  if (sheet.getName() !== ABA_EVENTOS) {
    throw new Error('Selecione uma linha da aba EVENTOS.');
  }

  const row = sheet.getActiveRange().getRow();
  if (row <= 1) {
    throw new Error('Selecione uma linha abaixo do cabeçalho.');
  }

  const values = sheet
    .getRange(row, 1, 1, EVENT_HEADERS.length)
    .getValues()[0];

  const evento = {};
  EVENT_HEADERS.forEach((header, index) => {
    evento[header] = values[index];
  });

  return { sheet, row, evento };
}

function validarCamposIniciais(evento) {
  if (!texto(evento.LINK_CONTRATO)) {
    throw new Error('Preencha LINK_CONTRATO.');
  }
  if (!texto(evento.LINK_PASTA_EVENTO)) {
    throw new Error('Preencha LINK_PASTA_EVENTO.');
  }
  if (!texto(evento.RESP_PRODUCAO)) {
    throw new Error('Preencha RESP_PRODUCAO.');
  }
}

function obterPdfContrato(linkContrato) {
  const fileId = extrairIdGoogle(linkContrato);
  const file = DriveApp.getFileById(fileId);

  if (file.getMimeType() !== MimeType.PDF) {
    throw new Error(
      'Neste MVP, o contrato de entrada precisa estar em PDF.',
    );
  }

  const blob = file.getBlob().setName(file.getName());

  if (blob.getBytes().length > 20 * 1024 * 1024) {
    throw new Error(
      'O PDF ultrapassa 20 MB. Comprima o arquivo para o MVP.',
    );
  }

  return blob;
}

function obterAditivosComoPdf(linksAditivos) {
  const links = extrairLinksGoogleMultiplos(linksAditivos);

  return links.map((link, index) => {
    const blob = obterPdfContrato(link);

    return {
      tipo: 'ADITIVO',
      ordem: index + 1,
      blob,
    };
  });
}

function extrairLinksGoogleMultiplos(value) {
  const raw = texto(value);

  if (!raw) {
    return [];
  }

  const matches = raw.match(
    /https?:\/\/[^\s,;]+|[-\w]{20,}/g,
  ) || [];

  const links = [];
  const ids = new Set();

  matches.forEach((item) => {
    try {
      const id = extrairIdGoogle(item);

      if (!ids.has(id)) {
        ids.add(id);
        links.push(item);
      }
    } catch (_) {
      // Ignora fragmentos que não sejam links ou IDs válidos.
    }
  });

  return links;
}

function extrairContratoComIA(documentos) {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('OPENAI_API_KEY');
  const model = props.getProperty('OPENAI_MODEL');

  if (!apiKey || !model) {
    throw new Error(
      'Configure OPENAI_API_KEY e OPENAI_MODEL nas propriedades do script.',
    );
  }

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      cabecalho_evento: {
        type: 'object',
        additionalProperties: false,
        properties: {
          numero_contrato: { type: 'string' },
          evento: { type: 'string' },
          local: { type: 'string' },
          contratante: { type: 'string' },
          data_evento: { type: 'string' },
          horario: { type: 'string' },
          numero_convidados: { type: 'integer' },
          montagem: { type: 'string' },
          desmontagem: { type: 'string' },
          data_limite_menu: { type: 'string' },
          valor_servicos: { type: 'string' },
          valor_alimentos_bebidas: { type: 'string' },
          valor_total: { type: 'string' },
          dados_faturamento: { type: 'string' },
          dados_contato: { type: 'string' },
        },
        required: [
          'numero_contrato',
          'evento',
          'local',
          'contratante',
          'data_evento',
          'horario',
          'numero_convidados',
          'montagem',
          'desmontagem',
          'data_limite_menu',
          'valor_servicos',
          'valor_alimentos_bebidas',
          'valor_total',
          'dados_faturamento',
          'dados_contato',
        ],
      },
      menu_anexo_ii: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            grupo: { type: 'string' },
            categoria: { type: 'string' },
            quantidade_menu_final: { type: 'integer' },
            itens: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: [
            'grupo',
            'categoria',
            'quantidade_menu_final',
            'itens',
          ],
        },
      },
      itens_fixos_anexo_ii: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            categoria: { type: 'string' },
            itens: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['categoria', 'itens'],
        },
      },
      itens_terceiros_registro: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            tipo: { type: 'string' },
            categoria: { type: 'string' },
            itens: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['tipo', 'categoria', 'itens'],
        },
      },
      consolidacao_aditivos: {
        type: 'object',
        additionalProperties: false,
        properties: {
          aditivos_encontrados: { type: 'integer' },
          aditivos_aplicados: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                ordem: { type: 'integer' },
                data_aditivo: { type: 'string' },
                arquivo: { type: 'string' },
                referencia_contrato: { type: 'string' },
                tipo_alteracao: { type: 'string' },
                efeito_menu: {
                  type: 'string',
                  enum: [
                    'SEM_ALTERACAO',
                    'SUBSTITUICAO_TOTAL',
                    'ALTERACAO_PARCIAL',
                    'INCLUSAO',
                    'REMOCAO',
                  ],
                },
                resumo: { type: 'string' },
                valor_adicional: { type: 'number' },
              },
              required: [
                'ordem',
                'data_aditivo',
                'arquivo',
                'referencia_contrato',
                'tipo_alteracao',
                'efeito_menu',
                'resumo',
                'valor_adicional',
              ],
            },
          },
          alimentacao_staff: {
            type: 'object',
            additionalProperties: false,
            properties: {
              incluida: { type: 'boolean' },
              quantidade: { type: 'integer' },
              valor_unitario: { type: 'number' },
              valor_total: { type: 'number' },
              menu: { type: 'string' },
              tempo_servico: { type: 'string' },
              fonte: { type: 'string' },
            },
            required: [
              'incluida',
              'quantidade',
              'valor_unitario',
              'valor_total',
              'menu',
              'tempo_servico',
              'fonte',
            ],
          },
          valor_total_original: { type: 'number' },
          valor_total_aditivos: { type: 'number' },
          valor_total_consolidado: { type: 'number' },
          alertas_identidade: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: [
          'aditivos_encontrados',
          'aditivos_aplicados',
          'alimentacao_staff',
          'valor_total_original',
          'valor_total_aditivos',
          'valor_total_consolidado',
          'alertas_identidade',
        ],
      },
      avisos_revisao: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: [
      'cabecalho_evento',
      'menu_anexo_ii',
      'itens_fixos_anexo_ii',
      'itens_terceiros_registro',
      'consolidacao_aditivos',
      'avisos_revisao',
    ],
  };

  const prompt = `
Você é um extrator e consolidador de documentos do departamento de
Alimentos e Bebidas de uma empresa de eventos.

Você receberá:
- um CONTRATO BASE;
- zero ou mais ADITIVOS vinculados ao mesmo contrato.

OBJETIVO:
Produzir o estado contratual FINAL e CONSOLIDADO que deve alimentar
a Escolha de Menu, o formulário do cliente, o Relatório de Degustação,
o Menu Final e a OS A&B.

PRECEDÊNCIA OBRIGATÓRIA:

1. Comece pelo contrato base.
2. Identifique a ordem dos aditivos pelo texto "1º", "2º", "3º" etc.
   e, subsidiariamente, pela data de assinatura.
3. Aplique os aditivos em ordem crescente.
4. O aditivo mais recente prevalece quando alterar o mesmo campo.
5. "Alterar", "substituir", "trocar X por Y" significa substituir
   integralmente o escopo indicado. Não misture o menu antigo com o novo.
6. "Incluir" significa adicionar sem apagar o que não foi alterado.
7. "Excluir" ou "retirar" significa remover.
8. "Ficam mantidas as demais cláusulas" significa preservar todos os
   campos que não foram alterados.

REGRAS DE A&B:

9. O objeto menu_anexo_ii deve representar o MENU ATIVO FINAL, mesmo quando
   ele vier de um aditivo e não do Anexo II original.
10. Se um aditivo substituir o menu completo, ignore integralmente o menu
    anterior para fins de degustação e Menu Final.
11. quantidade_menu_final deve copiar exatamente o número indicado em
    expressões como ESCOLHER 1 OPÇÃO, ESCOLHER 2 OPÇÕES etc.
12. Itens sem escolha, como ilha gastronômica contratada, entradas fixas,
    bebidas e finalização, devem entrar em itens_fixos_anexo_ii.
13. Uma ilha que faça parte do menu do próprio Grupo Trio não é fornecedor
    terceiro. Classifique como item fixo.
14. Ilhas, doces, estações e outros itens explicitamente contratados de
    fornecedor terceiro entram em itens_terceiros_registro.
15. Ignore completamente BAR, carta de drinks, coquetelaria, destilados,
    frutas do bar e qualquer conteúdo relacionado ao serviço de bar.
16. Alimentação de staff incluída por aditivo não entra no formulário do
    cliente. Registre em consolidacao_aditivos.alimentacao_staff para a OS.
17. Quando o menu ativo final trouxer explicitamente, dentro do Anexo II
    ou do menu substitutivo de um aditivo, as seções SERVIÇO DE SALA ou
    LANCHE DA MADRUGADA, copie a seção e todos os seus itens em
    itens_fixos_anexo_ii.
18. Para bebidas, considere apenas o Anexo II ou o menu substitutivo vigente.
    Nunca use conteúdo do Anexo I para formar o bloco de bebidas.
19. Água, refrigerantes e sucos padrão do buffet são BEBIDAS FIXAS e devem
    permanecer em itens_fixos_anexo_ii como itens fixos normais.
20. Qualquer outra seção de bebidas presente no Anexo II, além dessas
    bebidas fixas, também deve ser copiada em itens_fixos_anexo_ii,
    preservando seus itens. O sistema a exibirá nos documentos sob o título
    simplificado BEBIDAS.
21. Não confunda esse bloco com BAR, carta de drinks, coquetelaria,
    destilados ou frutas de bar. Bar continua completamente fora do fluxo.
22. SERVIÇO DE SALA, LANCHE DA MADRUGADA e as bebidas adicionais do
    Anexo II não geram checkbox no formulário do cliente.
23. Não crie nenhuma dessas seções quando elas não estiverem expressamente
    contratadas.
24. Preserve exatamente o nome e a descrição dos pratos, bebidas e serviços.
25. Preserve explicitamente, quando existirem no menu contratual vigente,
    as seções de Ilha Gastronômica, bebidas alcoólicas e não alcoólicas,
    finalização, sorvetes, lanche da madrugada, frutas e coffee/café.
    Esses itens serão tratados pelo sistema como NÃO DEGUSTADOS.
26. Dentro da mesma categoria, não repita o mesmo item mais de uma vez,
    mesmo que o PDF original o apresente duplicado.
27. Retorne cada categoria somente uma vez. Não divida SOBREMESAS, MASSAS,
    RISOTOS ou qualquer outra categoria em dois blocos por causa de
    quebra de página, subtítulo, espaço invisível ou diferença de formatação.
28. Categorias gastronômicas do menu ativo que não tenham regra de escolha,
    como coquetéis, mini porções, ilhas ou itens já inclusos, devem ser
    copiadas em itens_fixos_anexo_ii. Elas fazem parte do cardápio e não
    podem ser omitidas.
29. Quando existirem dois ou mais cabeçalhos consecutivos antes da primeira
    categoria, preserve todos no campo grupo, separados por " / ".
    Exemplo: "MENU VOLANTE 1 / MENU VOLANTE & CRIAÇÕES DO TRIO".
30. Não una itens diferentes por causa de quebra de linha. Quando houver
    ambiguidade, preserve o texto e gere aviso de revisão.

VALORES:

19. valor_total_original deve ser numérico e vir do contrato base.
20. valor_total_aditivos deve somar apenas valores adicionais dos aditivos.
21. valor_total_consolidado = original + aditivos.
22. Alteração sem custo adicional deve registrar valor_adicional = 0.

AUDITORIA:

23. Registre cada aditivo aplicado em aditivos_aplicados.
24. Compare número do contrato, contratante, contratada, CNPJ e datas.
    Inconsistências devem entrar em alertas_identidade e avisos_revisao.
25. Não invente dados. Campos ausentes devem ficar vazios ou zero.
`;

  const payload = {
    model,
    store: false,
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: prompt,
          },
          ...documentos.map((documento, index) => ({
            type: 'input_file',
            filename:
              `${index === 0 ? 'CONTRATO_BASE' : 'ADITIVO'} - ` +
              documento.blob.getName(),
            file_data:
              `data:application/pdf;base64,${Utilities.base64Encode(
                documento.blob.getBytes(),
              )}`,
          })),
        ],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'extracao_contrato_ab',
        strict: true,
        schema,
      },
    },
  };

  const response = UrlFetchApp.fetch(
    'https://api.openai.com/v1/responses',
    {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    },
  );

  const status = response.getResponseCode();
  const body = response.getContentText();

  if (status >= 300) {
    throw new Error(`Erro OpenAI ${status}: ${body}`);
  }

  const json = JSON.parse(body);
  const outputText = obterOutputText(json);

  if (!outputText) {
    throw new Error('A IA não retornou o JSON estruturado.');
  }

  return JSON.parse(outputText);
}

function obterOutputText(responseJson) {
  if (
    typeof responseJson.output_text === 'string' &&
    responseJson.output_text
  ) {
    return responseJson.output_text;
  }

  for (const output of responseJson.output || []) {
    for (const content of output.content || []) {
      if (content.type === 'output_text' && content.text) {
        return content.text;
      }
      if (content.type === 'refusal') {
        throw new Error(
          `A IA recusou o processamento: ${content.refusal}`,
        );
      }
    }
  }

  return '';
}

function normalizarExtracao(extraido) {
  const avisos = [...(extraido.avisos_revisao || [])];

  const menu = [];

  for (const categoria of extraido.menu_anexo_ii || []) {
    const qtdFinal =
      Number(categoria.quantidade_menu_final) || 0;

    /*
     * Regra padrão do MVP:
     * a quantidade de degustação começa igual à quantidade explicitamente
     * contratada. A Produção pode aumentar QTD_DEGUSTACAO na planilha antes
     * de gerar o formulário, quando houver margem adicional para degustação.
     *
     * Isso evita usar regras fixas de um evento em contratos com cardápios
     * diferentes, como Buffet Gardênia, Manacá e outros.
     */
    const qtdDegustacao =
      calcularQuantidadeMaximaDegustacao(
        categoria.grupo,
        categoria.categoria,
        qtdFinal,
      );

    if (qtdFinal <= 0) {
      avisos.push(
        `Categoria sem quantidade explícita: ${categoria.categoria}. ` +
        `Revise QTD_DEGUSTACAO, QTD_MENU_FINAL e TIPO na aba MENU_ANEXO_II.`,
      );
    }

    for (const item of categoria.itens || []) {
      menu.push({
        grupo: texto(categoria.grupo),
        categoria: texto(categoria.categoria),
        item: texto(item),
        qtdDegustacao,
        qtdFinal,
        tipo: 'SELECIONAVEL',
      });
    }
  }

  for (const categoria of extraido.itens_fixos_anexo_ii || []) {
    let tipoFixo = 'INCLUSO_CARDAPIO';

    if (
      ehServicoContratadoOpcional(
        categoria.categoria,
        categoria.itens,
      )
    ) {
      tipoFixo = 'SERVICO_CONTRATADO';
    } else if (
      ehBebidaOuFinalizacaoFixa(
        categoria.categoria,
      )
    ) {
      tipoFixo = 'FIXO';
    }

    for (const item of categoria.itens || []) {
      menu.push({
        grupo: texto(categoria.categoria),
        categoria: texto(categoria.categoria),
        item: texto(item),
        qtdDegustacao: '',
        qtdFinal: '',
        tipo: tipoFixo,
      });
    }
  }

  const terceiros = [];
  for (const bloco of extraido.itens_terceiros_registro || []) {
    for (const item of bloco.itens || []) {
      terceiros.push({
        tipo: texto(bloco.tipo),
        categoria: texto(bloco.categoria),
        item: texto(item),
        incluirMenuFinal: 'SIM',
        incluirOs: 'SIM',
      });
    }
  }

  const aditivos =
    extraido.consolidacao_aditivos || {
      aditivos_encontrados: 0,
      aditivos_aplicados: [],
      alimentacao_staff: {
        incluida: false,
        quantidade: 0,
        valor_unitario: 0,
        valor_total: 0,
        menu: '',
        tempo_servico: '',
        fonte: '',
      },
      valor_total_original: 0,
      valor_total_aditivos: 0,
      valor_total_consolidado: 0,
      alertas_identidade: [],
    };

  avisos.push(...(aditivos.alertas_identidade || []));

  return {
    cabecalho: extraido.cabecalho_evento,
    menu,
    terceiros,
    fixos: (extraido.itens_fixos_anexo_ii || []),
    aditivos,
    avisos,
  };
}




function ehBebidaOuFinalizacaoFixa(categoria) {
  const chave = removerAcentos(categoria)
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();

  return (
    /BEBIDA/.test(chave) ||
    /FINALIZACAO/.test(chave)
  );
}

function ehServicoContratadoOpcional(
  categoria,
  itens,
) {
  const chave = removerAcentos(categoria)
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();

  if (
    /SERVICO DE SALA/.test(chave) ||
    /LANCHE DA MADRUGADA/.test(chave)
  ) {
    return true;
  }

  /*
   * Qualquer seção de bebidas do cardápio vigente do Anexo II
   * entra como SERVICO_CONTRATADO quando não for composta apenas
   * pelas bebidas fixas/padrão.
   */
  if (/BEBIDA/.test(chave)) {
    return !saoSomenteBebidasFixas(itens);
  }

  return false;
}

function saoSomenteBebidasFixas(itens) {
  const lista = (itens || [])
    .map((item) =>
      removerAcentos(item)
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean);

  if (!lista.length) {
    return false;
  }

  return lista.every((item) =>
    (
      /\bAGUA\b/.test(item) ||
      /\bREFRIGERANTE/.test(item) ||
      /\bSUCO\b/.test(item)
    ),
  );
}

function normalizarTituloServicoContratado(value) {
  const titulo = limparTituloCategoria(value);
  const chave = removerAcentos(titulo)
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();

  /*
   * Remove nomes como "BEBIDAS TRIO", "BEBIDAS ESPECIAIS"
   * ou qualquer outra variação. Nos documentos, o título será
   * sempre apenas "BEBIDAS".
   */
  if (/BEBIDA/.test(chave)) {
    return 'BEBIDAS';
  }

  return titulo;
}

function calcularQuantidadeMaximaDegustacao(
  grupo,
  categoria,
  qtdFinal,
) {
  const quantidadeFinal = Number(qtdFinal) || 0;

  if (quantidadeFinal <= 0) {
    return 0;
  }

  const chave = removerAcentos(
    `${texto(grupo)} ${texto(categoria)}`,
  ).toUpperCase();

  const permiteUmaExtra =
    /COQUETEL VOLANTE.*FRIO/.test(chave) ||
    /COQUETEL VOLANTE.*QUENTE/.test(chave) ||
    /PRATOS? EM MINIATURA/.test(chave) ||
    /MINI PORCOES?/.test(chave);

  return permiteUmaExtra
    ? quantidadeFinal + 1
    : quantidadeFinal;
}

function obterRegraInterna(categoria, qtdFinalExtraida) {
  const chave = removerAcentos(categoria).toUpperCase();

  const regras = [
    {
      teste: /FRIO/,
      degustacao: 5,
      final: 4,
    },
    {
      teste: /QUENTE/,
      degustacao: 5,
      final: 4,
    },
    {
      teste: /MINI|PORCOES/,
      degustacao: 3,
      final: 2,
    },
    {
      teste: /MASSA/,
      degustacao: 1,
      final: 1,
    },
    {
      teste: /RISOTO|ARROZ/,
      degustacao: 1,
      final: 1,
    },
    {
      teste: /PEIXE|CARNE|PROTEINA/,
      degustacao: 1,
      final: 1,
    },
    {
      teste: /SOBREMESA/,
      degustacao: 2,
      final: 2,
    },
  ];

  const regra = regras.find((item) => item.teste.test(chave));
  if (!regra) {
    return null;
  }

  return {
    degustacao: regra.degustacao,
    final: Number(qtdFinalExtraida) || regra.final,
  };
}

function gravarMenu(idEvento, menu) {
  if (!menu.length) {
    return;
  }

  const sheet = obterPlanilhaPainel()
    .getSheetByName(ABA_MENU);

  const resultado = removerDuplicidadesMenu(menu);

  if (resultado.removidos.length) {
    registrarLog(
      'AVISO',
      idEvento,
      'DUPLICIDADES_MENU',
      `Itens duplicados removidos automaticamente: ` +
      resultado.removidos.join(' | '),
    );
  }

  const rows = resultado.itens.map((item) => [
    idEvento,
    item.grupo,
    item.categoria,
    item.item,
    item.qtdDegustacao,
    item.qtdFinal,
    item.tipo,
  ]);

  sheet
    .getRange(sheet.getLastRow() + 1, 1, rows.length, MENU_HEADERS.length)
    .setValues(rows);
}

function gravarTerceiros(idEvento, terceiros) {
  if (!terceiros.length) {
    return;
  }

  const sheet = obterPlanilhaPainel()
    .getSheetByName(ABA_TERCEIROS);

  const rows = terceiros.map((item) => [
    idEvento,
    item.tipo,
    item.categoria,
    item.item,
    item.incluirMenuFinal,
    item.incluirOs,
  ]);

  sheet
    .getRange(
      sheet.getLastRow() + 1,
      1,
      rows.length,
      TERCEIROS_HEADERS.length,
    )
    .setValues(rows);
}


function gravarAditivosAplicados(idEvento, consolidacao) {
  const aditivos = consolidacao.aditivos_aplicados || [];

  if (!aditivos.length) {
    return;
  }

  const sheet = obterPlanilhaPainel()
    .getSheetByName(ABA_ADITIVOS);

  const rows = aditivos.map((item) => [
    idEvento,
    item.ordem,
    item.data_aditivo,
    item.arquivo,
    item.referencia_contrato,
    item.tipo_alteracao,
    item.efeito_menu,
    item.resumo,
    item.valor_adicional,
  ]);

  sheet
    .getRange(
      sheet.getLastRow() + 1,
      1,
      rows.length,
      ADITIVOS_HEADERS.length,
    )
    .setValues(rows);
}

function limparDadosEvento(idEvento) {
  removerLinhasPorId(ABA_MENU, idEvento);
  removerLinhasPorId(ABA_TERCEIROS, idEvento);
  removerLinhasPorId(ABA_ADITIVOS, idEvento);
}

function removerLinhasPorId(nomeAba, idEvento) {
  const sheet = obterPlanilhaPainel()
    .getSheetByName(nomeAba);

  for (let row = sheet.getLastRow(); row >= 2; row--) {
    if (texto(sheet.getRange(row, 1).getValue()) === idEvento) {
      sheet.deleteRow(row);
    }
  }
}

function carregarDadosEvento(idEvento) {
  const eventoInfo = buscarEvento(idEvento);
  if (!eventoInfo) {
    throw new Error(`Evento ${idEvento} não encontrado.`);
  }

  const menuRows = lerLinhasPorEvento(
    ABA_MENU,
    MENU_HEADERS.length,
    idEvento,
  );

  const terceirosRows = lerLinhasPorEvento(
    ABA_TERCEIROS,
    TERCEIROS_HEADERS.length,
    idEvento,
  );

  const selecionaveis = agruparMenu(
    menuRows.filter((row) => texto(row[6]) === 'SELECIONAVEL'),
  );

  /*
   * Compatibilidade com extrações antigas:
   * categorias gastronômicas sem escolha eram gravadas como FIXO.
   * A V12 as reconhece como inclusas no cardápio quando não forem
   * bebidas ou finalização.
   */
  const inclusosCardapioRows = menuRows.filter((row) => {
    const tipo = texto(row[6]);

    if (tipo === 'INCLUSO_CARDAPIO') {
      return true;
    }

    return (
      tipo === 'FIXO' &&
      !ehBebidaOuFinalizacaoFixa(row[2])
    );
  });

  const inclusosCardapio = agruparMenu(
    inclusosCardapioRows,
  );

  const fixos = agruparMenu(
    menuRows.filter(
      (row) =>
        texto(row[6]) === 'FIXO' &&
        ehBebidaOuFinalizacaoFixa(row[2]),
    ),
  );

  const cardapioCompleto = agruparCardapioCompleto(
    menuRows,
  );

  const servicosContratados = agruparMenu(
    menuRows.filter(
      (row) => texto(row[6]) === 'SERVICO_CONTRATADO',
    ),
  );

  const naoDegustados = montarCategoriasNaoDegustadas([
    ...cardapioCompleto,
    ...fixos,
    ...servicosContratados,
  ]);

  const cardapioDegustavel = cardapioCompleto.filter(
    (categoria) =>
      !ehCategoriaNaoDegustada(
        categoria.grupo,
        categoria.categoria,
      ),
  );

  const terceiros = agruparTerceiros(terceirosRows);

  return {
    evento: eventoInfo.evento,
    row: eventoInfo.row,
    cabecalho: JSON.parse(
      texto(eventoInfo.evento.JSON_CABECALHO) || '{}',
    ),
    selecionaveis,
    inclusosCardapio,
    cardapioCompleto,
    cardapioDegustavel,
    naoDegustados,
    fixos,
    servicosContratados,
    terceiros,
    aditivos: JSON.parse(
      texto(eventoInfo.evento.JSON_ADITIVOS) || '{}',
    ),
  };
}

function lerLinhasPorEvento(nomeAba, numeroColunas, idEvento) {
  const sheet = obterPlanilhaPainel()
    .getSheetByName(nomeAba);

  if (sheet.getLastRow() < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, numeroColunas)
    .getValues()
    .filter((row) => texto(row[0]) === idEvento);
}


function agruparCardapioCompleto(rows) {
  const map = new Map();

  (rows || []).forEach((row) => {
    const tipoOriginal = texto(row[6]);
    const categoria = texto(row[2]);
    const grupo = texto(row[1]);

    let tipo = tipoOriginal;

    if (
      tipoOriginal === 'FIXO' &&
      !ehBebidaOuFinalizacaoFixa(categoria)
    ) {
      tipo = 'INCLUSO_CARDAPIO';
    }

    if (
      ![
        'SELECIONAVEL',
        'INCLUSO_CARDAPIO',
      ].includes(tipo)
    ) {
      return;
    }

    const key = [
      tipo,
      normalizarChaveAgrupamento(
        categoria || grupo,
      ),
    ].join('|||');

    if (!map.has(key)) {
      map.set(key, {
        key: normalizarChaveAgrupamento(
          categoria || grupo,
        ),
        grupo,
        categoria:
          limparTituloCategoria(categoria) ||
          limparTituloCategoria(grupo),
        qtdDegustacao: Number(row[4]) || 0,
        qtdFinal: Number(row[5]) || 0,
        tipo,
        itens: [],
      });
    }

    const registro = map.get(key);

    registro.qtdDegustacao = Math.max(
      Number(registro.qtdDegustacao) || 0,
      Number(row[4]) || 0,
    );

    registro.qtdFinal = Math.max(
      Number(registro.qtdFinal) || 0,
      Number(row[5]) || 0,
    );

    registro.itens.push(texto(row[3]));
  });

  return [...map.values()].map((categoria) => ({
    ...categoria,
    itens: removerDuplicidadesTexto(
      categoria.itens,
    ),
  }));
}

function agruparMenu(rows) {
  const map = new Map();

  rows.forEach((row) => {
    const grupo = texto(row[1]);
    const categoria = texto(row[2]);

    /*
     * Agrupa pela categoria normalizada, e não pelo texto bruto.
     *
     * Isso une variações como:
     * - "SOBREMESAS"
     * - "SOBREMESAS "
     * - "SOBREMESAS - Delicadezas finais"
     * - textos com espaços invisíveis do PDF.
     *
     * Os tipos SELECIONAVEL, FIXO e SERVICO_CONTRATADO já são
     * carregados separadamente, por isso a categoria pode ser a
     * chave principal com segurança.
     */
    const key = normalizarChaveAgrupamento(
      categoria || grupo,
    );

    if (!map.has(key)) {
      map.set(key, {
        key,
        grupo,
        categoria:
          limparTituloCategoria(categoria) ||
          limparTituloCategoria(grupo),
        qtdDegustacao: Number(row[4]) || 0,
        qtdFinal: Number(row[5]) || 0,
        itens: [],
      });
    }

    const registro = map.get(key);

    /*
     * Quando somente uma das linhas contém as quantidades,
     * preserva o maior valor válido.
     */
    registro.qtdDegustacao = Math.max(
      Number(registro.qtdDegustacao) || 0,
      Number(row[4]) || 0,
    );

    registro.qtdFinal = Math.max(
      Number(registro.qtdFinal) || 0,
      Number(row[5]) || 0,
    );

    registro.itens.push(texto(row[3]));
  });

  return [...map.values()].map((categoria) => ({
    ...categoria,
    itens: removerDuplicidadesTexto(
      categoria.itens,
    ),
  }));
}


function ehCategoriaNaoDegustada(
  grupo,
  categoria,
) {
  const chave = removerAcentos(
    `${texto(grupo)} ${texto(categoria)}`,
  )
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();

  return (
    /\bILHA\b/.test(chave) ||
    /\bBEBIDA/.test(chave) ||
    /\bCERVEJA\b/.test(chave) ||
    /\bVINHO\b/.test(chave) ||
    /\bESPUMANTE\b/.test(chave) ||
    /\bFINALIZACAO\b/.test(chave) ||
    /\bSORVETE/.test(chave) ||
    /\bGELATO\b/.test(chave) ||
    /LANCHE DA MADRUGADA/.test(chave) ||
    /\bFRUTA/.test(chave) ||
    /\bCOFFEE\b/.test(chave) ||
    /\bCAFE\b/.test(chave)
  );
}

function montarCategoriasNaoDegustadas(
  categorias,
) {
  const map = new Map();

  (categorias || []).forEach((categoria) => {
    if (
      !ehCategoriaNaoDegustada(
        categoria.grupo,
        categoria.categoria,
      )
    ) {
      return;
    }

    const titulo =
      limparTituloCategoria(
        categoria.categoria,
      ) ||
      limparTituloCategoria(
        categoria.grupo,
      );

    const key =
      normalizarChaveAgrupamento(
        titulo,
      );

    if (!map.has(key)) {
      map.set(key, {
        key,
        grupo: categoria.grupo,
        categoria: titulo,
        itens: [],
      });
    }

    map.get(key).itens.push(
      ...(categoria.itens || []),
    );
  });

  return [...map.values()].map(
    (categoria) => ({
      ...categoria,
      itens: removerDuplicidadesTexto(
        categoria.itens,
      ),
    }),
  );
}

function montarSecoesNaoDegustadas(
  categorias,
) {
  if (!(categorias || []).length) {
    return [];
  }

  return [
    {
      titulo:
        'ITENS NÃO DEGUSTADOS - CONFORME CONTRATO',
      regra: '',
      itens: categorias.map(
        (categoria) => {
          const itens = (
            categoria.itens || []
          ).join('; ');

          return itens
            ? `${categoria.categoria}: ${itens}`
            : categoria.categoria;
        },
      ),
    },
  ];
}

function montarTextoNaoDegustados(
  categorias,
) {
  if (!(categorias || []).length) {
    return '';
  }

  return categorias
    .map((categoria) => {
      const itens =
        (categoria.itens || [])
          .map((item) => `  • ${item}`)
          .join('\n');

      return [
        categoria.categoria,
        itens,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}

function agruparTerceiros(rows) {
  const map = new Map();

  rows.forEach((row) => {
    const tipo = texto(row[1]);
    const categoria = texto(row[2]);
    const key = `${tipo}|||${categoria}`;

    if (!map.has(key)) {
      map.set(key, {
        tipo,
        categoria,
        itens: [],
        incluirMenuFinal: texto(row[4]) !== 'NÃO',
        incluirOs: texto(row[5]) !== 'NÃO',
      });
    }

    map.get(key).itens.push(texto(row[3]));
  });

  return [...map.values()];
}

function validarDadosAntesDoFormulario(dados) {
  const problemas = [];

  if (!dados.selecionaveis.length) {
    problemas.push(
      'Nenhum item selecionável do Anexo II foi encontrado.',
    );
    return problemas;
  }

  const semDegustacao = dados.selecionaveis.filter(
    (categoria) => categoria.qtdDegustacao <= 0,
  );

  semDegustacao.forEach((categoria) => {
    problemas.push(
      `• ${categoria.categoria}: preencha QTD_DEGUSTACAO ` +
      `ou altere o TIPO para FIXO quando não houver escolha do cliente.`,
    );
  });

  const semFinal = dados.selecionaveis.filter(
    (categoria) => categoria.qtdFinal <= 0,
  );

  semFinal.forEach((categoria) => {
    problemas.push(
      `• ${categoria.categoria}: preencha QTD_MENU_FINAL.`,
    );
  });

  return problemas;
}

function gerarDocumentoEscolha(evento, dados, pasta) {
  const templateId = PropertiesService.getScriptProperties()
    .getProperty('TEMPLATE_ESCOLHA_ID');

  const nome =
    `${dados.cabecalho.numero_contrato || evento.ID_EVENTO}` +
    ` - Escolha de Menu Degustação - ${dados.cabecalho.evento}`;

  return gerarDocumento(
    templateId,
    pasta,
    nome,
    montarReplacementsBasicos(evento, dados.cabecalho),
    {
      '{{BLOCO_MENU_DEGUSTACAO}}':
        dados.cardapioCompleto.map(
          (categoria, index) => ({
            titulo: montarTituloCategoria(
              categoria,
              index,
            ),
            regra:
              categoria.tipo === 'SELECIONAVEL'
                ? montarRegraDegustacao(categoria)
                : 'ITEM JÁ INCLUSO NO CARDÁPIO - NÃO NECESSITA SELEÇÃO',
            itens: categoria.itens,
          }),
        ),
      '{{BLOCO_ITENS_FIXOS}}': dados.fixos.map((categoria) => ({
        titulo: limparTituloCategoria(
          categoria.categoria,
        ),
        regra: 'ITEM FIXO - NÃO NECESSITA SELEÇÃO',
        itens: categoria.itens,
      })),
      '{{BLOCO_SERVICOS_CONTRATADOS}}':
        dados.servicosContratados.map((categoria) => ({
          titulo: normalizarTituloServicoContratado(
            categoria.categoria,
          ),
          regra: '',
          itens: categoria.itens,
        })),
    },
  );
}

function criarFormularioCliente(evento, dados, pasta) {
  const form = FormApp.create(
    `Escolha de Menu Degustação - ${dados.cabecalho.evento}`,
    true,
  );

  form
    .setDescription(
      [
        `Evento: ${dados.cabecalho.evento}`,
        `Data: ${dados.cabecalho.data_evento}`,
        `Local: ${dados.cabecalho.local}`,
        `Prazo: ${dados.cabecalho.data_limite_menu}`,
        '',
        'Selecione as opções para degustação. O formulário apresenta somente itens do Anexo II.',
      ].join('\n'),
    )
    .setConfirmationMessage(
      'Suas escolhas foram registradas. A equipe de Produção dará continuidade ao processo.',
    )
    .setShowLinkToRespondAgain(false)
    .setProgressBar(true);

  const meta = {
    type: 'CLIENTE',
    eventId: evento.ID_EVENTO,
    questionMap: {},
    fields: {},
  };

  const responsavel = form
    .addTextItem()
    .setTitle('Nome do responsável pelo preenchimento')
    .setRequired(true);
  meta.fields[String(responsavel.getId())] = 'nome_responsavel';

  const email = form
    .addTextItem()
    .setTitle('E-mail do responsável')
    .setRequired(true);
  meta.fields[String(email.getId())] = 'email_responsavel';

  dados.cardapioCompleto.forEach(
    (categoria, index) => {
      const tituloCategoria = montarTituloCategoria(
        categoria,
        index,
      );

      if (
        categoria.tipo === 'INCLUSO_CARDAPIO'
      ) {
        form
          .addSectionHeaderItem()
          .setTitle(tituloCategoria)
          .setHelpText(
            [
              'ITEM JÁ INCLUSO NO CARDÁPIO - NÃO NECESSITA SELEÇÃO',
              '',
              ...categoria.itens.map(
                (item) => `• ${item}`,
              ),
            ].join('\n'),
          );

        return;
      }

      const minimo =
        Number(categoria.qtdFinal) || 0;
      const maximo =
        Number(categoria.qtdDegustacao) ||
        minimo;

      const permiteFaixa = maximo > minimo;

      const textoRegra = permiteFaixa
        ? `Escolha de ${minimo} até ${maximo} opção(ões) para degustar.`
        : `Escolha exatamente ${maximo} opção(ões) para degustar.`;

      form
        .addSectionHeaderItem()
        .setTitle(tituloCategoria)
        .setHelpText(textoRegra);

      const item = form.addCheckboxItem();

      const validation =
        FormApp.createCheckboxValidation();

      if (permiteFaixa) {
        validation
          .requireSelectAtLeast(minimo)
          .requireSelectAtMost(maximo)
          .setHelpText(
            `Selecione no mínimo ${minimo} e no máximo ${maximo} opção(ões).`,
          );
      } else {
        validation
          .requireSelectExactly(maximo)
          .setHelpText(
            `Selecione exatamente ${maximo} opção(ões).`,
          );
      }

      item
        .setTitle(
          permiteFaixa
            ? `Selecione de ${minimo} até ${maximo} opção(ões)`
            : `Selecione ${maximo} opção(ões)`,
        )
        .setChoices(
          removerDuplicidadesTexto(
            categoria.itens,
          ).map((opcao) =>
            item.createChoice(opcao),
          ),
        )
        .setRequired(true)
        .setValidation(validation.build());

      meta.questionMap[String(item.getId())] = {
        key: categoria.key,
        titulo: tituloCategoria,
      };
    },
  );

  const restricoes = form
    .addParagraphTextItem()
    .setTitle('Restrições alimentares, alergias ou intolerâncias')
    .setRequired(false);
  meta.fields[String(restricoes.getId())] =
    'restricoes_alimentares';

  const observacoes = form
    .addParagraphTextItem()
    .setTitle('Observações adicionais')
    .setRequired(false);
  meta.fields[String(observacoes.getId())] =
    'observacoes_cliente';

  DriveApp.getFileById(form.getId()).moveTo(pasta);

  registrarFormularioEscalavel(
    form,
    meta,
  );

  return {
    id: form.getId(),
    url: form.getPublishedUrl(),
  };
}


function registrarFormularioEscalavel(
  form,
  meta,
) {
  const lock =
    LockService.getScriptLock();

  lock.waitLock(30000);

  try {
    const infra =
      garantirInfraFormsEscalavel();

    const centralId =
      infra.central.getId();

    /*
     * Guarda o estado anterior apenas como fallback.
     * A identificação principal passa a usar Sheet.getFormUrl(),
     * que é a associação oficial entre a aba de respostas e o Form.
     */
    const before = new Set(
      SpreadsheetApp
        .openById(centralId)
        .getSheets()
        .map((sheet) =>
          String(sheet.getSheetId()),
        ),
    );

    form.setDestination(
      FormApp.DestinationType
        .SPREADSHEET,
      centralId,
    );

    const responseSheet =
      localizarAbaRespostaDoFormulario_(
        centralId,
        form.getId(),
        before,
      );

    /*
     * Mesmo que o Google demore para materializar a aba de respostas,
     * o Form já fica registrado. No primeiro submit, onCentralFormSubmit()
     * reconcilia automaticamente pelo Sheet.getFormUrl().
     *
     * Isso elimina a trava de criação do Form causada por propagação lenta.
     */
    salvarRegistroFormulario({
      FORM_ID: form.getId(),
      ID_EVENTO: meta.eventId,
      TIPO: meta.type,
      STATUS:
        responseSheet
          ? 'ATIVO'
          : 'AGUARDANDO_VINCULO',
      LINK_FORM:
        form.getPublishedUrl(),
      CENTRAL_SPREADSHEET_ID:
        centralId,
      RESPONSE_SHEET_ID:
        responseSheet
          ? responseSheet.getSheetId()
          : '',
      RESPONSE_SHEET_NAME:
        responseSheet
          ? responseSheet.getName()
          : '',
      META_JSON:
        JSON.stringify(meta),
      RESPOSTAS_PROCESSADAS_JSON:
        '[]',
      CRIADO_EM: new Date(),
      ULTIMO_PROCESSAMENTO_EM: '',
      EXPIRA_EM: '',
      ERRO: '',
    });

    registrarLog(
      responseSheet
        ? 'INFO'
        : 'AVISO',
      meta.eventId,
      'FORM_REGISTRY',
      responseSheet
        ? (
          `Form ${meta.type} registrado e vinculado à aba ` +
          `${responseSheet.getName()}: ${form.getId()}`
        )
        : (
          `Form ${meta.type} registrado. A aba de respostas ainda não ` +
          `foi identificada e será reconciliada no primeiro envio: ${form.getId()}`
        ),
    );
  } finally {
    lock.releaseLock();
  }
}

function localizarAbaRespostaDoFormulario_(
  centralId,
  formId,
  before,
) {
  const alvo =
    texto(formId);

  /*
   * O vínculo Forms -> Sheets pode levar alguns segundos para aparecer.
   * Reabrimos a planilha a cada tentativa para evitar objeto em cache.
   */
  for (
    let tentativa = 0;
    tentativa < 30;
    tentativa++
  ) {
    Utilities.sleep(
      tentativa < 5
        ? 500
        : 1000,
    );

    const central =
      SpreadsheetApp.openById(
        centralId,
      );

    const sheets =
      central.getSheets();

    /*
     * Método principal: a própria API do Sheets informa qual Form
     * envia respostas para cada aba.
     */
    for (const sheet of sheets) {
      try {
        const formUrl =
          sheet.getFormUrl();

        if (
          formUrl &&
          extrairIdGoogle(formUrl) === alvo
        ) {
          return sheet;
        }
      } catch (_) {
        // Continua tentando; pode haver propagação/permissão momentânea.
      }
    }

    /*
     * Fallback: se surgiu exatamente uma aba nova desde o setDestination(),
     * ela é usada. O ScriptLock impede concorrência neste trecho.
     */
    const novas =
      sheets.filter(
        (sheet) =>
          !before.has(
            String(
              sheet.getSheetId(),
            ),
          ),
      );

    if (novas.length === 1) {
      return novas[0];
    }
  }

  return null;
}

function onCentralFormSubmit(e) {
  /*
   * Usa UserLock porque o processamento de um Form Cliente pode
   * criar um Form Interno, e essa criação usa ScriptLock.
   */
  const lock =
    LockService.getUserLock();

  let registro = null;
  let form = null;
  let meta = null;

  try {
    lock.waitLock(30000);

    if (
      !e ||
      !e.range ||
      !e.source
    ) {
      throw new Error(
        'Evento inválido no gatilho central.',
      );
    }

    const centralId =
      texto(
        PropertiesService
          .getScriptProperties()
          .getProperty(
            PROP_CENTRAL_RESPOSTAS_ID,
          ),
      );

    if (
      centralId &&
      e.source.getId() !== centralId
    ) {
      throw new Error(
        'O gatilho foi acionado por uma planilha que não é a CENTRAL_RESPOSTAS_ID.',
      );
    }

    const responseSheet =
      e.range.getSheet();

    const responseSheetId =
      responseSheet.getSheetId();

    registro =
      buscarRegistroFormPorResponseSheetId(
        responseSheetId,
      );

    /*
     * Recuperação automática:
     * se a aba ainda não estava vinculada no FORM_REGISTRY na criação,
     * identifica o Form pela associação oficial Sheet.getFormUrl().
     */
    if (!registro) {
      let formUrl = '';

      try {
        formUrl =
          texto(
            responseSheet.getFormUrl(),
          );
      } catch (_) {
        formUrl = '';
      }

      const formId =
        formUrl
          ? extrairIdGoogle(
              formUrl,
            )
          : '';

      if (formId) {
        registro =
          buscarRegistroFormulario(
            formId,
          );

        if (registro) {
          atualizarRegistroFormulario(
            formId,
            {
              RESPONSE_SHEET_ID:
                responseSheetId,
              RESPONSE_SHEET_NAME:
                responseSheet.getName(),
              STATUS: 'ATIVO',
              ERRO: '',
            },
          );

          registro =
            buscarRegistroFormulario(
              formId,
            );

          registrarLog(
            'INFO',
            registro.ID_EVENTO,
            'FORM_REGISTRY_RECONCILIADO',
            `Vínculo recuperado automaticamente para o Form ${formId} na aba ${responseSheet.getName()}.`,
          );
        }
      }
    }

    if (!registro) {
      throw new Error(
        `Nenhum registro encontrado para a aba de resposta ${responseSheetId}. ` +
        `Também não foi possível reconciliar pelo Form associado à aba.`,
      );
    }

    form = FormApp.openById(
      registro.FORM_ID,
    );

    meta =
      JSON.parse(
        texto(registro.META_JSON) ||
        '{}',
      );

    if (
      !meta ||
      !meta.type ||
      !meta.eventId
    ) {
      throw new Error(
        `META_JSON inválido para o formulário ${registro.FORM_ID}.`,
      );
    }

    const processadas =
      new Set(
        parseJsonArray(
          registro
            .RESPOSTAS_PROCESSADAS_JSON,
        ),
      );

    const responses =
      form
        .getResponses()
        .sort(
          (a, b) =>
            a.getTimestamp() -
            b.getTimestamp(),
        );

    const pendentes =
      responses.filter(
        (response) => {
          const id =
            texto(response.getId());

          return (
            id &&
            !processadas.has(id)
          );
        },
      );

    if (!pendentes.length) {
      atualizarRegistroFormulario(
        registro.FORM_ID,
        {
          STATUS:
            registro.STATUS ||
            'ATIVO',
          ULTIMO_PROCESSAMENTO_EM:
            new Date(),
          ERRO: '',
        },
      );

      return;
    }

    const response =
      pendentes[0];

    if (meta.type === 'CLIENTE') {
      processarRespostaCliente(
        {
          source: form,
          response,
        },
        meta,
      );
    } else if (
      meta.type === 'INTERNO'
    ) {
      /*
       * V23.1:
       * o envio do Form Interno NÃO gera Menu Final + OS automaticamente.
       * Ele registra a resposta e libera a etapa de aprovação no Mini Software.
       */
      registrarRespostaInternaParaAprovacao_(
        {
          source: form,
          response,
        },
        meta,
      );
    } else {
      throw new Error(
        `Tipo de formulário desconhecido: ${meta.type}`,
      );
    }

    processadas.add(
      texto(response.getId()),
    );

    atualizarRegistroFormulario(
      registro.FORM_ID,
      {
        STATUS:
          meta.type === 'INTERNO'
            ? 'RESPONDIDO_AGUARDANDO_GERACAO'
            : 'PROCESSADO',
        RESPOSTAS_PROCESSADAS_JSON:
          JSON.stringify(
            [...processadas],
          ),
        ULTIMO_PROCESSAMENTO_EM:
          new Date(),
        /*
         * O Form Interno só entra na retenção após a geração final,
         * quando marcarFormularioInternoProcessado() é chamado.
         */
        EXPIRA_EM:
          meta.type === 'INTERNO'
            ? ''
            : new Date(),
        ERRO: '',
      },
    );

    if (meta.type === 'CLIENTE') {
      try {
        form
          .setAcceptingResponses(false)
          .setCustomClosedFormMessage(
            'Este formulário já foi processado. Em caso de ajuste, fale com a equipe de Produção.',
          );
      } catch (_) {
        // O registro continua com expiração imediata.
      }
    }
  } catch (error) {
    const idEvento =
      meta && meta.eventId
        ? meta.eventId
        : (
          registro
            ? registro.ID_EVENTO
            : ''
        );

    if (registro) {
      try {
        atualizarRegistroFormulario(
          registro.FORM_ID,
          {
            STATUS: 'ERRO',
            ULTIMO_PROCESSAMENTO_EM:
              new Date(),
            ERRO:
              error.message ||
              String(error),
          },
        );
      } catch (_) {
        // Mantém o erro original.
      }
    }

    if (idEvento) {
      try {
        atualizarEventoPorId(
          idEvento,
          {
            STATUS: 'ERRO',
            ERRO:
              `Erro no processamento automático do formulário: ` +
              `${error.message || error}`,
          },
        );
      } catch (_) {
        // Mantém o erro original.
      }
    }

    registrarLog(
      'ERRO',
      idEvento,
      'FORM_CENTRAL_SUBMIT',
      error.stack ||
        error.message ||
        String(error),
    );

    throw error;
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {
      // Nada a fazer.
    }
  }
}

function onAnyFormSubmit(e) {
  let meta = null;
  let formId = '';

  try {
    if (!e || !e.source || !e.response) {
      throw new Error(
        'Esta função deve ser executada por um gatilho de envio de formulário.',
      );
    }

    formId = e.source.getId();
    meta = obterMetaFormulario(formId);

    if (!meta) {
      throw new Error(
        `Metadados não encontrados para o formulário ${formId}.`,
      );
    }

    if (meta.type === 'CLIENTE') {
      processarRespostaCliente(e, meta);
      return;
    }

    if (meta.type === 'INTERNO') {
      /*
       * Compatibilidade com gatilhos legados:
       * também passa a aguardar a aprovação manual no Mini Software.
       */
      registrarRespostaInternaParaAprovacao_(
        e,
        meta,
      );
      return;
    }

    throw new Error(
      `Tipo de formulário desconhecido: ${meta.type}`,
    );
  } catch (error) {
    const idEvento =
      meta && meta.eventId ? meta.eventId : '';

    if (idEvento) {
      try {
        atualizarEventoPorId(idEvento, {
          STATUS: 'ERRO',
          ERRO:
            `Erro no envio do formulário: ` +
            `${error.message || error}`,
        });
      } catch (_) {
        // Mantém o erro original.
      }
    }

    registrarLog(
      'ERRO',
      idEvento,
      'FORM_SUBMIT',
      [
        formId ? `FORM_ID=${formId}` : '',
        error.stack || error.message || String(error),
      ]
        .filter(Boolean)
        .join('\n'),
    );

    throw error;
  }
}

function registrarRespostaInternaParaAprovacao_(
  e,
  meta,
) {
  if (
    !e ||
    !e.response ||
    !meta ||
    !meta.eventId
  ) {
    throw new Error(
      'Resposta interna inválida para registro.',
    );
  }

  gravarRespostas(
    meta.eventId,
    'INTERNO',
    e.response,
  );

  atualizarEventoPorId(
    meta.eventId,
    {
      STATUS:
        'AGUARDANDO_POS_DEGUSTACAO',
      ERRO: '',
    },
  );

  registrarLog(
    'INFO',
    meta.eventId,
    'RESPOSTA_INTERNA_RECEBIDA',
    'Formulário Interno respondido. Menu Final + OS aguardam aprovação no Mini Software.',
  );
}

function processarRespostaCliente(e, meta) {
  const dados = carregarDadosEvento(meta.eventId);
  const parsed = lerRespostaFormulario(e.response, meta);

  gravarRespostas(
    meta.eventId,
    'CLIENTE',
    e.response,
  );

  const pasta = DriveApp.getFolderById(
    extrairIdGoogle(dados.evento.LINK_PASTA_EVENTO),
  );

  const escolhidos = montarSecoesSelecionadas(
    dados.cardapioDegustavel,
    parsed.categorias,
    'DEGUSTACAO',
  );

  const replacements = {
    ...montarReplacementsBasicos(
      dados.evento,
      dados.cabecalho,
    ),
    '{{DATA_DEGUSTACAO}}': texto(
      dados.evento.DATA_DEGUSTACAO,
    ),
    '{{HORARIO_DEGUSTACAO}}': texto(
      dados.evento.HORARIO_DEGUSTACAO,
    ),
    '{{LOCAL_DEGUSTACAO}}': texto(
      dados.evento.LOCAL_DEGUSTACAO,
    ),
    '{{PAX_DEGUSTACAO}}': texto(
      dados.evento.PAX_DEGUSTACAO,
    ),
    '{{RESTRICOES_ALIMENTARES}}':
      parsed.fields.restricoes_alimentares || 'Não informado.',
    '{{OBSERVACOES_CLIENTE}}':
      parsed.fields.observacoes_cliente || 'Não informado.',
  };

  const nome =
    `${dados.cabecalho.numero_contrato || meta.eventId}` +
    ` - Relatório de Degustação - ${dados.cabecalho.evento}`;

  const relatorio = gerarDocumento(
    PropertiesService.getScriptProperties()
      .getProperty('TEMPLATE_RELATORIO_ID'),
    pasta,
    nome,
    replacements,
    {
      '{{BLOCO_ITENS_DEGUSTACAO}}': escolhidos,
      '{{BLOCO_NAO_DEGUSTADOS}}':
        montarSecoesNaoDegustadas(
          dados.naoDegustados,
        ),
      '{{BLOCO_ITENS_FIXOS}}': dados.fixos
        .filter(
          (categoria) =>
            !ehCategoriaNaoDegustada(
              categoria.grupo,
              categoria.categoria,
            ),
        )
        .map(
          (categoria) => ({
            titulo: limparTituloCategoria(
              categoria.categoria,
            ),
            regra: '',
            itens: categoria.itens,
          }),
        ),
      '{{BLOCO_SERVICOS_CONTRATADOS}}':
        dados.servicosContratados
          .filter(
            (categoria) =>
              !ehCategoriaNaoDegustada(
                categoria.grupo,
                categoria.categoria,
              ),
          )
          .map((categoria) => ({
            titulo: normalizarTituloServicoContratado(
              categoria.categoria,
            ),
            regra: '',
            itens: categoria.itens,
          })),
    },
  );

  const formularioInterno = criarFormularioInterno(
    dados,
    parsed,
    pasta,
  );

  atualizarEventoPorId(meta.eventId, {
    STATUS: 'AGUARDANDO_POS_DEGUSTACAO',
    LINK_RELATORIO_DOC: relatorio.docUrl,
    LINK_RELATORIO_PDF: relatorio.pdfUrl,
    LINK_FORM_INTERNO: formularioInterno.url,
    FORM_INTERNO_ID: formularioInterno.id,
  });

  registrarLog(
    'INFO',
    meta.eventId,
    'RESPOSTA_CLIENTE',
    'Relatório gerado e formulário interno criado.',
  );
}

function criarFormularioInterno(dados, respostaCliente, pasta) {
  const form = FormApp.create(
    `Pós-degustação - ${dados.cabecalho.evento}`,
    true,
  );

  const degustadosTexto = dados.selecionaveis
    .filter(
      (categoria) =>
        !ehCategoriaNaoDegustada(
          categoria.grupo,
          categoria.categoria,
        ),
    )
    .map((categoria) => {
      const itens =
        respostaCliente.categorias[categoria.key] || [];
      return `${categoria.categoria}: ${itens.join('; ')}`;
    })
    .join('\n');

  const naoDegustadosTexto =
    montarTextoNaoDegustados(
      dados.naoDegustados,
    );

  const staffAditivo = formatarAlimentacaoStaff(
    dados.aditivos.alimentacao_staff,
  );

  form
    .setDescription(
      [
        `Evento: ${dados.cabecalho.evento}`,
        `Data: ${dados.cabecalho.data_evento}`,
        '',
        'ITENS ESCOLHIDOS PARA DEGUSTAÇÃO:',
        degustadosTexto || 'Nenhum item selecionável para degustação.',
        '',
        naoDegustadosTexto
          ? 'ITENS CONTRATADOS QUE NÃO SÃO DEGUSTADOS:'
          : '',
        naoDegustadosTexto,
        '',
        staffAditivo
          ? `ALIMENTAÇÃO DE STAFF JÁ CONTRATADA EM ADITIVO:\n${staffAditivo}`
          : '',
        '',
        'Agora confirme o menu final e preencha os campos operacionais da OS.',
      ]
        .filter((linha) => linha !== '')
        .join('\n'),
    )
    .setConfirmationMessage(
      'Dados registrados. Volte ao Mini Software A&B para revisar e gerar o Menu Final + OS.',
    )
    .setShowLinkToRespondAgain(true)
    .setProgressBar(true);

  const meta = {
    type: 'INTERNO',
    eventId: dados.evento.ID_EVENTO,
    questionMap: {},
    customCategoryFields: {},
    categoryObservationFields: {},
    serviceModeFields: {},
    serviceHoursFields: {},
    servicePointsFields: {},
    fields: {},
  };

  dados.cardapioCompleto.forEach((categoria, index) => {
    const selecionavel =
      categoria.tipo === 'SELECIONAVEL';

    const degustados =
      respostaCliente.categorias[categoria.key] || [];

    const tituloCategoria = montarTituloCategoria(
      categoria,
      index,
    );

    const quantidadeFinal =
      Number(categoria.qtdFinal) || 0;

    const naoDegustado =
      ehCategoriaNaoDegustada(
        categoria.grupo,
        categoria.categoria,
      );

    const permiteOperacao =
      categoriaPermiteConfiguracaoOperacional_(
        categoria,
      );

    const ajudaCategoria = naoDegustado
      ? (
        `NÃO DEGUSTADO — conforme contrato.\n` +
        `Confira apenas a definição final e as informações aplicáveis.\n` +
        `Itens contratados:\n` +
        categoria.itens.map((item) => `• ${item}`).join('\n')
      )
      : (
        selecionavel
          ? (
            `✅ PRÉ-SELECIONADOS NA DEGUSTAÇÃO: ${degustados.join('; ') || 'não informado'}\n` +
            `As opções degustadas já serão abertas marcadas para facilitar o check.\n` +
            `Quantidade final contratada: ${quantidadeFinal} opção(ões).\n` +
            `Marque/desmarque no checklist o prato final. Use "Outro prato" ` +
            `somente quando o prato não estiver na lista.`
          )
          : (
            `Itens já inclusos no cardápio:\n` +
            categoria.itens.map((item) => `• ${item}`).join('\n')
          )
      );

    form
      .addSectionHeaderItem()
      .setTitle(
        index === 0
          ? `MENU FINAL - ${tituloCategoria}`
          : tituloCategoria,
      )
      .setHelpText(ajudaCategoria);

    /*
     * Formato de serviço, horas, pontos e observação de cozinha
     * só fazem sentido para categorias gastronômicas operacionais.
     * Estrutura da gastronomia e bebidas, por exemplo, não recebem
     * esses campos.
     */
    if (permiteOperacao) {
      adicionarConfiguracaoServicoCategoria(
        form,
        meta,
        categoria,
      );
    }

    if (selecionavel) {
      const item = form.addCheckboxItem();

      item
        .setTitle(
          `Selecione até ${quantidadeFinal} opção(ões) do checklist`,
        )
        .setChoices(
          removerDuplicidadesTexto(
            categoria.itens,
          ).map((opcao) =>
            item.createChoice(opcao),
          ),
        )
        .setRequired(false)
        .setValidation(
          FormApp.createCheckboxValidation()
            .requireSelectAtMost(quantidadeFinal)
            .setHelpText(
              `Selecione no máximo ${quantidadeFinal} opção(ões). ` +
              `As escolhas da degustação já aparecem pré-marcadas. ` +
              `Use o campo abaixo para pratos fora da lista.`,
            )
            .build(),
        );

      meta.questionMap[String(item.getId())] = {
        key: categoria.key,
        titulo: tituloCategoria,
      };

      const campoLivre = form
        .addParagraphTextItem()
        .setTitle(
          `Outro prato fora do checklist - ${limparTituloCategoria(
            categoria.categoria,
          )}`,
        )
        .setHelpText(
          'Preencha somente com o nome completo do prato quando ele não estiver ' +
          'no checklist. Não use este campo para observações.',
        )
        .setRequired(false);

      meta.customCategoryFields[String(campoLivre.getId())] = {
        key: categoria.key,
        titulo: tituloCategoria,
      };
    }

    if (permiteOperacao) {
      const observacaoCategoria = form
        .addParagraphTextItem()
        .setTitle(
          `Observações para cozinha - ${limparTituloCategoria(
            categoria.categoria,
          )}`,
        )
        .setHelpText(
          'Exemplos: ponto, alergias, apresentação, troca de guarnição ' +
          'ou cuidado operacional. Este texto não entra no cardápio.',
        )
        .setRequired(false);

      meta.categoryObservationFields[
        String(observacaoCategoria.getId())
      ] = {
        key: categoria.key,
        titulo: tituloCategoria,
      };
    }
  });

  if (dados.naoDegustados.length) {
    form
      .addSectionHeaderItem()
      .setTitle(
        'ITENS NÃO DEGUSTADOS - CONFORME CONTRATO',
      )
      .setHelpText(
        montarTextoNaoDegustados(
          dados.naoDegustados,
        ),
      );
  }

  adicionarCampoInterno(
    form,
    meta,
    'pax_os',
    'Pax operacional da OS',
    'TEXT',
    true,
  );
  adicionarCampoInterno(
    form,
    meta,
    'bebidas_cliente',
    'Bebidas do cliente',
    'PARAGRAPH',
    false,
  );
  adicionarCampoInterno(
    form,
    meta,
    'encantamento',
    'Encantamento (se tiver A&B)',
    'PARAGRAPH',
    false,
  );
  adicionarFluxoCamarimStaff(
    form,
    meta,
    staffAditivo,
    dados,
  );
  adicionarCampoInterno(
    form,
    meta,
    'guardanapo',
    'Guardanapo',
    'TEXT',
    false,
  );
  adicionarCampoInterno(
    form,
    meta,
    'perfil_convidado',
    'Perfil dos convidados',
    'PARAGRAPH',
    false,
  );
  adicionarCampoInterno(
    form,
    meta,
    'cor_evento',
    'Cor do evento',
    'TEXT',
    false,
  );
  adicionarCampoInterno(
    form,
    meta,
    'observacoes_cozinha',
    'Observações de cozinha',
    'PARAGRAPH',
    false,
  );
  adicionarCampoInterno(
    form,
    meta,
    'observacoes_salao',
    'Observações de salão',
    'PARAGRAPH',
    false,
  );
  adicionarCampoInterno(
    form,
    meta,
    'restricoes_alimentares',
    'Restrições alimentares consolidadas',
    'PARAGRAPH',
    false,
  );

  /*
   * Google Forms / FormApp não expõe formatação rich-text individual
   * (como negrito em uma opção). A solução mais segura é melhor:
   * abrir o Form Interno com as escolhas da degustação já MARCADAS.
   */
  const urlPreenchida =
    criarUrlPreenchidoFormularioInterno_(
      form,
      meta,
      dados,
      respostaCliente,
    );

  DriveApp.getFileById(form.getId()).moveTo(pasta);

  registrarFormularioEscalavel(
    form,
    meta,
  );

  return {
    id: form.getId(),
    url:
      urlPreenchida ||
      form.getPublishedUrl(),
    urlBase:
      form.getPublishedUrl(),
  };
}



function adicionarFluxoCamarimStaff(
  form,
  meta,
  staffAditivo,
  dados,
) {
  const paginaCamarim = form
    .addPageBreakItem()
    .setTitle('CAMARIM');

  const camarimItem = form
    .addMultipleChoiceItem()
    .setTitle('Camarim')
    .setHelpText(
      'Se o camarim for padrão, não é necessário preencher nenhuma informação adicional.',
    )
    .setRequired(true);

  meta.fields[
    String(camarimItem.getId())
  ] = 'camarim_tipo';

  const paginaDetalhesCamarim = form
    .addPageBreakItem()
    .setTitle('CAMARIM FORA DO PADRÃO')
    .setHelpText(
      'Descreva somente as necessidades que fogem do padrão.',
    );

  adicionarCampoInterno(
    form,
    meta,
    'camarim_detalhes',
    'Especificações desejadas para o camarim',
    'PARAGRAPH',
    false,
  );

  const paginaStaff = form
    .addPageBreakItem()
    .setTitle('ALIMENTAÇÃO DE STAFF')
    .setHelpText(
      staffAditivo
        ? `Existe contratação de staff em aditivo: ${staffAditivo}`
        : 'Preencha os dados operacionais de cada etapa. As datas vêm pré-selecionadas e podem ser alteradas.',
    );

  camarimItem.setChoices([
    camarimItem.createChoice(
      'Padrão',
      paginaStaff,
    ),
    camarimItem.createChoice(
      'Fora do padrão',
      paginaDetalhesCamarim,
    ),
  ]);

  adicionarBlocoStaffPadrao(
    form,
    meta,
    'staff_montagem',
    'ALIMENTAÇÃO DE STAFF - MONTAGEM',
  );

  adicionarBlocoStaffPadrao(
    form,
    meta,
    'staff_evento',
    'ALIMENTAÇÃO DE STAFF - EVENTO',
  );

  adicionarBlocoStaffPadrao(
    form,
    meta,
    'staff_desmontagem',
    'ALIMENTAÇÃO DE STAFF - DESMONTAGEM',
  );

  const paginaStaffCliente = form
    .addPageBreakItem()
    .setTitle('CONTRATAÇÃO STAFF CLIENTE');

  const staffClienteItem = form
    .addMultipleChoiceItem()
    .setTitle('Haverá contratação de staff pelo cliente?')
    .setHelpText(
      'Se a resposta for Não, nenhuma informação adicional será solicitada.',
    )
    .setRequired(true);

  meta.fields[
    String(staffClienteItem.getId())
  ] = 'staff_cliente_contratado';

  const paginaDetalhesStaffCliente = form
    .addPageBreakItem()
    .setTitle('DETALHES - CONTRATAÇÃO STAFF CLIENTE');

  adicionarCampoInterno(
    form,
    meta,
    'staff_cliente_data',
    'Data - Contratação Staff Cliente',
    'DATE',
    false,
  );

  adicionarCampoInterno(
    form,
    meta,
    'staff_cliente_horario',
    'Horário - Contratação Staff Cliente',
    'TEXT',
    false,
  );

  adicionarCampoInterno(
    form,
    meta,
    'staff_cliente_quantidade',
    'Quantidade de pessoas - Contratação Staff Cliente',
    'TEXT',
    false,
  );

  adicionarCampoInterno(
    form,
    meta,
    'staff_cliente_observacao',
    'Observações - Contratação Staff Cliente',
    'PARAGRAPH',
    false,
  );

  const paginaDemais = form
    .addPageBreakItem()
    .setTitle('DEMAIS INFORMAÇÕES');

  staffClienteItem.setChoices([
    staffClienteItem.createChoice(
      'Não',
      paginaDemais,
    ),
    staffClienteItem.createChoice(
      'Sim',
      paginaDetalhesStaffCliente,
    ),
  ]);
}

function adicionarBlocoStaffPadrao(
  form,
  meta,
  prefixo,
  titulo,
) {
  form
    .addSectionHeaderItem()
    .setTitle(titulo)
    .setHelpText(
      'Alimentação de staff padrão Grupo Trio, conforme operação vigente. ' +
      'Neste formulário, informe somente data, horário e quantidade de pessoas. ' +
      'A data já vem pré-selecionada conforme o contrato e pode ser alterada.',
    );

  adicionarCampoInterno(
    form,
    meta,
    `${prefixo}_data`,
    `Data - ${titulo}`,
    'DATE',
    false,
  );

  adicionarCampoInterno(
    form,
    meta,
    `${prefixo}_horario`,
    `Horário - ${titulo}`,
    'TEXT',
    false,
  );

  adicionarCampoInterno(
    form,
    meta,
    `${prefixo}_quantidade`,
    `Quantidade de pessoas - ${titulo}`,
    'TEXT',
    false,
  );
}

function formatarCamarim(fields) {
  const tipo =
    texto(fields.camarim_tipo);

  if (
    normalizarTextoComparacao(tipo) ===
    'PADRAO'
  ) {
    return 'Padrão';
  }

  if (
    normalizarTextoComparacao(tipo) ===
    'FORA DO PADRAO'
  ) {
    return (
      texto(fields.camarim_detalhes) ||
      'Fora do padrão - detalhes não informados.'
    );
  }

  return (
    texto(fields.camarim) ||
    texto(fields.camarim_detalhes) ||
    'Não informado.'
  );
}

function formatarStaffPadrao(
  fields,
  prefixo,
  legado,
) {
  const data =
    texto(fields[`${prefixo}_data`]);

  const horario =
    texto(fields[`${prefixo}_horario`]);

  const quantidade =
    texto(fields[`${prefixo}_quantidade`]);

  if (
    !data &&
    !horario &&
    !quantidade &&
    texto(legado)
  ) {
    return texto(legado);
  }

  return [
    'Padrão Grupo Trio',
    `Data: ${data || 'Não informado'}`,
    `Horário: ${horario || 'Não informado'}`,
    `Quantidade: ${quantidade || 'Não informado'}`,
  ].join(' | ');
}

function formatarContratacaoStaffCliente(
  fields,
) {
  const contratado =
    normalizarTextoComparacao(
      fields.staff_cliente_contratado,
    );

  if (
    !contratado ||
    contratado === 'NAO'
  ) {
    return '';
  }

  if (contratado !== 'SIM') {
    return '';
  }

  return [
    'Sim',
    `Data: ${texto(fields.staff_cliente_data) || 'Não informado'}`,
    `Horário: ${texto(fields.staff_cliente_horario) || 'Não informado'}`,
    `Quantidade: ${texto(fields.staff_cliente_quantidade) || 'Não informado'}`,
    texto(fields.staff_cliente_observacao)
      ? `Observações: ${texto(fields.staff_cliente_observacao)}`
      : '',
  ]
    .filter(Boolean)
    .join(' | ');
}

function adicionarConfiguracaoServicoCategoria(
  form,
  meta,
  categoria,
) {
  const titulo =
    limparTituloCategoria(
      categoria.categoria,
    );

  const modeItem = form
    .addMultipleChoiceItem()
    .setTitle(
      `Formato de serviço - ${titulo}`,
    )
    .setHelpText(
      'Escolha somente uma opção. Depois informe as horas e, ' +
      'quando for Ponto de Buffet, a quantidade de pontos.',
    )
    .setChoiceValues([
      'Volante',
      'Ponto de Buffet',
      'Empratado',
      'Não se aplica',
    ])
    .setRequired(true);

  meta.serviceModeFields[
    String(modeItem.getId())
  ] = {
    key: categoria.key,
    titulo,
  };

  const hoursItem = form
    .addTextItem()
    .setTitle(
      `Quantidade de horas - ${titulo}`,
    )
    .setHelpText(
      'Preencha para Volante, Ponto de Buffet ou Empratado. ' +
      'Exemplos: 2 horas, 3h30.',
    )
    .setRequired(false);

  meta.serviceHoursFields[
    String(hoursItem.getId())
  ] = {
    key: categoria.key,
    titulo,
  };

  const pointsItem = form
    .addTextItem()
    .setTitle(
      `Quantidade de pontos de buffet - ${titulo}`,
    )
    .setHelpText(
      'Preencha somente quando o formato escolhido for Ponto de Buffet.',
    )
    .setRequired(false);

  meta.servicePointsFields[
    String(pointsItem.getId())
  ] = {
    key: categoria.key,
    titulo,
  };
}

function adicionarCampoInterno(
  form,
  meta,
  key,
  titulo,
  tipo,
  obrigatorio,
) {
  let item = null;

  if (tipo === 'PARAGRAPH') {
    item = form.addParagraphTextItem();
  } else if (tipo === 'DATE') {
    item = form
      .addDateItem()
      .setIncludesYear(true);
  } else {
    item = form.addTextItem();
  }

  item
    .setTitle(titulo)
    .setRequired(obrigatorio);

  meta.fields[
    String(item.getId())
  ] = key;

  return item;
}

function categoriaPermiteConfiguracaoOperacional_(
  categoria,
) {
  const chave = removerAcentos(
    `${texto(categoria && categoria.grupo)} ${texto(categoria && categoria.categoria)}`,
  )
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();

  /*
   * Estes blocos são informação/estrutura, e não uma categoria de prato
   * que precise de formato de serviço, horas, pontos ou observação de cozinha.
   */
  const naoOperacionais = [
    /\bESTRUTURA DA GASTRONOMIA\b/,
    /\bESTRUTURA GASTRONOMICA\b/,
    /\bESTRUTURA GASTRONOMIA\b/,
    /\bBEBIDA/,
    /\bCERVEJA\b/,
    /\bVINHO\b/,
    /\bESPUMANTE\b/,
    /\bWHISKY\b/,
    /\bVODKA\b/,
    /\bGIN\b/,
    /\bDRINK/,
    /\bCOQUETELARIA\b/,
    /\bBAR\b/,
    /\bREFRIGERANTE/,
    /\bSUCO\b/,
    /\bAGUA\b/,
    /\bFINALIZACAO\b/,
  ];

  return !naoOperacionais.some(
    (regex) => regex.test(chave),
  );
}

function criarUrlPreenchidoFormularioInterno_(
  form,
  meta,
  dados,
  respostaCliente,
) {
  try {
    const prefill =
      form.createResponse();

    let adicionou = false;

    form.getItems()
      .forEach((item) => {
        const itemId =
          String(item.getId());

        if (
          meta.questionMap[itemId] &&
          item.getType() ===
            FormApp.ItemType.CHECKBOX
        ) {
          const info =
            meta.questionMap[itemId];

          const desejados =
            removerDuplicidadesTexto(
              (respostaCliente.categorias || {})[
                info.key
              ] || [],
            );

          if (!desejados.length) {
            return;
          }

          const checkbox =
            item.asCheckboxItem();

          const choices =
            checkbox
              .getChoices()
              .map(
                (choice) =>
                  choice.getValue(),
              );

          const mapaNormalizado =
            new Map(
              choices.map(
                (choice) => [
                  normalizarTextoComparacao(
                    choice,
                  ),
                  choice,
                ],
              ),
            );

          const validos =
            desejados
              .map(
                (value) =>
                  mapaNormalizado.get(
                    normalizarTextoComparacao(
                      value,
                    ),
                  ) || '',
              )
              .filter(Boolean);

          if (validos.length) {
            prefill.withItemResponse(
              checkbox.createResponse(
                validos,
              ),
            );
            adicionou = true;
          }

          return;
        }

        if (
          meta.fields[itemId] &&
          item.getType() ===
            FormApp.ItemType.DATE
        ) {
          const fieldKey =
            meta.fields[itemId];

          const data =
            obterDataPadraoCampoInterno_(
              fieldKey,
              dados,
            );

          if (data) {
            prefill.withItemResponse(
              item
                .asDateItem()
                .createResponse(data),
            );
            adicionou = true;
          }
        }
      });

    return adicionou
      ? prefill.toPrefilledUrl()
      : form.getPublishedUrl();
  } catch (error) {
    registrarLog(
      'AVISO',
      dados && dados.evento
        ? dados.evento.ID_EVENTO
        : '',
      'FORM_INTERNO_PREFILL',
      `Não foi possível gerar URL pré-preenchida. O Form continuará disponível sem pré-seleção. ${error.message || error}`,
    );

    return form.getPublishedUrl();
  }
}

function obterDataPadraoCampoInterno_(
  fieldKey,
  dados,
) {
  const cabecalho =
    (dados && dados.cabecalho) || {};

  const dataEvento =
    extrairDataOperacao_(
      cabecalho.data_evento,
    );

  if (
    fieldKey ===
    'staff_montagem_data'
  ) {
    return (
      extrairDataOperacao_(
        cabecalho.montagem,
      ) || dataEvento
    );
  }

  if (
    fieldKey ===
    'staff_desmontagem_data'
  ) {
    return (
      extrairDataOperacao_(
        cabecalho.desmontagem,
      ) || dataEvento
    );
  }

  if (
    fieldKey ===
      'staff_evento_data' ||
    fieldKey ===
      'staff_cliente_data'
  ) {
    return dataEvento;
  }

  return null;
}

function extrairDataOperacao_(
  value,
) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      12,
      0,
      0,
    );
  }

  const raw = texto(value);

  let match = raw.match(
    /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/,
  );

  if (match) {
    let ano = Number(match[3]);

    if (ano < 100) {
      ano += 2000;
    }

    const date = new Date(
      ano,
      Number(match[2]) - 1,
      Number(match[1]),
      12,
      0,
      0,
    );

    return Number.isNaN(
      date.getTime(),
    )
      ? null
      : date;
  }

  match = raw.match(
    /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/,
  );

  if (match) {
    const date = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      12,
      0,
      0,
    );

    return Number.isNaN(
      date.getTime(),
    )
      ? null
      : date;
  }

  return null;
}

function normalizarRespostaFormulario_(
  value,
) {
  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      'dd/MM/yyyy',
    );
  }

  if (Array.isArray(value)) {
    return value
      .map(
        (item) =>
          normalizarRespostaFormulario_(
            item,
          ),
      )
      .join('; ');
  }

  return texto(value);
}



function recriarFormularioInternoUltimaRespostaClienteLinhaAtiva() {
  executarComTratamento('RECRIAR_FORM_INTERNO', () => {
    const contexto =
      obterContextoLinhaAtiva();

    const evento = contexto.evento;

    if (!texto(evento.FORM_CLIENTE_ID)) {
      throw new Error(
        'A linha não possui FORM_CLIENTE_ID.',
      );
    }

    if (!texto(evento.LINK_PASTA_EVENTO)) {
      throw new Error(
        'A linha não possui LINK_PASTA_EVENTO.',
      );
    }

    const formCliente =
      FormApp.openById(
        texto(evento.FORM_CLIENTE_ID),
      );

    const responses =
      formCliente.getResponses();

    if (!responses.length) {
      throw new Error(
        'O formulário do cliente ainda não possui respostas.',
      );
    }

    const metaCliente =
      obterMetaFormulario(
        formCliente.getId(),
      );

    if (!metaCliente) {
      throw new Error(
        'Metadados do formulário do cliente não encontrados.',
      );
    }

    const ultimaResposta =
      responses[responses.length - 1];

    const respostaCliente =
      lerRespostaFormulario(
        ultimaResposta,
        metaCliente,
      );

    const dados =
      carregarDadosEvento(
        evento.ID_EVENTO,
      );

    const pasta =
      DriveApp.getFolderById(
        extrairIdGoogle(
          evento.LINK_PASTA_EVENTO,
        ),
      );

    const interno =
      criarFormularioInterno(
        dados,
        respostaCliente,
        pasta,
      );

    atualizarEventoPorId(
      evento.ID_EVENTO,
      {
        STATUS:
          'AGUARDANDO_POS_DEGUSTACAO',
        ERRO: '',
        LINK_FORM_INTERNO:
          interno.url,
        FORM_INTERNO_ID:
          interno.id,
      },
    );

    SpreadsheetApp.getUi().alert(
      'Novo Formulário Interno criado com formato de serviço por categoria. Use o novo LINK_FORM_INTERNO.',
    );
  });
}

function gerarMenuFinalEOsUltimaRespostaLinhaAtiva() {
  executarComTratamento('GERAR_FINAL_MANUAL', () => {
    const contexto = obterContextoLinhaAtiva();
    const { evento } = contexto;

    validarFormularioInternoDoEvento(evento);

    const form = FormApp.openById(
      texto(evento.FORM_INTERNO_ID),
    );

    const responses = form.getResponses();

    if (!responses.length) {
      throw new Error(
        'O formulário interno ainda não possui respostas.',
      );
    }

    const meta = obterMetaFormulario(
      form.getId(),
    );

    if (!meta) {
      throw new Error(
        'Os metadados do formulário interno não foram encontrados. ' +
        'Gere novamente o formulário interno ou restaure as propriedades do script.',
      );
    }

    const ultimaResposta =
      responses[responses.length - 1];

    processarRespostaInterna(
      {
        source: form,
        response: ultimaResposta,
      },
      meta,
      {
        ignorarGravacaoResposta: true,
      },
    );

    const eventoAtualizado =
      buscarEvento(evento.ID_EVENTO).evento;

    if (
      eventoAtualizado.STATUS ===
      'MENU_FINAL_E_OS_GERADOS'
    ) {
      const atualizado =
        buscarEvento(evento.ID_EVENTO).evento;

      const possuiAvisos =
        texto(atualizado.AVISOS_REVISAO);

      marcarFormularioInternoProcessado(
        form.getId(),
      );

      SpreadsheetApp.getUi().alert(
        possuiAvisos
          ? 'Menu Final e OS gerados. Houve ajustes automáticos; confira a coluna AVISOS_REVISAO antes de enviar os documentos.'
          : 'Menu Final e OS gerados com sucesso usando a última resposta do formulário interno.',
      );
      return;
    }

    throw new Error(
      texto(eventoAtualizado.ERRO) ||
      'A última resposta não passou pela validação. Consulte a coluna ERRO.',
    );
  });
}

function diagnosticarFormularioInternoLinhaAtiva() {
  executarComTratamento('DIAGNOSTICO_FORM_INTERNO', () => {
    const contexto = obterContextoLinhaAtiva();
    const { evento } = contexto;

    const diagnostico =
      montarDiagnosticoFormularioInterno(
        evento,
      );

    registrarLog(
      diagnostico.ok ? 'INFO' : 'AVISO',
      evento.ID_EVENTO,
      'DIAGNOSTICO_FORM_INTERNO',
      diagnostico.linhas.join('\n'),
    );

    SpreadsheetApp.getUi().alert(
      diagnostico.linhas.join('\n'),
    );
  });
}

function montarDiagnosticoFormularioInterno(evento) {
  const linhas = [];
  let ok = true;

  linhas.push(
    `Evento: ${texto(evento.ID_EVENTO) || 'sem ID'}`,
  );

  if (!texto(evento.FORM_INTERNO_ID)) {
    linhas.push(
      '❌ FORM_INTERNO_ID está vazio.',
    );
    return {
      ok: false,
      linhas,
    };
  }

  linhas.push(
    `✅ FORM_INTERNO_ID: ${evento.FORM_INTERNO_ID}`,
  );

  let form;

  try {
    form = FormApp.openById(
      texto(evento.FORM_INTERNO_ID),
    );
    linhas.push(
      `✅ Formulário encontrado: ${form.getTitle()}`,
    );
  } catch (error) {
    linhas.push(
      `❌ Não foi possível abrir o formulário: ${error.message || error}`,
    );
    return {
      ok: false,
      linhas,
    };
  }

  const meta = obterMetaFormulario(
    form.getId(),
  );

  if (!meta) {
    ok = false;
    linhas.push(
      '❌ Metadados do formulário não encontrados no FORM_REGISTRY nem no legado FORM_META.',
    );
  } else {
    linhas.push(
      `✅ Metadados encontrados: tipo=${meta.type}, evento=${meta.eventId}`,
    );
  }

  const registroCentral =
    buscarRegistroFormulario(
      form.getId(),
    );

  if (registroCentral) {
    linhas.push(
      `✅ Form registrado no FORM_REGISTRY: ${registroCentral.STATUS}`,
    );

    const centralId =
      texto(
        registroCentral
          .CENTRAL_SPREADSHEET_ID,
      );

    const triggerCentral =
      ScriptApp
        .getProjectTriggers()
        .find(
          (item) =>
            item.getHandlerFunction() ===
              HANDLER_CENTRAL_FORMS &&
            item.getTriggerSourceId() ===
              centralId,
        );

    if (!triggerCentral) {
      ok = false;
      linhas.push(
        '❌ Gatilho central de envio não encontrado.',
      );
    } else {
      linhas.push(
        '✅ Gatilho central de envio encontrado.',
      );
    }
  } else {
    const triggerLegado =
      ScriptApp
        .getProjectTriggers()
        .find(
          (item) =>
            item.getHandlerFunction() ===
              'onAnyFormSubmit' &&
            item.getTriggerSourceId() ===
              form.getId(),
        );

    if (!triggerLegado) {
      ok = false;
      linhas.push(
        '❌ Form não está no FORM_REGISTRY e não possui gatilho legado visível nesta conta.',
      );
    } else {
      linhas.push(
        '✅ Form legado com gatilho individual encontrado.',
      );
    }
  }

  const responses = form.getResponses();

  linhas.push(
    `Respostas encontradas: ${responses.length}`,
  );

  if (!responses.length) {
    ok = false;
    linhas.push(
      '❌ O formulário não possui resposta para processar.',
    );
    return {
      ok,
      linhas,
    };
  }

  if (meta) {
    const ultima =
      responses[responses.length - 1];

    const parsed =
      lerRespostaFormulario(
        ultima,
        meta,
      );

    const dados =
      carregarDadosEvento(
        evento.ID_EVENTO,
      );

    const resolucao =
      resolverCategoriasMenuFinal(
        dados.selecionaveis,
        parsed.categorias,
        parsed.categoriasExtras,
        parsed.observacoesCategorias,
      );

    if (resolucao.avisos.length) {
      linhas.push(
        '⚠️ A última resposta será ajustada automaticamente:',
      );
      resolucao.avisos.forEach((aviso) =>
        linhas.push(`• ${aviso}`),
      );
    } else {
      linhas.push(
        '✅ Quantidades do Menu Final estão corretas.',
      );
    }

    const problemasModelos =
      validarModelosFinais(
        dados,
      );

    if (problemasModelos.length) {
      ok = false;
      linhas.push(
        '❌ Problemas nos modelos finais:',
      );
      problemasModelos.forEach((problema) =>
        linhas.push(`• ${problema}`),
      );
    } else {
      linhas.push(
        '✅ Modelos de Menu Final e OS possuem os blocos obrigatórios.',
      );
    }
  }

  if (texto(evento.ERRO)) {
    linhas.push(
      `Último erro registrado: ${evento.ERRO}`,
    );
  }

  linhas.push(
    ok
      ? 'DIAGNÓSTICO: pronto para gerar.'
      : 'DIAGNÓSTICO: existem pendências.',
  );

  return {
    ok,
    linhas,
  };
}

function validarFormularioInternoDoEvento(evento) {
  if (!texto(evento.ID_EVENTO)) {
    throw new Error(
      'A linha não possui ID_EVENTO.',
    );
  }

  if (!texto(evento.FORM_INTERNO_ID)) {
    throw new Error(
      'A linha não possui FORM_INTERNO_ID.',
    );
  }
}

function validarModelosFinais(dados) {
  const problemas = [];

  const terceirosMenuFinal =
    dados.terceiros.filter(
      (item) => item.incluirMenuFinal,
    );

  const terceirosOs =
    dados.terceiros.filter(
      (item) => item.incluirOs,
    );

  problemas.push(
    ...validarModeloFinalIndividual(
      'MODELO - MENU FINAL',
      PropertiesService.getScriptProperties()
        .getProperty('TEMPLATE_MENU_FINAL_ID'),
      [
        {
          marker: '{{BLOCO_MENU_FINAL}}',
          necessario:
            dados.cardapioCompleto.length > 0,
        },
        {
          marker: '{{BLOCO_ITENS_FIXOS}}',
          necessario: dados.fixos.length > 0,
        },
        {
          marker: '{{BLOCO_TERCEIROS}}',
          necessario:
            terceirosMenuFinal.length > 0,
        },
      ],
    ),
  );

  problemas.push(
    ...validarModeloFinalIndividual(
      'MODELO - OS A&B',
      PropertiesService.getScriptProperties()
        .getProperty('TEMPLATE_OS_ID'),
      [
        {
          marker: '{{BLOCO_MENU_FINAL}}',
          necessario:
            dados.cardapioCompleto.length > 0,
        },
        {
          marker: '{{BLOCO_ITENS_FIXOS}}',
          necessario: dados.fixos.length > 0,
        },
        {
          marker: '{{BLOCO_TERCEIROS}}',
          necessario:
            terceirosOs.length > 0,
        },
      ],
    ),
  );

  return problemas;
}

function validarModeloFinalIndividual(
  nome,
  templateId,
  markers,
) {
  const problemas = [];

  if (!texto(templateId)) {
    return [
      `${nome}: ID do modelo não configurado.`,
    ];
  }

  let body;

  try {
    body = DocumentApp
      .openById(templateId)
      .getBody();
  } catch (error) {
    return [
      `${nome}: não foi possível abrir o modelo (${error.message || error}).`,
    ];
  }

  markers
    .filter((item) => item.necessario)
    .forEach((item) => {
      const found = body.findText(
        escaparRegex(item.marker),
      );

      if (!found) {
        problemas.push(
          `${nome}: falta ${item.marker}.`,
        );
        return;
      }

      if (
        !elementoEstaEmParagrafoDoCorpo(
          found.getElement(),
        )
      ) {
        problemas.push(
          `${nome}: ${item.marker} precisa estar sozinho em um parágrafo fora de tabelas.`,
        );
      }
    });

  return problemas;
}

function processarRespostaInterna(
  e,
  meta,
  opcoes,
) {
  const config = opcoes || {};
  const dados = carregarDadosEvento(meta.eventId);

  /*
   * The Google Forms response is the primary source.
   * The RESPOSTAS sheet is used as a robust fallback, especially for
   * forms created by older versions whose saved metadata may not contain
   * every operational field.
   */
  const parsed = complementarParsedComRespostasSalvas(
    meta.eventId,
    lerRespostaFormulario(e.response, meta),
  );

  if (!config.ignorarGravacaoResposta) {
    gravarRespostas(
      meta.eventId,
      'INTERNO',
      e.response,
    );
  }

  const pasta = DriveApp.getFolderById(
    extrairIdGoogle(dados.evento.LINK_PASTA_EVENTO),
  );

  const resolucaoMenuFinal =
    resolverCategoriasMenuFinal(
      dados.selecionaveis,
      parsed.categorias,
      parsed.categoriasExtras,
      parsed.observacoesCategorias,
    );

  const categoriasFinais =
    resolucaoMenuFinal.categorias;

  const resolucaoServicos =
    resolverServicosCategorias(
      dados.cardapioCompleto,
      parsed.servicosCategorias,
    );

  if (resolucaoMenuFinal.avisos.length) {
    registrarLog(
      'AVISO',
      meta.eventId,
      'AJUSTE_AUTOMATICO_MENU_FINAL',
      resolucaoMenuFinal.avisos.join('\n'),
    );
  }

  if (resolucaoServicos.avisos.length) {
    registrarLog(
      'AVISO',
      meta.eventId,
      'SERVICOS_POR_CATEGORIA',
      resolucaoServicos.avisos.join('\n'),
    );
  }

  const menuFinal = montarSecoesSelecionadas(
    dados.cardapioCompleto,
    categoriasFinais,
    'MENU_FINAL',
  );

  const menuOs = adicionarServicosNasSecoes(
    menuFinal,
    dados.cardapioCompleto,
    resolucaoServicos.servicos,
  );

  const terceirosMenuFinal = dados.terceiros
    .filter((item) => item.incluirMenuFinal)
    .map((item) => ({
      titulo: [item.tipo, item.categoria]
        .filter(Boolean)
        .join(' - '),
      regra: 'FORNECEDOR TERCEIRO - SOMENTE REGISTRO',
      itens: item.itens,
    }));

  const terceirosOs = dados.terceiros
    .filter((item) => item.incluirOs)
    .map((item) => ({
      titulo: [item.tipo, item.categoria]
        .filter(Boolean)
        .join(' - '),
      regra: 'FORNECEDOR TERCEIRO - SOMENTE REGISTRO',
      itens: item.itens,
    }));

  const observacoesCozinhaConsolidadas =
    consolidarObservacoesCozinha(
      parsed.fields.observacoes_cozinha,
      dados.selecionaveis,
      resolucaoMenuFinal.observacoesCategorias,
    );

  const baseReplacements = {
    ...montarReplacementsBasicos(
      dados.evento,
      dados.cabecalho,
    ),
    '{{TIPO_SERVICO}}':
      resumirTiposServico(
        resolucaoServicos.servicos,
      ),
    '{{PAX_OS}}':
      parsed.fields.pax_os || 'Não informado.',
    '{{BEBIDAS_CLIENTE}}':
      parsed.fields.bebidas_cliente || 'A definir.',
    '{{ENCANTAMENTO}}':
      parsed.fields.encantamento || 'Não informado.',
    '{{CAMARIM}}':
      formatarCamarim(
        parsed.fields,
      ),
    '{{STAFF_MONTAGEM}}':
      formatarStaffPadrao(
        parsed.fields,
        'staff_montagem',
        parsed.fields.staff_montagem,
      ),
    '{{STAFF_EVENTO}}':
      formatarStaffPadrao(
        parsed.fields,
        'staff_evento',
        parsed.fields.staff_evento ||
          formatarAlimentacaoStaff(
            dados.aditivos.alimentacao_staff,
          ),
      ),
    '{{STAFF_DESMONTAGEM}}':
      formatarStaffPadrao(
        parsed.fields,
        'staff_desmontagem',
        parsed.fields.staff_desmontagem,
      ),
    '{{CONTRATACAO_STAFF_CLIENTE}}':
      formatarContratacaoStaffCliente(
        parsed.fields,
      ),
    '{{GUARDANAPO}}':
      parsed.fields.guardanapo || 'Não informado.',
    '{{PERFIL_CONVIDADO}}':
      parsed.fields.perfil_convidado || 'Não informado.',
    '{{COR_EVENTO}}':
      parsed.fields.cor_evento || 'Não informado.',
    '{{OBS_COZINHA}}':
      observacoesCozinhaConsolidadas || 'Não informado.',
    '{{OBS_SALAO}}':
      parsed.fields.observacoes_salao || 'Não informado.',
    '{{RESTRICOES_ALIMENTARES}}':
      parsed.fields.restricoes_alimentares ||
      'Não informado.',
  };

  const prefixo =
    dados.cabecalho.numero_contrato || meta.eventId;

  const docMenuFinal = gerarDocumento(
    PropertiesService.getScriptProperties()
      .getProperty('TEMPLATE_MENU_FINAL_ID'),
    pasta,
    `${prefixo} - Menu Final - ${dados.cabecalho.evento}`,
    baseReplacements,
    {
      '{{BLOCO_MENU_FINAL}}': menuFinal,
      '{{BLOCO_ITENS_FIXOS}}': dados.fixos.map(
        (categoria) => ({
          titulo: limparTituloCategoria(
            categoria.categoria,
          ),
          regra: '',
          itens: categoria.itens,
        }),
      ),
      '{{BLOCO_TERCEIROS}}': terceirosMenuFinal,
      '{{BLOCO_SERVICOS_CONTRATADOS}}':
        dados.servicosContratados.map((categoria) => ({
          titulo: normalizarTituloServicoContratado(
            categoria.categoria,
          ),
          regra: '',
          itens: categoria.itens,
        })),
    },
  );

  const templateOsId =
    PropertiesService.getScriptProperties()
      .getProperty('TEMPLATE_OS_ID');

  const blocoComplementarOs =
    montarBlocoComplementarOs(
      templateOsId,
      baseReplacements,
    );

  const blocoObservacoesOs =
    montarBlocoObservacoesOs(
      templateOsId,
      baseReplacements,
    );

  const docOs = gerarDocumento(
    templateOsId,
    pasta,
    `${prefixo} - OS A&B - ${dados.cabecalho.evento}`,
    baseReplacements,
    {
      '{{BLOCO_MENU_FINAL}}': menuOs,
      '{{BLOCO_ITENS_FIXOS}}': dados.fixos.map(
        (categoria) => ({
          titulo: limparTituloCategoria(
            categoria.categoria,
          ),
          regra: '',
          itens: categoria.itens,
        }),
      ),
      '{{BLOCO_TERCEIROS}}': terceirosOs,
      '{{BLOCO_SERVICOS_CONTRATADOS}}':
        dados.servicosContratados.map((categoria) => ({
          titulo: normalizarTituloServicoContratado(
            categoria.categoria,
          ),
          regra: '',
          itens: categoria.itens,
        })),
      '{{BLOCO_INFORMACOES_OS}}':
        blocoComplementarOs,
      '{{BLOCO_OBSERVACOES_OS}}':
        blocoObservacoesOs,
    },
  );

  const avisosConsolidados = mesclarAvisos(
    dados.evento.AVISOS_REVISAO,
    [
      ...resolucaoMenuFinal.avisos,
      ...resolucaoServicos.avisos,
    ],
  );

  atualizarEventoPorId(meta.eventId, {
    STATUS: 'MENU_FINAL_E_OS_GERADOS',
    ERRO: '',
    AVISOS_REVISAO: avisosConsolidados,
    LINK_MENU_FINAL_DOC: docMenuFinal.docUrl,
    LINK_MENU_FINAL_PDF: docMenuFinal.pdfUrl,
    LINK_OS_DOC: docOs.docUrl,
    LINK_OS_PDF: docOs.pdfUrl,
  });

  registrarLog(
    resolucaoMenuFinal.avisos.length
      ? 'AVISO'
      : 'INFO',
    meta.eventId,
    'RESPOSTA_INTERNA',
    resolucaoMenuFinal.avisos.length
      ? 'Menu Final e OS gerados com ajustes automáticos. ' +
        resolucaoMenuFinal.avisos.join(' | ')
      : 'Menu Final e OS gerados.',
  );
}

function lerRespostaFormulario(response, meta) {
  const categorias = {};
  const categoriasExtras = {};
  const observacoesCategorias = {};
  const servicosCategorias = {};
  const fields = {};

  response.getItemResponses().forEach((itemResponse) => {
    const itemId = String(itemResponse.getItem().getId());
    const resposta = itemResponse.getResponse();

    if (meta.questionMap[itemId]) {
      categorias[meta.questionMap[itemId].key] =
        Array.isArray(resposta) ? resposta : [resposta];
    }

    if (
      meta.customCategoryFields &&
      meta.customCategoryFields[itemId]
    ) {
      categoriasExtras[
        meta.customCategoryFields[itemId].key
      ] = separarItensCampoLivre(resposta);
    }

    if (
      meta.categoryObservationFields &&
      meta.categoryObservationFields[itemId]
    ) {
      const key =
        meta.categoryObservationFields[itemId].key;

      const valor =
        normalizarRespostaFormulario_(
          resposta,
        );

      if (valor) {
        observacoesCategorias[key] = [valor];
      }
    }

    if (
      meta.serviceModeFields &&
      meta.serviceModeFields[itemId]
    ) {
      const info =
        meta.serviceModeFields[itemId];

      servicosCategorias[info.key] = {
        ...(servicosCategorias[info.key] || {}),
        modo: normalizarRespostaFormulario_(resposta),
        titulo: info.titulo,
      };
    }

    if (
      meta.serviceHoursFields &&
      meta.serviceHoursFields[itemId]
    ) {
      const info =
        meta.serviceHoursFields[itemId];

      servicosCategorias[info.key] = {
        ...(servicosCategorias[info.key] || {}),
        horas: normalizarRespostaFormulario_(resposta),
        titulo: info.titulo,
      };
    }

    if (
      meta.servicePointsFields &&
      meta.servicePointsFields[itemId]
    ) {
      const info =
        meta.servicePointsFields[itemId];

      servicosCategorias[info.key] = {
        ...(servicosCategorias[info.key] || {}),
        pontos: normalizarRespostaFormulario_(resposta),
        titulo: info.titulo,
      };
    }

    if (meta.fields[itemId]) {
      fields[meta.fields[itemId]] =
        normalizarRespostaFormulario_(
          resposta,
        );
    }
  });

  return {
    categorias,
    categoriasExtras,
    observacoesCategorias,
    servicosCategorias,
    fields,
  };
}


function complementarParsedComRespostasSalvas(
  idEvento,
  parsed,
) {
  const result = {
    categorias: {
      ...(parsed.categorias || {}),
    },
    categoriasExtras: {
      ...(parsed.categoriasExtras || {}),
    },
    observacoesCategorias: {
      ...(parsed.observacoesCategorias || {}),
    },
    servicosCategorias: {
      ...(parsed.servicosCategorias || {}),
    },
    fields: {
      ...(parsed.fields || {}),
    },
  };

  const respostas =
    obterUltimoLoteRespostasInternas(
      idEvento,
    );

  respostas.forEach((registro) => {
    const pergunta = texto(
      registro.pergunta,
    );

    const resposta = texto(
      registro.resposta,
    );

    if (!pergunta || !resposta) {
      return;
    }

    const servicoCategoria =
      mapearPerguntaServicoCategoria(
        pergunta,
      );

    if (servicoCategoria) {
      const key =
        encontrarChaveCardapioPorNome(
          servicoCategoria.categoria,
          result,
        );

      if (key) {
        result.servicosCategorias[key] = {
          ...(result.servicosCategorias[key] || {}),
          [servicoCategoria.campo]: resposta,
          titulo:
            servicoCategoria.categoria,
        };
      }

      return;
    }

    const fieldKey =
      mapearPerguntaParaCampoInterno(
        pergunta,
      );

    if (fieldKey) {
      /*
       * The sheet is the source of truth for non-empty answers.
       * This fixes old forms whose metadata did not map the field.
       */
      result.fields[fieldKey] = resposta;
      return;
    }

    const extra =
      mapearPerguntaParaCategoriaExtra(
        pergunta,
      );

    if (extra) {
      const categoriaKey =
        encontrarChaveCategoriaPorNome(
          result,
          extra.categoria,
        );

      if (categoriaKey) {
        result.categoriasExtras[
          categoriaKey
        ] = separarItensCampoLivre(
          resposta,
        );
      }
    }
  });

  return result;
}

function obterUltimoLoteRespostasInternas(
  idEvento,
) {
  const sheet = obterPlanilhaPainel()
    .getSheetByName(ABA_RESPOSTAS);

  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  const rows = sheet
    .getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      RESPOSTAS_HEADERS.length,
    )
    .getValues()
    .filter(
      (row) =>
        texto(row[0]) === texto(idEvento) &&
        texto(row[1]) === 'INTERNO',
    );

  if (!rows.length) {
    return [];
  }

  const timestamps = rows
    .map((row) => {
      const value = row[4];

      if (value instanceof Date) {
        return value.getTime();
      }

      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime())
        ? 0
        : parsed.getTime();
    });

  const ultimoTimestamp = Math.max(
    ...timestamps,
  );

  return rows
    .filter((row, index) => {
      /*
       * In old spreadsheets, some timestamps may have lost their type.
       * When no valid timestamp exists, use all rows for the event.
       */
      if (ultimoTimestamp <= 0) {
        return true;
      }

      return (
        timestamps[index] ===
        ultimoTimestamp
      );
    })
    .map((row) => ({
      pergunta: row[2],
      resposta: row[3],
      data: row[4],
    }));
}


function mapearPerguntaServicoCategoria(
  pergunta,
) {
  const patterns = [
    {
      regex:
        /^Formato de serviço\s*-\s*(.+)$/i,
      campo: 'modo',
    },
    {
      regex:
        /^Quantidade de horas\s*-\s*(.+)$/i,
      campo: 'horas',
    },
    {
      regex:
        /^Quantidade de pontos de buffet\s*-\s*(.+)$/i,
      campo: 'pontos',
    },
  ];

  for (const pattern of patterns) {
    const match = texto(pergunta).match(
      pattern.regex,
    );

    if (match) {
      return {
        categoria: texto(match[1]),
        campo: pattern.campo,
      };
    }
  }

  return null;
}

function encontrarChaveCardapioPorNome(
  nome,
  parsed,
) {
  const alvo =
    normalizarChaveAgrupamento(
      nome,
    );

  const chaves = new Set([
    ...Object.keys(
      parsed.categorias || {},
    ),
    ...Object.keys(
      parsed.categoriasExtras || {},
    ),
    ...Object.keys(
      parsed.servicosCategorias || {},
    ),
  ]);

  for (const key of chaves) {
    if (
      key === alvo ||
      normalizarChaveAgrupamento(
        key,
      ) === alvo
    ) {
      return key;
    }
  }

  return alvo;
}

function mapearPerguntaParaCampoInterno(
  pergunta,
) {
  const chave =
    normalizarTextoComparacao(
      pergunta,
    );

  const mapa = {
    TIPO_DE_SERVICO: 'tipo_servico',
    PAX_OPERACIONAL_DA_OS: 'pax_os',
    BEBIDAS_DO_CLIENTE: 'bebidas_cliente',
    ENCANTAMENTO_SE_TIVER_A_B:
      'encantamento',
    ENCANTAMENTO_SE_TIVER_AB:
      'encantamento',
    CAMARIM: 'camarim_tipo',
    ESPECIFICACOES_DESEJADAS_PARA_O_CAMARIM:
      'camarim_detalhes',
    ALIMENTACAO_DE_STAFF_MONTAGEM:
      'staff_montagem',
    ALIMENTACAO_DE_STAFF_EVENTO:
      'staff_evento',
    ALIMENTACAO_DE_STAFF_DESMONTAGEM:
      'staff_desmontagem',
    DATA_ALIMENTACAO_DE_STAFF_MONTAGEM:
      'staff_montagem_data',
    HORARIO_ALIMENTACAO_DE_STAFF_MONTAGEM:
      'staff_montagem_horario',
    QUANTIDADE_DE_PESSOAS_ALIMENTACAO_DE_STAFF_MONTAGEM:
      'staff_montagem_quantidade',
    DATA_ALIMENTACAO_DE_STAFF_EVENTO:
      'staff_evento_data',
    HORARIO_ALIMENTACAO_DE_STAFF_EVENTO:
      'staff_evento_horario',
    QUANTIDADE_DE_PESSOAS_ALIMENTACAO_DE_STAFF_EVENTO:
      'staff_evento_quantidade',
    DATA_ALIMENTACAO_DE_STAFF_DESMONTAGEM:
      'staff_desmontagem_data',
    HORARIO_ALIMENTACAO_DE_STAFF_DESMONTAGEM:
      'staff_desmontagem_horario',
    QUANTIDADE_DE_PESSOAS_ALIMENTACAO_DE_STAFF_DESMONTAGEM:
      'staff_desmontagem_quantidade',
    HAVERA_CONTRATACAO_DE_STAFF_PELO_CLIENTE:
      'staff_cliente_contratado',
    DATA_CONTRATACAO_STAFF_CLIENTE:
      'staff_cliente_data',
    HORARIO_CONTRATACAO_STAFF_CLIENTE:
      'staff_cliente_horario',
    QUANTIDADE_DE_PESSOAS_CONTRATACAO_STAFF_CLIENTE:
      'staff_cliente_quantidade',
    OBSERVACOES_CONTRATACAO_STAFF_CLIENTE:
      'staff_cliente_observacao',
    GUARDANAPO: 'guardanapo',
    PERFIL_DOS_CONVIDADOS:
      'perfil_convidado',
    COR_DO_EVENTO: 'cor_evento',
    OBSERVACOES_DE_COZINHA:
      'observacoes_cozinha',
    OBSERVACOES_DE_SALAO:
      'observacoes_salao',
    RESTRICOES_ALIMENTARES_CONSOLIDADAS:
      'restricoes_alimentares',
    RESTRICOES_ALIMENTARES:
      'restricoes_alimentares',
  };

  const key = chave.replace(
    /\s+/g,
    '_',
  );

  return mapa[key] || '';
}

function mapearPerguntaParaCategoriaExtra(
  pergunta,
) {
  const match = texto(pergunta).match(
    /^(?:Outro item\s*\/\s*ajuste manual|Outro prato fora do checklist)\s*-\s*(.+)$/i,
  );

  if (!match) {
    return null;
  }

  return {
    categoria: texto(match[1]),
  };
}

function encontrarChaveCategoriaPorNome(
  parsed,
  nome,
) {
  const alvo =
    normalizarChaveAgrupamento(
      nome,
    );

  const chaves = new Set([
    ...Object.keys(
      parsed.categorias || {},
    ),
    ...Object.keys(
      parsed.categoriasExtras || {},
    ),
  ]);

  for (const key of chaves) {
    if (
      normalizarChaveAgrupamento(
        key,
      ) === alvo ||
      key === alvo
    ) {
      return key;
    }
  }

  return '';
}

function gravarRespostas(idEvento, tipo, response) {
  const sheet = obterPlanilhaPainel()
    .getSheetByName(ABA_RESPOSTAS);

  const rows = response.getItemResponses().map((itemResponse) => {
    const raw = itemResponse.getResponse();
    return [
      idEvento,
      tipo,
      itemResponse.getItem().getTitle(),
      normalizarRespostaFormulario_(raw),
      response.getTimestamp(),
    ];
  });

  if (rows.length) {
    sheet
      .getRange(
        sheet.getLastRow() + 1,
        1,
        rows.length,
        RESPOSTAS_HEADERS.length,
      )
      .setValues(rows);
  }
}

function montarSecoesSelecionadas(
  categoriasBase,
  selecionadas,
  modo,
) {
  return categoriasBase.map((categoria, index) => {
    const incluso =
      categoria.tipo === 'INCLUSO_CARDAPIO';

    const itens = incluso
      ? categoria.itens
      : selecionadas[categoria.key] || [];

    let regra = '';

    if (
      incluso &&
      modo === 'DEGUSTACAO'
    ) {
      regra =
        'ITEM JÁ INCLUSO NO CARDÁPIO - NÃO NECESSITA SELEÇÃO';
    } else if (
      !incluso &&
      modo === 'DEGUSTACAO'
    ) {
      regra = montarRegraDegustacao(categoria);
    }

    return {
      titulo: montarTituloCategoria(
        categoria,
        index,
      ),
      regra,
      itens,
    };
  });
}


function limparTituloCategoria(value) {
  const original = texto(value)
    .replace(/\s+/g, ' ')
    .trim();

  if (!original) {
    return '';
  }

  /*
   * Remove subtítulos promocionais depois de " - ".
   * Ex.: "PRATOS EM MINIATURA - Delicadas composições..."
   * vira "PRATOS EM MINIATURA".
   */
  return original.split(/\s+-\s+/)[0].trim();
}

function montarTituloCategoria(categoria, index) {
  const grupo = limparTituloCategoria(
    categoria.grupo,
  );

  const nome = limparTituloCategoria(
    categoria.categoria,
  );

  if (index === 0) {
    if (
      grupo &&
      removerAcentos(grupo).toUpperCase() !==
        removerAcentos(nome).toUpperCase()
    ) {
      return `${grupo} - ${nome}`;
    }

    return nome || grupo;
  }

  return nome || grupo;
}

function montarRegraDegustacao(categoria) {
  const minimo = Number(categoria.qtdFinal) || 0;
  const maximo =
    Number(categoria.qtdDegustacao) || minimo;

  if (maximo > minimo) {
    return (
      `ESCOLHER DE ${formatarQuantidade(minimo)} ATÉ ` +
      `${formatarQuantidade(maximo)} OPÇÃO(ÕES) PARA DEGUSTAR ` +
      `E ${formatarQuantidade(minimo)} PARA O MENU FINAL`
    );
  }

  return (
    `ESCOLHER ${formatarQuantidade(maximo)} OPÇÃO(ÕES) ` +
    `PARA DEGUSTAR E ${formatarQuantidade(minimo)} ` +
    `PARA O MENU FINAL`
  );
}

function separarItensCampoLivre(value) {
  const raw = Array.isArray(value)
    ? value.join('\n')
    : texto(value);

  if (!raw) {
    return [];
  }

  /*
   * Não divide por vírgulas, porque os nomes dos pratos
   * normalmente contêm vírgulas.
   */
  return raw
    .split(/\r?\n|;/)
    .map((item) => texto(item))
    .filter(Boolean);
}



function resolverServicosCategorias(
  categoriasBase,
  servicosInformados,
) {
  const servicos = {};
  const avisos = [];

  (categoriasBase || []).forEach((categoria) => {
    const key = categoria.key;
    const informado =
      (servicosInformados || {})[key] || {};

    const modo =
      normalizarModoServico(
        informado.modo,
      );

    const horas = texto(
      informado.horas,
    );

    const pontos = texto(
      informado.pontos,
    );

    const titulo =
      limparTituloCategoria(
        categoria.categoria,
      );

    servicos[key] = {
      modo,
      horas,
      pontos,
      titulo,
    };

    if (
      ['Volante', 'Empratado'].includes(
        modo,
      ) &&
      !horas
    ) {
      avisos.push(
        `${titulo}: formato ${modo} sem quantidade de horas informada.`,
      );
    }

    if (modo === 'Ponto de Buffet') {
      if (!horas) {
        avisos.push(
          `${titulo}: Ponto de Buffet sem quantidade de horas informada.`,
        );
      }

      if (!pontos) {
        avisos.push(
          `${titulo}: Ponto de Buffet sem quantidade de pontos informada.`,
        );
      }
    }
  });

  return {
    servicos,
    avisos,
  };
}

function normalizarModoServico(value) {
  const chave =
    normalizarTextoComparacao(
      value,
    );

  if (chave === 'VOLANTE') {
    return 'Volante';
  }

  if (
    chave === 'PONTO DE BUFFET' ||
    chave === 'PONTO DE BUFET'
  ) {
    return 'Ponto de Buffet';
  }

  if (chave === 'EMPRATADO') {
    return 'Empratado';
  }

  return 'Não se aplica';
}

function formatarServicoCategoria(servico) {
  const modo =
    normalizarModoServico(
      servico && servico.modo,
    );

  const horas = texto(
    servico && servico.horas,
  );

  const pontos = texto(
    servico && servico.pontos,
  );

  if (modo === 'Volante') {
    return (
      `SERVIÇO: VOLANTE | HORAS: ` +
      `${horas || 'NÃO INFORMADO'}`
    );
  }

  if (modo === 'Ponto de Buffet') {
    return (
      `SERVIÇO: PONTO DE BUFFET | HORAS: ` +
      `${horas || 'NÃO INFORMADO'} | PONTOS: ` +
      `${pontos || 'NÃO INFORMADO'}`
    );
  }

  if (modo === 'Empratado') {
    return (
      `SERVIÇO: EMPRATADO | HORAS: ` +
      `${horas || 'NÃO INFORMADO'}`
    );
  }

  return 'SERVIÇO: NÃO SE APLICA';
}

function adicionarServicosNasSecoes(
  sections,
  categoriasBase,
  servicos,
) {
  return (sections || []).map(
    (section, index) => {
      const categoria =
        (categoriasBase || [])[index];

      if (!categoria) {
        return section;
      }

      return {
        ...section,
        detalhe: formatarServicoCategoria(
          (servicos || {})[
            categoria.key
          ],
        ),
      };
    },
  );
}

function resumirTiposServico(servicos) {
  const modos = removerDuplicidadesTexto(
    Object.values(servicos || {})
      .map((item) =>
        normalizarModoServico(
          item.modo,
        ),
      )
      .filter(
        (modo) =>
          modo !== 'Não se aplica',
      ),
  );

  if (!modos.length) {
    return 'Não se aplica.';
  }

  if (modos.length === 1) {
    return modos[0];
  }

  return (
    'Misto — ver formato por categoria no cardápio.'
  );
}

function resolverCategoriasMenuFinal(
  categoriasBase,
  categoriasChecklist,
  categoriasExtras,
  observacoesInformadas,
) {
  const categorias = {};
  const avisos = [];
  const observacoesCategorias = {};

  (categoriasBase || []).forEach((categoria) => {
    const key = categoria.key;
    const esperado =
      Number(categoria.qtdFinal) || 0;

    const checklist =
      removerDuplicidadesTexto(
        (categoriasChecklist || {})[key] || [],
      );

    const extras =
      removerDuplicidadesTexto(
        (categoriasExtras || {})[key] || [],
      );

    const observacoesExplicitas =
      removerDuplicidadesTexto(
        (observacoesInformadas || {})[key] || [],
      );

    /*
     * Regra:
     * 1. checklist representa a escolha do cardápio;
     * 2. "Outro prato" só completa vagas ainda não preenchidas;
     * 3. texto excedente vira observação operacional.
     */
    const selecionados = checklist.slice(
      0,
      Math.max(esperado, 0),
    );

    const vagasRestantes = Math.max(
      esperado - selecionados.length,
      0,
    );

    const extrasUsados = extras.slice(
      0,
      vagasRestantes,
    );

    const extrasNaoUsados = extras.slice(
      vagasRestantes,
    );

    let finais = [
      ...selecionados,
      ...extrasUsados,
    ];

    if (checklist.length > esperado) {
      const ignorados =
        checklist.slice(esperado);

      avisos.push(
        `${limparTituloCategoria(categoria.categoria)}: ` +
        `foram marcados ${checklist.length} pratos para ${esperado} vaga(s). ` +
        `O sistema manteve: ${selecionados.join('; ')}. ` +
        `Ignorado(s): ${ignorados.join('; ')}.`,
      );
    }

    if (extrasNaoUsados.length) {
      observacoesCategorias[key] = [
        ...(observacoesCategorias[key] || []),
        ...extrasNaoUsados,
      ];

      avisos.push(
        `${limparTituloCategoria(categoria.categoria)}: ` +
        `o checklist já preenchia a quantidade contratada. ` +
        `O texto adicional foi enviado para Observações de Cozinha, ` +
        `e não para o cardápio.`,
      );
    }

    if (observacoesExplicitas.length) {
      observacoesCategorias[key] = [
        ...(observacoesCategorias[key] || []),
        ...observacoesExplicitas,
      ];
    }

    if (esperado <= 0) {
      categorias[key] = finais;
      return;
    }

    if (finais.length < esperado) {
      const faltantes =
        esperado - finais.length;

      const placeholders = [];

      for (
        let index = 1;
        index <= faltantes;
        index++
      ) {
        placeholders.push(
          faltantes === 1
            ? 'PENDENTE DE DEFINIÇÃO'
            : `PENDENTE DE DEFINIÇÃO ${index}`,
        );
      }

      finais = [
        ...finais,
        ...placeholders,
      ];

      avisos.push(
        `${limparTituloCategoria(categoria.categoria)}: ` +
        `foram definidos ${esperado - faltantes} de ${esperado} prato(s). ` +
        `O documento foi gerado com ${faltantes} pendência(s).`,
      );
    }

    categorias[key] = finais;
  });

  return {
    categorias,
    avisos,
    observacoesCategorias,
  };
}


function consolidarObservacoesCozinha(
  observacaoGeral,
  categoriasBase,
  observacoesCategorias,
) {
  const linhas = [];

  if (texto(observacaoGeral)) {
    linhas.push(texto(observacaoGeral));
  }

  (categoriasBase || []).forEach((categoria) => {
    const observacoes =
      removerDuplicidadesTexto(
        (observacoesCategorias || {})[
          categoria.key
        ] || [],
      );

    if (!observacoes.length) {
      return;
    }

    linhas.push(
      `${limparTituloCategoria(categoria.categoria)}: ` +
      observacoes.join(' | '),
    );
  });

  return linhas.join('\n');
}

function mesclarAvisos(avisosExistentes, novosAvisos) {
  const linhas = [
    ...texto(avisosExistentes)
      .split(/\r?\n/)
      .map((item) => texto(item))
      .filter(Boolean),
    ...(novosAvisos || [])
      .map((item) => texto(item))
      .filter(Boolean),
  ];

  const vistos = new Set();

  return linhas
    .filter((item) => {
      const chave =
        normalizarTextoComparacao(item);

      if (!chave || vistos.has(chave)) {
        return false;
      }

      vistos.add(chave);
      return true;
    })
    .join('\n');
}

function combinarCategoriasComExtras(
  categorias,
  categoriasExtras,
) {
  const keys = new Set([
    ...Object.keys(categorias || {}),
    ...Object.keys(categoriasExtras || {}),
  ]);

  const result = {};

  keys.forEach((key) => {
    const itens = [
      ...((categorias || {})[key] || []),
      ...((categoriasExtras || {})[key] || []),
    ];

    const vistos = new Set();

    result[key] = itens.filter((item) => {
      const chave = removerAcentos(item)
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim();

      if (!chave || vistos.has(chave)) {
        return false;
      }

      vistos.add(chave);
      return true;
    });
  });

  return result;
}

function validarQuantidadesMenuFinal(
  categoriasBase,
  selecionadas,
) {
  const problemas = [];

  categoriasBase.forEach((categoria) => {
    const esperado = Number(categoria.qtdFinal) || 0;
    const recebido =
      (selecionadas[categoria.key] || []).length;

    if (recebido !== esperado) {
      problemas.push(
        `• ${limparTituloCategoria(categoria.categoria)}: ` +
        `o total deve ser ${esperado}, mas foram informados ${recebido}.`,
      );
    }
  });

  return problemas;
}

function formatarQuantidade(value) {
  const numero = Number(value) || 0;
  return String(numero).padStart(2, '0');
}

function montarReplacementsBasicos(evento, cabecalho) {
  return {
    '{{ID_EVENTO}}': texto(evento.ID_EVENTO),
    '{{NUMERO_CONTRATO}}': texto(
      cabecalho.numero_contrato,
    ),
    '{{EVENTO}}': texto(cabecalho.evento),
    '{{LOCAL}}': texto(cabecalho.local),
    '{{CONTRATANTE}}': texto(cabecalho.contratante),
    '{{DATA_EVENTO}}': texto(cabecalho.data_evento),
    '{{HORARIO_EVENTO}}': texto(cabecalho.horario),
    '{{PAX_CLIENTE}}': texto(
      cabecalho.numero_convidados,
    ),
    '{{MONTAGEM}}': texto(cabecalho.montagem),
    '{{DESMONTAGEM}}': texto(cabecalho.desmontagem),
    '{{DATA_LIMITE_MENU}}': texto(
      cabecalho.data_limite_menu,
    ),
    '{{VALOR_SERVICOS}}': texto(
      cabecalho.valor_servicos,
    ),
    '{{VALOR_ALIMENTOS_BEBIDAS}}': texto(
      cabecalho.valor_alimentos_bebidas,
    ),
    '{{VALOR_TOTAL}}': texto(cabecalho.valor_total),
    '{{DADOS_FATURAMENTO}}': texto(
      cabecalho.dados_faturamento,
    ),
    '{{DADOS_CONTATO}}': texto(
      cabecalho.dados_contato,
    ),
    '{{RESP_PRODUCAO}}': texto(
      evento.RESP_PRODUCAO,
    ),
    '{{VALOR_ADITIVOS}}': texto(
      evento.VALOR_ADITIVOS,
    ),
    '{{VALOR_TOTAL_CONSOLIDADO}}': texto(
      evento.VALOR_TOTAL_CONSOLIDADO,
    ),
    '{{RESUMO_ADITIVOS}}': montarResumoAditivos(
      evento.JSON_ADITIVOS,
    ),
  };
}



function montarBlocoComplementarOs(
  templateId,
  replacements,
) {
  if (!texto(templateId)) {
    return [];
  }

  let body;

  try {
    body = DocumentApp
      .openById(templateId)
      .getBody();
  } catch (_) {
    /*
     * The normal document-generation flow will report
     * a clearer error if the template cannot be opened.
     */
    return [];
  }

  const campos = [
    {
      marker: '{{TIPO_SERVICO}}',
      label: 'TIPO DE SERVIÇO',
    },
    {
      marker: '{{PAX_OS}}',
      label: 'PAX OPERACIONAL',
    },
    {
      marker: '{{BEBIDAS_CLIENTE}}',
      label: 'BEBIDAS DO CLIENTE',
    },
    {
      marker: '{{ENCANTAMENTO}}',
      label: 'ENCANTAMENTO',
    },
    {
      marker: '{{CAMARIM}}',
      label: 'CAMARIM',
    },
    {
      marker: '{{STAFF_MONTAGEM}}',
      label: 'ALIMENTAÇÃO DE STAFF - MONTAGEM',
    },
    {
      marker: '{{STAFF_EVENTO}}',
      label: 'ALIMENTAÇÃO DE STAFF - EVENTO',
    },
    {
      marker: '{{STAFF_DESMONTAGEM}}',
      label: 'ALIMENTAÇÃO DE STAFF - DESMONTAGEM',
    },
    {
      marker: '{{CONTRATACAO_STAFF_CLIENTE}}',
      label: 'CONTRATAÇÃO STAFF CLIENTE',
      omitirSeVazio: true,
    },
    {
      marker: '{{GUARDANAPO}}',
      label: 'GUARDANAPO',
    },
    {
      marker: '{{PERFIL_CONVIDADO}}',
      label: 'PERFIL DOS CONVIDADOS',
    },
    {
      marker: '{{COR_EVENTO}}',
      label: 'COR DO EVENTO',
    },
  ];

  const itensFaltantes = campos
    .filter(
      (campo) =>
        !body.findText(
          escaparRegex(campo.marker),
        ),
    )
    .map((campo) => {
      const value =
        texto(replacements[campo.marker]);

      if (
        campo.omitirSeVazio &&
        !value
      ) {
        return '';
      }

      return (
        `${campo.label}: ` +
        `${value || 'Não informado.'}`
      );
    })
    .filter(Boolean);

  if (!itensFaltantes.length) {
    return [];
  }

  return [
    {
      titulo: 'INFORMAÇÕES OPERACIONAIS',
      regra: '',
      itens: itensFaltantes,
    },
  ];
}


function montarBlocoObservacoesOs(
  templateId,
  replacements,
) {
  if (!texto(templateId)) {
    return [];
  }

  let body;

  try {
    body = DocumentApp
      .openById(templateId)
      .getBody();
  } catch (_) {
    return [];
  }

  const campos = [
    {
      marker: '{{OBS_COZINHA}}',
      label: 'OBSERVAÇÕES DE COZINHA',
    },
    {
      marker: '{{OBS_SALAO}}',
      label: 'OBSERVAÇÕES DE SALÃO',
    },
    {
      marker: '{{RESTRICOES_ALIMENTARES}}',
      label: 'RESTRIÇÕES ALIMENTARES',
    },
  ];

  const itens = campos
    .filter(
      (campo) =>
        !body.findText(
          escaparRegex(campo.marker),
        ),
    )
    .map((campo) => {
      const value = texto(
        replacements[campo.marker],
      );

      if (
        !value ||
        value === 'Não informado.'
      ) {
        return '';
      }

      return `${campo.label}: ${value}`;
    })
    .filter(Boolean);

  if (!itens.length) {
    return [];
  }

  return [
    {
      titulo:
        'OBSERVAÇÕES E RESTRIÇÕES',
      regra: '',
      itens,
    },
  ];
}

function formatarAlimentacaoStaff(staff) {
  if (!staff || !staff.incluida) {
    return '';
  }

  return [
    `${staff.quantidade} staff(s)`,
    staff.menu ? `Menu: ${staff.menu}` : '',
    staff.tempo_servico
      ? `Tempo de serviço: ${staff.tempo_servico}`
      : '',
  ]
    .filter(Boolean)
    .join(' | ');
}

function montarResumoAditivos(rawJson) {
  if (!texto(rawJson)) {
    return '';
  }

  try {
    const data = JSON.parse(rawJson);

    return (data.aditivos_aplicados || [])
      .map(
        (item) =>
          `${item.ordem}º aditivo: ${item.resumo}`,
      )
      .join('\\n');
  } catch (_) {
    return '';
  }
}

function gerarDocumento(
  templateId,
  pasta,
  nomeArquivo,
  replacements,
  blocks,
) {
  if (!templateId) {
    throw new Error(
      `ID de modelo não configurado para ${nomeArquivo}.`,
    );
  }

  let copia = null;

  try {
    copia = DriveApp.getFileById(templateId)
      .makeCopy(nomeSeguro(nomeArquivo), pasta);

    const doc = DocumentApp.openById(copia.getId());
    const body = doc.getBody();

    Object.entries(replacements).forEach(([marker, value]) => {
      body.replaceText(
        escaparRegex(marker),
        escaparReplacement(texto(value)),
      );
    });

    /*
     * O bloco de serviços contratados é opcional.
     * Quando o modelo antigo ainda não possui o marcador,
     * o sistema cria o marcador automaticamente na posição
     * mais adequada, em vez de interromper o processo.
     */
    prepararMarcadoresOpcionais(
      body,
      blocks,
    );

    Object.entries(blocks).forEach(([marker, sections]) => {
      inserirBlocoEstruturado(body, marker, sections || []);
    });

    removerMarcadoresRestantes(body);
    doc.saveAndClose();

    Utilities.sleep(500);

    const pdf = pasta.createFile(
      DriveApp.getFileById(copia.getId())
        .getAs(MimeType.PDF)
        .setName(`${nomeSeguro(nomeArquivo)}.pdf`),
    );

    return {
      docUrl: copia.getUrl(),
      pdfUrl: pdf.getUrl(),
    };
  } catch (error) {
    /*
     * Evita deixar cópias incompletas na pasta quando
     * ocorrer qualquer falha durante a geração.
     */
    if (copia) {
      try {
        copia.setTrashed(true);
      } catch (_) {
        // Não substitui o erro original.
      }
    }

    throw error;
  }
}


function prepararMarcadoresOpcionais(
  body,
  blocks,
) {
  const markerServicos =
    '{{BLOCO_SERVICOS_CONTRATADOS}}';

  const sectionsServicos =
    blocks[markerServicos] || [];

  if (
    sectionsServicos.length &&
    !body.findText(
      escaparRegex(markerServicos),
    )
  ) {
    inserirMarcadorServicosContratados(
      body,
      markerServicos,
    );
  }

  const markerNaoDegustados =
    '{{BLOCO_NAO_DEGUSTADOS}}';

  const sectionsNaoDegustados =
    blocks[markerNaoDegustados] || [];

  if (
    sectionsNaoDegustados.length &&
    !body.findText(
      escaparRegex(markerNaoDegustados),
    )
  ) {
    inserirMarcadorNaoDegustados(
      body,
      markerNaoDegustados,
    );
  }

  const markerInformacoesOs =
    '{{BLOCO_INFORMACOES_OS}}';

  const sectionsInformacoesOs =
    blocks[markerInformacoesOs] || [];

  if (
    sectionsInformacoesOs.length &&
    !body.findText(
      escaparRegex(markerInformacoesOs),
    )
  ) {
    body.appendParagraph(
      markerInformacoesOs,
    );
  }

  const markerObservacoesOs =
    '{{BLOCO_OBSERVACOES_OS}}';

  const sectionsObservacoesOs =
    blocks[markerObservacoesOs] || [];

  if (
    sectionsObservacoesOs.length &&
    !body.findText(
      escaparRegex(markerObservacoesOs),
    )
  ) {
    /*
     * Guaranteed visible comments section at the end of the OS.
     */
    body.appendParagraph(
      markerObservacoesOs,
    );
  }
}


function inserirMarcadorNaoDegustados(
  body,
  marker,
) {
  const fixos = body.findText(
    escaparRegex('{{BLOCO_ITENS_FIXOS}}'),
  );

  if (
    fixos &&
    elementoEstaEmParagrafoDoCorpo(
      fixos.getElement(),
    )
  ) {
    const paragraph =
      fixos.getElement().getParent().asParagraph();

    const index =
      body.getChildIndex(paragraph);

    body.insertParagraph(
      index,
      marker,
    );

    return;
  }

  const servicos = body.findText(
    escaparRegex('{{BLOCO_SERVICOS_CONTRATADOS}}'),
  );

  if (
    servicos &&
    elementoEstaEmParagrafoDoCorpo(
      servicos.getElement(),
    )
  ) {
    const paragraph =
      servicos.getElement().getParent().asParagraph();

    const index =
      body.getChildIndex(paragraph);

    body.insertParagraph(
      index,
      marker,
    );

    return;
  }

  body.appendParagraph(marker);
}

function inserirMarcadorServicosContratados(
  body,
  marker,
) {
  /*
   * Primeira preferência:
   * inserir imediatamente depois de
   * {{BLOCO_ITENS_FIXOS}}.
   */
  const fixos = body.findText(
    escaparRegex('{{BLOCO_ITENS_FIXOS}}'),
  );

  if (
    fixos &&
    elementoEstaEmParagrafoDoCorpo(
      fixos.getElement(),
    )
  ) {
    const paragraph =
      fixos.getElement().getParent().asParagraph();

    const index =
      body.getChildIndex(paragraph);

    body.insertParagraph(
      index + 1,
      marker,
    );

    return;
  }

  /*
   * Segunda preferência:
   * inserir antes de fornecedores terceiros.
   */
  const terceiros = body.findText(
    escaparRegex('{{BLOCO_TERCEIROS}}'),
  );

  if (
    terceiros &&
    elementoEstaEmParagrafoDoCorpo(
      terceiros.getElement(),
    )
  ) {
    const paragraph =
      terceiros.getElement().getParent().asParagraph();

    const index =
      body.getChildIndex(paragraph);

    body.insertParagraph(
      index,
      marker,
    );

    return;
  }

  /*
   * Fallback final:
   * acrescenta no final do corpo do documento.
   */
  body.appendParagraph(marker);
}

function elementoEstaEmParagrafoDoCorpo(element) {
  const parent = element.getParent();

  return (
    parent.getType() ===
      DocumentApp.ElementType.PARAGRAPH &&
    parent.getParent().getType() ===
      DocumentApp.ElementType.BODY_SECTION
  );
}

function inserirBlocoEstruturado(body, marker, sections) {
  const found = body.findText(escaparRegex(marker));

  if (!found) {
    if (!sections.length) {
      return;
    }

    throw new Error(
      `Marcador obrigatório ${marker} não encontrado no modelo. ` +
      `Adicione o marcador sozinho em um parágrafo fora de tabelas.`,
    );
  }

  const textElement = found.getElement().asText();
  const parent = textElement.getParent();

  if (
    parent.getType() !== DocumentApp.ElementType.PARAGRAPH ||
    parent.getParent().getType() !==
      DocumentApp.ElementType.BODY_SECTION
  ) {
    throw new Error(
      `O marcador ${marker} precisa estar sozinho em um parágrafo fora de tabelas.`,
    );
  }

  const paragraph = parent.asParagraph();
  let index = body.getChildIndex(paragraph);

  if (!sections.length) {
    removerParagrafoMarcadorSeguro_(
      body,
      paragraph,
    );
    return;
  }

  sections.forEach((section) => {
    const title = body.insertParagraph(
      index++,
      texto(section.titulo).toUpperCase(),
    );

    /*
     * O Google Docs pode herdar a formatação do parágrafo anterior.
     * Por isso, todos os estilos são definidos explicitamente.
     */
    title
      .editAsText()
      .setBold(true)
      .setItalic(false)
      .setUnderline(false)
      .setForegroundColor('#000000')
      .setBackgroundColor(null);

    if (texto(section.regra)) {
      const rule = body.insertParagraph(
        index++,
        `(${texto(section.regra)})`,
      );

      /*
       * Somente a regra de quantidade recebe destaque.
       */
      rule
        .editAsText()
        .setBold(true)
        .setItalic(false)
        .setUnderline(false)
        .setForegroundColor('#FF0000')
        .setBackgroundColor('#FFF200');
    }

    if (texto(section.detalhe)) {
      const detail = body.insertParagraph(
        index++,
        texto(section.detalhe),
      );

      detail
        .editAsText()
        .setBold(true)
        .setItalic(false)
        .setUnderline(false)
        .setForegroundColor('#000000')
        .setBackgroundColor(null);
    }

    (section.itens || []).forEach((item) => {
      const listItem = body
        .insertListItem(index++, texto(item))
        .setGlyphType(DocumentApp.GlyphType.BULLET);

      /*
       * Limpa a formatação herdada da linha da regra.
       */
      listItem
        .editAsText()
        .setBold(false)
        .setItalic(false)
        .setUnderline(false)
        .setForegroundColor('#000000')
        .setBackgroundColor(null);
    });

    const spacer = body.insertParagraph(index++, '');
    spacer
      .editAsText()
      .setBold(false)
      .setItalic(false)
      .setUnderline(false)
      .setForegroundColor('#000000')
      .setBackgroundColor(null);
  });

  removerParagrafoMarcadorSeguro_(
    body,
    paragraph,
  );
}

/**
 * O Google Docs não permite remover o último parágrafo de uma seção.
 *
 * Alguns modelos deixam um marcador de bloco como o último parágrafo
 * do documento (por exemplo {{BLOCO_SERVICOS_CONTRATADOS}}).
 * A implementação antiga chamava removeFromParent() diretamente e
 * gerava o erro:
 *
 * "Não é possível remover o último parágrafo em uma seção do documento."
 *
 * Quando o marcador é o último parágrafo, mantemos o parágrafo obrigatório
 * do Google Docs e apenas limpamos o seu conteúdo.
 */
function removerParagrafoMarcadorSeguro_(
  body,
  paragraph,
) {
  const index =
    body.getChildIndex(
      paragraph,
    );

  const ehUltimo =
    index ===
    body.getNumChildren() - 1;

  if (
    !ehUltimo &&
    body.getNumChildren() > 1
  ) {
    paragraph.removeFromParent();
    return;
  }

  /*
   * O parágrafo final precisa permanecer no Body.
   * Como o marcador é validado para ficar sozinho,
   * limpar seu conteúdo é equivalente visualmente a removê-lo.
   */
  try {
    paragraph.clear();
  } catch (_) {
    paragraph
      .editAsText()
      .setText('');
  }
}

function removerMarcadoresRestantes(body) {
  const regex = '\\{\\{[A-Z0-9_]+\\}\\}';
  let found = body.findText(regex);

  while (found) {
    found.getElement().asText().replaceText(regex, '');
    found = body.findText(regex);
  }
}




function salvarRegistroFormulario(
  registro,
) {
  const sheet =
    obterAbaFormRegistry();

  const existente =
    buscarRegistroFormulario(
      registro.FORM_ID,
    );

  if (existente) {
    atualizarRegistroFormulario(
      registro.FORM_ID,
      registro,
    );

    return;
  }

  const row =
    FORM_REGISTRY_HEADERS.map(
      (header) =>
        Object.prototype
          .hasOwnProperty
          .call(registro, header)
          ? registro[header]
          : '',
    );

  sheet
    .getRange(
      sheet.getLastRow() + 1,
      1,
      1,
      row.length,
    )
    .setValues([row]);
}

function obterAbaFormRegistry() {
  const ss =
    obterPlanilhaPainel();

  let sheet =
    ss.getSheetByName(
      ABA_FORM_REGISTRY,
    );

  if (!sheet) {
    sheet = criarOuAtualizarAba(
      ss,
      ABA_FORM_REGISTRY,
      FORM_REGISTRY_HEADERS,
    );
  }

  return sheet;
}

function lerRegistrosForms() {
  const sheet =
    obterAbaFormRegistry();

  if (sheet.getLastRow() < 2) {
    return [];
  }

  return sheet
    .getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      FORM_REGISTRY_HEADERS.length,
    )
    .getValues()
    .map((row, index) => {
      const item = {
        _row: index + 2,
      };

      FORM_REGISTRY_HEADERS
        .forEach(
          (header, col) => {
            item[header] =
              row[col];
          },
        );

      return item;
    });
}

function buscarRegistroFormulario(
  formId,
) {
  return (
    lerRegistrosForms()
      .find(
        (item) =>
          texto(item.FORM_ID) ===
          texto(formId),
      ) ||
    null
  );
}

function buscarRegistroFormPorResponseSheetId(
  sheetId,
) {
  return (
    lerRegistrosForms()
      .find(
        (item) =>
          Number(
            item.RESPONSE_SHEET_ID,
          ) ===
          Number(sheetId),
      ) ||
    null
  );
}

function atualizarRegistroFormulario(
  formId,
  values,
) {
  const registro =
    buscarRegistroFormulario(
      formId,
    );

  if (!registro) {
    return false;
  }

  const sheet =
    obterAbaFormRegistry();

  Object.entries(values)
    .forEach(
      ([header, value]) => {
        const index =
          FORM_REGISTRY_HEADERS
            .indexOf(header);

        if (index === -1) {
          return;
        }

        sheet
          .getRange(
            registro._row,
            index + 1,
          )
          .setValue(value);
      },
    );

  return true;
}

function obterMetaFormulario(formId) {
  const registro =
    buscarRegistroFormulario(
      formId,
    );

  if (
    registro &&
    texto(registro.META_JSON)
  ) {
    try {
      return JSON.parse(
        texto(
          registro.META_JSON,
        ),
      );
    } catch (_) {
      // Tenta o legado abaixo.
    }
  }

  /*
   * Compatibilidade com Forms criados nas versões V1-V20.
   */
  const raw =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        `FORM_META_${formId}`,
      );

  return raw
    ? JSON.parse(raw)
    : null;
}

function salvarMetaFormulario(
  formId,
  meta,
) {
  /*
   * Mantido apenas para compatibilidade de funções antigas.
   * Novos Forms são registrados por registrarFormularioEscalavel().
   */
  const registro =
    buscarRegistroFormulario(
      formId,
    );

  if (registro) {
    atualizarRegistroFormulario(
      formId,
      {
        META_JSON:
          JSON.stringify(meta),
      },
    );

    return;
  }

  PropertiesService
    .getScriptProperties()
    .setProperty(
      `FORM_META_${formId}`,
      JSON.stringify(meta),
    );
}

function criarGatilhoFormulario(form) {
  /*
   * LEGADO.
   * A V21 não cria mais gatilho individual por Form.
   * Mantido para não quebrar Forms antigos.
   */
  return form;
}

function parseJsonArray(value) {
  try {
    const parsed =
      JSON.parse(
        texto(value) || '[]',
      );

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (_) {
    return [];
  }
}

function adicionarDias(date, dias) {
  const result =
    new Date(date);

  result.setDate(
    result.getDate() +
    Number(dias || 0),
  );

  return result;
}

function arquivarFormularioEscalavel(
  formId,
  fecharForm,
) {
  const registro =
    buscarRegistroFormulario(
      formId,
    );

  if (!registro) {
    return;
  }

  try {
    const form =
      FormApp.openById(
        formId,
      );

    if (fecharForm) {
      try {
        form
          .setAcceptingResponses(
            false,
          )
          .setCustomClosedFormMessage(
            'Este formulário já foi processado. Em caso de ajuste, fale com a equipe de Produção.',
          );
      } catch (_) {
        // Continua a limpeza.
      }
    }

    try {
      form.removeDestination();
    } catch (_) {
      // Pode já estar desvinculado.
    }

    const centralId =
      texto(
        registro
          .CENTRAL_SPREADSHEET_ID,
      );

    const sheetId =
      Number(
        registro.RESPONSE_SHEET_ID,
      );

    if (
      centralId &&
      sheetId
    ) {
      try {
        const central =
          SpreadsheetApp
            .openById(
              centralId,
            );

        const sheet =
          central
            .getSheets()
            .find(
              (item) =>
                item.getSheetId() ===
                sheetId,
            );

        if (
          sheet &&
          central.getSheets().length > 1
        ) {
          central.deleteSheet(
            sheet,
          );
        }
      } catch (_) {
        // Mantém registro mesmo se a limpeza da aba falhar.
      }
    }

    atualizarRegistroFormulario(
      formId,
      {
        STATUS: 'ARQUIVADO',
        EXPIRA_EM: '',
        ERRO: '',
      },
    );
  } catch (error) {
    atualizarRegistroFormulario(
      formId,
      {
        STATUS:
          'ERRO_ARQUIVAMENTO',
        ERRO:
          error.message ||
          String(error),
      },
    );
  }
}

function limparFormsEscalaveisExpirados() {
  const lock =
    LockService.getScriptLock();

  if (!lock.tryLock(10000)) {
    return;
  }

  try {
    const agora =
      new Date();

    lerRegistrosForms()
      .filter(
        (registro) =>
          texto(registro.STATUS) ===
            'PROCESSADO' &&
          registro.EXPIRA_EM,
      )
      .forEach(
        (registro) => {
          const expira =
            registro.EXPIRA_EM
              instanceof Date
              ? registro.EXPIRA_EM
              : new Date(
                  registro.EXPIRA_EM,
                );

          if (
            !Number.isNaN(
              expira.getTime(),
            ) &&
            expira <= agora
          ) {
            arquivarFormularioEscalavel(
              registro.FORM_ID,
              true,
            );
          }
        },
      );
  } finally {
    lock.releaseLock();
  }
}

function marcarFormularioInternoProcessado(
  formId,
) {
  const registro =
    buscarRegistroFormulario(
      formId,
    );

  if (!registro) {
    return;
  }

  atualizarRegistroFormulario(
    formId,
    {
      STATUS: 'PROCESSADO',
      ULTIMO_PROCESSAMENTO_EM:
        new Date(),
      EXPIRA_EM:
        adicionarDias(
          new Date(),
          DIAS_RETENCAO_FORM_INTERNO,
        ),
      ERRO: '',
    },
  );
}

function limparFormMetaLegadosConcluidos() {
  const ui =
    SpreadsheetApp.getUi();

  const resposta =
    ui.alert(
      'Limpar FORM_META legados',
      'Serão apagados somente FORM_META de eventos já finalizados com STATUS MENU_FINAL_E_OS_GERADOS. Forms antigos desses eventos deixarão de processar automaticamente. Continuar?',
      ui.ButtonSet.YES_NO,
    );

  if (
    resposta !== ui.Button.YES
  ) {
    return;
  }

  const props =
    PropertiesService
      .getScriptProperties();

  const todas =
    props.getProperties();

  let removidas = 0;

  Object.keys(todas)
    .filter(
      (key) =>
        key.startsWith(
          'FORM_META_',
        ),
    )
    .forEach(
      (key) => {
        try {
          const meta =
            JSON.parse(
              todas[key],
            );

          const evento =
            meta.eventId
              ? buscarEvento(
                  meta.eventId,
                )
              : null;

          if (
            evento &&
            texto(
              evento.evento.STATUS,
            ) ===
              'MENU_FINAL_E_OS_GERADOS'
          ) {
            props.deleteProperty(
              key,
            );

            removidas++;
          }
        } catch (_) {
          // Não apaga metadados que não puderam ser validados.
        }
      },
    );

  ui.alert(
    `${removidas} FORM_META legado(s) removido(s).`,
  );
}


function buscarEvento(idEvento) {
  const sheet = obterPlanilhaPainel()
    .getSheetByName(ABA_EVENTOS);

  if (sheet.getLastRow() < 2) {
    return null;
  }

  const values = sheet
    .getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      EVENT_HEADERS.length,
    )
    .getValues();

  for (let index = 0; index < values.length; index++) {
    if (texto(values[index][0]) === idEvento) {
      const evento = {};
      EVENT_HEADERS.forEach((header, col) => {
        evento[header] = values[index][col];
      });
      return {
        row: index + 2,
        evento,
      };
    }
  }

  return null;
}

function atualizarEventoPorId(idEvento, fields) {
  const info = buscarEvento(idEvento);
  if (!info) {
    throw new Error(`Evento ${idEvento} não encontrado.`);
  }

  const sheet = obterPlanilhaPainel()
    .getSheetByName(ABA_EVENTOS);
  atualizarEvento(sheet, info.row, fields);
}

function atualizarEvento(sheet, row, fields) {
  Object.entries(fields).forEach(([field, value]) => {
    if (!EVENT_COL[field]) {
      throw new Error(`Coluna de evento desconhecida: ${field}`);
    }
    sheet.getRange(row, EVENT_COL[field]).setValue(value);
  });
}

function registrarLog(nivel, idEvento, etapa, mensagem) {
  const sheet = obterPlanilhaPainel()
    .getSheetByName(ABA_LOG);

  if (sheet) {
    sheet.appendRow([
      new Date(),
      nivel,
      idEvento || '',
      etapa,
      mensagem,
    ]);
  }
}

function executarComTratamento(etapa, fn) {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    throw new Error(
      'Já existe outro processamento em andamento.',
    );
  }

  try {
    fn();
  } catch (error) {
    let idEvento = '';

    try {
      const contexto = obterContextoLinhaAtiva();
      idEvento = texto(contexto.evento.ID_EVENTO);
      atualizarEvento(contexto.sheet, contexto.row, {
        STATUS: 'ERRO',
        ERRO: error.message || String(error),
      });
    } catch (_) {
      // Não altera a linha quando o erro ocorreu fora da aba EVENTOS.
    }

    registrarLog(
      'ERRO',
      idEvento,
      etapa,
      error.stack || error.message || String(error),
    );

    SpreadsheetApp.getUi().alert(
      `Erro em ${etapa}: ${error.message || error}`,
    );

    throw error;
  } finally {
    lock.releaseLock();
  }
}

function extrairIdGoogle(urlOuId) {
  const value = texto(urlOuId);
  const match = value.match(/[-\w]{20,}/);

  if (!match) {
    throw new Error(
      `Não foi possível identificar o ID no link: ${value}`,
    );
  }

  return match[0];
}

function gerarIdEvento() {
  return Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "'AB-'yyyyMMdd-HHmmss",
  );
}


function removerDuplicidadesMenu(menu) {
  const vistos = new Set();
  const itens = [];
  const removidos = [];

  (menu || []).forEach((item) => {
    const chave = [
      normalizarChaveAgrupamento(
        item.categoria || item.grupo,
      ),
      normalizarTextoComparacao(item.item),
      texto(item.tipo).toUpperCase(),
    ].join('|||');

    if (vistos.has(chave)) {
      removidos.push(
        `${texto(item.categoria)}: ${texto(item.item)}`,
      );
      return;
    }

    vistos.add(chave);
    itens.push(item);
  });

  return {
    itens,
    removidos,
  };
}

function removerDuplicidadesTexto(itens) {
  const vistos = new Set();

  return (itens || []).filter((item) => {
    const chave = normalizarTextoComparacao(item);

    if (!chave || vistos.has(chave)) {
      return false;
    }

    vistos.add(chave);
    return true;
  });
}


function normalizarChaveAgrupamento(value) {
  return normalizarTextoComparacao(
    limparTituloCategoria(
      texto(value)
        .replace(/\u00A0/g, ' ')
        .replace(/[\u200B-\u200D\uFEFF]/g, ''),
    ),
  ).replace(/\s+/g, '_');
}

function normalizarTextoComparacao(value) {
  return removerAcentos(value)
    .toUpperCase()
    .replace(/[“”"'´`]/g, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizarChave(value) {
  return removerAcentos(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function removerAcentos(value) {
  return texto(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function escaparRegex(value) {
  return texto(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  );
}

function escaparReplacement(value) {
  return texto(value)
    .replace(/\\/g, '\\\\')
    .replace(/\$/g, '\\$');
}

function nomeSeguro(value) {
  return texto(value)
    .replace(/[\\/:*?"<>|#%]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function texto(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}