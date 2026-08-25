/**
 * V23.2 — Mini Software A&B
 * Camada de software em tela cheia sobre o backend consolidado V23.1.
 *
 * Requer no mesmo projeto:
 * - backend V21.2 (incluindo hotfix do último parágrafo)
 * - FORM_REGISTRY / planilha central já preparados
 *
 * Este arquivo SUBSTITUI o MiniSoftware.gs V23.0.
 */

const FRONT_AB_VERSION = '23.2';
const ABA_ADITIVO_WORKFLOW = 'ADITIVO_WORKFLOW';
const CACHE_EVENT_LIST_AB = 'AB_V232_EVENT_LIST';
const CACHE_EVENT_ROW_PREFIX_AB = 'AB_V232_EVENT_ROW_';
const CACHE_FORM_STATE_PREFIX_AB = 'AB_V232_FORM_STATE_';
const ADITIVO_WORKFLOW_HEADERS = [
  'ID_EVENTO',
  'ID_ADITIVO',
  'LINK_ADITIVO',
  'FILE_ID',
  'ARQUIVO',
  'ESTAGIO',
  'STATUS',
  'ANALISE_JSON',
  'IMPACTO_JSON',
  'ARTEFATOS_ANTERIORES_JSON',
  'ACAO_FLUXO',
  'CRIADO_EM',
  'APLICADO_EM',
  'ERRO',
];
const PROP_METRICAS_TEMPO_AB = 'METRICAS_TEMPO_AB';
const CACHE_PROGRESS_PREFIX_AB = 'AB_PROGRESS_';

/* =========================================================
 * TELA CHEIA / WEB APP
 * ========================================================= */

function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('MVP_AB_App')
    .setTitle('Mini Software A&B');
}

/**
 * O menu da planilha passa a servir como "launcher".
 * Em produção, a operação deve acontecer no Web App em tela cheia.
 */
function abrirMiniSoftwareAB() {
  const url = ScriptApp
    .getService()
    .getUrl();

  if (!url) {
    const html = HtmlService
      .createHtmlOutput(
        [
          '<div style="font-family:Arial;padding:22px;line-height:1.5">',
          '<h2 style="color:#870f21;margin-top:0">Mini Software A&B</h2>',
          '<p>Para usar a versão em tela cheia, publique este projeto como <b>Aplicativo da Web</b>.</p>',
          '<p>Apps Script → Implantar → Nova implantação → Aplicativo da Web.</p>',
          '<p>Depois volte a este menu.</p>',
          '</div>',
        ].join(''),
      )
      .setWidth(520)
      .setHeight(280);

    SpreadsheetApp
      .getUi()
      .showModalDialog(
        html,
        'Mini Software A&B',
      );

    return;
  }

  const safeUrl =
    String(url)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;');

  const html = HtmlService
    .createHtmlOutput(
      [
        '<div style="font-family:Arial;padding:24px;text-align:center">',
        '<h2 style="color:#870f21;margin-top:0">Mini Software A&B</h2>',
        '<p style="color:#667085">Abra a interface de produção em uma aba própria.</p>',
        `<a href="${safeUrl}" target="_blank" style="display:inline-block;background:#870f21;color:white;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:10px">Abrir em tela cheia</a>`,
        '</div>',
      ].join(''),
    )
    .setWidth(470)
    .setHeight(230);

  SpreadsheetApp
    .getUi()
    .showModalDialog(
      html,
      'Mini Software A&B',
    );
}

/* =========================================================
 * HEALTHCHECK / PAINEL
 * ========================================================= */

function apiHealthcheckFrontAB() {
  garantirInfraAditivosFrontAB_();

  return {
    ok: true,
    version: FRONT_AB_VERSION,
    painelId:
      obterPlanilhaPainel()
        .getId(),
    webAppUrl:
      ScriptApp
        .getService()
        .getUrl() || '',
    timestamp:
      formatarDataHoraFront_(
        new Date(),
      ),
  };
}

function apiPainelInicialAB() {
  garantirInfraAditivosFrontAB_();

  const eventos =
    lerEventosPainelAB_();

  return {
    version:
      FRONT_AB_VERSION,
    resumo:
      calcularResumoEventosAB_(
        eventos,
      ),
    eventos:
      filtrarEventosPainelAB_(
        eventos,
        {
          somenteAbertos:
            true,
        },
      ),
    responsaveis:
      listarResponsaveisDeEventosAB_(
        eventos,
      ),
    statusDisponiveis:
      listarStatusDeEventosAB_(
        eventos,
      ),
    estimativas:
      obterEstimativasTempoAB_(),
    atualizadoEm:
      formatarDataHoraFront_(
        new Date(),
      ),
  };
}

function apiResumoPainelAB() {
  return calcularResumoEventosAB_(
    lerEventosPainelAB_(),
  );
}

function apiListarEventosPainelAB(
  filtros,
) {
  filtros = filtros || {};

  return filtrarEventosPainelAB_(
    lerEventosPainelAB_(),
    filtros,
  ).slice(
    0,
    Number(
      filtros.limite || 400,
    ),
  );
}

function apiListarResponsaveisAB() {
  return listarResponsaveisDeEventosAB_(
    lerEventosPainelAB_(),
  );
}

function apiListarStatusAB() {
  return listarStatusDeEventosAB_(
    lerEventosPainelAB_(),
  );
}

/* =========================================================
 * NOVO EVENTO
 * ========================================================= */

function apiCriarEventoAB(
  payload,
) {
  payload = payload || {};

  validarNovoEventoFrontAB_(
    payload,
  );

  const lock =
    LockService.getUserLock();

  if (!lock.tryLock(30000)) {
    throw new Error(
      'Existe outro processamento em andamento. Aguarde alguns segundos e tente novamente.',
    );
  }

  try {
    const sheet =
      obterPlanilhaPainel()
        .getSheetByName(
          ABA_EVENTOS,
        );

    if (!sheet) {
      throw new Error(
        `A aba ${ABA_EVENTOS} não foi encontrada.`,
      );
    }

    const idEvento =
      gerarIdEventoFrontAB_();

    const row =
      sheet.getLastRow() + 1;

    const dados = {
      ID_EVENTO:
        idEvento,
      LINK_CONTRATO:
        texto(
          payload.linkContrato,
        ),
      LINK_PASTA_EVENTO:
        texto(
          payload.linkPastaEvento,
        ),
      RESP_PRODUCAO:
        texto(
          payload.respProducao,
        ),
      DATA_DEGUSTACAO:
        converterStringParaDataFront_(
          payload.dataDegustacao,
        ),
      HORARIO_DEGUSTACAO:
        texto(
          payload.horarioDegustacao,
        ),
      LOCAL_DEGUSTACAO:
        texto(
          payload.localDegustacao,
        ),
      PAX_DEGUSTACAO:
        Number(
          payload.paxDegustacao || 0,
        ) || '',
      STATUS:
        'NOVO',
      PROCESSADO_EM:
        '',
      ERRO:
        '',
      AVISOS_REVISAO:
        '',
    };

    Object.entries(dados)
      .forEach(
        ([campo, valor]) => {
          const coluna =
            EVENT_COL[campo];

          if (coluna) {
            sheet
              .getRange(
                row,
                coluna,
              )
              .setValue(
                valor,
              );
          }
        },
      );

    SpreadsheetApp.flush();

    registrarLog(
      'INFO',
      idEvento,
      'CRIAR_EVENTO_FRONT',
      'Evento criado pelo Mini Software V23.2.',
    );

    invalidarCacheEventosAB_(
      idEvento,
    );

    return {
      ok: true,
      idEvento,
      evento:
        apiBuscarEventoDetalheAB(
          idEvento,
        ),
    };
  } finally {
    lock.releaseLock();
  }
}

/* =========================================================
 * EVENTO / WORKSPACE
 * ========================================================= */

function apiBuscarEventoDetalheAB(
  idEvento,
) {
  const info =
    buscarEventoRapidoAB_(
      idEvento,
    );

  if (!info) {
    throw new Error(
      `Evento ${idEvento} não encontrado.`,
    );
  }

  return mapearEventoFrontAB_(
    info.row,
    info.evento,
  );
}

function apiObterWorkspaceEventoAB(
  idEvento,
) {
  /*
   * Mantido por compatibilidade, mas agora é LEVE.
   * Revisão, histórico e aditivos são carregados somente quando a aba é aberta.
   */
  return apiObterEventoShellAB(
    idEvento,
  );
}

function apiObterEventoShellAB(
  idEvento,
) {
  const evento =
    apiBuscarEventoDetalheAB(
      idEvento,
    );

  return {
    evento,
    formInterno:
      obterEstadoFormularioInternoAB_(
        idEvento,
      ),
    proximaAcao:
      determinarProximaAcaoAB_(
        idEvento,
      ),
  };
}

function apiObterEstadoLeveEventoAB(
  idEvento,
) {
  return apiObterEventoShellAB(
    idEvento,
  );
}

function obterEstadoFormularioInternoAB_(
  idEvento,
) {
  const info =
    buscarEventoRapidoAB_(
      idEvento,
    );

  if (!info) {
    return {
      existe: false,
      respondido: false,
      respostas: 0,
      ultimaRespostaEm: '',
      url: '',
      erro: 'Evento não encontrado.',
    };
  }

  const evento =
    info.evento;

  const formId =
    texto(
      evento.FORM_INTERNO_ID,
    );

  if (!formId) {
    return {
      existe: false,
      respondido: false,
      respostas: 0,
      ultimaRespostaEm: '',
      url:
        texto(
          evento.LINK_FORM_INTERNO,
        ),
      erro: '',
    };
  }

  const cache =
    CacheService
      .getScriptCache();

  const cacheKey =
    CACHE_FORM_STATE_PREFIX_AB +
    formId;

  const cached =
    cache.get(
      cacheKey,
    );

  if (cached) {
    try {
      return JSON.parse(
        cached,
      );
    } catch (_) {
      // Continua.
    }
  }

  /*
   * Performance V23.2:
   * não abre o Google Form a cada clique de cliente.
   * O gatilho central já mantém o FORM_REGISTRY sincronizado.
   */
  const registro =
    buscarRegistroFormulario(
      formId,
    );

  const statusRegistro =
    texto(
      registro &&
      registro.STATUS,
    ).toUpperCase();

  const respondido =
    [
      'RESPONDIDO_AGUARDANDO_GERACAO',
      'PROCESSADO',
    ].includes(
      statusRegistro,
    ) ||
    texto(
      evento.STATUS,
    ) ===
      'MENU_FINAL_E_OS_GERADOS';

  const state = {
    existe: true,
    respondido,
    respostas:
      respondido
        ? 1
        : 0,
    ultimaRespostaEm:
      registro
        ? formatarDataHoraFront_(
            registro
              .ULTIMO_PROCESSAMENTO_EM,
          )
        : '',
    url:
      texto(
        evento.LINK_FORM_INTERNO,
      ),
    erro:
      registro &&
      statusRegistro ===
        'ERRO'
        ? texto(
            registro.ERRO,
          )
        : '',
  };

  cache.put(
    cacheKey,
    JSON.stringify(
      state,
    ),
    20,
  );

  return state;
}

function apiAtualizarPdfDocumentoAB(
  idEvento,
  tipoDocumento,
  token,
) {
  const inicio = Date.now();

  const config =
    obterConfigDocumentoPdfAB_(
      tipoDocumento,
    );

  const info =
    buscarEvento(
      idEvento,
    );

  if (!info) {
    throw new Error(
      `Evento ${idEvento} não encontrado.`,
    );
  }

  const evento =
    info.evento;

  const docUrl =
    texto(
      evento[config.docField],
    );

  const pdfUrlAtual =
    texto(
      evento[config.pdfField],
    );

  if (!docUrl) {
    throw new Error(
      `${config.label}: o DOC ainda não foi gerado.`,
    );
  }

  setProgressoAB_(
    token,
    10,
    'Abrindo DOC',
    `Lendo ${config.label}.`,
  );

  const docId =
    extrairIdGoogle(
      docUrl,
    );

  const docFile =
    DriveApp.getFileById(
      docId,
    );

  setProgressoAB_(
    token,
    38,
    'Gerando PDF',
    'Convertendo a versão atual do Google Docs para PDF.',
  );

  const nomePdf =
    docFile
      .getName()
      .replace(/\.docx?$/i, '') +
    '.pdf';

  const blob =
    docFile
      .getAs(
        MimeType.PDF,
      )
      .setName(
        nomePdf,
      );

  let pdfFile = null;
  let preservouLink = false;
  let substituiuLink = false;

  if (pdfUrlAtual) {
    const pdfId =
      extrairIdGoogle(
        pdfUrlAtual,
      );

    setProgressoAB_(
      token,
      62,
      'Atualizando PDF existente',
      'Tentando preservar o mesmo link do PDF.',
    );

    try {
      atualizarConteudoArquivoPdfAB_(
        pdfId,
        blob,
      );

      pdfFile =
        DriveApp.getFileById(
          pdfId,
        );

      preservouLink = true;
    } catch (error) {
      registrarLog(
        'AVISO',
        idEvento,
        'ATUALIZAR_PDF_LINK',
        `Não foi possível substituir o conteúdo mantendo o ID. Será criado um PDF novo na pasta do evento. ${error.message || error}`,
      );
    }
  }

  if (!pdfFile) {
    setProgressoAB_(
      token,
      76,
      'Gravando PDF na pasta',
      'Criando o arquivo atualizado na pasta do evento.',
    );

    const pasta =
      DriveApp.getFolderById(
        extrairIdGoogle(
          evento.LINK_PASTA_EVENTO,
        ),
      );

    pdfFile =
      pasta.createFile(
        blob,
      );

    if (pdfUrlAtual) {
      try {
        DriveApp
          .getFileById(
            extrairIdGoogle(
              pdfUrlAtual,
            ),
          )
          .setTrashed(true);
      } catch (_) {
        // O novo PDF já foi criado; não interrompe por falha na limpeza.
      }
    }

    atualizarEventoPorId(
      idEvento,
      {
        [config.pdfField]:
          pdfFile.getUrl(),
      },
    );

    substituiuLink = true;
  }

  setProgressoAB_(
    token,
    94,
    'Conferindo arquivo',
    'Finalizando a atualização do PDF.',
  );

  const segundos =
    Math.max(
      1,
      Math.round(
        (Date.now() - inicio) /
        1000,
      ),
    );

  registrarLog(
    'INFO',
    idEvento,
    'ATUALIZAR_PDF',
    `${config.label}: PDF atualizado a partir do DOC. ` +
    (preservouLink
      ? 'O link do PDF foi preservado.'
      : 'Foi criado um novo PDF e o painel foi atualizado.'),
  );

  setProgressoAB_(
    token,
    100,
    'PDF atualizado',
    `Concluído em ${segundos}s.`,
  );

  invalidarCacheEventosAB_(
    idEvento,
  );

  return {
    ok: true,
    tipo:
      config.key,
    label:
      config.label,
    pdfUrl:
      pdfFile.getUrl(),
    preservouLink,
    substituiuLink,
    duracaoSegundos:
      segundos,
  };
}

