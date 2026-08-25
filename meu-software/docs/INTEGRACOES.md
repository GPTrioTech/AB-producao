# INTEGRACOES.md

## 1. Google Sheets

**Finalidade:** persistência principal, registry, log e centralização de respostas.  
**Entrada:** eventos, respostas, estruturas extraídas.  
**Saída:** estado consultado pelo Web App e backend.  
**Autenticação:** credenciais OAuth do Apps Script/usuário executor.  
**Funções:** `obterPlanilhaPainel()`, `prepararEstrutura()`, `buscarEvento()`, `atualizarEventoPorId()`, `registrarLog()` e APIs V23.2.  
**Riscos:** leitura de abas inteiras pode ficar lenta; V23.2 adicionou caches/lazy loading; concorrência entre usuários; schema por posição.  
**Erro histórico:** objetos `Date` retornados diretamente ao HTML quebravam serialização no V22.1.

## 2. Google Drive

**Finalidade:** armazenar contrato, aditivos, Forms/Docs e PDFs nas pastas de evento.  
**Entrada:** links Drive.  
**Saída:** URLs/IDs gravados em `EVENTOS`.  
**Autenticação:** OAuth Apps Script.  
**Funções:** `obterPdfContrato()`, `obterAditivosComoPdf()`, `gerarDocumento()`, `apiAtualizarPdfDocumentoAB()`.

### Atualização de PDF

`atualizarConteudoArquivoPdfAB_()` usa:

```text
PATCH https://www.googleapis.com/upload/drive/v3/files/{pdfId}?uploadType=media
Authorization: Bearer ScriptApp.getOAuthToken()
Content-Type: application/pdf
```

Se a atualização do mesmo ID falhar, cria PDF novo, tenta mandar o anterior para lixeira e atualiza o link.

**Risco:** pode exigir escopo/autorização adicional na primeira execução.

## 3. Google Docs / DocumentApp

**Finalidade:** gerar os documentos editáveis a partir de templates.  
**Templates:** IDs em Script Properties.  
**Saída:** DOC + PDF.

### Marcadores conhecidos

Marcadores básicos incluem, entre outros:

- `{{ID_EVENTO}}`
- `{{NUMERO_CONTRATO}}`
- campos de cabeçalho derivados de `montarReplacementsBasicos()`

Blocos estruturados relevantes:

- `{{BLOCO_ITENS_DEGUSTACAO}}`
- `{{BLOCO_NAO_DEGUSTADOS}}`
- `{{BLOCO_ITENS_FIXOS}}`
- `{{BLOCO_SERVICOS_CONTRATADOS}}`
- `{{BLOCO_TERCEIROS}}`
- `{{BLOCO_MENU_FINAL}}`
- `{{BLOCO_INFORMACOES_OS}}` (fallback/operacional)
- `{{BLOCO_OBSERVACOES_OS}}` (fallback)

Marcadores operacionais OS identificados historicamente:

- `{{TIPO_SERVICO}}`
- `{{PAX_OS}}`
- `{{BEBIDAS_CLIENTE}}`
- `{{ENCANTAMENTO}}`
- `{{CAMARIM}}`
- `{{STAFF_MONTAGEM}}`
- `{{STAFF_EVENTO}}`
- `{{STAFF_DESMONTAGEM}}`
- `{{CONTRATACAO_STAFF_CLIENTE}}`
- `{{GUARDANAPO}}`
- `{{PERFIL_CONVIDADO}}`
- `{{COR_EVENTO}}`
- `{{OBS_COZINHA}}`
- `{{OBS_SALAO}}`
- `{{RESTRICOES_ALIMENTARES}}`

`[PRECISA VALIDAR — o conjunto exato presente em cada template atual do Drive não foi confirmado após a última revisão.]`

### Limitações/erros

- marcador estruturado em último parágrafo não pode ser removido via `removeFromParent()`; usar helper seguro;
- marcadores principais em tabela podem falhar na validação/inserção estruturada;
- formatação pode ser herdada de parágrafos anteriores se não for definida explicitamente;
- ausência de marcador opcional não deve travar; backend insere posição fallback.

## 4. Google Forms

### Form Cliente

