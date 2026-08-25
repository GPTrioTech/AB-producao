# REGRAS_NEGOCIO.md

Este documento consolida as regras vigentes identificadas no histórico. Quando uma regra antiga foi substituída, a regra abaixo reflete a versão mais recente; a evolução fica em `CHANGELOG.md`.

---

## 1. Identidade e estado contratual

### Regra: contrato base inicia o estado
**Quando se aplica:** toda extração/consolidação.  
**Resultado esperado:** o contrato base é a primeira versão do estado contratual do evento.  
**Exceções:** nenhuma identificada.  
**Dependências:** `extrairContratoComIA()`, `normalizarExtracao()`.

### Regra: ordem dos aditivos
**Quando se aplica:** existem um ou mais aditivos.  
**Resultado esperado:** ordenar por indicação textual `1º`, `2º`, `3º` etc.; subsidiariamente, por data de assinatura. Aplicar em ordem crescente.  
**Exceções:** documentos ambíguos geram aviso para revisão.  
**Dependências:** prompt/schema da extração OpenAI.

### Regra: precedência
**Quando se aplica:** aditivo altera campo/escopo já existente.  
**Resultado esperado:** aditivo mais recente prevalece.  
**Exceções:** campos não alterados permanecem válidos.  
**Dependências:** consolidação OpenAI.

### Regra: verbos contratuais
**Quando se aplica:** interpretação do texto do aditivo.  
**Resultado esperado:**  
- alterar/substituir/trocar = substituir o escopo indicado;
- incluir = adicionar sem apagar o restante;
- excluir/retirar = remover;
- “demais cláusulas mantidas” = preservar o que não foi alterado.

### Regra: identidade do aditivo
**Quando se aplica:** novo aditivo no workflow V23.2.  
**Resultado esperado:** IA deve verificar contrato, cliente/contratante, evento, local, datas/referências e indicar `pertence_ao_contrato`. Documento não relacionado não pode ser aplicado.  
**Exceções:** confiança média/baixa deve elevar necessidade de revisão humana.  
**Dependências:** `apiAnalisarAditivoAB()`, `analisarNovoAditivoComIA_()`.

---

## 2. Cabeçalho do evento

### Regra: dados esperados da extração
**Quando se aplica:** contrato/aditivos lidos pela IA.  
**Resultado esperado:** extrair quando existirem:

- `numero_contrato`
- `evento`
- `local`
- `contratante`
- `data_evento`
- `horario`
- `numero_convidados`
- `montagem`
- `desmontagem`
- `data_limite_menu`
- `valor_servicos`
- `valor_alimentos_bebidas`
- `valor_total`
- `dados_faturamento`
- `dados_contato`

**Exceções:** não inventar valores ausentes; vazio/zero conforme schema.  
**Dependências:** `JSON_CABECALHO`, templates e tela de revisão.

### Regra: mudanças operacionais no cabeçalho podem reabrir fluxo
**Quando se aplica:** aditivo altera evento/local/data/horário/nº convidados/montagem/desmontagem/data limite.  
**Resultado esperado:** considerar impacto operacional para decidir invalidação/revisão.  
**Dependências:** `compararEstadosContratuaisAB_()`.

---

## 3. Fonte do cardápio

### Regra: menu ativo vigente
**Quando se aplica:** geração de qualquer etapa A&B.  
**Resultado esperado:** `menu_anexo_ii` representa o **menu final contratual vigente**, inclusive se vier de aditivo substitutivo.  
**Exceções:** nenhuma.  
**Dependências:** OpenAI + `MENU_ANEXO_II`.

### Regra: substituição total de menu
**Quando se aplica:** aditivo substitui menu completo.  
**Resultado esperado:** ignorar integralmente menu anterior para degustação e Menu Final. Não misturar versões.  
**Dependências:** consolidação de aditivos.