function obterConfigDocumentoPdfAB_(
  tipoDocumento,
) {
  const key =
    texto(
      tipoDocumento,
    ).toUpperCase();

  const configs = {
    ESCOLHA: {
      key: 'ESCOLHA',
      label: 'Escolha de Menu',
      docField: 'LINK_ESCOLHA_DOC',
      pdfField: 'LINK_ESCOLHA_PDF',
    },
    RELATORIO: {
      key: 'RELATORIO',
      label: 'Relatório de Degustação',
      docField: 'LINK_RELATORIO_DOC',
      pdfField: 'LINK_RELATORIO_PDF',
    },
    MENU_FINAL: {
      key: 'MENU_FINAL',
      label: 'Menu Final',
      docField: 'LINK_MENU_FINAL_DOC',
      pdfField: 'LINK_MENU_FINAL_PDF',
    },
    OS: {
      key: 'OS',
      label: 'OS A&B',
      docField: 'LINK_OS_DOC',
      pdfField: 'LINK_OS_PDF',
    },
  };

  if (!configs[key]) {
    throw new Error(
      `Tipo de documento desconhecido: ${tipoDocumento}`,
    );
  }

  return configs[key];
}

function atualizarConteudoArquivoPdfAB_(
  pdfId,
  blob,
) {
  const url =
    `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(pdfId)}?uploadType=media`;

  const response =
    UrlFetchApp.fetch(
      url,
      {
        method: 'patch',
        contentType:
          'application/pdf',
        payload:
          blob.getBytes(),
        headers: {
          Authorization:
            `Bearer ${ScriptApp.getOAuthToken()}`,
        },
        muteHttpExceptions:
          true,
      },
    );

  const code =
    response.getResponseCode();

  if (
    code < 200 ||
    code >= 300
  ) {
    throw new Error(
      `Drive API retornou HTTP ${code}: ${response.getContentText().slice(0, 500)}`,
    );
  }
}

/**
 * Link direto para a linha da aba EVENTOS.
 * Serve como fallback técnico; a operação normal não depende mais da seleção.
 */
function gerarLinkLinhaEventoAB_(
  row,
) {
  const ss =
    obterPlanilhaPainel();

  const sheet =
    ss.getSheetByName(
      ABA_EVENTOS,
    );

  return (
    ss.getUrl() +
    '#gid=' +
    sheet.getSheetId() +
    '&range=A' +
    row
  );
}

/* =========================================================
 * REVISÃO DA EXTRAÇÃO NO SOFTWARE
 * ========================================================= */

function apiObterRevisaoExtracaoAB(
  idEvento,
) {
  const info =
    buscarEvento(
      idEvento,
    );

  if (!info) {
    throw new Error(
      `Evento ${idEvento} não encontrado.`,
    );
  }

  const menuRows =
    lerLinhasPorEvento(
      ABA_MENU,
      MENU_HEADERS.length,
      idEvento,
    );

  const terceirosRows =
    lerLinhasPorEvento(
      ABA_TERCEIROS,
      TERCEIROS_HEADERS.length,
      idEvento,
    );

  const aditivosRows =
    lerLinhasPorEvento(
      ABA_ADITIVOS,
      ADITIVOS_HEADERS.length,
      idEvento,
    );

  const cabecalho =
    parseJsonSeguroFrontAB_(
      info.evento
        .JSON_CABECALHO,
    );

  return {
    cabecalho:
      serializarObjetoFrontAB_(
        cabecalho,
      ),
    menu:
      menuRows.map(
        (row, index) => ({
          index,
          grupo:
            texto(row[1]),
          categoria:
            texto(row[2]),
          item:
            texto(row[3]),
          qtdDegustacao:
            Number(row[4]) || 0,
          qtdMenuFinal:
            Number(row[5]) || 0,
          tipo:
            texto(row[6]),
        }),
      ),
    terceiros:
      terceirosRows.map(
        (row, index) => ({
          index,
          tipo:
            texto(row[1]),
          categoria:
            texto(row[2]),
          item:
            texto(row[3]),
          incluirMenuFinal:
            normalizarBooleanFrontAB_(
              row[4],
            ),
          incluirOs:
            normalizarBooleanFrontAB_(
              row[5],
            ),
        }),
      ),
    aditivos:
      aditivosRows.map(
        (row) => ({
          ordem:
            texto(row[1]),
          data:
            texto(row[2]),
          arquivo:
            texto(row[3]),
          referenciaContrato:
            texto(row[4]),
          tipoAlteracao:
            texto(row[5]),
          efeitoMenu:
            texto(row[6]),
          resumo:
            texto(row[7]),
          valorAdicional:
            texto(row[8]),
        }),
      ),
    avisos:
      texto(
        info.evento
          .AVISOS_REVISAO,
      ),
    erro:
      texto(
        info.evento
          .ERRO,
      ),
    status:
      texto(
        info.evento
          .STATUS,
      ),
  };
}

function apiSalvarRevisaoExtracaoAB(
  idEvento,
  payload,
) {
  payload = payload || {};

  const info =
    buscarEvento(
      idEvento,
    );

  if (!info) {
    throw new Error(
      `Evento ${idEvento} não encontrado.`,
    );
  }

  const sheetEventos =
    obterPlanilhaPainel()
      .getSheetByName(
        ABA_EVENTOS,
      );

  if (
    payload.cabecalho &&
    typeof payload.cabecalho ===
      'object'
  ) {
    atualizarEvento(
      sheetEventos,
      info.row,
      {
        JSON_CABECALHO:
          JSON.stringify(
            payload.cabecalho,
          ),
      },
    );
  }

  if (
    Array.isArray(
      payload.menu,
    )
  ) {
    removerLinhasPorId(
      ABA_MENU,
      idEvento,
    );

    const rows =
      payload.menu
        .filter(
          (item) =>
            texto(
              item.item,
            ),
        )
        .map(
          (item) => [
            idEvento,
            texto(
              item.grupo,
            ),
            texto(
              item.categoria,
            ),
            texto(
              item.item,
            ),
            Number(
              item.qtdDegustacao || 0,
            ) || 0,
            Number(
              item.qtdMenuFinal || 0,
            ) || 0,
            texto(
              item.tipo,
            ) ||
              'INCLUSO_CARDAPIO',
          ],
        );

    if (rows.length) {
      const sheetMenu =
        obterPlanilhaPainel()
          .getSheetByName(
            ABA_MENU,
          );

      sheetMenu
        .getRange(
          sheetMenu.getLastRow() + 1,
          1,
          rows.length,
          MENU_HEADERS.length,
        )
        .setValues(
          rows,
        );
    }
  }

  if (
    Array.isArray(
      payload.terceiros,
    )
  ) {
    removerLinhasPorId(
      ABA_TERCEIROS,
      idEvento,
    );

    const rows =
      payload.terceiros
        .filter(
          (item) =>
            texto(
              item.item,
            ),
        )
        .map(
          (item) => [
            idEvento,
            texto(
              item.tipo,
            ),
            texto(
              item.categoria,
            ),
            texto(
              item.item,
            ),
            !!item.incluirMenuFinal,
            !!item.incluirOs,
          ],
        );

    if (rows.length) {
      const sheetTerceiros =
        obterPlanilhaPainel()
          .getSheetByName(
            ABA_TERCEIROS,
          );

      sheetTerceiros
        .getRange(
          sheetTerceiros.getLastRow() + 1,
          1,
          rows.length,
          TERCEIROS_HEADERS.length,
        )
        .setValues(
          rows,
        );
    }
  }

  const dados =
    carregarDadosEvento(
      idEvento,
    );

  const problemas =
    validarDadosAntesDoFormulario(
      dados,
    );

  atualizarEventoPorId(
    idEvento,
    {
      STATUS:
        'AGUARDANDO_REVISAO',
      ERRO:
        problemas.length
          ? problemas.join('\n')
          : '',
    },
  );

  registrarLog(
    problemas.length
      ? 'AVISO'
      : 'INFO',
    idEvento,
    'REVISAO_FRONT',
    problemas.length
      ? (
        'Revisão salva. Ainda existem validações pendentes: ' +
        problemas.join(' | ')
      )
      : 'Revisão da extração salva pelo Mini Software.',
  );

  invalidarCacheEventosAB_(
    idEvento,
  );

  return {
    ok:
      !problemas.length,
    problemas,
    revisao:
      apiObterRevisaoExtracaoAB(
        idEvento,
      ),
  };
}

/* =========================================================
 * HISTÓRICO / ERROS
 * ========================================================= */

function apiObterHistoricoEventoAB(
  idEvento,
) {
  const sheet =
    obterPlanilhaPainel()
      .getSheetByName(
        ABA_LOG,
      );

  if (
    !sheet ||
    sheet.getLastRow() < 2
  ) {
    return [];
  }

  const values =
    sheet
      .getRange(
        2,
        1,
        sheet.getLastRow() - 1,
        5,
      )
      .getValues();

  return values
    .filter(
      (row) =>
        texto(row[2]) ===
        idEvento,
    )
    .slice(-80)
    .reverse()
    .map(
      (row) => ({
        data:
          formatarDataHoraFront_(
            row[0],
          ),
        nivel:
          texto(row[1]),
        etapa:
          texto(row[3]),
        mensagem:
          texto(row[4]),
      }),
    );
}

function determinarProximaAcaoAB_(
  idEvento,
) {
  const info =
    buscarEventoRapidoAB_(
      idEvento,
    );

  if (!info) {
    return {
      acao: '',
      label: '',
    };
  }

  const evento =
    info.evento;

  const status =
    texto(
      evento.STATUS,
    ).toUpperCase();

  if (status === 'ERRO') {
    return {
      acao:
        determinarAcaoRetentativaAB_(
          evento,
        ),
      label:
        'Tentar novamente',
    };
  }

  if (
    status === 'NOVO' ||
    !texto(
      evento.JSON_CABECALHO,
    )
  ) {
    return {
      acao:
        'EXTRACAO',
      label:
        'Extrair contrato',
    };
  }

  if (
    !texto(
      evento.FORM_CLIENTE_ID,
    )
  ) {
    return {
      acao:
        'GERAR_ESCOLHA_FORM',
      label:
        'Aprovar extração e gerar Form',
    };
  }

  if (
    texto(
      evento.FORM_CLIENTE_ID,
    ) &&
    !texto(
      evento.FORM_INTERNO_ID,
    )
  ) {
    return {
      acao:
        'AGUARDAR_CLIENTE',
      label:
        'Aguardando cliente',
    };
  }

  if (
    texto(
      evento.FORM_INTERNO_ID,
    ) &&
    !texto(
      evento.LINK_OS_DOC,
    )
  ) {
    return {
      acao:
        'POS_DEGUSTACAO',
      label:
        'Pós-degustação',
    };
  }

  return {
    acao:
      'FINALIZADO',
    label:
      'Finalizado',
  };
}

function determinarAcaoRetentativaAB_(
  evento,
) {
  if (
    !texto(
      evento.JSON_CABECALHO,
    )
  ) {
    return 'EXTRACAO';
  }

  if (
    !texto(
      evento.FORM_CLIENTE_ID,
    )
  ) {
    return 'GERAR_ESCOLHA_FORM';
  }

  if (
    texto(
      evento.FORM_CLIENTE_ID,
    ) &&
    !texto(
      evento.FORM_INTERNO_ID,
    )
  ) {
    /*
     * Não abrimos FormApp durante a navegação.
     * Se houve erro depois da criação do Form Cliente, a retentativa segura
     * é reprocessar a resposta; se ela ainda não existir, a própria ação
     * informará isso sem alterar dados.
     */
    return 'REPROCESSAR_CLIENTE';
  }

  if (
    texto(
      evento.FORM_INTERNO_ID,
    ) &&
    !texto(
      evento.LINK_OS_DOC,
    )
  ) {
    return 'GERAR_FINAL_OS';
  }

  return 'DIAGNOSTICO';
}