**Finalidade:** escolhas estruturadas do cliente.  
**Entrada:** cardápio consolidado + quantidades.  
**Saída:** respostas processadas por trigger central.  
**Configuração:** `setShowLinkToRespondAgain(false)`, progress bar, destino central.

### Form Interno

**Finalidade:** decisão final + dados operacionais.  
**Entrada:** contrato consolidado + escolha do cliente.  
**Saída:** resposta interna aguardando aprovação da geração final.  
**Configuração:** permite responder novamente durante janela de correção.

### Arquitetura central

- `form.setDestination(FormApp.DestinationType.SPREADSHEET, centralId)`;
- registro em `FORM_REGISTRY`;
- um `onCentralFormSubmit` na planilha central;
- limpeza diária.

### Reconciliação V21.2

O Google pode demorar a materializar a aba de respostas. `localizarAbaRespostaDoFormulario_()` reabre a central e usa `Sheet.getFormUrl()`. Se não encontrar imediatamente, registry fica `AGUARDANDO_VINCULO`; primeiro submit reconcilia.

### Limitação de rich text

FormApp não oferece formatação individual em negrito de uma alternativa. Requisito “destacar pré-selecionados” foi implementado como **URL pré-preenchida com checkbox já marcado**, não como bold.

## 5. OpenAI Responses API

**Finalidade 1:** extração e consolidação de contrato + aditivos.  
**Função:** `extrairContratoComIA(documentos)`.  
**Endpoint:** `https://api.openai.com/v1/responses`.  
**Autenticação:** Bearer `OPENAI_API_KEY`.  
**Modelo:** `OPENAI_MODEL`; valor real `[NÃO IDENTIFICADO NA CONVERSA]`.  
**Entrada:** PDFs convertidos para base64 + prompt + JSON Schema.  
**Saída:** JSON estruturado.

### Regras críticas no prompt

- precedência dos aditivos;
- Bar excluído;
- Anexo II é escopo das bebidas A&B;
- menu vigente consolidado;
- quantidades do contrato;
- itens fixos/terceiros;
- Staff por aditivo;
- alertas de identidade;
- não inventar dados.

### Finalidade 2: análise de um novo aditivo V23.2

**Função:** `analisarNovoAditivoComIA_()`.  
**Entrada:** contrato, aditivos anteriores e novo aditivo.  
**Saída:** vinculação/confiança/diferenças/impactos.  
**Importante:** essa etapa não altera o evento.

### Riscos

- latência;
- indisponibilidade/429/503;
- custo;
- erro de interpretação semântica;
- PDFs com linhas unidas/quebras ruins;
- necessidade de revisão humana.

O código usa schema e warnings para reduzir risco; não elimina revisão.

## 6. Apps Script HTML Service

**Finalidade:** servir Web App full-screen.  
**Função:** `doGet()`.  
**Arquivo:** `MVP_AB_App`.  
**Comunicação:** `google.script.run` assíncrono.

### Healthcheck

HTML e server-side precisam concordar em `FRONT_AB_VERSION='23.2'`. O botão de novo evento só deve ser habilitado após conexão válida.

## 7. PropertiesService

**Finalidade:** configuração persistente, não banco transacional.  
**Uso atual:** API key, modelo, templates, IDs da central/painel, métricas de tempo.  
**Legado:** `FORM_META_*`.

Não voltar a armazenar metadata de cada Form novo em Script Properties.

## 8. CacheService

**Finalidade:** performance e progresso temporário.  
**Uso V23.2:** lista de eventos, linha por ID, estado de Form, progresso; TTLs curtos.  
**Regra:** cache nunca é fonte de verdade; precisa invalidar após mutações.

## 9. LockService

- `ScriptLock`: usado em operações de infraestrutura/registry/reset e alguns fluxos globais.
- `UserLock`: ações do Web App e trigger central em partes do código.

**Risco:** `UserLock` não impede dois usuários diferentes de alterarem o mesmo evento simultaneamente.

## 10. Triggers Apps Script

### `onCentralFormSubmit`
Installable trigger na planilha central.

### `limparFormsEscalaveisExpirados`
Time-based diário, criado com `.everyDays(1).atHour(4)`.

### `onAnyFormSubmit`
Legado para Forms antigos. Não criar para Forms novos.

**Propriedade:** installable triggers pertencem ao usuário criador; validar após transferência de propriedade/conta.