### Regra: preservar nomenclatura
**Quando se aplica:** itens, categorias e descrições contratuais.  
**Resultado esperado:** preservar nomes/descrições do documento; não “melhorar” redação com invenção.  
**Exceções:** títulos de bebidas adicionais são normalizados para `BEBIDAS`; agrupamentos removem subtítulos/invisíveis para identidade da categoria.

---

## 4. Bar e bebidas

### Regra: Bar é completamente fora do fluxo A&B desta automação
**Quando se aplica:** extração, Forms, documentos e aditivos.  
**Resultado esperado:** excluir Bar de Drinks, carta de drinks, coquetelaria, destilados, frutas do bar e conteúdo de Bar do Anexo I.  
**Exceções:** bebida explicitamente contratada no Anexo II segue regras abaixo; não confundir com Bar.  
**Dependências:** prompt da IA e classificadores.

### Regra: bebidas padrão
**Quando se aplica:** água, refrigerantes e sucos padrão do buffet no Anexo II.  
**Resultado esperado:** `FIXO`.  
**Dependências:** `ehBebidaOuFinalizacaoFixa()`, `saoSomenteBebidasFixas()`.

### Regra: bebidas adicionais do Anexo II
**Quando se aplica:** seção adicional de bebida contratada no Anexo II/menu substitutivo.  
**Resultado esperado:** `SERVICO_CONTRATADO`, sem checkbox do cliente. No documento, título normalizado para `BEBIDAS`.  
**Exceções:** bebidas padrão permanecem FIXO; Anexo I/Bar nunca entra.  
**Dependências:** `normalizarTituloServicoContratado()`.

---

## 5. Tipos de categoria

### `SELECIONAVEL`
Categoria com regra de escolha contratual (`ESCOLHER X OPÇÕES`). Tem checkbox e quantidade.

### `INCLUSO_CARDAPIO`
Categoria gastronômica sem escolha do cliente. Deve:

- aparecer na Escolha de Menu;
- aparecer no Form Cliente como informação, sem checkbox;
- aparecer no Relatório;
- aparecer no Menu Final;
- aparecer na OS;
- não exigir quantidade/validação de escolha.

### `FIXO`
Reservado principalmente a bebidas fixas/finalização. Não exige escolha.

### `SERVICO_CONTRATADO`
Serviço adicional do cardápio/Anexo II, como Serviço de Sala, Lanche da Madrugada e bebidas adicionais. Não gera checkbox do cliente.

---

## 6. Quantidades de Menu Final e degustação

### Regra: `QTD_MENU_FINAL` vem do contrato
**Quando se aplica:** categoria selecionável.  
**Resultado esperado:** ler exatamente `ESCOLHER X OPÇÕES` ou equivalente. Não usar tabela hard-coded por menu.  
**Exceções:** se não houver quantidade e a categoria realmente exigir escolha, manter revisão pendente; não inventar.  
**Dependências:** extração OpenAI, `validarDadosAntesDoFormulario()`.

### Regra: base de `QTD_DEGUSTACAO`
**Quando se aplica:** categoria selecionável.  
**Resultado esperado:** parte de `QTD_MENU_FINAL` e aplica regra +1 quando cabível.

### Regra: +1 opção de degustação
**Quando se aplica:** categorias normalizadas equivalentes a:

- Coquetel Volante Frio;
- Coquetel Volante Quente;
- Pratos em Miniatura / Mini Porções.

**Resultado esperado:** máximo de degustação = `QTD_MENU_FINAL + 1`; mínimo = `QTD_MENU_FINAL`.  
**Exceções:** demais categorias usam quantidade exata.  
**Dependências:** `calcularQuantidadeMaximaDegustacao()`, `montarRegraDegustacao()`.

### Regra: produção pode revisar quantidades antes do cliente
**Quando se aplica:** etapa Revisão.  
**Resultado esperado:** valores podem ser ajustados na revisão estruturada antes de gerar o Form Cliente.

---

## 7. Deduplicação e agrupamento