/* =========================================================
 * PROGRESSO / TEMPO ESTIMADO
 * ========================================================= */

function apiObterProgressoAB(
  token,
) {
  if (!token) {
    return null;
  }

  const raw =
    CacheService
      .getScriptCache()
      .get(
        CACHE_PROGRESS_PREFIX_AB +
        token,
      );

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function setProgressoAB_(
  token,
  percentual,
  etapa,
  detalhe,
) {
  if (!token) {
    return;
  }

  const payload = {
    percentual:
      Math.max(
        0,
        Math.min(
          100,
          Number(
            percentual || 0,
          ),
        ),
      ),
    etapa:
      texto(etapa),
    detalhe:
      texto(detalhe),
    atualizadoEm:
      Date.now(),
  };

  CacheService
    .getScriptCache()
    .put(
      CACHE_PROGRESS_PREFIX_AB +
        token,
      JSON.stringify(
        payload,
      ),
      600,
    );
}

function obterEstimativasTempoAB_() {
  const defaults = {
    EXTRACAO: 70,
    GERAR_ESCOLHA_FORM: 35,
    GERAR_FINAL_OS: 40,
    RECRIAR_FORM_INTERNO: 25,
    REPROCESSAR_CLIENTE: 35,
    ANALISAR_ADITIVO: 45,
    APLICAR_ADITIVO: 85,
    ATUALIZAR_PDF: 12,
  };

  const raw =
    PropertiesService
      .getScriptProperties()
      .getProperty(
        PROP_METRICAS_TEMPO_AB,
      );

  let metricas = {};

  try {
    metricas =
      raw
        ? JSON.parse(raw)
        : {};
  } catch (_) {
    metricas = {};
  }

  const result = {};

  Object.keys(defaults)
    .forEach(
      (acao) => {
        const avg =
          Number(
            metricas[acao] &&
            metricas[acao].avg,
          ) ||
          defaults[acao];

        result[acao] = {
          segundos:
            Math.round(avg),
          minimo:
            Math.max(
              5,
              Math.round(
                avg * 0.7,
              ),
            ),
          maximo:
            Math.round(
              avg * 1.4,
            ),
        };
      },
    );

  return result;
}

function registrarDuracaoAcaoAB_(
  acao,
  segundos,
) {
  const props =
    PropertiesService
      .getScriptProperties();

  let metricas = {};

  try {
    metricas =
      JSON.parse(
        props.getProperty(
          PROP_METRICAS_TEMPO_AB,
        ) || '{}',
      );
  } catch (_) {
    metricas = {};
  }

  const atual =
    metricas[acao] || {
      count: 0,
      avg: segundos,
    };

  const count =
    Number(
      atual.count || 0,
    );

  const avg =
    Number(
      atual.avg || segundos,
    );

  /*
   * Média móvel suavizada.
   * Depois de várias execuções, a estimativa passa a refletir
   * o tempo real do ambiente.
   */
  const novoAvg =
    count === 0
      ? segundos
      : (
        avg * 0.7 +
        segundos * 0.3
      );

  metricas[acao] = {
    count:
      count + 1,
    avg:
      Math.round(
        novoAvg,
      ),
  };

  props.setProperty(
    PROP_METRICAS_TEMPO_AB,
    JSON.stringify(
      metricas,
    ),
  );
}

/* =========================================================
 * EXECUÇÃO POR ID — SEM LINHA ATIVA
 * ========================================================= */

function apiExecutarAcaoAB(
  idEvento,
  acao,
  token,
) {
  const inicio =
    Date.now();

  const lock =
    LockService.getUserLock();

  if (!lock.tryLock(30000)) {
    throw new Error(
      'Existe outro processamento em andamento para este usuário. Aguarde alguns segundos.',
    );
  }

  try {
    let tentativa = 1;

    while (
      tentativa <= 2
    ) {
      try {
        setProgressoAB_(
          token,
          2,
          tentativa === 1
            ? 'Iniciando'
            : 'Tentando novamente automaticamente',
          tentativa === 1
            ? 'Preparando a operação.'
            : 'A primeira tentativa encontrou uma falha técnica temporária.',
        );

        const resultado =
          executarAcaoDiretaAB_(
            idEvento,
            acao,
            token,
          );

        const segundos =
          Math.max(
            1,
            Math.round(
              (
                Date.now() -
                inicio
              ) /
              1000,
            ),
          );

        registrarDuracaoAcaoAB_(
          acao,
          segundos,
        );

        setProgressoAB_(
          token,
          100,
          'Concluído',
          `Processo concluído em ${segundos}s.`,
        );

        invalidarCacheEventosAB_(
          idEvento,
        );

        return {
          ok: true,
          tentativa,
          duracaoSegundos:
            segundos,
          resultado,
          evento:
            apiBuscarEventoDetalheAB(
              idEvento,
            ),
        };
      } catch (error) {
        const mensagem =
          error.message ||
          String(error);

        const podeRetentar =
          tentativa === 1 &&
          ehErroTecnicoRetentavelAB_(
            mensagem,
          ) &&
          podeRetentarSemDuplicarAB_(
            idEvento,
            acao,
          );

        if (!podeRetentar) {
          throw error;
        }

        registrarLog(
          'AVISO',
          idEvento,
          'AUTO_RETRY',
          `Falha técnica na ação ${acao}. O sistema fará uma segunda tentativa automática. Erro: ${mensagem}`,
        );

        setProgressoAB_(
          token,
          10,
          'Falha temporária detectada',
          'Aguardando alguns segundos para uma nova tentativa automática.',
        );

        Utilities.sleep(
          3000,
        );

        tentativa++;
      }
    }

    throw new Error(
      'A operação não foi concluída.',
    );
  } catch (error) {
    const mensagem =
      error.message ||
      String(error);

    atualizarEventoPorId(
      idEvento,
      {
        STATUS:
          'ERRO',
        ERRO:
          mensagem,
      },
    );

    invalidarCacheEventosAB_(
      idEvento,
    );

    registrarLog(
      'ERRO',
      idEvento,
      acao,
      error.stack ||
        mensagem,
    );

    setProgressoAB_(
      token,
      100,
      'Erro',
      mensagem,
    );

    throw error;
  } finally {
    lock.releaseLock();
  }
}

function executarAcaoDiretaAB_(
  idEvento,
  acao,
  token,
) {
  switch (acao) {
    case 'EXTRACAO':
      return executarExtracaoPorIdAB_(
        idEvento,
        token,
      );

    case 'GERAR_ESCOLHA_FORM':
      return gerarEscolhaFormPorIdAB_(
        idEvento,
        token,
      );

    case 'GERAR_FINAL_OS':
      return gerarFinalOsPorIdAB_(
        idEvento,
        token,
      );

    case 'RECRIAR_FORM_INTERNO':
      return recriarFormInternoPorIdAB_(
        idEvento,
        token,
      );

    case 'REPROCESSAR_CLIENTE':
      return reprocessarClientePorIdAB_(
        idEvento,
        token,
      );

    default:
      throw new Error(
        `Ação desconhecida: ${acao}`,
      );
  }
}

function executarExtracaoPorIdAB_(
  idEvento,
  token,
) {
  const info =
    buscarEvento(
      idEvento,
    );

  if (!info) {
    throw new Error(
      `Evento ${idEvento} não encontrado.`,
    );
  }

  const sheet =
    obterPlanilhaPainel()
      .getSheetByName(
        ABA_EVENTOS,
      );

  const evento =
    info.evento;

  setProgressoAB_(
    token,
    8,
    'Validando evento',
    'Conferindo contrato, pasta e dados da degustação.',
  );

  validarCamposIniciais(
    evento,
  );

  atualizarEvento(
    sheet,
    info.row,
    {
      STATUS:
        'PROCESSANDO_CONTRATO',
      ERRO:
        '',
    },
  );

  setProgressoAB_(
    token,
    18,
    'Lendo documentos',
    'Abrindo contrato e aditivos no Google Drive.',
  );

  const contrato =
    obterPdfContrato(
      evento.LINK_CONTRATO,
    );

  const aditivos =
    obterAditivosComoPdf(
      evento.LINKS_ADITIVOS,
    );

  const documentos = [
    {
      tipo:
        'CONTRATO_BASE',
      ordem:
        0,
      blob:
        contrato,
    },
    ...aditivos,
  ];

  setProgressoAB_(
    token,
    38,
    'Extraindo com IA',
    'Interpretando cabeçalho, Anexo II, terceiros e aditivos.',
  );

  const extraido =
    extrairContratoComIA(
      documentos,
    );

  setProgressoAB_(
    token,
    68,
    'Consolidando informações',
    'Aplicando as regras do cardápio e consolidando os aditivos.',
  );

  const normalizado =
    normalizarExtracao(
      extraido,
    );

  setProgressoAB_(
    token,
    84,
    'Gravando extração',
    'Atualizando cardápio, terceiros, aditivos e cabeçalho.',
  );

  limparDadosEvento(
    idEvento,
  );

  gravarMenu(
    idEvento,
    normalizado.menu,
  );

  gravarTerceiros(
    idEvento,
    normalizado.terceiros,
  );

  gravarAditivosAplicados(
    idEvento,
    normalizado.aditivos,
  );

  atualizarEvento(
    sheet,
    info.row,
    {
      STATUS:
        'AGUARDANDO_REVISAO',
      JSON_CABECALHO:
        JSON.stringify(
          normalizado.cabecalho,
        ),
      JSON_FIXOS:
        JSON.stringify(
          normalizado.fixos,
        ),
      JSON_ADITIVOS:
        JSON.stringify(
          normalizado.aditivos,
        ),
      VALOR_ADITIVOS:
        normalizado.aditivos
          .valor_total_aditivos ||
        0,
      VALOR_TOTAL_CONSOLIDADO:
        normalizado.aditivos
          .valor_total_consolidado ||
        0,
      AVISOS_REVISAO:
        normalizado.avisos
          .join('\n'),
      PROCESSADO_EM:
        new Date(),
      ERRO:
        '',
    },
  );

  registrarLog(
    'INFO',
    idEvento,
    'EXTRACAO',
    'Contrato e aditivos consolidados. Aguardando revisão no Mini Software.',
  );

  setProgressoAB_(
    token,
    96,
    'Finalizando',
    'Preparando a tela de revisão da extração.',
  );

  return {
    mensagem:
      normalizado.avisos.length
        ? 'Extração concluída com avisos para revisão.'
        : 'Extração concluída sem avisos.',
  };
}

function gerarEscolhaFormPorIdAB_(
  idEvento,
  token,
) {
  const info =
    buscarEvento(
      idEvento,
    );

  if (!info) {
    throw new Error(
      `Evento ${idEvento} não encontrado.`,
    );
  }

  const evento =
    info.evento;

  if (
    ![
      'AGUARDANDO_REVISAO',
      'AGUARDANDO_CLIENTE',
      'ERRO',
    ].includes(
      texto(
        evento.STATUS,
      ),
    )
  ) {
    throw new Error(
      'O evento precisa estar em AGUARDANDO_REVISAO, AGUARDANDO_CLIENTE ou ERRO.',
    );
  }

  setProgressoAB_(
    token,
    10,
    'Validando extração',
    'Conferindo regras e quantidades do cardápio.',
  );

  const dados =
    carregarDadosEvento(
      idEvento,
    );

  const problemas =
    validarDadosAntesDoFormulario(
      dados,
    );

  if (problemas.length) {
    atualizarEventoPorId(
      idEvento,
      {
        STATUS:
          'AGUARDANDO_REVISAO',
        ERRO:
          problemas.join('\n'),
      },
    );

    throw new Error(
      'REVISÃO NECESSÁRIA: ' +
      problemas.join(' | '),
    );
  }

  const pasta =
    DriveApp.getFolderById(
      extrairIdGoogle(
        evento
          .LINK_PASTA_EVENTO,
      ),
    );

  setProgressoAB_(
    token,
    28,
    'Gerando Escolha de Menu',
    'Criando o documento e o PDF para conferência.',
  );

  const documentoEscolha =
    gerarDocumentoEscolha(
      evento,
      dados,
      pasta,
    );

  setProgressoAB_(
    token,
    62,
    'Criando formulário do cliente',
    'Montando as perguntas conforme as regras do contrato.',
  );

  const formulario =
    criarFormularioCliente(
      evento,
      dados,
      pasta,
    );

  setProgressoAB_(
    token,
    90,
    'Registrando links',
    'Atualizando o evento com documento, PDF e formulário.',
  );

  atualizarEventoPorId(
    idEvento,
    {
      STATUS:
        'AGUARDANDO_CLIENTE',
      ERRO:
        '',
      LINK_ESCOLHA_DOC:
        documentoEscolha.docUrl,
      LINK_ESCOLHA_PDF:
        documentoEscolha.pdfUrl,
      LINK_FORM_CLIENTE:
        formulario.url,
      FORM_CLIENTE_ID:
        formulario.id,
    },
  );

  registrarLog(
    'INFO',
    idEvento,
    'GERAR_ESCOLHA_FORM',
    'Documento Escolha de Menu e formulário do cliente gerados pelo Mini Software.',
  );

  return {
    mensagem:
      'Escolha de Menu e formulário do cliente gerados.',
  };
}

function reprocessarClientePorIdAB_(
  idEvento,
  token,
) {
  const info =
    buscarEvento(
      idEvento,
    );

  if (!info) {
    throw new Error(
      `Evento ${idEvento} não encontrado.`,
    );
  }

  const evento =
    info.evento;

  if (
    !texto(
      evento.FORM_CLIENTE_ID,
    )
  ) {
    throw new Error(
      'O evento não possui FORM_CLIENTE_ID.',
    );
  }

  setProgressoAB_(
    token,
    15,
    'Abrindo resposta do cliente',
    'Recuperando a última resposta enviada.',
  );

  const form =
    FormApp.openById(
      texto(
        evento.FORM_CLIENTE_ID,
      ),
    );

  const responses =
    form.getResponses();

  if (!responses.length) {
    throw new Error(
      'O formulário do cliente ainda não possui respostas.',
    );
  }

  const meta =
    obterMetaFormulario(
      form.getId(),
    );

  if (!meta) {
    throw new Error(
      'Metadados do formulário do cliente não encontrados.',
    );
  }

  /*
   * Se o processamento anterior já gerou os dois resultados,
   * tratamos como sucesso e não duplicamos.
   */
  const atual =
    buscarEvento(
      idEvento,
    ).evento;

  if (
    texto(
      atual.LINK_RELATORIO_DOC,
    ) &&
    texto(
      atual.FORM_INTERNO_ID,
    )
  ) {
    atualizarEventoPorId(
      idEvento,
      {
        STATUS:
          'AGUARDANDO_POS_DEGUSTACAO',
        ERRO:
          '',
      },
    );

    return {
      mensagem:
        'A resposta do cliente já estava processada. O evento foi recuperado.',
    };
  }

  setProgressoAB_(
    token,
    38,
    'Processando escolhas',
    'Gerando Relatório de Degustação e Formulário Interno.',
  );

  processarRespostaCliente(
    {
      source:
        form,
      response:
        responses[
          responses.length - 1
        ],
    },
    meta,
  );

  setProgressoAB_(
    token,
    92,
    'Finalizando pós-degustação',
    'Atualizando links e status do evento.',
  );

  return {
    mensagem:
      'Última resposta do cliente reprocessada com sucesso.',
  };
}

function recriarFormInternoPorIdAB_(
  idEvento,
  token,
) {
  const info =
    buscarEvento(
      idEvento,
    );

  if (!info) {
    throw new Error(
      `Evento ${idEvento} não encontrado.`,
    );
  }

  const evento =
    info.evento;

  const formInternoAnteriorId =
    texto(
      evento.FORM_INTERNO_ID,
    );

  if (
    !texto(
      evento.FORM_CLIENTE_ID,
    )
  ) {
    throw new Error(
      'O evento não possui FORM_CLIENTE_ID.',
    );
  }

  setProgressoAB_(
    token,
    15,
    'Recuperando resposta do cliente',
    'Abrindo a última resposta válida.',
  );

  const formCliente =
    FormApp.openById(
      texto(
        evento.FORM_CLIENTE_ID,
      ),
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
    responses[
      responses.length - 1
    ];

  const respostaCliente =
    lerRespostaFormulario(
      ultimaResposta,
      metaCliente,
    );

  const dados =
    carregarDadosEvento(
      idEvento,
    );

  const pasta =
    DriveApp.getFolderById(
      extrairIdGoogle(
        evento
          .LINK_PASTA_EVENTO,
      ),
    );

  setProgressoAB_(
    token,
    55,
    'Criando Formulário Interno',
    'Montando campos de produção e operação.',
  );

  const interno =
    criarFormularioInterno(
      dados,
      respostaCliente,
      pasta,
    );

  atualizarEventoPorId(
    idEvento,
    {
      STATUS:
        'AGUARDANDO_POS_DEGUSTACAO',
      ERRO:
        '',
      LINK_FORM_INTERNO:
        interno.url,
      FORM_INTERNO_ID:
        interno.id,
    },
  );

  if (
    formInternoAnteriorId &&
    formInternoAnteriorId !== interno.id
  ) {
    try {
      arquivarFormularioEscalavel(
        formInternoAnteriorId,
        true,
      );
    } catch (error) {
      registrarLog(
        'AVISO',
        idEvento,
        'RECRIAR_FORM_INTERNO',
        `O novo Form Interno foi criado, mas o formulário anterior não pôde ser arquivado: ${error.message || error}`,
      );
    }
  }

  return {
    mensagem:
      'Novo Formulário Interno criado.',
  };
}

function gerarFinalOsPorIdAB_(
  idEvento,
  token,
) {
  const info =
    buscarEvento(
      idEvento,
    );

  if (!info) {
    throw new Error(
      `Evento ${idEvento} não encontrado.`,
    );
  }

  const evento =
    info.evento;

  setProgressoAB_(
    token,
    12,
    'Validando formulário interno',
    'Conferindo se há uma resposta de produção disponível.',
  );

  validarFormularioInternoDoEvento(
    evento,
  );

  const form =
    FormApp.openById(
      texto(
        evento.FORM_INTERNO_ID,
      ),
    );

  const responses =
    form.getResponses();

  if (!responses.length) {
    throw new Error(
      'O formulário interno ainda não possui respostas.',
    );
  }

  const meta =
    obterMetaFormulario(
      form.getId(),
    );

  if (!meta) {
    throw new Error(
      'Os metadados do formulário interno não foram encontrados.',
    );
  }

  setProgressoAB_(
    token,
    35,
    'Processando dados da produção',
    'Validando Menu Final, operação e observações.',
  );

  const ultimaResposta =
    responses[
      responses.length - 1
    ];

  setProgressoAB_(
    token,
    55,
    'Gerando Menu Final e OS',
    'Criando os documentos e PDFs finais.',
  );

  processarRespostaInterna(
    {
      source:
        form,
      response:
        ultimaResposta,
    },
    meta,
    {
      ignorarGravacaoResposta:
        true,
    },
  );

  const atualizado =
    buscarEvento(
      idEvento,
    ).evento;

  if (
    texto(
      atualizado.STATUS,
    ) !==
      'MENU_FINAL_E_OS_GERADOS'
  ) {
    throw new Error(
      texto(
        atualizado.ERRO,
      ) ||
      'A última resposta interna não passou pela validação.',
    );
  }

  setProgressoAB_(
    token,
    92,
    'Finalizando',
    'Conferindo links e encerrando a etapa operacional.',
  );

  marcarFormularioInternoProcessado(
    form.getId(),
  );

  return {
    mensagem:
      texto(
        atualizado
          .AVISOS_REVISAO,
      )
        ? 'Menu Final e OS gerados com avisos para revisão.'
        : 'Menu Final e OS gerados com sucesso.',
  };
}

function ehErroTecnicoRetentavelAB_(
  mensagem,
) {
  const textoErro =
    removerAcentos(
      texto(
        mensagem,
      ),
    ).toUpperCase();

  if (
    textoErro.includes(
      'REVISAO NECESSARIA',
    )
  ) {
    return false;
  }

  const padroes = [
    'INTERNAL ERROR',
    'ERRO INTERNO',
    'TEMPORARILY UNAVAILABLE',
    'TEMPORARIAMENTE INDISPONIVEL',
    'TIMED OUT',
    'TIMEOUT',
    'RATE LIMIT',
    'TOO MANY TIMES',
    '429',
    '503',
    'NAO FOI POSSIVEL IDENTIFICAR A ABA DE RESPOSTAS',
    'BACKEND ERROR',
    'SERVICE UNAVAILABLE',
  ];

  return padroes.some(
    (item) =>
      textoErro.includes(
        item,
      ),
  );
}

function podeRetentarSemDuplicarAB_(
  idEvento,
  acao,
) {
  const info =
    buscarEvento(
      idEvento,
    );

  if (!info) {
    return false;
  }

  const evento =
    info.evento;

  if (acao === 'EXTRACAO') {
    return true;
  }

  if (
    acao ===
    'GERAR_ESCOLHA_FORM'
  ) {
    return !(
      texto(
        evento.FORM_CLIENTE_ID,
      ) ||
      texto(
        evento.LINK_FORM_CLIENTE,
      )
    );
  }

  if (
    acao ===
    'GERAR_FINAL_OS'
  ) {
    return !(
      texto(
        evento.LINK_MENU_FINAL_DOC,
      ) ||
      texto(
        evento.LINK_OS_DOC,
      )
    );
  }

  return false;
}


/* =========================================================
 * PERFORMANCE V23.2 — ÍNDICES / CACHE
 * ========================================================= */

function invalidarCacheEventosAB_(
  idEvento,
) {
  const cache =
    CacheService
      .getScriptCache();

  cache.remove(
    CACHE_EVENT_LIST_AB,
  );

  if (idEvento) {
    cache.remove(
      CACHE_EVENT_ROW_PREFIX_AB +
      idEvento,
    );
  }
}

function buscarEventoRapidoAB_(
  idEvento,
) {
  const id =
    texto(
      idEvento,
    );

  if (!id) {
    return null;
  }

  const sheet =
    obterPlanilhaPainel()
      .getSheetByName(
        ABA_EVENTOS,
      );

  if (
    !sheet ||
    sheet.getLastRow() < 2
  ) {
    return null;
  }

  const cache =
    CacheService
      .getScriptCache();

  const key =
    CACHE_EVENT_ROW_PREFIX_AB +
    id;

  const cachedRow =
    Number(
      cache.get(key) ||
      0,
    );

  if (
    cachedRow >= 2 &&
    texto(
      sheet
        .getRange(
          cachedRow,
          1,
        )
        .getValue(),
    ) === id
  ) {
    return {
      row:
        cachedRow,
      evento:
        lerEventoDaLinhaAB_(
          sheet,
          cachedRow,
        ),
    };
  }

  const found =
    sheet
      .getRange(
        2,
        1,
        sheet.getLastRow() - 1,
        1,
      )
      .createTextFinder(
        id,
      )
      .matchEntireCell(true)
      .findNext();

  if (!found) {
    return null;
  }

  const row =
    found.getRow();

  cache.put(
    key,
    String(row),
    600,
  );

  return {
    row,
    evento:
      lerEventoDaLinhaAB_(
        sheet,
        row,
      ),
  };
}

function lerEventoDaLinhaAB_(
  sheet,
  row,
) {
  const values =
    sheet
      .getRange(
        row,
        1,
        1,
        EVENT_HEADERS.length,
      )
      .getValues()[0];

  const evento = {};

  EVENT_HEADERS
    .forEach(
      (header, index) => {
        evento[header] =
          values[index];
      },
    );

  return evento;
}

function calcularResumoEventosAB_(
  eventos,
) {
  const resumo = {
    total:
      (eventos || []).length,
    novos: 0,
    aguardandoRevisao: 0,
    aguardandoCliente: 0,
    posDegustacao: 0,
    finalizados: 0,
    erros: 0,
    hoje: 0,
    atrasados: 0,
  };

  const hoje =
    normalizarDataFront_(
      new Date(),
    );

  (eventos || [])
    .forEach(
      (item) => {
        const status =
          String(
            item.status || '',
          ).toUpperCase();

        if (
          status === 'NOVO'
        ) {
          resumo.novos++;
        }

        if (
          status ===
          'AGUARDANDO_REVISAO'
        ) {
          resumo
            .aguardandoRevisao++;
        }

        if (
          status ===
          'AGUARDANDO_CLIENTE'
        ) {
          resumo
            .aguardandoCliente++;
        }

        if (
          [
            'RELATORIO_GERADO',
            'AGUARDANDO_POS_DEGUSTACAO',
          ].includes(status)
        ) {
          resumo.posDegustacao++;
        }

        if (
          status ===
          'MENU_FINAL_E_OS_GERADOS'
        ) {
          resumo.finalizados++;
        }

        if (
          status === 'ERRO'
        ) {
          resumo.erros++;
        }

        const dataDeg =
          texto(
            item
              .dataDegustacaoRaw,
          );

        if (
          dataDeg &&
          dataDeg === hoje
        ) {
          resumo.hoje++;
        }

        if (
          dataDeg &&
          dataDeg < hoje &&
          ![
            'MENU_FINAL_E_OS_GERADOS',
            'ARQUIVADO',
          ].includes(status)
        ) {
          resumo.atrasados++;
        }
      },
    );

  return resumo;
}

function filtrarEventosPainelAB_(
  eventos,
  filtros,
) {
  filtros =
    filtros || {};

  return (eventos || [])
    .filter(
      (item) =>
        aplicarFiltrosFrontAB_(
          item,
          filtros,
        ),
    )
    .sort(
      (a, b) =>
        ordenarEventosFrontAB_(
          a,
          b,
        ),
    );
}

function listarResponsaveisDeEventosAB_(
  eventos,
) {
  return [
    ...new Set(
      (eventos || [])
        .map(
          (item) =>
            String(
              item.respProducao ||
              '',
            ).trim(),
        )
        .filter(Boolean),
    ),
  ].sort();
}

function listarStatusDeEventosAB_(
  eventos,
) {
  return [
    ...new Set(
      (eventos || [])
        .map(
          (item) =>
            String(
              item.status ||
              '',
            ).trim(),
        )
        .filter(Boolean),
    ),
  ].sort();
}

/* =========================================================
 * ADITIVOS V23.2 — ANÁLISE, APLICAÇÃO E RASTREABILIDADE
 * ========================================================= */

function garantirInfraAditivosFrontAB_() {
  const ss =
    obterPlanilhaPainel();

  let sheet =
    ss.getSheetByName(
      ABA_ADITIVO_WORKFLOW,
    );

  if (!sheet) {
    sheet =
      ss.insertSheet(
        ABA_ADITIVO_WORKFLOW,
      );

    sheet
      .getRange(
        1,
        1,
        1,
        ADITIVO_WORKFLOW_HEADERS.length,
      )
      .setValues([
        ADITIVO_WORKFLOW_HEADERS,
      ])
      .setFontWeight(
        'bold',
      )
      .setBackground(
        '#5A0B16',
      )
      .setFontColor(
        '#FFFFFF',
      )
      .setWrap(
        true,
      );

    sheet.setFrozenRows(
      1,
    );

    return sheet;
  }

  /*
   * Não chama autoResize nem reescreve a aba em toda abertura.
   * Isso evita transformar o healthcheck em uma operação lenta.
   */
  const atuais =
    sheet
      .getRange(
        1,
        1,
        1,
        Math.max(
          sheet.getLastColumn(),
          ADITIVO_WORKFLOW_HEADERS.length,
        ),
      )
      .getValues()[0]
      .slice(
        0,
        ADITIVO_WORKFLOW_HEADERS.length,
      );

  const precisaAtualizar =
    ADITIVO_WORKFLOW_HEADERS
      .some(
        (header, index) =>
          texto(
            atuais[index],
          ) !== header,
      );

  if (precisaAtualizar) {
    sheet
      .getRange(
        1,
        1,
        1,
        ADITIVO_WORKFLOW_HEADERS.length,
      )
      .setValues([
        ADITIVO_WORKFLOW_HEADERS,
      ])
      .setFontWeight(
        'bold',
      )
      .setBackground(
        '#5A0B16',
      )
      .setFontColor(
        '#FFFFFF',
      )
      .setWrap(
        true,
      );
  }

  sheet.setFrozenRows(
    1,
  );

  return sheet;
}

function apiObterAditivosEventoAB(
  idEvento,
) {
  garantirInfraAditivosFrontAB_();

  const info =
    buscarEventoRapidoAB_(
      idEvento,
    );

  if (!info) {
    throw new Error(
      `Evento ${idEvento} não encontrado.`,
    );
  }

  const aplicados =
    lerLinhasPorEvento(
      ABA_ADITIVOS,
      ADITIVOS_HEADERS.length,
      idEvento,
    ).map(
      (row) => ({
        ordem:
          texto(row[1]),
        data:
          texto(row[2]),
        arquivo:
          texto(row[3]),
        referenciaContrato:
          texto(row[4]),
        tipoAlteracao:
          texto(row[5]),
        efeitoMenu:
          texto(row[6]),
        resumo:
          texto(row[7]),
        valorAdicional:
          texto(row[8]),
      }),
    );

  const workflow =
    lerWorkflowAditivosEventoAB_(
      idEvento,
    );

  return {
    linksAtuais:
      extrairLinksGoogleMultiplos(
        info.evento
          .LINKS_ADITIVOS,
      ),
    aplicados,
    workflow,
    estagioSugerido:
      sugerirEstagioAditivoAB_(
        info.evento,
      ),
  };
}

function obterResumoAditivoEventoAB_(
  idEvento,
) {
  try {
    const workflow =
      lerWorkflowAditivosEventoAB_(
        idEvento,
      );

    if (!workflow.length) {
      return {
        quantidade: 0,
        ultimoStatus: '',
        ultimoEstagio: '',
        ultimoResumo: '',
      };
    }

    const ultimo =
      workflow[0];

    return {
      quantidade:
        workflow.filter(
          (item) =>
            item.status ===
            'APLICADO',
        ).length,
      ultimoStatus:
        ultimo.status,
      ultimoEstagio:
        ultimo.estagio,
      ultimoResumo:
        texto(
          ultimo.analise &&
          ultimo.analise.resumo,
        ),
    };
  } catch (_) {
    return {
      quantidade: 0,
      ultimoStatus: '',
      ultimoEstagio: '',
      ultimoResumo: '',
    };
  }
}

function lerWorkflowAditivosEventoAB_(
  idEvento,
) {
  const sheet =
    garantirInfraAditivosFrontAB_();

  if (
    sheet.getLastRow() < 2
  ) {
    return [];
  }

  const values =
    sheet
      .getRange(
        2,
        1,
        sheet.getLastRow() - 1,
        ADITIVO_WORKFLOW_HEADERS.length,
      )
      .getValues();

  return values
    .map(
      (row, index) => ({
        rawRow:
          index + 2,
        row,
      }))
    .filter(
      (item) =>
        texto(item.row[0]) ===
        idEvento,
    )
    .map(
      (item) => {
        const row =
          item.row;

        return {
        row:
          item.rawRow,
        idEvento:
          texto(row[0]),
        idAditivo:
          texto(row[1]),
        link:
          texto(row[2]),
        fileId:
          texto(row[3]),
        arquivo:
          texto(row[4]),
        estagio:
          texto(row[5]),
        status:
          texto(row[6]),
        analise:
          parseJsonSeguroFrontAB_(
            row[7],
          ),
        impacto:
          parseJsonSeguroFrontAB_(
            row[8],
          ),
        artefatosAnteriores:
          parseJsonSeguroFrontAB_(
            row[9],
          ),
        acaoFluxo:
          texto(row[10]),
        criadoEm:
          formatarDataHoraFront_(
            row[11],
          ),
        aplicadoEm:
          formatarDataHoraFront_(
            row[12],
          ),
        erro:
          texto(row[13]),
        };
      })
    .sort(
      (a, b) =>
        b.row - a.row,
    );
}

function buscarWorkflowAditivoAB_(
  idEvento,
  idAditivo,
) {
  const sheet =
    garantirInfraAditivosFrontAB_();

  if (
    sheet.getLastRow() < 2
  ) {
    return null;
  }

  const values =
    sheet
      .getRange(
        2,
        1,
        sheet.getLastRow() - 1,
        ADITIVO_WORKFLOW_HEADERS.length,
      )
      .getValues();

  for (
    let i = 0;
    i < values.length;
    i++
  ) {
    const row =
      values[i];

    if (
      texto(row[0]) ===
        idEvento &&
      texto(row[1]) ===
        idAditivo
    ) {
      return {
        row:
          i + 2,
        values:
          row,
        registro: {
          idEvento:
            texto(row[0]),
          idAditivo:
            texto(row[1]),
          link:
            texto(row[2]),
          fileId:
            texto(row[3]),
          arquivo:
            texto(row[4]),
          estagio:
            texto(row[5]),
          status:
            texto(row[6]),
          analise:
            parseJsonSeguroFrontAB_(
              row[7],
            ),
          impacto:
            parseJsonSeguroFrontAB_(
              row[8],
            ),
          artefatosAnteriores:
            parseJsonSeguroFrontAB_(
              row[9],
            ),
          acaoFluxo:
            texto(row[10]),
          criadoEm:
            row[11],
          aplicadoEm:
            row[12],
          erro:
            texto(row[13]),
        },
      };
    }
  }

  return null;
}

function atualizarWorkflowAditivoAB_(
  row,
  fields,
) {
  const sheet =
    garantirInfraAditivosFrontAB_();

  const col = {};

  ADITIVO_WORKFLOW_HEADERS
    .forEach(
      (header, index) => {
        col[header] =
          index + 1;
      },
    );

  Object.entries(
    fields || {},
  ).forEach(
    ([key, value]) => {
      if (!col[key]) {
        throw new Error(
          `Campo de workflow de aditivo desconhecido: ${key}`,
        );
      }

      sheet
        .getRange(
          row,
          col[key],
        )
        .setValue(
          value,
        );
    },
  );
}

function sugerirEstagioAditivoAB_(
  evento,
) {
  if (
    texto(
      evento.LINK_OS_DOC,
    ) ||
    texto(
      evento.LINK_OS_PDF,
    ) ||
    texto(
      evento.STATUS,
    ) ===
      'MENU_FINAL_E_OS_GERADOS'
  ) {
    return 'APOS_OS';
  }

  if (
    texto(
      evento.FORM_INTERNO_ID,
    ) ||
    texto(
      evento.LINK_RELATORIO_DOC,
    )
  ) {
    return 'DEPOIS_DEGUSTACAO';
  }

  return 'ANTES_DEGUSTACAO';
}

function validarEstagioAditivoAB_(
  estagio,
) {
  const value =
    texto(
      estagio,
    ).toUpperCase();

  if (
    ![
      'ANTES_DEGUSTACAO',
      'DEPOIS_DEGUSTACAO',
      'APOS_OS',
    ].includes(value)
  ) {
    throw new Error(
      'Selecione quando o aditivo foi recebido: antes da degustação, depois da degustação ou após a OS.',
    );
  }

  return value;
}

function apiAnalisarAditivoAB(
  idEvento,
  linkAditivo,
  estagio,
  token,
) {
  const inicio =
    Date.now();

  const etapa =
    validarEstagioAditivoAB_(
      estagio,
    );

  const info =
    buscarEventoRapidoAB_(
      idEvento,
    );

  if (!info) {
    throw new Error(
      `Evento ${idEvento} não encontrado.`,
    );
  }

  const evento =
    info.evento;

  const fileId =
    extrairIdGoogle(
      linkAditivo,
    );

  const existentes =
    [
      extrairIdGoogle(
        evento.LINK_CONTRATO,
      ),
      ...extrairLinksGoogleMultiplos(
        evento.LINKS_ADITIVOS,
      ).map(
        (link) =>
          extrairIdGoogle(
            link,
          ),
      ),
    ];

  if (
    existentes.includes(
      fileId,
    )
  ) {
    throw new Error(
      'Este documento já está registrado no contrato/aditivos deste evento.',
    );
  }

  setProgressoAB_(
    token,
    8,
    'Validando aditivo',
    'Conferindo arquivo, contrato e estágio informado.',
  );

  const blobNovo =
    obterPdfContrato(
      linkAditivo,
    );

  const arquivo =
    DriveApp
      .getFileById(
        fileId,
      )
      .getName();

  const idAditivo =
    'AD-' +
    Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      'yyyyMMdd-HHmmss',
    ) +
    '-' +
    Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase();

  const sheetWorkflow =
    garantirInfraAditivosFrontAB_();

  const row =
    sheetWorkflow
      .getLastRow() + 1;

  sheetWorkflow
    .getRange(
      row,
      1,
      1,
      ADITIVO_WORKFLOW_HEADERS.length,
    )
    .setValues([[
      idEvento,
      idAditivo,
      texto(
        linkAditivo,
      ),
      fileId,
      arquivo,
      etapa,
      'PROCESSANDO',
      '',
      '',
      '',
      '',
      new Date(),
      '',
      '',
    ]]);

  try {
    setProgressoAB_(
      token,
      22,
      'Lendo histórico contratual',
      'Abrindo contrato base e aditivos já aplicados.',
    );

    const documentos = [
      {
        tipo:
          'CONTRATO_BASE',
        ordem:
          0,
        blob:
          obterPdfContrato(
            evento.LINK_CONTRATO,
          ),
      },
      ...obterAditivosComoPdf(
        evento.LINKS_ADITIVOS,
      ),
    ];

    setProgressoAB_(
      token,
      45,
      'Comparando com o contrato',
      'A IA está identificando exatamente o que o novo aditivo altera, inclui ou remove.',
    );

    const analise =
      analisarNovoAditivoComIA_(
        documentos,
        {
          tipo:
            'NOVO_ADITIVO',
          ordem:
            documentos.length,
          blob:
            blobNovo,
        },
        evento,
        etapa,
      );

    const plano =
      montarPlanoPreliminarAditivoAB_(
        etapa,
        analise,
        evento,
      );

    atualizarWorkflowAditivoAB_(
      row,
      {
        STATUS:
          analise
            .pertence_ao_contrato
            ? 'ANALISADO'
            : 'REJEITADO',
        ANALISE_JSON:
          JSON.stringify(
            analise,
          ),
        ACAO_FLUXO:
          plano.acao,
        ERRO:
          analise
            .pertence_ao_contrato
            ? ''
            : (
              analise
                .inconsistencias ||
              []
            ).join(' | '),
      },
    );

    const segundos =
      Math.max(
        1,
        Math.round(
          (
            Date.now() -
            inicio
          ) /
          1000,
        ),
      );

    registrarDuracaoAcaoAB_(
      'ANALISAR_ADITIVO',
      segundos,
    );

    setProgressoAB_(
      token,
      100,
      'Análise concluída',
      analise
        .pertence_ao_contrato
        ? 'O aditivo foi comparado com o contrato. Revise o impacto antes de aplicar.'
        : 'O aditivo não foi aplicado porque a IA não confirmou vínculo com este contrato.',
    );

    registrarLog(
      analise
        .pertence_ao_contrato
        ? 'INFO'
        : 'AVISO',
      idEvento,
      'ANALISAR_ADITIVO',
      `${arquivo} — ${analise.resumo || ''}`,
    );

    return {
      ok:
        !!analise
          .pertence_ao_contrato,
      idAditivo,
      analise,
      plano,
      duracaoSegundos:
        segundos,
    };
  } catch (error) {
    atualizarWorkflowAditivoAB_(
      row,
      {
        STATUS:
          'ERRO',
        ERRO:
          error.message ||
          String(error),
      },
    );

    setProgressoAB_(
      token,
      100,
      'Erro',
      error.message ||
        String(error),
    );

    throw error;
  }
}

function analisarNovoAditivoComIA_(
  documentosAtuais,
  novoAditivo,
  evento,
  estagio,
) {
  const props =
    PropertiesService
      .getScriptProperties();

  const apiKey =
    props.getProperty(
      'OPENAI_API_KEY',
    );

  const model =
    props.getProperty(
      'OPENAI_MODEL',
    );

  if (
    !apiKey ||
    !model
  ) {
    throw new Error(
      'Configure OPENAI_API_KEY e OPENAI_MODEL nas propriedades do script.',
    );
  }

  const schema = {
    type:
      'object',
    additionalProperties:
      false,
    properties: {
      pertence_ao_contrato: {
        type:
          'boolean',
      },
      confianca: {
        type:
          'string',
        enum: [
          'ALTA',
          'MEDIA',
          'BAIXA',
        ],
      },
      referencia_contrato: {
        type:
          'string',
      },
      resumo: {
        type:
          'string',
      },
      inconsistencias: {
        type:
          'array',
        items: {
          type:
            'string',
        },
      },
      altera_menu: {
        type:
          'boolean',
      },
      altera_valores: {
        type:
          'boolean',
      },
      altera_operacao: {
        type:
          'boolean',
      },
      recomenda_revisao_humana: {
        type:
          'boolean',
      },
      alteracoes: {
        type:
          'array',
        items: {
          type:
            'object',
          additionalProperties:
            false,
          properties: {
            area: {
              type:
                'string',
              enum: [
                'CABECALHO',
                'MENU',
                'TERCEIROS',
                'VALORES',
                'STAFF',
                'SERVICOS',
                'BEBIDAS',
                'OUTROS',
              ],
            },
            acao: {
              type:
                'string',
              enum: [
                'INCLUIR',
                'ALTERAR',
                'SUBSTITUIR',
                'REMOVER',
                'SEM_EFEITO',
              ],
            },
            antes: {
              type:
                'string',
            },
            depois: {
              type:
                'string',
            },
            impacto_fluxo: {
              type:
                'string',
            },
          },
          required: [
            'area',
            'acao',
            'antes',
            'depois',
            'impacto_fluxo',
          ],
        },
      },
    },
    required: [
      'pertence_ao_contrato',
      'confianca',
      'referencia_contrato',
      'resumo',
      'inconsistencias',
      'altera_menu',
      'altera_valores',
      'altera_operacao',
      'recomenda_revisao_humana',
      'alteracoes',
    ],
  };

  const estadoAtual = {
    id_evento:
      texto(
        evento.ID_EVENTO,
      ),
    numero_contrato:
      texto(
        parseJsonSeguroFrontAB_(
          evento.JSON_CABECALHO,
        ).numero_contrato,
      ),
    evento:
      texto(
        parseJsonSeguroFrontAB_(
          evento.JSON_CABECALHO,
        ).evento,
      ),
    contratante:
      texto(
        parseJsonSeguroFrontAB_(
          evento.JSON_CABECALHO,
        ).contratante,
      ),
    estagio_informado:
      estagio,
  };

  const prompt = `
Você é um auditor contratual especializado no fluxo de Alimentos e Bebidas
de eventos.

Você receberá, nesta ordem:
1. CONTRATO BASE;
2. zero ou mais ADITIVOS JÁ APLICADOS;
3. um arquivo identificado como NOVO_ADITIVO.

Sua tarefa nesta etapa é SOMENTE analisar o NOVO_ADITIVO.
NÃO consolide silenciosamente o contrato e NÃO invente alterações.

ESTADO DO EVENTO NO SISTEMA:
${JSON.stringify(estadoAtual)}

REGRAS:
- Primeiro confirme se o NOVO_ADITIVO pertence de fato ao mesmo contrato/evento.
- Compare número de contrato, contratante, evento, local, datas e referências.
- Leve em conta os aditivos anteriores: o NOVO_ADITIVO pode alterar algo
  que já havia sido modificado por um aditivo anterior.
- Liste apenas alterações efetivas trazidas pelo NOVO_ADITIVO.
- Diferencie INCLUIR, ALTERAR, SUBSTITUIR e REMOVER.
- Explique "antes" e "depois" de forma objetiva.
- Marque altera_menu=true para qualquer inclusão/remoção/substituição de
  pratos, categorias, bebidas do Anexo II, serviços de sala, lanche,
  estrutura gastronômica ou itens fixos do cardápio.
- BAR continua fora do fluxo A&B deste sistema.
- Alimentação de staff deve ser classificada como STAFF.
- Mudanças de horário, data, local, pax, montagem ou desmontagem podem
  afetar a operação mesmo sem mudar o menu.
- Mudança apenas financeira deve marcar altera_valores=true, mas não
  necessariamente altera_menu.
- Se houver dúvida de identidade, confiança BAIXA ou MEDIA e explique em
  inconsistencias.
- pertence_ao_contrato=false somente quando o documento realmente não puder
  ser relacionado ao contrato/evento informado.
`;

  const arquivos = [
    ...(documentosAtuais || []),
    novoAditivo,
  ];

  const payload = {
    model,
    store:
      false,
    input: [
      {
        role:
          'user',
        content: [
          {
            type:
              'input_text',
            text:
              prompt,
          },
          ...arquivos.map(
            (documento, index) => ({
              type:
                'input_file',
              filename:
                (
                  index ===
                  arquivos.length - 1
                    ? 'NOVO_ADITIVO - '
                    : (
                      index === 0
                        ? 'CONTRATO_BASE - '
                        : 'ADITIVO_ANTERIOR - '
                    )
                ) +
                documento
                  .blob
                  .getName(),
              file_data:
                `data:application/pdf;base64,${Utilities.base64Encode(
                  documento
                    .blob
                    .getBytes(),
                )}`,
            }),
          ),
        ],
      },
    ],
    text: {
      format: {
        type:
          'json_schema',
        name:
          'analise_novo_aditivo_ab',
        strict:
          true,
        schema,
      },
    },
  };

  const response =
    UrlFetchApp.fetch(
      'https://api.openai.com/v1/responses',
      {
        method:
          'post',
        contentType:
          'application/json',
        headers: {
          Authorization:
            `Bearer ${apiKey}`,
        },
        payload:
          JSON.stringify(
            payload,
          ),
        muteHttpExceptions:
          true,
      },
    );

  const status =
    response
      .getResponseCode();

  const body =
    response
      .getContentText();

  if (
    status >= 300
  ) {
    throw new Error(
      `Erro OpenAI ${status}: ${body}`,
    );
  }

  const json =
    JSON.parse(
      body,
    );

  const outputText =
    obterOutputText(
      json,
    );

  if (!outputText) {
    throw new Error(
      'A IA não retornou a análise estruturada do aditivo.',
    );
  }

  return JSON.parse(
    outputText,
  );
}

function montarPlanoPreliminarAditivoAB_(
  estagio,
  analise,
  evento,
) {
  const impactaAB =
    !!(
      analise.altera_menu ||
      analise.altera_operacao
    );

  if (!impactaAB) {
    return {
      acao:
        'ATUALIZAR_CONTRATO_SEM_INVALIDAR_FLUXO',
      descricao:
        'O aditivo será consolidado no contrato, mas o fluxo operacional atual pode ser preservado.',
    };
  }

  if (
    estagio ===
    'ANTES_DEGUSTACAO'
  ) {
    return {
      acao:
        'REVISAR_E_REGERAR_PRE_DEGUSTACAO',
      descricao:
        'Após aplicar: revisar nova extração e regenerar Escolha/Form Cliente. Artefatos antigos ficam preservados apenas para auditoria.',
    };
  }

  if (
    estagio ===
    'DEPOIS_DEGUSTACAO'
  ) {
    return {
      acao:
        'REVALIDAR_POS_DEGUSTACAO',
      descricao:
        'Relatório e escolhas anteriores são preservados como histórico. Será criado um novo Form Interno com o contrato atualizado.',
    };
  }

  return {
    acao:
      'REVISAR_POS_OS_E_REGERAR_FINAL',
    descricao:
      'OS/Menu Final anteriores serão preservados como histórico. Será criado um novo Form Interno para gerar uma revisão atualizada.',
  };
}

function apiAplicarAditivoAB(
  idEvento,
  idAditivo,
  token,
) {
  const inicio =
    Date.now();

  const lock =
    LockService
      .getUserLock();

  if (
    !lock.tryLock(
      30000,
    )
  ) {
    throw new Error(
      'Existe outro processamento em andamento. Aguarde alguns segundos.',
    );
  }

  try {
    const workflow =
      buscarWorkflowAditivoAB_(
        idEvento,
        idAditivo,
      );

    if (!workflow) {
      throw new Error(
        'Análise do aditivo não encontrada.',
      );
    }

    const reg =
      workflow.registro;

    if (
      ![
        'ANALISADO',
        'ERRO_APLICACAO',
      ].includes(
        reg.status,
      )
    ) {
      throw new Error(
        `Este aditivo está com status ${reg.status}. Somente análises válidas ou aplicações com erro podem ser retomadas.`,
      );
    }

    if (
      !reg.analise ||
      !reg.analise
        .pertence_ao_contrato
    ) {
      throw new Error(
        'O aditivo não foi confirmado como pertencente a este contrato.',
      );
    }

    const info =
      buscarEventoRapidoAB_(
        idEvento,
      );

    if (!info) {
      throw new Error(
        `Evento ${idEvento} não encontrado.`,
      );
    }

    const eventoAntes =
      info.evento;

    validarEstagioContraEstadoAB_(
      reg.estagio,
      eventoAntes,
    );

    const snapshotAntes =
      capturarSnapshotContratualAB_(
        idEvento,
      );

    const artefatosAntes =
      capturarArtefatosEventoAB_(
        eventoAntes,
      );

    setProgressoAB_(
      token,
      8,
      'Preparando consolidação',
      'O estado atual foi preservado para auditoria antes de aplicar o aditivo.',
    );

    const linksAtuais =
      extrairLinksGoogleMultiplos(
        eventoAntes
          .LINKS_ADITIVOS,
      );

    const novosLinks =
      deduplicarLinksAditivosAB_(
        [
          ...linksAtuais,
          reg.link,
        ],
      );

    setProgressoAB_(
      token,
      22,
      'Lendo contrato completo',
      'Abrindo contrato base, aditivos anteriores e o novo aditivo.',
    );

    const documentos = [
      {
        tipo:
          'CONTRATO_BASE',
        ordem:
          0,
        blob:
          obterPdfContrato(
            eventoAntes
              .LINK_CONTRATO,
          ),
      },
      ...obterAditivosComoPdf(
        novosLinks.join('\n'),
      ),
    ];

    setProgressoAB_(
      token,
      42,
      'Consolidando com IA',
      'Recalculando o estado contratual final com a precedência de todos os aditivos.',
    );

    const extraido =
      extrairContratoComIA(
        documentos,
      );

    const normalizado =
      normalizarExtracao(
        extraido,
      );

    const snapshotDepois =
      snapshotDeNormalizadoAB_(
        normalizado,
      );

    setProgressoAB_(
      token,
      66,
      'Comparando antes e depois',
      'Identificando exatamente quais informações mudaram no A&B.',
    );

    const impacto =
      compararEstadosContratuaisAB_(
        snapshotAntes,
        snapshotDepois,
      );

    const plano =
      montarPlanoFinalAditivoAB_(
        reg.estagio,
        impacto,
        eventoAntes,
      );

    /*
     * Só agora, após todas as leituras/IA/diff terem funcionado,
     * substituímos o estado consolidado. Assim uma falha anterior
     * não deixa o evento parcialmente alterado.
     */
    setProgressoAB_(
      token,
      76,
      'Aplicando estado contratual',
      'Atualizando cabeçalho, cardápio, terceiros, aditivos e valores.',
    );

    limparDadosEvento(
      idEvento,
    );

    gravarMenu(
      idEvento,
      normalizado.menu,
    );

    gravarTerceiros(
      idEvento,
      normalizado.terceiros,
    );

    gravarAditivosAplicados(
      idEvento,
      normalizado.aditivos,
    );

    const avisos =
      [
        ...(normalizado
          .avisos || []),
        `ADITIVO ${reg.arquivo} aplicado em ${rotuloEstagioAditivoAB_(reg.estagio)}.`,
        plano.mensagem,
      ].filter(Boolean);

    atualizarEvento(
      obterPlanilhaPainel()
        .getSheetByName(
          ABA_EVENTOS,
        ),
      info.row,
      {
        LINKS_ADITIVOS:
          novosLinks.join('\n'),
        JSON_CABECALHO:
          JSON.stringify(
            normalizado.cabecalho,
          ),
        JSON_FIXOS:
          JSON.stringify(
            normalizado.fixos,
          ),
        JSON_ADITIVOS:
          JSON.stringify(
            {
              ...normalizado.aditivos,
              workflow_ultimo_aditivo: {
                id:
                  reg.idAditivo,
                arquivo:
                  reg.arquivo,
                estagio:
                  reg.estagio,
                aplicado_em:
                  new Date()
                    .toISOString(),
                impacto,
                plano,
              },
            },
          ),
        VALOR_ADITIVOS:
          normalizado
            .aditivos
            .valor_total_aditivos ||
          0,
        VALOR_TOTAL_CONSOLIDADO:
          normalizado
            .aditivos
            .valor_total_consolidado ||
          0,
        AVISOS_REVISAO:
          avisos.join('\n'),
        PROCESSADO_EM:
          new Date(),
        ERRO:
          '',
      },
    );

    setProgressoAB_(
      token,
      86,
      'Atualizando o fluxo',
      plano.mensagem,
    );

    aplicarPlanoFluxoAditivoAB_(
      idEvento,
      reg.estagio,
      impacto,
      artefatosAntes,
      token,
    );

    atualizarWorkflowAditivoAB_(
      workflow.row,
      {
        STATUS:
          'APLICADO',
        IMPACTO_JSON:
          JSON.stringify(
            {
              diff:
                impacto,
              plano,
            },
          ),
        ARTEFATOS_ANTERIORES_JSON:
          JSON.stringify(
            artefatosAntes,
          ),
        ACAO_FLUXO:
          plano.acao,
        APLICADO_EM:
          new Date(),
        ERRO:
          '',
      },
    );

    invalidarCacheEventosAB_(
      idEvento,
    );

    const segundos =
      Math.max(
        1,
        Math.round(
          (
            Date.now() -
            inicio
          ) /
          1000,
        ),
      );

    registrarDuracaoAcaoAB_(
      'APLICAR_ADITIVO',
      segundos,
    );

    registrarLog(
      'INFO',
      idEvento,
      'APLICAR_ADITIVO',
      `${reg.arquivo} aplicado em ${rotuloEstagioAditivoAB_(reg.estagio)}. ${plano.mensagem}`,
    );

    setProgressoAB_(
      token,
      100,
      'Aditivo aplicado',
      plano.proximoPasso,
    );

    return {
      ok: true,
      impacto,
      plano,
      evento:
        apiBuscarEventoDetalheAB(
          idEvento,
        ),
      duracaoSegundos:
        segundos,
    };
  } catch (error) {
    const workflow =
      buscarWorkflowAditivoAB_(
        idEvento,
        idAditivo,
      );

    if (workflow) {
      atualizarWorkflowAditivoAB_(
        workflow.row,
        {
          STATUS:
            workflow
              .registro
              .status ===
              'APLICADO'
              ? 'APLICADO'
              : 'ERRO_APLICACAO',
          ERRO:
            error.message ||
            String(error),
        },
      );
    }

    setProgressoAB_(
      token,
      100,
      'Erro',
      error.message ||
        String(error),
    );

    registrarLog(
      'ERRO',
      idEvento,
      'APLICAR_ADITIVO',
      error.stack ||
        error.message ||
        String(error),
    );

    throw error;
  } finally {
    lock.releaseLock();
  }
}

function validarEstagioContraEstadoAB_(
  estagio,
  evento,
) {
  if (
    estagio ===
      'DEPOIS_DEGUSTACAO' &&
    !texto(
      evento.FORM_CLIENTE_ID,
    )
  ) {
    throw new Error(
      'Para aplicar como "Depois da degustação", o evento precisa ter o Form Cliente criado. Se o aditivo chegou antes dessa etapa, selecione "Antes da degustação".',
    );
  }

  if (
    estagio ===
      'APOS_OS' &&
    !(
      texto(
        evento.LINK_OS_DOC,
      ) ||
      texto(
        evento.LINK_OS_PDF,
      )
    )
  ) {
    throw new Error(
      'Para aplicar como "Após OS", o evento precisa possuir uma OS gerada.',
    );
  }
}

function capturarSnapshotContratualAB_(
  idEvento,
) {
  const info =
    buscarEventoRapidoAB_(
      idEvento,
    );

  const menuRows =
    lerLinhasPorEvento(
      ABA_MENU,
      MENU_HEADERS.length,
      idEvento,
    );

  const terceirosRows =
    lerLinhasPorEvento(
      ABA_TERCEIROS,
      TERCEIROS_HEADERS.length,
      idEvento,
    );

  const aditivos =
    parseJsonSeguroFrontAB_(
      info.evento
        .JSON_ADITIVOS,
    );

  return {
    cabecalho:
      parseJsonSeguroFrontAB_(
        info.evento
          .JSON_CABECALHO,
      ),
    menu:
      menuRows.map(
        (row) => ({
          grupo:
            texto(row[1]),
          categoria:
            texto(row[2]),
          item:
            texto(row[3]),
          qtdDegustacao:
            Number(row[4]) ||
            0,
          qtdFinal:
            Number(row[5]) ||
            0,
          tipo:
            texto(row[6]),
        }),
      ),
    terceiros:
      terceirosRows.map(
        (row) => ({
          tipo:
            texto(row[1]),
          categoria:
            texto(row[2]),
          item:
            texto(row[3]),
        }),
      ),
    staff:
      aditivos
        .alimentacao_staff ||
      {},
    valores: {
      total:
        Number(
          info.evento
            .VALOR_TOTAL_CONSOLIDADO ||
          0,
        ),
      aditivos:
        Number(
          info.evento
            .VALOR_ADITIVOS ||
          0,
        ),
    },
  };
}

function snapshotDeNormalizadoAB_(
  normalizado,
) {
  return {
    cabecalho:
      normalizado.cabecalho ||
      {},
    menu:
      (normalizado.menu || [])
        .map(
          (item) => ({
            grupo:
              texto(
                item.grupo,
              ),
            categoria:
              texto(
                item.categoria,
              ),
            item:
              texto(
                item.item,
              ),
            qtdDegustacao:
              Number(
                item
                  .qtdDegustacao ||
                0,
              ),
            qtdFinal:
              Number(
                item.qtdFinal ||
                0,
              ),
            tipo:
              texto(
                item.tipo,
              ),
          }),
        ),
    terceiros:
      (normalizado.terceiros || [])
        .map(
          (item) => ({
            tipo:
              texto(
                item.tipo,
              ),
            categoria:
              texto(
                item.categoria,
              ),
            item:
              texto(
                item.item,
              ),
          }),
        ),
    staff:
      normalizado
        .aditivos
        .alimentacao_staff ||
      {},
    valores: {
      total:
        Number(
          normalizado
            .aditivos
            .valor_total_consolidado ||
          0,
        ),
      aditivos:
        Number(
          normalizado
            .aditivos
            .valor_total_aditivos ||
          0,
        ),
    },
  };
}

function compararEstadosContratuaisAB_(
  antes,
  depois,
) {
  const cabecalhoAlterado = [];

  const keys =
    new Set([
      ...Object.keys(
        antes.cabecalho ||
        {},
      ),
      ...Object.keys(
        depois.cabecalho ||
        {},
      ),
    ]);

  keys.forEach(
    (key) => {
      const a =
        texto(
          antes
            .cabecalho[key],
        );
      const d =
        texto(
          depois
            .cabecalho[key],
        );

      if (a !== d) {
        cabecalhoAlterado.push({
          campo:
            key,
          antes:
            a,
          depois:
            d,
        });
      }
    },
  );

  const menuAntes =
    indexarMenuDiffAB_(
      antes.menu,
    );

  const menuDepois =
    indexarMenuDiffAB_(
      depois.menu,
    );

  const menuAdicionados = [];
  const menuRemovidos = [];
  const menuAlterados = [];

  Object.entries(
    menuDepois,
  ).forEach(
    ([key, item]) => {
      if (!menuAntes[key]) {
        menuAdicionados.push(
          item,
        );
      } else if (
        menuAntes[key]
          .qtdDegustacao !==
          item.qtdDegustacao ||
        menuAntes[key]
          .qtdFinal !==
          item.qtdFinal ||
        menuAntes[key]
          .tipo !==
          item.tipo
      ) {
        menuAlterados.push({
          item:
            item.item,
          categoria:
            item.categoria,
          antes:
            menuAntes[key],
          depois:
            item,
        });
      }
    },
  );

  Object.entries(
    menuAntes,
  ).forEach(
    ([key, item]) => {
      if (!menuDepois[key]) {
        menuRemovidos.push(
          item,
        );
      }
    },
  );

  const terceirosAntes =
    indexarTerceirosDiffAB_(
      antes.terceiros,
    );

  const terceirosDepois =
    indexarTerceirosDiffAB_(
      depois.terceiros,
    );

  const terceirosAdicionados =
    Object.entries(
      terceirosDepois,
    )
      .filter(
        ([key]) =>
          !terceirosAntes[key],
      )
      .map(
        ([, item]) => item,
      );

  const terceirosRemovidos =
    Object.entries(
      terceirosAntes,
    )
      .filter(
        ([key]) =>
          !terceirosDepois[key],
      )
      .map(
        ([, item]) => item,
      );

  const staffAlterado =
    JSON.stringify(
      antes.staff || {},
    ) !==
    JSON.stringify(
      depois.staff || {},
    );

  const valoresAlterados =
    Number(
      antes.valores &&
      antes.valores.total ||
      0,
    ) !==
      Number(
        depois.valores &&
        depois.valores.total ||
        0,
      ) ||
    Number(
      antes.valores &&
      antes.valores.aditivos ||
      0,
    ) !==
      Number(
        depois.valores &&
        depois.valores.aditivos ||
        0,
      );

  const camposOperacionais = [
    'evento',
    'local',
    'data_evento',
    'horario',
    'numero_convidados',
    'montagem',
    'desmontagem',
    'data_limite_menu',
  ];

  const cabecalhoOperacional =
    cabecalhoAlterado.some(
      (item) =>
        camposOperacionais
          .includes(
            item.campo,
          ),
    );

  const impactaFluxoAB =
    menuAdicionados.length > 0 ||
    menuRemovidos.length > 0 ||
    menuAlterados.length > 0 ||
    terceirosAdicionados.length > 0 ||
    terceirosRemovidos.length > 0 ||
    staffAlterado ||
    cabecalhoOperacional;

  return {
    impactaFluxoAB,
    cabecalhoAlterado,
    menuAdicionados,
    menuRemovidos,
    menuAlterados,
    terceirosAdicionados,
    terceirosRemovidos,
    staffAlterado,
    valoresAlterados,
    valoresAntes:
      antes.valores || {},
    valoresDepois:
      depois.valores || {},
  };
}

function indexarMenuDiffAB_(
  items,
) {
  const out = {};

  (items || [])
    .forEach(
      (item) => {
        const key =
          normalizarChaveDiffAB_(
            [
              item.grupo,
              item.categoria,
              item.item,
            ].join('|'),
          );

        out[key] =
          item;
      },
    );

  return out;
}

function indexarTerceirosDiffAB_(
  items,
) {
  const out = {};

  (items || [])
    .forEach(
      (item) => {
        const key =
          normalizarChaveDiffAB_(
            [
              item.tipo,
              item.categoria,
              item.item,
            ].join('|'),
          );

        out[key] =
          item;
      },
    );

  return out;
}

function normalizarChaveDiffAB_(
  value,
) {
  return removerAcentos(
    texto(value),
  )
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function capturarArtefatosEventoAB_(
  evento,
) {
  return {
    escolhaDoc:
      texto(
        evento.LINK_ESCOLHA_DOC,
      ),
    escolhaPdf:
      texto(
        evento.LINK_ESCOLHA_PDF,
      ),
    formCliente:
      texto(
        evento.LINK_FORM_CLIENTE,
      ),
    formClienteId:
      texto(
        evento.FORM_CLIENTE_ID,
      ),
    relatorioDoc:
      texto(
        evento.LINK_RELATORIO_DOC,
      ),
    relatorioPdf:
      texto(
        evento.LINK_RELATORIO_PDF,
      ),
    formInterno:
      texto(
        evento.LINK_FORM_INTERNO,
      ),
    formInternoId:
      texto(
        evento.FORM_INTERNO_ID,
      ),
    menuFinalDoc:
      texto(
        evento.LINK_MENU_FINAL_DOC,
      ),
    menuFinalPdf:
      texto(
        evento.LINK_MENU_FINAL_PDF,
      ),
    osDoc:
      texto(
        evento.LINK_OS_DOC,
      ),
    osPdf:
      texto(
        evento.LINK_OS_PDF,
      ),
  };
}

function montarPlanoFinalAditivoAB_(
  estagio,
  impacto,
  evento,
) {
  if (
    !impacto
      .impactaFluxoAB
  ) {
    return {
      acao:
        'CONSOLIDADO_SEM_INVALIDACAO',
      mensagem:
        'O aditivo foi incorporado ao contrato consolidado. Não foi detectada alteração estrutural de A&B que exija refazer formulários/documentos operacionais.',
      proximoPasso:
        'Confira o resumo do aditivo. O fluxo atual foi mantido.',
    };
  }

  if (
    estagio ===
      'ANTES_DEGUSTACAO'
  ) {
    return {
      acao:
        'REGERAR_PRE_DEGUSTACAO',
      mensagem:
        'O aditivo altera o A&B antes da degustação. Escolha de Menu, Form Cliente e etapas posteriores serão invalidados como versão atual.',
      proximoPasso:
        'Revise a nova extração e clique em Aprovar extração e gerar Form.',
    };
  }

  if (
    estagio ===
      'DEPOIS_DEGUSTACAO'
  ) {
    return {
      acao:
        'NOVO_FORM_INTERNO_POS_ADITIVO',
      mensagem:
        'O aditivo altera o A&B após a degustação. A degustação e o relatório ficam preservados como histórico; a Produção deverá validar um novo Form Interno.',
      proximoPasso:
        'Abra o novo Form Interno, revise as alterações e depois gere Menu Final + OS.',
    };
  }

  return {
    acao:
      'REVISAO_POS_OS',
    mensagem:
      'O aditivo altera o A&B após uma OS já gerada. A OS/Menu Final anteriores ficam preservados como histórico e uma nova revisão operacional será exigida.',
    proximoPasso:
      'Preencha o novo Form Interno e gere uma nova versão de Menu Final + OS.',
  };
}

function aplicarPlanoFluxoAditivoAB_(
  idEvento,
  estagio,
  impacto,
  artefatosAntes,
  token,
) {
  if (
    !impacto
      .impactaFluxoAB
  ) {
    return;
  }

  if (
    estagio ===
      'ANTES_DEGUSTACAO'
  ) {
    setProgressoAB_(
      token,
      90,
      'Invalidando versões anteriores',
      'Fechando formulários antigos e preparando uma nova revisão antes da degustação.',
    );

    arquivarFormularioAditivoSeguroAB_(
      artefatosAntes
        .formClienteId,
      idEvento,
      'FORM_CLIENTE',
    );

    arquivarFormularioAditivoSeguroAB_(
      artefatosAntes
        .formInternoId,
      idEvento,
      'FORM_INTERNO',
    );

    atualizarEventoPorId(
      idEvento,
      {
        STATUS:
          'AGUARDANDO_REVISAO',
        LINK_ESCOLHA_DOC:
          '',
        LINK_ESCOLHA_PDF:
          '',
        LINK_FORM_CLIENTE:
          '',
        FORM_CLIENTE_ID:
          '',
        LINK_RELATORIO_DOC:
          '',
        LINK_RELATORIO_PDF:
          '',
        LINK_FORM_INTERNO:
          '',
        FORM_INTERNO_ID:
          '',
        LINK_MENU_FINAL_DOC:
          '',
        LINK_MENU_FINAL_PDF:
          '',
        LINK_OS_DOC:
          '',
        LINK_OS_PDF:
          '',
        ERRO:
          '',
      },
    );

    return;
  }

  /*
   * Após degustação ou após OS:
   * primeiro criamos o novo Form Interno. Só depois de ele existir
   * retiramos Menu Final/OS anteriores da posição de "versão atual".
   * Assim uma falha na criação do novo formulário não apaga os links vigentes.
   */
  setProgressoAB_(
    token,
    90,
    'Criando revisão operacional',
    'Gerando um novo Form Interno com o contrato consolidado após o aditivo.',
  );

  recriarFormInternoPorIdAB_(
    idEvento,
    null,
  );

  atualizarEventoPorId(
    idEvento,
    {
      STATUS:
        'AGUARDANDO_POS_DEGUSTACAO',
      LINK_MENU_FINAL_DOC:
        '',
      LINK_MENU_FINAL_PDF:
        '',
      LINK_OS_DOC:
        '',
      LINK_OS_PDF:
        '',
      ERRO:
        '',
    },
  );
}

function arquivarFormularioAditivoSeguroAB_(
  formId,
  idEvento,
  tipo,
) {
  if (!formId) {
    return;
  }

  try {
    arquivarFormularioEscalavel(
      formId,
      true,
    );
  } catch (error) {
    registrarLog(
      'AVISO',
      idEvento,
      'ADITIVO_ARQUIVAR_FORM',
      `${tipo}: não foi possível arquivar o formulário anterior ${formId}: ${error.message || error}`,
    );
  }
}


function deduplicarLinksAditivosAB_(
  links,
) {
  const ids =
    new Set();

  const result = [];

  (links || [])
    .forEach(
      (link) => {
        try {
          const id =
            extrairIdGoogle(
              link,
            );

          if (!ids.has(id)) {
            ids.add(id);
            result.push(
              link,
            );
          }
        } catch (_) {
          // Link inválido já teria sido rejeitado na análise.
        }
      },
    );

  return result;
}

function rotuloEstagioAditivoAB_(
  estagio,
) {
  return {
    ANTES_DEGUSTACAO:
      'antes da degustação',
    DEPOIS_DEGUSTACAO:
      'depois da degustação',
    APOS_OS:
      'após a OS',
  }[estagio] ||
  estagio;
}


/* =========================================================
 * HELPERS FRONT
 * ========================================================= */

function lerEventosPainelAB_() {
  const cache =
    CacheService
      .getScriptCache();

  const cached =
    cache.get(
      CACHE_EVENT_LIST_AB,
    );

  if (cached) {
    try {
      return JSON.parse(
        cached,
      );
    } catch (_) {
      // Refaz a leitura.
    }
  }

  const sheet =
    obterPlanilhaPainel()
      .getSheetByName(
        ABA_EVENTOS,
      );

  if (
    !sheet ||
    sheet.getLastRow() < 2
  ) {
    return [];
  }

  const total =
    sheet.getLastRow() - 1;

  /*
   * Para a lista lateral não carregamos as ~30 colunas do EVENTOS.
   * Lemos apenas A:I + JSON_CABECALHO.
   */
  const base =
    sheet
      .getRange(
        2,
        1,
        total,
        9,
      )
      .getValues();

  const cabecalhos =
    sheet
      .getRange(
        2,
        EVENT_COL.JSON_CABECALHO,
        total,
        1,
      )
      .getValues();

  const items =
    base
      .map(
        (row, index) => {
          const idEvento =
            texto(
              row[0],
            );

          const linkContrato =
            texto(
              row[1],
            );

          if (
            !idEvento &&
            !linkContrato
          ) {
            return null;
          }

          const cab =
            parseJsonSeguroFrontAB_(
              cabecalhos[index][0],
            );

          return {
            row:
              index + 2,
            idEvento,
            nomeEvento:
              texto(
                cab.evento,
              ) ||
              idEvento,
            contratante:
              texto(
                cab.contratante,
              ),
            local:
              texto(
                cab.local,
              ) ||
              texto(
                row[6],
              ),
            respProducao:
              texto(
                row[3],
              ),
            dataDegustacao:
              formatarDataFront_(
                row[4],
              ),
            dataDegustacaoRaw:
              formatarDataInputFront_(
                row[4],
              ),
            horarioDegustacao:
              texto(
                row[5],
              ),
            paxDegustacao:
              texto(
                row[7],
              ),
            status:
              texto(
                row[8],
              ),
          };
        },
      )
      .filter(Boolean);

  try {
    const payload =
      JSON.stringify(
        items,
      );

    if (
      payload.length <
      90000
    ) {
      cache.put(
        CACHE_EVENT_LIST_AB,
        payload,
        20,
      );
    }
  } catch (_) {
    // Cache é otimização, não requisito.
  }

  return items;
}

function mapearEventoFrontAB_(
  row,
  evento,
) {
  const cabecalho =
    parseJsonSeguroFrontAB_(
      evento.JSON_CABECALHO,
    );

  return {
    row,
    idEvento:
      texto(
        evento.ID_EVENTO,
      ),
    nomeEvento:
      texto(
        cabecalho.evento,
      ) ||
      texto(evento.EVENTO) ||
      texto(
        evento.ID_EVENTO,
      ),
    contratante:
      texto(
        cabecalho.contratante,
      ),
    local:
      texto(
        cabecalho.local,
      ) ||
      texto(
        evento.LOCAL_DEGUSTACAO,
      ),
    respProducao:
      texto(
        evento.RESP_PRODUCAO,
      ),
    dataDegustacao:
      formatarDataFront_(
        evento.DATA_DEGUSTACAO,
      ),
    dataDegustacaoRaw:
      formatarDataInputFront_(
        evento.DATA_DEGUSTACAO,
      ),
    horarioDegustacao:
      texto(
        evento.HORARIO_DEGUSTACAO,
      ),
    paxDegustacao:
      texto(
        evento.PAX_DEGUSTACAO,
      ),
    status:
      texto(
        evento.STATUS,
      ),
    linkContrato:
      texto(
        evento.LINK_CONTRATO,
      ),
    linkPastaEvento:
      texto(
        evento.LINK_PASTA_EVENTO,
      ),
    linkEscolhaDoc:
      texto(
        evento.LINK_ESCOLHA_DOC,
      ),
    linkEscolhaPdf:
      texto(
        evento.LINK_ESCOLHA_PDF,
      ),
    linkFormCliente:
      texto(
        evento.LINK_FORM_CLIENTE,
      ),
    linkRelatorioDoc:
      texto(
        evento.LINK_RELATORIO_DOC,
      ),
    linkRelatorioPdf:
      texto(
        evento.LINK_RELATORIO_PDF,
      ),
    linkFormInterno:
      texto(
        evento.LINK_FORM_INTERNO,
      ),
    linkMenuFinalDoc:
      texto(
        evento.LINK_MENU_FINAL_DOC,
      ),
    linkMenuFinalPdf:
      texto(
        evento.LINK_MENU_FINAL_PDF,
      ),
    linkOsDoc:
      texto(
        evento.LINK_OS_DOC,
      ),
    linkOsPdf:
      texto(
        evento.LINK_OS_PDF,
      ),
    avisos:
      texto(
        evento.AVISOS_REVISAO,
      ),
    erro:
      texto(
        evento.ERRO,
      ),
    processadoEm:
      formatarDataHoraFront_(
        evento.PROCESSADO_EM,
      ),
    formClienteId:
      texto(
        evento.FORM_CLIENTE_ID,
      ),
    formInternoId:
      texto(
        evento.FORM_INTERNO_ID,
      ),
    possuiErro:
      !!texto(
        evento.ERRO,
      ),
    possuiAviso:
      !!texto(
        evento.AVISOS_REVISAO,
      ),
    linkLinhaPlanilha:
      gerarLinkLinhaEventoAB_(
        row,
      ),
  };
}

function aplicarFiltrosFrontAB_(
  item,
  filtros,
) {
  const busca =
    String(
      filtros.busca || '',
    )
      .trim()
      .toLowerCase();

  const status =
    String(
      filtros.status || '',
    ).trim();

  const responsavel =
    String(
      filtros.responsavel || '',
    ).trim();

  if (busca) {
    const alvo = [
      item.idEvento,
      item.nomeEvento,
      item.contratante,
      item.local,
      item.respProducao,
      item.status,
    ]
      .join(' ')
      .toLowerCase();

    if (
      !alvo.includes(
        busca,
      )
    ) {
      return false;
    }
  }

  if (
    status &&
    item.status !== status
  ) {
    return false;
  }

  if (
    responsavel &&
    item.respProducao !==
      responsavel
  ) {
    return false;
  }

  if (
    filtros.somenteAbertos &&
    [
      'MENU_FINAL_E_OS_GERADOS',
      'ARQUIVADO',
    ].includes(
      String(
        item.status || '',
      ).toUpperCase(),
    )
  ) {
    return false;
  }

  return true;
}

function ordenarEventosFrontAB_(
  a,
  b,
) {
  const da =
    a.dataDegustacaoRaw || '';

  const db =
    b.dataDegustacaoRaw || '';

  if (
    da &&
    db &&
    da !== db
  ) {
    return da > db
      ? 1
      : -1;
  }

  return (
    a.idEvento || ''
  ).localeCompare(
    b.idEvento || '',
  );
}

function validarNovoEventoFrontAB_(
  payload,
) {
  const faltantes = [];

  [
    [
      'linkContrato',
      'Link do contrato',
    ],
    [
      'linkPastaEvento',
      'Link da pasta do evento',
    ],
    [
      'respProducao',
      'Responsável de produção',
    ],
    [
      'dataDegustacao',
      'Data da degustação',
    ],
    [
      'horarioDegustacao',
      'Horário da degustação',
    ],
    [
      'localDegustacao',
      'Local da degustação',
    ],
    [
      'paxDegustacao',
      'Pax da degustação',
    ],
  ].forEach(
    ([key, label]) => {
      if (
        !texto(
          payload[key],
        )
      ) {
        faltantes.push(
          label,
        );
      }
    },
  );

  if (faltantes.length) {
    throw new Error(
      'Preencha antes de criar o evento: ' +
      faltantes.join(', ') +
      '.',
    );
  }

  if (
    !extrairIdGoogle(
      payload.linkContrato,
    )
  ) {
    throw new Error(
      'O link do contrato não parece ser um link válido do Google Drive.',
    );
  }

  if (
    !extrairIdGoogle(
      payload.linkPastaEvento,
    )
  ) {
    throw new Error(
      'O link da pasta do evento não parece ser um link válido do Google Drive.',
    );
  }
}

function gerarIdEventoFrontAB_() {
  return (
    'AB-' +
    Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      'yyyyMMdd-HHmmss',
    )
  );
}

function parseJsonSeguroFrontAB_(
  value,
) {
  try {
    return value
      ? JSON.parse(value)
      : {};
  } catch (_) {
    return {};
  }
}

function serializarObjetoFrontAB_(
  obj,
) {
  const result = {};

  Object.entries(
    obj || {},
  ).forEach(
    ([key, value]) => {
      if (
        value instanceof Date
      ) {
        result[key] =
          formatarDataFront_(
            value,
          );
      } else if (
        value &&
        typeof value ===
          'object'
      ) {
        result[key] =
          JSON.stringify(
            value,
          );
      } else {
        result[key] =
          value === null ||
          value === undefined
            ? ''
            : String(value);
      }
    },
  );

  return result;
}

function normalizarBooleanFrontAB_(
  value,
) {
  if (
    value === true ||
    value === 1
  ) {
    return true;
  }

  const v =
    texto(value)
      .toUpperCase();

  return [
    'TRUE',
    'SIM',
    '1',
    'X',
  ].includes(v);
}

function formatarDataFront_(
  value,
) {
  if (!value) {
    return '';
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return String(value);
  }

  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    'dd/MM/yyyy',
  );
}

function formatarDataHoraFront_(
  value,
) {
  if (!value) {
    return '';
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return String(value);
  }

  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    'dd/MM/yyyy HH:mm',
  );
}

function formatarDataInputFront_(
  value,
) {
  if (!value) {
    return '';
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '';
  }

  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    'yyyy-MM-dd',
  );
}

function converterStringParaDataFront_(
  value,
) {
  if (!value) {
    return '';
  }

  return new Date(
    `${value}T12:00:00`,
  );
}

function normalizarDataFront_(
  value,
) {
  if (!value) {
    return '';
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '';
  }

  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    'yyyy-MM-dd',
  );
}