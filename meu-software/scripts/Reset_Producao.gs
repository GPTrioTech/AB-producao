/**
 * RESET DE AMBIENTE DE TESTE — A&B
 *
 * Use somente quando TODOS os registros atuais forem de teste.
 *
 * O que limpa:
 * - EVENTOS
 * - MENU_ANEXO_II
 * - TERCEIROS_REGISTRO
 * - RESPOSTAS
 * - ADITIVOS_APLICADOS
 * - LOG
 * - FORM_REGISTRY
 * - FORM_META_* legados
 * - gatilhos antigos onAnyFormSubmit
 * - abas temporárias da CENTRAL - RESPOSTAS FORMS A&B
 *
 * O que NÃO limpa:
 * - cabeçalhos das abas
 * - templates
 * - OPENAI_API_KEY
 * - OPENAI_MODEL
 * - TEMPLATE_*_ID
 * - CENTRAL_RESPOSTAS_ID
 * - PAINEL_SPREADSHEET_ID
 * - gatilho central da V21
 * - gatilho diário de limpeza
 * - código V21/V22
 */

function limparAmbienteTesteAB() {
  const ui = SpreadsheetApp.getUi();

  const resposta = ui.prompt(
    'RESET DO AMBIENTE DE TESTE',
    [
      'Esta ação vai apagar os dados operacionais atuais do painel.',
      '',
      'Use somente se tudo que está hoje for teste.',
      '',
      'Para confirmar, digite exatamente:',
      'LIMPAR TESTES',
    ].join('\n'),
    ui.ButtonSet.OK_CANCEL,
  );

  if (resposta.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  if (texto(resposta.getResponseText()).toUpperCase() !== 'LIMPAR TESTES') {
    ui.alert(
      'Cancelado. O texto de confirmação não corresponde.',
    );
    return;
  }

  const lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    throw new Error(
      'Não foi possível iniciar o reset porque existe outro processamento em execução.',
    );
  }

  try {
    const ss = obterPlanilhaPainel();

    // 1) Arquiva/desvincula os Forms novos antes de apagar o registry.
    try {
      const registros = lerRegistrosForms();

      registros.forEach((registro) => {
        try {
          arquivarFormularioEscalavel(
            texto(registro.FORM_ID),
            true,
          );
        } catch (_) {
          // Continua o reset mesmo se um Form antigo não puder ser aberto.
        }
      });
    } catch (_) {
      // FORM_REGISTRY pode ainda não existir.
    }

    // 2) Limpa abas operacionais, preservando linha 1.
    const abasParaLimpar = [
      typeof ABA_EVENTOS !== 'undefined' ? ABA_EVENTOS : 'EVENTOS',
      typeof ABA_MENU !== 'undefined' ? ABA_MENU : 'MENU_ANEXO_II',
      typeof ABA_TERCEIROS !== 'undefined' ? ABA_TERCEIROS : 'TERCEIROS_REGISTRO',
      typeof ABA_RESPOSTAS !== 'undefined' ? ABA_RESPOSTAS : 'RESPOSTAS',
      typeof ABA_ADITIVOS !== 'undefined' ? ABA_ADITIVOS : 'ADITIVOS_APLICADOS',
      typeof ABA_LOG !== 'undefined' ? ABA_LOG : 'LOG',
      typeof ABA_FORM_REGISTRY !== 'undefined' ? ABA_FORM_REGISTRY : 'FORM_REGISTRY',
    ];

    abasParaLimpar.forEach((nome) => {
      limparDadosMantendoCabecalho_(ss, nome);
    });

    // 3) Remove apenas FORM_META legados.
    const props = PropertiesService
      .getScriptProperties();

    const todas = props.getProperties();

    Object.keys(todas)
      .filter((key) => key.startsWith('FORM_META_'))
      .forEach((key) => props.deleteProperty(key));

    // 4) Remove apenas gatilhos individuais antigos.
    ScriptApp.getProjectTriggers()
      .filter(
        (trigger) =>
          trigger.getHandlerFunction() === 'onAnyFormSubmit',
      )
      .forEach((trigger) => {
        try {
          ScriptApp.deleteTrigger(trigger);
        } catch (_) {}
      });

    // 5) Limpa abas técnicas restantes na planilha central.
    const centralId = texto(
      props.getProperty(
        typeof PROP_CENTRAL_RESPOSTAS_ID !== 'undefined'
          ? PROP_CENTRAL_RESPOSTAS_ID
          : 'CENTRAL_RESPOSTAS_ID',
      ),
    );

    if (centralId) {
      try {
        const central = SpreadsheetApp.openById(centralId);

        central.getSheets()
          .filter(
            (sheet) =>
              sheet.getName() !== 'CONTROLE',
          )
          .forEach((sheet) => {
            try {
              if (central.getSheets().length > 1) {
                central.deleteSheet(sheet);
              }
            } catch (_) {}
          });

        const controle =
          central.getSheetByName('CONTROLE');

        if (controle) {
          controle.getRange('A1').setValue(
            'Arquivo técnico. Não editar manualmente. ' +
            'As abas temporárias de respostas são gerenciadas pelo Apps Script.',
          );
        }
      } catch (_) {
        // Não trava o reset se a central estiver inacessível.
      }
    }

    SpreadsheetApp.flush();

    ui.alert(
      [
        'Reset concluído.',
        '',
        'O painel ficou limpo para produção.',
        '',
        'Foram preservados:',
        '• V21/V22',
        '• API Key e modelo OpenAI',
        '• IDs dos templates',
        '• planilha central',
        '• gatilho central',
        '• gatilho diário de limpeza',
        '',
        'Próximo passo: crie 1 evento novo de teste final e percorra o fluxo completo.',
      ].join('\n'),
    );
  } finally {
    lock.releaseLock();
  }
}

function limparDadosMantendoCabecalho_(ss, nomeAba) {
  const sheet = ss.getSheetByName(nomeAba);

  if (!sheet) {
    return;
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow <= 1 || lastCol <= 0) {
    return;
  }

  sheet
    .getRange(
      2,
      1,
      lastRow - 1,
      lastCol,
    )
    .clearContent();

  // Mantém formatação, validações e estrutura.
}