### Regra: opção duplicada não pode chegar ao Google Forms
**Quando se aplica:** mesma opção aparece repetida na categoria.  
**Resultado esperado:** manter primeira ocorrência e descartar seguintes; normalização ignora caixa, acentos, pontuação e espaços repetidos. Registrar quando aplicável.  
**Dependências:** `removerDuplicidadesMenu()`, `removerDuplicidadesTexto()`.

### Regra: categorias visualmente iguais devem ser agrupadas
**Quando se aplica:** diferenças invisíveis, espaços, acentos, subtítulos etc.  
**Resultado esperado:** uma única categoria/pergunta; preservar maior quantidade; deduplicar itens.  
**Dependências:** `normalizarChaveAgrupamento()`, agrupadores.

### Regra: títulos de menu
**Quando se aplica:** documentos/Forms.  
**Resultado esperado:** nome completo do menu aparece na primeira categoria; categorias seguintes usam título limpo. Subtítulos promocionais após ` - ` podem ser removidos para título de categoria. Cabeçalhos consecutivos podem ser preservados no grupo separados por ` / `.

---

## 8. Serviços contratados opcionais

### Regra: só existem quando estão no contrato vigente
**Quando se aplica:** Serviço de Sala, Lanche da Madrugada e bebidas adicionais.  
**Resultado esperado:** criar seção apenas quando explicitamente contratada no Anexo II/menu substitutivo.  
**Exceções:** ausência = não exibir; não inferir.  
**Dependências:** `{{BLOCO_SERVICOS_CONTRATADOS}}`.

### Regra: marcador opcional não pode travar geração
**Quando se aplica:** template não possui `{{BLOCO_SERVICOS_CONTRATADOS}}`.  
**Resultado esperado:** inserir marcador automaticamente em posição fallback.  
**Dependências:** `prepararMarcadoresOpcionais()`.

---

## 9. Itens não degustados

### Regra: categorias explícitas não degustadas
**Quando se aplica:** existirem no menu vigente.  
**Resultado esperado:** separar dos itens degustados:

- Ilha Gastronômica;
- bebidas alcoólicas ou não alcoólicas;
- finalização;
- sorvetes/gelatos;
- lanche da madrugada;
- frutas;
- coffee/café.

**Dependências:** `ehCategoriaNaoDegustada()`, `{{BLOCO_NAO_DEGUSTADOS}}`.

### Regra: Form Interno informa “NÃO DEGUSTADO — conforme contrato”
**Quando se aplica:** categoria classificada como não degustável.  
**Resultado esperado:** exibir contratados e permitir definição final quando houver escolha necessária.

---

## 10. Formulário do Cliente

### Regra: origem
**Quando se aplica:** extração revisada e aprovada.  
**Resultado esperado:** criar Form dentro da pasta do evento e registrar no `FORM_REGISTRY`.

### Regra: campos pessoais
**Quando se aplica:** todo Form Cliente.  
**Resultado esperado:** nome do responsável e e-mail obrigatórios; restrições e observações adicionais opcionais.

### Regra: selecionáveis
**Quando se aplica:** `SELECIONAVEL`.  
**Resultado esperado:** checkbox com validação exata ou faixa mínimo/máximo conforme `QTD_MENU_FINAL` / `QTD_DEGUSTACAO`.

### Regra: inclusos
**Quando se aplica:** `INCLUSO_CARDAPIO`.  
**Resultado esperado:** seção informativa, sem checkbox.

### Regra: resposta única operacional
**Quando se aplica:** primeira resposta válida.  
**Resultado esperado:** processar, criar Relatório/Form Interno, fechar o Form Cliente e preparar arquivamento.

---

## 11. Relatório de Degustação

### Regra: conteúdo
**Quando se aplica:** resposta do cliente.  
**Resultado esperado:** refletir itens escolhidos para degustação, não degustados contratados, serviços contratados, restrições e observações do cliente conforme template.

### Regra: não antecipar campos internos
**Quando se aplica:** template do Relatório.  
**Resultado esperado:** informações que só existem no Form Interno (staff operacional, guardanapo, perfil, cor etc.) não devem aparecer como campos vazios no Relatório.  
**Status:** `[PRECISA VALIDAR — revisão dos templates foi discutida; não há confirmação de que todos os modelos ativos no Drive foram atualizados.]`

---

## 12. Formulário Interno de Produção

### Regra: origem
**Quando se aplica:** após resposta do cliente.  
**Resultado esperado:** Form Interno é criado a partir do estado contratual + escolha do cliente.

### Regra: escolhas pré-marcadas
**Quando se aplica:** opções degustadas/escolhidas pelo cliente.  
**Resultado esperado:** abrir Form Interno por URL pré-preenchida com essas opções já marcadas.  
**Motivo:** Google Forms via FormApp não oferece negrito por opção individual.  
**Dependências:** `criarUrlPreenchidoFormularioInterno_()`.

### Regra: checklist vs “Outro prato”
**Quando se aplica:** categoria selecionável no Form Interno.  
**Resultado esperado:**

1. checklist é fonte prioritária;
2. “Outro prato fora do checklist” serve apenas para nome de prato não listado;
3. o campo livre completa vagas restantes até a quantidade final;
4. texto excedente é tratado como observação/aviso, não como prato adicional.

### Regra: observação de cozinha separada
**Quando se aplica:** categorias operacionais de comida.  
**Resultado esperado:** ponto, alergia, apresentação, troca de guarnição etc. em campo separado; não contam como escolha de prato e não entram no Menu Final.

### Regra: formato de serviço por categoria
**Quando se aplica:** categoria gastronômica operacional.  
**Resultado esperado:** escolha obrigatória única:

- Volante;
- Ponto de Buffet;
- Empratado;
- Não se aplica.

Horas/pontos são campos auxiliares. Ausência não bloqueia documento; vira aviso/`NÃO INFORMADO`.

### Regra: categorias sem formato de serviço
**Quando se aplica:** estrutura e itens que não são prato/serviço dessa natureza.  
**Resultado esperado:** NÃO criar formato, horas, pontos nem observação de cozinha para categorias cujo texto indique:

- Estrutura da Gastronomia;
- bebidas;
- cerveja;
- vinho;
- espumante;
- whisky;
- vodka;
- gin;
- drinks/coquetelaria/bar;
- refrigerante;
- suco;
- água;
- finalização.

**Dependências:** `categoriaPermiteConfiguracaoOperacional_()`.

### Regra: campo global tipo de serviço removido
**Quando se aplica:** novos Forms Internos.  
**Resultado esperado:** não perguntar “Tipo de serviço” global. OS resume modos:

- todos iguais -> modo único;
- diferentes -> `Misto — ver formato por categoria no cardápio.`;
- nenhum aplicável -> `Não se aplica.`

### Regra: Camarim condicional
**Quando se aplica:** Form Interno.  
**Resultado esperado:**

- `Padrão` -> não pedir detalhes; OS = `Padrão`;
- `Fora do padrão` -> pedir especificações; OS usa texto informado.

### Regra: Alimentação de Staff padrão
**Quando se aplica:** montagem, evento e desmontagem.  
**Resultado esperado:** solicitar somente Data, Horário e Quantidade; texto-base “Padrão Grupo Trio”. Datas são `DateItem` e vêm pré-preenchidas quando possível.

Sugestões:

- montagem -> data extraída de `montagem`, fallback data do evento;
- evento -> `data_evento`;
- desmontagem -> data extraída de `desmontagem`, fallback data do evento.

### Regra: Staff do cliente condicional
**Quando se aplica:** Form Interno.  
**Resultado esperado:**

- Não -> não exibir detalhes/nada na OS;
- Sim -> Data, Horário, Quantidade, Observações.

Data do evento é sugestão inicial.

### Regra: demais informações internas
Registrar quando aplicável:

- `pax_os`;
- `bebidas_cliente`;
- `encantamento`;
- Camarim;
- staff montagem/evento/desmontagem;
- contratação staff cliente;
- `guardanapo`;
- `perfil_convidado`;
- `cor_evento`;
- `observacoes_cozinha`;
- `observacoes_salao`;
- `restricoes_alimentares`.

---

## 13. Resposta interna e geração final

### Regra: submit do Form Interno NÃO gera final automaticamente
**Quando se aplica:** qualquer resposta interna na arquitetura atual.  
**Resultado esperado:**

1. gravar resposta;
2. evento permanece `AGUARDANDO_POS_DEGUSTACAO`;
3. registry = `RESPONDIDO_AGUARDANDO_GERACAO`;
4. Web App libera `Gerar Menu Final + OS`;
5. Produção clica explicitamente.

### Regra: não bloquear por quantidade divergente
**Quando se aplica:** resolução do Menu Final.  
**Resultado esperado:**

- checklist acima do limite -> manter primeiras opções até o limite + aviso;
- checklist abaixo -> completar com “Outro prato” quando disponível;
- ainda faltando -> inserir `PENDENTE DE DEFINIÇÃO [n]`;
- gerar documentos e registrar `AVISOS_REVISAO` + `LOG`.

### Regra: Menu Final usa prato, não comentário
**Quando se aplica:** documento final do cliente.  
**Resultado esperado:** apenas escolhas de menu; observações internas ficam na OS.

### Regra: Menu Final clean
**Quando se aplica:** Menu Final e OS.  
**Resultado esperado:** não exibir `(ITEM FIXO)` nem `ITEM JÁ INCLUSO NO CARDÁPIO - NÃO NECESSITA SELEÇÃO` nos documentos finais.  
**Exceção:** documentos de degustação podem manter indicação explicativa de itens já inclusos conforme a lógica atual.

### Regra: OS contém o contexto operacional completo
**Quando se aplica:** geração da OS.  
**Resultado esperado:** garantir serviço por categoria, Pax, bebidas cliente, Encantamento, Camarim, Staff, guardanapo, perfil, cor, cozinha, salão, restrições e informação de terceiros quando aplicável. Se marcadores individuais faltarem, usar blocos complementares automáticos.

---

## 14. Compatibilidade com respostas antigas

### Regra: fallback em `RESPOSTAS`
**Quando se aplica:** Form Interno antigo cujo metadata não mapeia todos os campos.  
**Resultado esperado:** combinar resposta do Google Forms com último lote `INTERNO` salvo na aba `RESPOSTAS`.  
**Dependências:** `complementarParsedComRespostasSalvas()`, `obterUltimoLoteRespostasInternas()`.

---

## 15. Documentos e templates

### Regra: quatro artefatos principais
- Escolha de Menu Degustação;
- Relatório de Degustação;
- Menu Final;
- OS A&B.

Cada um possui template em Script Properties e gera DOC + PDF.

### Regra: serviço opcional
`{{BLOCO_SERVICOS_CONTRATADOS}}` é recomendado nos templates, mas o backend cria posição fallback se ausente.

### Regra: não degustados
`{{BLOCO_NAO_DEGUSTADOS}}` é recomendado no Relatório; backend pode criar posição fallback.

### Regra: marcadores de blocos principais
Marcadores estruturados necessários precisam estar em parágrafo de corpo, não dentro de tabela quando a função de validação exigir. Ver `docs/INTEGRACOES.md`.

### Regra: não remover último parágrafo físico
Ao limpar marcador que é último parágrafo, limpar o conteúdo em vez de remover o elemento.

---

## 16. PDF após edição manual do DOC

### Regra: DOC é editável e PDF pode ser regenerado
**Quando se aplica:** Escolha, Relatório, Menu Final ou OS já gerados.  
**Resultado esperado:** `Atualizar PDF` converte o DOC atual e tenta atualizar o PDF existente preservando ID/link.  
**Fallback:** criar novo PDF na pasta do evento, mandar antigo para lixeira quando possível e atualizar `EVENTOS`.  
**Dependências:** `apiAtualizarPdfDocumentoAB()`, `atualizarConteudoArquivoPdfAB_()`.

---

## 17. Aditivo V23.2 — workflow explícito

### Regra: analisar antes de aplicar
**Quando se aplica:** novo link de aditivo.  
**Resultado esperado:** análise não muta `EVENTOS`, menu ou documentos. Workflow registra resultado.  
**Dependências:** `ADITIVO_WORKFLOW`.

### Regra: estágio Antes da Degustação
**Quando se aplica:** aditivo recebido antes da degustação.  
**Resultado esperado se impactar A&B:**

- consolidar contrato + todos aditivos;
- atualizar menu/terceiros/valores;
- arquivar Forms anteriores como versão atual;
- limpar links correntes de Escolha/Form Cliente/Relatório/Form Interno/Menu Final/OS;
- voltar a `AGUARDANDO_REVISAO`;
- Produção revisa e gera nova Escolha/Form Cliente.

### Regra: estágio Depois da Degustação
**Quando se aplica:** degustação já ocorreu.  
**Resultado esperado se impactar A&B:**

- preservar Escolha/Relatório como histórico;
- consolidar contrato/cardápio;
- criar novo Form Interno;
- limpar Menu Final/OS atuais;
- Produção responde e gera novos finais.

**Validação técnica atual:** exige existência de `FORM_CLIENTE_ID`.  
`[PRECISA VALIDAR — essa checagem não prova que a resposta/degustação de fato ocorreu; ver BUGS_E_LIMITACOES.md.]`

### Regra: estágio Após OS
**Quando se aplica:** já existe `LINK_OS_DOC` ou `LINK_OS_PDF`.  
**Resultado esperado:** preservar links dos finais anteriores, consolidar estado, criar novo Form Interno e gerar nova versão final após revisão.

### Regra: aditivo somente financeiro
**Quando se aplica:** diff não detecta menu/terceiros/staff nem cabeçalho operacional.  
**Resultado esperado:** atualizar valores/estado consolidado sem invalidar Forms/documentos operacionais.

### Regra: versões anteriores
**Quando se aplica:** aplicação que invalida/reabre etapas.  
**Resultado esperado:** capturar os links atuais em `ARTEFATOS_ANTERIORES_JSON` antes de limpar os campos correntes.  
**Limitação:** são referências por URL, não cópias imutáveis.

---

## 18. Erros e retentativa

### Regra: erro técnico pode tentar novamente
**Quando se aplica:** erros transitórios reconhecidos (timeout, 429, 503, indisponibilidade etc.).  
**Resultado esperado:** até uma segunda tentativa automática quando `podeRetentarSemDuplicarAB_()` considerar segura.

### Regra: erro de validação não entra em loop
**Quando se aplica:** `REVISÃO NECESSÁRIA` ou inconsistência de dados.  
**Resultado esperado:** retornar à revisão; não repetir automaticamente.

### Regra: erro é estado recuperável
**Quando se aplica:** evento com `STATUS=ERRO`.  
**Resultado esperado:** Web App determina a etapa provável e oferece `Tentar novamente`/diagnóstico sem seleção manual de linha.

---

## 19. Regras de UX operacional

- Web App é tela principal; planilha é backend.
- ficha básica de evento deve abrir rápido;
- tabs pesadas são lazy-loaded;
- o usuário deve ver processamento, tempo e etapa;
- botão Atualizar tem feedback;
- resposta de Form deve aparecer por auto-sync;
- Form Interno fica destacado na Pós-degustação;
- Final fica bloqueado até resposta interna;
- usuário pode sair da ficha com `← Voltar / fechar evento`;
- todo evento é operado por `ID_EVENTO`.
