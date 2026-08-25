===== AGENTS.md =====

# AGENTS.md — Instruções para agentes de desenvolvimento

## 0. Leia antes de alterar qualquer coisa

Este repositório representa o handoff do **Mini Software A&B**, uma automação operacional do departamento de Alimentos & Bebidas de uma empresa de eventos. O sistema foi construído sobre **Google Apps Script + Google Sheets + Google Drive + Google Docs + Google Forms + OpenAI** e evoluiu de um MVP operado pela planilha para um **Web App em tela cheia**.

### Baseline mais recente identificada

A combinação mais recente de código disponível na conversa é:

- `backend/MVP_A&B.gs`: **backend consolidado V23.1**;
- `frontend/MiniSoftware.gs`: **controller/API do Web App V23.2**;
- `frontend/MVP_AB_App.html`: **interface HTML V23.2**;
- `scripts/Reset_Producao.gs`: utilitário de reset criado antes da V23.2.

**Importante:** a V23.2 foi criada deliberadamente em cima do backend V23.1, sem substituir esse backend. Portanto, não tente “equalizar” versões renomeando tudo para V23.2. Essa composição é intencional.

`[PRECISA VALIDAR — o histórico indica que essa é a versão destinada aos testes de Produção, mas não há confirmação explícita nesta conversa de que a implantação V23.2 foi efetivamente publicada na conta Google de produção.]`

## 1. Objetivo do sistema

Automatizar e tornar auditável o fluxo de Gastronomia/A&B de um evento:

1. receber contrato assinado e, quando existirem, aditivos;
2. extrair com IA o cabeçalho e o cardápio contratual vigente;
3. permitir revisão humana estruturada;
4. gerar Escolha de Menu de Degustação + Formulário do Cliente;
5. processar a resposta do cliente;
6. gerar Relatório de Degustação + Formulário Interno de Produção;
7. registrar a decisão operacional pós-degustação;
8. mediante aprovação explícita da Produção, gerar Menu Final + OS A&B;
9. tratar aditivos recebidos antes da degustação, depois da degustação ou após a OS, preservando histórico e reabrindo somente as etapas necessárias.

A UI deve permitir que a Produção trabalhe **sem depender da linha ativa da planilha** e, no fluxo normal, sem precisar abrir abas técnicas.

## 2. Tecnologias e serviços

- **Google Apps Script (JavaScript)**: runtime, backend, APIs do Web App, automações e triggers.
- **Google Sheets**: banco operacional e técnico.
- **Google Drive / Drive API v3**: armazenamento e atualização de PDFs.
- **Google Docs / DocumentApp**: templates, geração de DOCs e PDFs.
- **Google Forms / FormApp**: Form Cliente e Form Interno.
- **HTML Service**: Web App em tela cheia servido por `doGet()`.
- **OpenAI Responses API**: extração/consolidação de contrato e aditivos; análise isolada de novos aditivos.
- **PropertiesService**: segredos/configurações e IDs de infraestrutura.
- **CacheService**: progresso temporário e caches de performance.
- **LockService**: mitigação de concorrência.

Consulte `docs/ARQUITETURA.md` e `docs/INTEGRACOES.md` antes de alterar integrações ou infraestrutura.

## 3. Organização dos componentes

### `backend/MVP_A&B.gs`
Motor de negócio e infraestrutura:

- criação/validação das abas;
- extração com OpenAI;
- normalização do contrato;
- regras de degustação e Menu Final;
- geração de Google Docs/PDF;
- criação dos Google Forms;
- arquitetura escalável de respostas (`FORM_REGISTRY` + planilha central);
- processamento de respostas;
- compatibilidade com Forms legados;
- limpeza/arquivamento dos Forms;
- logs e manipulação do evento.

### `frontend/MiniSoftware.gs`
Camada servidor do Web App e orquestração da UI:

- healthcheck/versionamento do front;
- listagem rápida de eventos;
- busca por `ID_EVENTO`;
- lazy loading;
- progresso/ETA;
- execução de ações por ID, sem linha ativa;
- retentativa segura;
- atualização DOC -> PDF;
- workflow V23.2 de aditivos;
- caches de performance.

### `frontend/MVP_AB_App.html`
Interface do usuário:

- sidebar de eventos;
- filtros/pesquisa;
- workspace do evento;
- stepper Contrato -> Revisão -> Cliente -> Pós-degustação -> Finalizado;
- revisão da extração;
- arquivos;
- histórico/erros;
- aditivos;
- indicador de processamento;
- auto-sync;
- feedback do botão Atualizar.

### `scripts/Reset_Producao.gs`
Ferramenta administrativa destrutiva para limpar dados de teste. **Não é rotina operacional.** Foi construída antes de `ADITIVO_WORKFLOW`; veja limitações em `docs/BUGS_E_LIMITACOES.md`.

### `database/`
Não existe banco SQL. A persistência é feita em Google Sheets. O arquivo `database/README.md` documenta isso; o schema completo está em `docs/BANCO_DADOS.md`.

## 4. Regras que um agente NÃO pode violar

### 4.1 Bar é fora do fluxo

Não importar, não oferecer em checkbox e não misturar no cardápio de degustação:

- Bar de Drinks;
- carta de drinks;
- coquetelaria;
- destilados;
- frutas do bar;
- conteúdo de Bar do Anexo I.

A exceção é **bebida contratada no Anexo II** conforme as regras de bebidas documentadas em `docs/REGRAS_NEGOCIO.md`.

### 4.2 A fonte contratual precisa ser consolidada corretamente

- contrato base cria o estado inicial;
- aditivos são aplicados em ordem cronológica/lógica;
- alteração/substituição substitui o escopo indicado;
- inclusão adiciona;
- exclusão remove;
- aditivo mais recente prevalece no mesmo campo;
- campos não alterados continuam válidos.

Nunca mesclar silenciosamente um menu substituído com o menu anterior.

### 4.3 `ID_EVENTO` é a chave operacional

O Web App não pode depender de `getActiveRange()` / linha ativa para executar o fluxo normal. A linha da planilha é apenas fallback técnico. Toda ação do Web App deve resolver o evento por `ID_EVENTO`.

### 4.4 Revisão humana é obrigatória antes de etapas externas/finais

A IA auxilia; não é autoridade final. O fluxo deve preservar:

- revisão após extração;
- validação da Produção no Form Interno;
- clique explícito para `Gerar Menu Final + OS` após resposta interna.

Não reintroduza geração automática de Menu Final + OS no submit do Form Interno.

### 4.5 Não reintroduzir arquitetura “1 trigger por Form”

Forms novos devem usar:

- `FORM_REGISTRY`;
- `CENTRAL - RESPOSTAS FORMS A&B`;
- um trigger central `onCentralFormSubmit`;
- um trigger diário de limpeza.

`FORM_META_*` e `onAnyFormSubmit` existem apenas por compatibilidade legada.

### 4.6 Não remover o hotfix do último parágrafo do Google Docs

`removerParagrafoMarcadorSeguro_()` evita o erro ao remover o último parágrafo de uma seção. Qualquer refatoração de `inserirBlocoEstruturado()` precisa preservar esse comportamento.

### 4.7 Não usar Google Forms como banco

Responses podem ser consultadas, mas o estado operacional deve estar refletido no Sheets/registry. Navegação não deve abrir `FormApp` desnecessariamente.

### 4.8 Não reintroduzir hard stop por quantidade no Menu Final

Quando a resposta interna tiver quantidade divergente:

- excesso: ajustar determinística e registrar aviso;
- falta: inserir `PENDENTE DE DEFINIÇÃO` e registrar aviso;
- gerar os documentos em vez de travar o processo.

A regra atual dá prioridade ao checklist e usa “Outro prato” apenas para completar vagas. Ver `docs/REGRAS_NEGOCIO.md`.

### 4.9 Menu Final deve permanecer clean

Informações operacionais (serviço, horas, pontos, observações de cozinha/salão, staff etc.) pertencem à OS, não ao Menu Final do cliente.

### 4.10 Aditivo é processo em duas fases

Nunca aplique um aditivo apenas porque o link foi informado.

1. **Analisar**: sem mutação do evento.
2. **Aplicar**: somente após análise, vinculação ao contrato e confirmação.

Respeitar o estágio `ANTES_DEGUSTACAO`, `DEPOIS_DEGUSTACAO` ou `APOS_OS`.

## 5. Cuidados antes de alterar código existente

1. Leia este `AGENTS.md`.
2. Leia `docs/REGRAS_NEGOCIO.md`.
3. Leia o documento específico da área alterada:
   - dados/schema -> `docs/BANCO_DADOS.md`;
   - Forms/Drive/OpenAI -> `docs/INTEGRACOES.md`;
   - fluxo -> `docs/FLUXOS.md`;
   - decisões históricas -> `docs/DECISOES_TECNICAS.md`;
   - bugs -> `docs/BUGS_E_LIMITACOES.md`;
   - histórico -> `docs/CHANGELOG.md`.
4. Verifique se a função existe em `backend/MVP_A&B.gs` ou `frontend/MiniSoftware.gs` antes de criar uma nova função equivalente.
5. Não copie uma versão antiga (`Code_vXX`) sobre o código atual.
6. Não mantenha dois arquivos `.gs` com a mesma função no mesmo projeto Apps Script; funções globais duplicadas podem conflitar.
7. Faça backup **fora do projeto Apps Script**. Não deixe “backup.gs” com as mesmas funções dentro do projeto.
8. Se mudar schema, faça migração compatível e idempotente. Nunca reordene colunas existentes sem avaliar `EVENT_COL` e leituras por índice.
9. Se mudar templates, validar marcadores antes de publicar.
10. Se mudar Web App, atualizar a implantação existente, preservando a URL `/exec`.

## 6. Regras para mudanças em dados / “banco”

- Sheets são o banco. Não delete cabeçalhos ou validações manualmente.
- `EVENTOS.ID_EVENTO` é chave primária lógica.
- Tabelas filhas usam `ID_EVENTO` como FK lógica.
- `FORM_REGISTRY.FORM_ID` identifica Form; `ID_EVENTO` relaciona ao evento.
- Novos campos devem ser adicionados no fim sempre que possível, mantendo compatibilidade.
- Funções de setup devem ser idempotentes.
- Atualize `docs/BANCO_DADOS.md` em qualquer alteração estrutural.
- Se adicionar aba técnica, atualizar também o reset seguro e os diagnósticos.
- **Atenção:** `ADITIVO_WORKFLOW` foi criado na V23.2 fora de `prepararEstrutura()`; qualquer evolução deve decidir se essa separação continua apropriada.

## 7. Regras para frontend

- A ficha básica deve abrir de forma otimista/rápida; não carregar LOG, `MENU_ANEXO_II` ou Forms completos no clique do evento.
- Preservar lazy loading das abas pesadas.
- Preservar auto-sync leve (evento aberto) e atualização periódica da sidebar.
- Toda ação deve fornecer feedback visual.
- Processamentos pesados devem mostrar etapa, percentual, tempo decorrido e faixa estimada.
- O botão Atualizar precisa sinalizar que está trabalhando e quando terminou.
- A UI deve oferecer `← Voltar / fechar evento`.
- O Form Interno deve estar destacado na etapa Pós-degustação; `Gerar Menu Final + OS` fica bloqueado até resposta.
- Não obrigar a usuária a abrir planilha para revisão, seleção de evento ou erro.
- `Abrir linha na planilha` é fallback técnico, não fluxo principal.

## 8. Regras para backend

- Não alterar a precedência de aditivos sem revisão de negócio.
- Não remover deduplicação/normalização de categorias e opções.
- Não reintroduzir quantidades hard-coded por menu/cliente.
- Não misturar observação de cozinha com nome de prato.
- Preservar compatibilidade com Forms antigos via aba `RESPOSTAS` e `FORM_META_*` enquanto houver eventos legados.
- Manter `AVISOS_REVISAO` como registro de ajustes automáticos e pendências que não devem travar a geração.
- Erros automáticos precisam ser associados ao evento e registrados em `LOG`.
- Falhas de geração de Docs devem limpar cópias incompletas quando aplicável.

## 9. Regras para integrações

- OpenAI: manter schema estruturado; não trocar por resposta textual livre.
- Não enviar/aceitar Bar como parte do cardápio mesmo se a IA sugerir.
- Forms: novos Forms devem ser registrados no registry central.
- Drive: ao atualizar PDF, tentar preservar o ID; se falhar, criar novo PDF e atualizar link no evento.
- Web App: manter healthcheck de versão entre HTML e server-side.
- Triggers: validar propriedade/autorização da conta de produção após migração de conta.

## 10. Validação mínima de qualquer alteração

### Smoke test obrigatório

Use evento controlado, não cliente em produção:

1. Criar evento.
2. Extrair contrato.
3. Conferir status `AGUARDANDO_REVISAO`.
4. Abrir Revisão e conferir cabeçalho/menu/terceiros.
5. Aprovar e gerar Escolha + Form Cliente.
6. Responder Form Cliente.
7. Confirmar criação de Relatório + Form Interno sem abrir a planilha.
8. Abrir Form Interno e verificar pré-seleções, campos operacionais e datas de staff.
9. Enviar Form Interno.
10. Confirmar que Menu Final/OS **não** foram gerados automaticamente.
11. Confirmar que botão Final é liberado.
12. Gerar Menu Final + OS.
13. Conferir DOC/PDF e OS operacional.
14. Editar um DOC e executar `Atualizar PDF`.
15. Confirmar PDF novo/atualizado.
16. Conferir `FORM_REGISTRY` e `LOG`.

### Testes de aditivo

Executar separadamente:

- antes da degustação;
- depois da degustação;
- após OS;
- PDF de outro contrato (deve rejeitar);
- aditivo somente financeiro (não deve invalidar A&B sem necessidade).

### Teste de performance

- clicar rapidamente em ao menos 5 eventos;
- ficha básica deve aparecer sem carregar tabs pesadas;
- Revisão, Histórico e Aditivos carregam sob demanda;
- observar console/log caso a navegação volte a bloquear.

## 11. Funcionalidades críticas que não podem quebrar

- extração do contrato e múltiplos aditivos;
- exclusão de Bar;
- quantidades dinâmicas do contrato;
- regra +1 de degustação em categorias específicas;
- categorias `INCLUSO_CARDAPIO`;
- deduplicação de opções;
- agrupamento de categorias com texto invisível/subtítulos;
- geração dos quatro tipos de documento;
- processamento central de Forms;
- pré-preenchimento do Form Interno;
- campos de serviço apenas em categorias aplicáveis;
- staff/camarim condicionais;
- todas as observações na OS;
- aprovação manual antes de Menu Final + OS;
- atualização de PDF;
- workflow de aditivo e preservação de versões anteriores;
- retentativa segura sem duplicar artefatos;
- navegação por `ID_EVENTO`.

## 12. Mapa de documentação

| Alteração pretendida | Leia primeiro |
|---|---|
| Regra de menu/degustação | `docs/REGRAS_NEGOCIO.md`, `docs/FLUXOS.md` |
| Aditivos | `docs/REGRAS_NEGOCIO.md`, `docs/FLUXOS.md`, `docs/DECISOES_TECNICAS.md` |
| Sheets/schema | `docs/BANCO_DADOS.md` |
| Google Forms | `docs/INTEGRACOES.md`, `docs/ARQUITETURA.md` |
| OpenAI | `docs/INTEGRACOES.md`, `docs/REGRAS_NEGOCIO.md` |
| Docs/PDF/templates | `docs/INTEGRACOES.md`, `docs/BUGS_E_LIMITACOES.md` |
| Frontend/performance | `docs/ARQUITETURA.md`, `docs/DECISOES_TECNICAS.md` |
| Bugs | `docs/BUGS_E_LIMITACOES.md` |
| Roadmap | `docs/PENDENCIAS.md` |
| Por que algo existe | `docs/CHANGELOG.md`, `docs/DECISOES_TECNICAS.md` |

## 13. Pontos que precisam ser validados no ambiente real antes de uma nova entrega

- qual deployment `/exec` está atualmente publicado;
- se o topo mostra `V23.2 • conectado`;
- identidade da conta dona dos triggers instaláveis;
- valores atuais de `OPENAI_MODEL` e IDs dos templates;
- versão real dos quatro templates no Drive;
- se `Reset_Producao.gs` ativo é idêntico ao snapshot deste repositório;
- se o primeiro smoke test V23.2 foi concluído sem erro;
- se a atualização automática após resposta do cliente funciona sem qualquer interação com a planilha.


===== README.md =====

# Mini Software A&B

## Visão geral

O **Mini Software A&B** é um Web App interno que automatiza o fluxo documental e operacional de Gastronomia/Alimentos & Bebidas de eventos.

Foi criado para substituir um processo com alta dependência de leitura manual de contratos, preenchimento de documentos, coleta de escolhas por mensagens/fotos e repetição de informações entre Comercial, Produção, cliente, Cozinha, Compras A&B e Maitria/Salão.

A solução atual usa uma planilha Google como banco, Apps Script como backend/orquestrador, Google Forms para coleta estruturada, Google Docs para documentos e OpenAI para extração/consolidação contratual.

## Usuários

- **Produção**: principal usuária operacional do Web App.
- **Cliente**: responde o Formulário de Escolha de Menu.
- **Cozinha / Salão / Maitria / Compras A&B**: consumidores das informações consolidadas no Relatório/OS.
- **Comercial**: origem do contrato e da passagem de bastão.

## Problema resolvido

Antes da automação, a escolha do cliente podia chegar por papel, foto, WhatsApp ou texto solto. A Produção precisava reler contrato, transcrever cardápio, validar quantidades, gerar documentos e repetir informação em vários artefatos.

O sistema transforma o contrato em uma estrutura auditável, força revisão humana e propaga o estado validado para os documentos seguintes.

## Principais funcionalidades

- criação de eventos;
- extração de contrato com IA;
- suporte a múltiplos aditivos contratuais;
- revisão do cabeçalho e do Anexo II dentro do Web App;
- geração de Escolha de Menu DOC/PDF;
- geração de Form Cliente com checkboxes e validações;
- Relatório de Degustação;
- Form Interno de Produção pós-degustação;
- pré-seleção das escolhas degustadas;
- configuração de serviço por categoria gastronômica;
- Camarim e Staff com lógica condicional;
- geração de Menu Final e OS A&B;
- atualização de PDF depois de editar o DOC;
- histórico/log técnico;
- workflow de aditivos em três momentos do evento;
- retentativa segura de falhas técnicas;
- indicador de progresso e ETA;
- frontend full-screen com lazy loading e auto-sync.

## Fluxo principal

```mermaid
flowchart LR
    A[Contrato assinado] --> B[Novo evento]
    B --> C[Extração IA]
    C --> D[Revisão humana]
    D --> E[Escolha DOC/PDF + Form Cliente]
    E --> F[Resposta cliente]
    F --> G[Relatório Degustação]
    F --> H[Form Interno Produção]
    H --> I{Form Interno respondido?}
    I -- Não --> H
    I -- Sim --> J[Produção aprova geração]
    J --> K[Menu Final DOC/PDF]
    J --> L[OS A&B DOC/PDF]
    K --> M[Finalizado]
    L --> M
```

## Stack

- Google Apps Script
- Google Sheets
- Google Drive
- Google Docs
- Google Forms
- Apps Script HTML Service / Web App
- OpenAI Responses API

## Arquitetura resumida

```mermaid
flowchart TB
    UI[Web App HTML V23.2] --> API[MiniSoftware.gs V23.2]
    API --> CORE[MVP_A&B.gs V23.1]
    API --> SHEETS[(Google Sheets)]
    CORE --> SHEETS
    CORE --> OPENAI[OpenAI Responses API]
    CORE --> DRIVE[Google Drive]
    CORE --> DOCS[Google Docs]
    CORE --> FORMS[Google Forms]
    FORMS --> CENTRAL[(CENTRAL - RESPOSTAS FORMS A&B)]
    CENTRAL --> TRIGGER[onCentralFormSubmit]
    TRIGGER --> CORE
```

## Estrutura do repositório de handoff

```text
meu-software/
├── AGENTS.md
├── README.md
├── backend/
│   └── MVP_A&B.gs
├── frontend/
│   ├── MiniSoftware.gs
│   └── MVP_AB_App.html
├── scripts/
│   └── Reset_Producao.gs
├── database/
│   └── README.md
└── docs/
    ├── CONTEXTO_PROJETO.md
    ├── REGRAS_NEGOCIO.md
    ├── ARQUITETURA.md
    ├── FLUXOS.md
    ├── BANCO_DADOS.md
    ├── INTEGRACOES.md
    ├── BUGS_E_LIMITACOES.md
    ├── DECISOES_TECNICAS.md
    ├── PENDENCIAS.md
    └── CHANGELOG.md
```

## Baseline de código

- Backend: `MVP_A&B.gs` V23.1.
- Controller/API Web App: `MiniSoftware.gs` V23.2.
- HTML: `MVP_AB_App.html` V23.2.
- Reset: versão anterior à V23.2.

`[PRECISA VALIDAR — implantação real na conta Google de produção não foi confirmada na conversa após a geração da V23.2.]`

## Configuração / execução

### Script Properties obrigatórias

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `TEMPLATE_ESCOLHA_ID`
- `TEMPLATE_RELATORIO_ID`
- `TEMPLATE_MENU_FINAL_ID`
- `TEMPLATE_OS_ID`

Infraestrutura criada/armazenada automaticamente:

- `CENTRAL_RESPOSTAS_ID`
- `PAINEL_SPREADSHEET_ID`
- `METRICAS_TEMPO_AB` (métricas de ETA, quando usado)

### Preparação inicial

No menu da planilha:

1. `MVP A&B > 0. Preparar estrutura`
2. `MVP A&B > 0B. Preparar produção escalável`
3. Autorizar serviços na conta de produção.
4. `MVP A&B > Diagnosticar arquitetura de Forms`
5. `MVP A&B > Testar configurações`

### Web App

O projeto precisa estar implantado como **Aplicativo da Web**. `doGet()` serve o arquivo HTML `MVP_AB_App`.

Em atualizações:

1. salvar o Apps Script;
2. `Implantar > Gerenciar implantações`;
3. editar a implantação existente;
4. selecionar/criar nova versão;
5. implantar;
6. preservar a URL `/exec`.

Configuração exata de “Executar como” e “Quem pode acessar” no ambiente real: `[PRECISA VALIDAR]`.

## Arquivos/templates externos importantes

Foram usados quatro modelos no Drive:

- `MODELO - ESCOLHA MENU DEGUSTAÇÃO`
- `MODELO - RELATÓRIO DE DEGUSTAÇÃO`
- `MODELO - MENU FINAL`
- `MODELO - OS A&B`

Os IDs ficam nas Script Properties. A versão exata atualmente implantada dos templates precisa ser validada.

## Referências funcionais usadas no desenvolvimento

Casos reais/teste recorrentes na conversa:

- contrato `260410` — Aniversário Valentina 18 anos — SKY;
- contrato `260411` — Casamento Raquel e João — T19, com múltiplos aditivos;
- casos Scania e Berkley foram usados para encontrar bugs de bebidas, opções duplicadas e categorias divididas.

## Leia antes de desenvolver

Comece por `AGENTS.md`. Depois use os documentos de `/docs` conforme o tipo de alteração.


# ARQUIVOS DE CÓDIGO IDENTIFICADOS

## `/backend`

### `MVP_A&B.gs`
- Origem: `MVP A&B_V23_1.gs` gerado na conversa a partir dos arquivos ativos enviados pelo usuário.
- Versão: Backend consolidado **V23.1**.
- Estado: **código completo** no material disponível.
- Observação: incorpora arquitetura V21/V21.1/V21.2 e alterações de negócio até V23.1.

## `/frontend`

### `MiniSoftware.gs`
- Origem: `MiniSoftware_V23_2.gs`.
- Versão: **V23.2**.
- Estado: **código completo**.
- Função: APIs/controller do Web App, performance, progresso, PDF e aditivos.

### `MVP_AB_App.html`
- Origem: `MVP_AB_App_V23_2.html`.
- Versão: **V23.2**.
- Estado: **código completo**.
- Função: interface do Web App.

## `/database`

Não há arquivo de banco separado. O schema existe nas constantes do backend e na criação automática de `ADITIVO_WORKFLOW`. Veja `database/README.md` e `docs/BANCO_DADOS.md`.

## `/scripts`

### `Reset_Producao.gs`
- Origem: `Reset_Producao_AB.gs`.
- Versão: criada no período V21/V22, anterior à V23.2.
- Estado: **código completo do artefato gerado**, porém `[PRECISA VALIDAR]` se é byte-a-byte igual ao arquivo atualmente ativo na conta de produção.
- Limitação: não limpa `ADITIVO_WORKFLOW`.

## Código histórico disponível na conversa

Também foram produzidas versões `Code_v2` até `Code_v21`, hotfixes V21.1/V21.2, fronts V22/V22.1/V22.2/V22.3 e V23. Esses arquivos são **histórico**, não devem substituir a baseline atual.

Como este pacote inclui snapshots completos dos arquivos mais recentes identificados, o Codex pode iniciar a análise do código imediatamente. Ainda assim, **antes de alterar produção deve comparar esses snapshots com os arquivos realmente implantados no Apps Script**, porque a conversa não confirma a publicação final da V23.2.


===== docs/CONTEXTO_PROJETO.md =====

# CONTEXTO_PROJETO.md

## 1. Origem

O projeto nasceu do mapeamento do fluxo operacional de Alimentos & Bebidas de eventos. O processo original tinha etapas bem definidas — evento fechado, passagem Comercial -> Produção, definição da degustação, escolha do menu, relatório, Menu Final e OS — porém as etapas documentais eram altamente manuais.

Um gargalo explícito era a coleta da escolha do cliente: o retorno podia vir por folha impressa preenchida à mão, foto, WhatsApp ou texto solto. Em seguida, a Produção precisava transformar esse material novamente em informação estruturada para Compras, Cozinha e Maitria/Salão.

## 2. Problema de negócio

Principais problemas que motivaram a automação:

- releitura repetida de contrato;
- transcrição manual do Anexo II;
- risco de levar Bar/Anexo I para o fluxo errado;
- quantidades diferentes por categoria e contrato;
- aditivos alterando contrato e menu em momentos diferentes;
- dificuldade de saber qual documento era a versão atual;
- coleta de escolha do cliente de forma não estruturada;
- repetição de dados entre Escolha de Menu, Relatório, Menu Final e OS;
- perda de observações operacionais;
- dependência da linha ativa da planilha;
- baixa visibilidade de processamento e erros;
- risco de limites do Apps Script ao criar muitos Forms/triggers.

## 3. Usuários e áreas

### Produção
Principal usuária. Precisa executar o fluxo sem conhecer detalhes de Apps Script ou banco técnico.

### Cliente
Interage por Google Form para registrar escolhas de degustação.

### Comercial
Origem do contrato e passagem de bastão para Produção.

### Cozinha, Compras A&B e Maitria/Salão
Recebem informações operacionais derivadas do Relatório e, principalmente, da OS.

## 4. Processo anterior

Fluxo mapeado originalmente:

```text
Evento fechado
-> Recebimento do contrato comercial
-> Passagem de bastão Comercial x Produção
-> Reunião inicial / definição de degustação
-> Escolha de Menu Degustação (quando aplicável)
-> Retorno do cliente
-> Relatório de Degustação
-> Menu Final + OS A&B
-> Cronocardápio
```

O mapeamento original previa também um caminho “Menu Final direto” quando não houvesse degustação.

`[PRECISA VALIDAR — o código atual é predominantemente orientado ao fluxo com degustação; não foi identificado um fluxo completo e explícito “sem degustação / Menu Final direto” na baseline V23.2.]`

O Cronocardápio constava como etapa futura/seguinte no mapeamento original, combinando OS com “Tempos e Movimentos”. Não foi identificado como funcionalidade implementada na baseline atual.

## 5. Evolução do escopo

### Fase 1 — planilha + Apps Script

O MVP começou com Google Sheets como painel e Apps Script para:

- extrair contrato;
- preencher `MENU_ANEXO_II`;
- gerar Escolha de Menu;
- criar Google Form;
- processar respostas;
- gerar documentos finais.

### Fase 2 — regras reais de contratos

Casos diferentes revelaram que regras hard-coded não eram sustentáveis. Foram adicionados:

- quantidades vindas do contrato;
- categorias desconhecidas sem invenção;
- +1 opção de degustação em categorias específicas;
- múltiplos aditivos;
- itens inclusos sem escolha;
- diferenciação entre bebidas fixas, bebidas adicionais e Bar;
- serviços opcionais;
- deduplicação e normalização de categorias.

### Fase 3 — robustez de documentos e pós-degustação

Foram resolvidos problemas de:

- formatação herdada no Google Docs;
- marcadores opcionais ausentes;
- observações que sumiam da OS;
- respostas de Forms antigos sem metadados completos;
- geração que travava por quantidade;
- mistura entre nome do prato e comentário operacional;
- formato de serviço por categoria;
- Camarim e Staff condicionais;
- itens contratados não degustados.

### Fase 4 — escalabilidade de Forms

O volume estimado era superior a 100 Forms Cliente/mês, além dos Forms Internos — cerca de 200 Forms/mês e aproximadamente 2.400/ano.

A arquitetura antiga usava:

- `FORM_META_<FORM_ID>` em Script Properties;
- um trigger instalável por Form.

Isso foi substituído por:

- `FORM_REGISTRY`;
- uma planilha central de respostas;
- um trigger central;
- um trigger diário de limpeza.

### Fase 5 — Mini Software

A planilha “crua” passou a ser considerada inadequada para a equipe. Surgiu a interface V22, inicialmente como modal dentro do Sheets.

Evoluções de UX:

- cards, filtros e ações por evento;
- remoção do conceito de rascunho;
- criação real de evento;
- correção de loading e versão de front;
- separação entre criar linha e extrair;
- operação por `ID_EVENTO`.

### Fase 6 — Web App full-screen

A V23 tornou a interface um Web App de tela cheia, com:

- progresso e ETA;
- revisão no próprio software;
- erro/retentativa;
- operação por ID em vez de linha ativa;
- todos os links do evento.

### Fase 7 — Produção pós-degustação

A V23.1 ajustou a experiência de Produção:

- escolhas do cliente pré-marcadas no Form Interno;
- remoção de campos operacionais absurdos de bebidas/estrutura;
- DateItem e datas sugeridas para Staff;
- Form Interno deixa de gerar final automaticamente;
- Menu Final + OS só é liberado após resposta interna;
- auto-sync;
- atualizar PDF após editar DOC;
- botão de fechar a visão do evento.

### Fase 8 — performance e workflow de aditivo

A V23.2:

- introduziu lazy loading e caches;
- evitou abrir Forms a cada troca de cliente;
- adicionou `ADITIVO_WORKFLOW`;
- criou análise de aditivo antes da aplicação;
- definiu comportamento distinto para antes da degustação, depois e após OS;
- preservou referências de versões anteriores.

## 6. Situação atual

Baseline mais recente identificada:

```text
Backend: MVP_A&B.gs V23.1
Controller/Web APIs: MiniSoftware.gs V23.2
Frontend HTML: MVP_AB_App.html V23.2
Persistência: Google Sheets
Forms: arquitetura central V21.2 incorporada no backend atual
```

A equipe de Produção estava prestes a iniciar testes operacionais quando o handoff para Codex foi solicitado.

## 7. Princípio de produto consolidado

O objetivo deixou de ser “automatizar uma planilha” e passou a ser:

> oferecer um software operacional em que a Produção consiga entender o estado do evento, revisar dados, executar a próxima etapa, tratar erros e acessar documentos sem sair da interface.

A planilha deve permanecer backend técnico, não interface cotidiana.


===== docs/REGRAS_NEGOCIO.md =====

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


===== docs/ARQUITETURA.md =====

# ARQUITETURA.md

## 1. Visão geral

O sistema é um **monólito Apps Script** distribuído em arquivos lógicos, com Google Sheets como persistência e um Web App HTML como interface.

```mermaid
flowchart TB
    Browser[Usuária - Browser] --> HTML[MVP_AB_App.html V23.2]
    HTML -->|google.script.run| FrontAPI[MiniSoftware.gs V23.2]
    FrontAPI --> Core[MVP_A&B.gs V23.1]
    FrontAPI --> Sheets[(Planilha Painel)]
    Core --> Sheets
    Core --> Drive[Google Drive]
    Core --> Docs[Google Docs]
    Core --> Forms[Google Forms]
    Core --> OpenAI[OpenAI Responses API]
    Forms --> Central[(CENTRAL - RESPOSTAS FORMS A&B)]
    Central --> Trigger[onCentralFormSubmit]
    Trigger --> Core
    Cleanup[Trigger diário] --> Core
```

Embora existam arquivos “frontend” e “backend”, todos os `.gs` vivem no mesmo namespace global do projeto Apps Script. Uma função definida duas vezes em arquivos distintos pode conflitar.

## 2. Frontend

### HTML
Arquivo: `frontend/MVP_AB_App.html`.

Responsabilidades:

- renderização da lista lateral;
- filtros e pesquisa;
- workspace do evento;
- stepper de status;
- abas `Visão geral`, `Revisão da extração`, `Arquivos`, `Erros & histórico`, `Aditivos`;
- modal de novo evento;
- tela de processamento;
- feedback/Toast;
- auto-sync;
- cache no cliente para dados lazy já carregados.

A comunicação é feita por `google.script.run` para funções server-side de `MiniSoftware.gs`.

### Performance / lazy loading V23.2

Ao selecionar evento:

1. renderiza imediatamente dados já existentes na sidebar;
2. chama `apiObterEventoShellAB()` para estado leve;
3. só carrega revisão ao abrir a tab;
4. só carrega LOG ao abrir histórico;
5. só carrega aditivos ao abrir a tab correspondente;
6. estado do Form Interno vem principalmente do `FORM_REGISTRY`, evitando `FormApp.openById()` na navegação.

Auto-sync:

- evento aberto: endpoint leve em intervalo de ~10s;
- sidebar: atualização aproximadamente a cada 30s.

## 3. Controller/API do Web App

Arquivo: `frontend/MiniSoftware.gs` V23.2.

### Funções de entrada principais

- `doGet()`
- `abrirMiniSoftwareAB()`
- `apiHealthcheckFrontAB()`
- `apiPainelInicialAB()`
- `apiResumoPainelAB()`
- `apiListarEventosPainelAB()`
- `apiCriarEventoAB()`
- `apiBuscarEventoDetalheAB()`
- `apiObterEventoShellAB()`
- `apiObterEstadoLeveEventoAB()`
- `apiObterRevisaoExtracaoAB()`
- `apiSalvarRevisaoExtracaoAB()`
- `apiObterHistoricoEventoAB()`
- `apiAtualizarPdfDocumentoAB()`
- `apiExecutarAcaoAB()`
- `apiObterProgressoAB()`
- `apiObterAditivosEventoAB()`
- `apiAnalisarAditivoAB()`
- `apiAplicarAditivoAB()`

### Cache

Constantes V23.2:

- `AB_V232_EVENT_LIST`
- `AB_V232_EVENT_ROW_<ID>`
- `AB_V232_FORM_STATE_<...>`
- `AB_PROGRESS_<token>`

`CacheService` é otimização, não fonte de verdade.

### Locks

Ações de usuário usam predominantemente `LockService.getUserLock()`.

**Consequência:** o lock serializa ações do mesmo usuário, não necessariamente de dois usuários diferentes atuando no mesmo evento. Ver `BUGS_E_LIMITACOES.md`.

## 4. Backend de negócio

Arquivo: `backend/MVP_A&B.gs` V23.1.

### Domínios internos

#### Setup / infraestrutura
- `prepararEstrutura()`
- `prepararProducaoEscalavel()`
- `garantirInfraFormsEscalavel()`
- `diagnosticarArquiteturaForms()`
- `testarConfiguracoes()`

#### Extração
- `obterPdfContrato()`
- `obterAditivosComoPdf()`
- `extrairContratoComIA()`
- `normalizarExtracao()`

#### Dados
- `gravarMenu()`
- `gravarTerceiros()`
- `gravarAditivosAplicados()`
- `carregarDadosEvento()`
- agrupadores/normalizadores

#### Cliente
- `gerarDocumentoEscolha()`
- `criarFormularioCliente()`
- `processarRespostaCliente()`

#### Forms escaláveis
- `registrarFormularioEscalavel()`
- `localizarAbaRespostaDoFormulario_()`
- `onCentralFormSubmit()`
- `obterMetaFormulario()`
- `limparFormsEscalaveisExpirados()`
- `marcarFormularioInternoProcessado()`
- legado: `onAnyFormSubmit()`

#### Pós-degustação
- `criarFormularioInterno()`
- `registrarRespostaInternaParaAprovacao_()`
- `processarRespostaInterna()`
- `resolverCategoriasMenuFinal()`
- `resolverServicosCategorias()`
- `complementarParsedComRespostasSalvas()`

#### Documentos
- `gerarDocumento()`
- `prepararMarcadoresOpcionais()`
- `inserirBlocoEstruturado()`
- `removerParagrafoMarcadorSeguro_()`
- `validarModelosFinais()`

#### Diagnóstico / recuperação
- `diagnosticarFormularioInternoLinhaAtiva()`
- `gerarMenuFinalEOsUltimaRespostaLinhaAtiva()`
- `recriarFormularioInternoUltimaRespostaClienteLinhaAtiva()`

As funções “LinhaAtiva” permanecem como ferramentas administrativas/legadas; o Web App não deve depender delas.

## 5. Persistência

A planilha painel contém:

- `EVENTOS`
- `MENU_ANEXO_II`
- `TERCEIROS_REGISTRO`
- `RESPOSTAS`
- `ADITIVOS_APLICADOS`
- `FORM_REGISTRY`
- `LOG`
- `ADITIVO_WORKFLOW` (V23.2, criada pelo controller quando necessário)

Uma segunda planilha técnica, `CENTRAL - RESPOSTAS FORMS A&B`, recebe as abas de resposta dos Forms ativos.

Schema completo: `BANCO_DADOS.md`.

## 6. Arquitetura dos Forms

```mermaid
sequenceDiagram
    participant App as Backend
    participant Form as Google Form
    participant Reg as FORM_REGISTRY
    participant Central as Planilha Central
    participant Tr as onCentralFormSubmit

    App->>Form: criar Form
    App->>Central: Form.setDestination(SPREADSHEET)
    App->>Reg: registrar FORM_ID + META_JSON
    Note over App,Reg: STATUS ATIVO ou AGUARDANDO_VINCULO
    Form-->>Central: resposta
    Central->>Tr: trigger onFormSubmit
    Tr->>Reg: localizar por response sheet
    alt vínculo ainda não reconciliado
        Tr->>Central: Sheet.getFormUrl()
        Tr->>Reg: atualizar RESPONSE_SHEET_ID / STATUS
    end
    Tr->>App: processar resposta
```

### Cliente
Primeira resposta -> Relatório + Form Interno -> Form Cliente fechado -> registry aguardando limpeza imediata.

### Interno
Resposta -> gravada -> `RESPONDIDO_AGUARDANDO_GERACAO`. Só depois do clique final o registry vira `PROCESSADO` e recebe `EXPIRA_EM = +14 dias`.

## 7. Geração de documentos

Templates são Google Docs identificados por Script Properties.

Pipeline:

```mermaid
flowchart LR
    T[Template Google Docs] --> C[Cópia na pasta do evento]
    C --> R[Substituição de marcadores]
    R --> B[Inserção de blocos estruturados]
    B --> L[Limpeza de marcadores]
    L --> D[DOC final]
    D --> P[PDF]
```

Em falha durante `gerarDocumento()`, a cópia incompleta deve ser enviada à lixeira.

## 8. Integração OpenAI

`extrairContratoComIA()` chama `https://api.openai.com/v1/responses` com:

- Bearer `OPENAI_API_KEY`;
- modelo de `OPENAI_MODEL`;
- PDFs base64;
- instrução/prompt de domínio;
- retorno forçado por JSON Schema.

A análise de aditivo V23.2 também usa a Responses API, mas com schema específico de comparação do novo aditivo.

## 9. Workflow de aditivo

A lógica V23.2 reside hoje no **controller** `MiniSoftware.gs`, não no backend V23.1. Isso é arquitetura real, embora concentre regra de negócio na camada de Web App.

```mermaid
flowchart TD
    L[Link novo aditivo] --> A[apiAnalisarAditivoAB]
    A --> AI[OpenAI compara contrato + anteriores + novo]
    AI --> R{Pertence ao contrato?}
    R -- Não --> X[REJEITADO]
    R -- Sim --> S[ANALISADO]
    S --> C{Usuária confirma Aplicar?}
    C -- Não --> S
    C -- Sim --> P[apiAplicarAditivoAB]
    P --> F[Reextrair contrato + TODOS aditivos]
    F --> D[Diff antes/depois]
    D --> E{Impacta fluxo A&B?}
    E -- Não --> V[Atualizar consolidado sem invalidar]
    E -- Sim --> M{Estágio}
    M -- Antes degustação --> RD[Voltar revisão / regenerar Cliente]
    M -- Depois degustação --> RI[Novo Form Interno]
    M -- Após OS --> RO[Novo Form Interno + nova versão final]
```

## 10. Deployment/autenticação

O Web App é uma implantação Apps Script. `doGet()` retorna `HtmlService.createHtmlOutputFromFile('MVP_AB_App')`.

Configuração final de acesso no ambiente real: `[PRECISA VALIDAR]`.

Triggers instaláveis pertencem ao usuário que os criou. Após mudança de conta/proprietário, é obrigatório validar que os triggers centrais pertencem à conta de produção.

## 11. Ausência de infraestrutura tradicional

Não foram identificados:

- servidor Node/Python dedicado;
- banco SQL;
- Docker;
- CI/CD;
- testes automatizados unitários;
- Git/repositório original conectado;
- framework frontend externo.

`[NÃO IDENTIFICADO NA CONVERSA]` se qualquer um desses componentes existir fora do material fornecido.


## Apêndice A — funções identificadas no backend V23.1

- `onOpen()`
- `prepararEstrutura()`
- `prepararProducaoEscalavel()`
- `garantirInfraFormsEscalavel()`
- `obterPlanilhaPainel()`
- `moverArquivoParaPastaDoPainel()`
- `garantirGatilhoCentralForms()`
- `garantirGatilhoLimpezaForms()`
- `diagnosticarArquiteturaForms()`
- `criarOuAtualizarAba()`
- `testarConfiguracoes()`
- `extrairContratoLinhaAtiva()`
- `gerarEscolhaEFormularioLinhaAtiva()`
- `obterContextoLinhaAtiva()`
- `validarCamposIniciais()`
- `obterPdfContrato()`
- `obterAditivosComoPdf()`
- `extrairLinksGoogleMultiplos()`
- `extrairContratoComIA()`
- `obterOutputText()`
- `normalizarExtracao()`
- `ehBebidaOuFinalizacaoFixa()`
- `ehServicoContratadoOpcional()`
- `saoSomenteBebidasFixas()`
- `normalizarTituloServicoContratado()`
- `calcularQuantidadeMaximaDegustacao()`
- `obterRegraInterna()`
- `gravarMenu()`
- `gravarTerceiros()`
- `gravarAditivosAplicados()`
- `limparDadosEvento()`
- `removerLinhasPorId()`
- `carregarDadosEvento()`
- `lerLinhasPorEvento()`
- `agruparCardapioCompleto()`
- `agruparMenu()`
- `ehCategoriaNaoDegustada()`
- `montarCategoriasNaoDegustadas()`
- `montarSecoesNaoDegustadas()`
- `montarTextoNaoDegustados()`
- `agruparTerceiros()`
- `validarDadosAntesDoFormulario()`
- `gerarDocumentoEscolha()`
- `criarFormularioCliente()`
- `registrarFormularioEscalavel()`
- `localizarAbaRespostaDoFormulario_()`
- `onCentralFormSubmit()`
- `onAnyFormSubmit()`
- `registrarRespostaInternaParaAprovacao_()`
- `processarRespostaCliente()`
- `criarFormularioInterno()`
- `adicionarFluxoCamarimStaff()`
- `adicionarBlocoStaffPadrao()`
- `formatarCamarim()`
- `formatarStaffPadrao()`
- `formatarContratacaoStaffCliente()`
- `adicionarConfiguracaoServicoCategoria()`
- `adicionarCampoInterno()`
- `categoriaPermiteConfiguracaoOperacional_()`
- `criarUrlPreenchidoFormularioInterno_()`
- `obterDataPadraoCampoInterno_()`
- `extrairDataOperacao_()`
- `normalizarRespostaFormulario_()`
- `recriarFormularioInternoUltimaRespostaClienteLinhaAtiva()`
- `gerarMenuFinalEOsUltimaRespostaLinhaAtiva()`
- `diagnosticarFormularioInternoLinhaAtiva()`
- `montarDiagnosticoFormularioInterno()`
- `validarFormularioInternoDoEvento()`
- `validarModelosFinais()`
- `validarModeloFinalIndividual()`
- `processarRespostaInterna()`
- `lerRespostaFormulario()`
- `complementarParsedComRespostasSalvas()`
- `obterUltimoLoteRespostasInternas()`
- `mapearPerguntaServicoCategoria()`
- `encontrarChaveCardapioPorNome()`
- `mapearPerguntaParaCampoInterno()`
- `mapearPerguntaParaCategoriaExtra()`
- `encontrarChaveCategoriaPorNome()`
- `gravarRespostas()`
- `montarSecoesSelecionadas()`
- `limparTituloCategoria()`
- `montarTituloCategoria()`
- `montarRegraDegustacao()`
- `separarItensCampoLivre()`
- `resolverServicosCategorias()`
- `normalizarModoServico()`
- `formatarServicoCategoria()`
- `adicionarServicosNasSecoes()`
- `resumirTiposServico()`
- `resolverCategoriasMenuFinal()`
- `consolidarObservacoesCozinha()`
- `mesclarAvisos()`
- `combinarCategoriasComExtras()`
- `validarQuantidadesMenuFinal()`
- `formatarQuantidade()`
- `montarReplacementsBasicos()`
- `montarBlocoComplementarOs()`
- `montarBlocoObservacoesOs()`
- `formatarAlimentacaoStaff()`
- `montarResumoAditivos()`
- `gerarDocumento()`
- `prepararMarcadoresOpcionais()`
- `inserirMarcadorNaoDegustados()`
- `inserirMarcadorServicosContratados()`
- `elementoEstaEmParagrafoDoCorpo()`
- `inserirBlocoEstruturado()`
- `removerParagrafoMarcadorSeguro_()`
- `removerMarcadoresRestantes()`
- `salvarRegistroFormulario()`
- `obterAbaFormRegistry()`
- `lerRegistrosForms()`
- `buscarRegistroFormulario()`
- `buscarRegistroFormPorResponseSheetId()`
- `atualizarRegistroFormulario()`
- `obterMetaFormulario()`
- `salvarMetaFormulario()`
- `criarGatilhoFormulario()`
- `parseJsonArray()`
- `adicionarDias()`
- `arquivarFormularioEscalavel()`
- `limparFormsEscalaveisExpirados()`
- `marcarFormularioInternoProcessado()`
- `limparFormMetaLegadosConcluidos()`
- `buscarEvento()`
- `atualizarEventoPorId()`
- `atualizarEvento()`
- `registrarLog()`
- `executarComTratamento()`
- `extrairIdGoogle()`
- `gerarIdEvento()`
- `removerDuplicidadesMenu()`
- `removerDuplicidadesTexto()`
- `normalizarChaveAgrupamento()`
- `normalizarTextoComparacao()`
- `normalizarChave()`
- `removerAcentos()`
- `escaparRegex()`
- `escaparReplacement()`
- `nomeSeguro()`
- `texto()`

## Apêndice B — funções identificadas no MiniSoftware V23.2

- `doGet()`
- `abrirMiniSoftwareAB()`
- `apiHealthcheckFrontAB()`
- `apiPainelInicialAB()`
- `apiResumoPainelAB()`
- `apiListarEventosPainelAB()`
- `apiListarResponsaveisAB()`
- `apiListarStatusAB()`
- `apiCriarEventoAB()`
- `apiBuscarEventoDetalheAB()`
- `apiObterWorkspaceEventoAB()`
- `apiObterEventoShellAB()`
- `apiObterEstadoLeveEventoAB()`
- `obterEstadoFormularioInternoAB_()`
- `apiAtualizarPdfDocumentoAB()`
- `obterConfigDocumentoPdfAB_()`
- `atualizarConteudoArquivoPdfAB_()`
- `gerarLinkLinhaEventoAB_()`
- `apiObterRevisaoExtracaoAB()`
- `apiSalvarRevisaoExtracaoAB()`
- `apiObterHistoricoEventoAB()`
- `determinarProximaAcaoAB_()`
- `determinarAcaoRetentativaAB_()`
- `apiObterProgressoAB()`
- `setProgressoAB_()`
- `obterEstimativasTempoAB_()`
- `registrarDuracaoAcaoAB_()`
- `apiExecutarAcaoAB()`
- `executarAcaoDiretaAB_()`
- `executarExtracaoPorIdAB_()`
- `gerarEscolhaFormPorIdAB_()`
- `reprocessarClientePorIdAB_()`
- `recriarFormInternoPorIdAB_()`
- `gerarFinalOsPorIdAB_()`
- `ehErroTecnicoRetentavelAB_()`
- `podeRetentarSemDuplicarAB_()`
- `invalidarCacheEventosAB_()`
- `buscarEventoRapidoAB_()`
- `lerEventoDaLinhaAB_()`
- `calcularResumoEventosAB_()`
- `filtrarEventosPainelAB_()`
- `listarResponsaveisDeEventosAB_()`
- `listarStatusDeEventosAB_()`
- `garantirInfraAditivosFrontAB_()`
- `apiObterAditivosEventoAB()`
- `obterResumoAditivoEventoAB_()`
- `lerWorkflowAditivosEventoAB_()`
- `buscarWorkflowAditivoAB_()`
- `atualizarWorkflowAditivoAB_()`
- `sugerirEstagioAditivoAB_()`
- `validarEstagioAditivoAB_()`
- `apiAnalisarAditivoAB()`
- `analisarNovoAditivoComIA_()`
- `montarPlanoPreliminarAditivoAB_()`
- `apiAplicarAditivoAB()`
- `validarEstagioContraEstadoAB_()`
- `capturarSnapshotContratualAB_()`
- `snapshotDeNormalizadoAB_()`
- `compararEstadosContratuaisAB_()`
- `indexarMenuDiffAB_()`
- `indexarTerceirosDiffAB_()`
- `normalizarChaveDiffAB_()`
- `capturarArtefatosEventoAB_()`
- `montarPlanoFinalAditivoAB_()`
- `aplicarPlanoFluxoAditivoAB_()`
- `arquivarFormularioAditivoSeguroAB_()`
- `deduplicarLinksAditivosAB_()`
- `rotuloEstagioAditivoAB_()`
- `lerEventosPainelAB_()`
- `mapearEventoFrontAB_()`
- `aplicarFiltrosFrontAB_()`
- `ordenarEventosFrontAB_()`
- `validarNovoEventoFrontAB_()`
- `gerarIdEventoFrontAB_()`
- `parseJsonSeguroFrontAB_()`
- `serializarObjetoFrontAB_()`
- `normalizarBooleanFrontAB_()`
- `formatarDataFront_()`
- `formatarDataHoraFront_()`
- `formatarDataInputFront_()`
- `converterStringParaDataFront_()`
- `normalizarDataFront_()`


===== docs/FLUXOS.md =====

# FLUXOS.md

## 1. Novo evento

**Trigger:** usuária clica `+ Novo evento`.  
**Processamento:** `apiCriarEventoAB(payload)` valida campos, cria `ID_EVENTO`, adiciona linha em `EVENTOS` com `STATUS=NOVO`.  
**Validações:** links Drive de contrato/pasta; responsável; data/horário/local/Pax.  
**Resultado:** evento visível na sidebar. Se “Criar e já extrair” estiver marcado, o frontend chama a extração em uma chamada separada.  
**Erros:** a linha permanece criada mesmo se a extração falhar.

```mermaid
flowchart LR
A[+ Novo evento] --> B[Validar payload]
B --> C[Criar linha STATUS NOVO]
C --> D{Extrair agora?}
D -- Não --> E[Evento NOVO]
D -- Sim --> F[Fluxo de extração]
```

## 2. Extração do contrato

**Trigger:** ação `EXTRACAO`.  
**Processamento:**

1. validar evento;
2. abrir contrato PDF;
3. abrir links de aditivos já vinculados;
4. chamar `extrairContratoComIA()`;
5. normalizar saída;
6. limpar dados filhos atuais do evento;
7. gravar menu, terceiros e aditivos aplicados;
8. atualizar JSONs/valores/avisos;
9. `STATUS=AGUARDANDO_REVISAO`.

**Validações:** links, resposta OpenAI/schema, regras de identidade/aditivos.  
**Resultado:** estado contratual estruturado disponível para revisão.  
**Erros possíveis:** Drive inacessível, PDF inválido, OpenAI indisponível/schema, inconsistências; evento -> `ERRO`, LOG preenchido.

## 3. Revisão da extração no Web App

**Trigger:** abrir tab Revisão.  
**Processamento:** `apiObterRevisaoExtracaoAB()` carrega sob demanda cabeçalho, menu, terceiros, aditivos e avisos.  
**Validações:** revisão humana.  
**Resultado:** usuário pode editar cabeçalho e menu e salvar. `apiSalvarRevisaoExtracaoAB()` revalida dados.  
**Limitação:** terceiros/aditivos são exibidos, mas a UI atual não oferece edição equivalente para todos os registros; ver limitações.

## 4. Aprovar e gerar Escolha + Form Cliente

**Trigger:** ação `GERAR_ESCOLHA_FORM`.  
**Pré-condição:** dados aprovados e `validarDadosAntesDoFormulario()` sem bloqueios.  
**Processamento:**

- carregar dados;
- gerar Escolha DOC/PDF via template;
- criar Form Cliente;
- registrar Form na arquitetura central;
- salvar links/IDs;
- `STATUS=AGUARDANDO_CLIENTE`.

**Erros:** ausência de quantidade selecionável, template, Drive/Forms, registro central. Retentativa só quando segura.

## 5. Resposta do Form Cliente

**Trigger:** Google Sheets installable `onFormSubmit` na planilha central.  
**Processamento:**

1. localizar `FORM_REGISTRY` por response sheet;
2. se necessário, reconciliar via `Sheet.getFormUrl()`;
3. obter `META_JSON`;
4. localizar respostas ainda não processadas;
5. `processarRespostaCliente()`;
6. gravar `RESPOSTAS` tipo `CLIENTE`;
7. gerar Relatório de Degustação;
8. criar Form Interno;
9. atualizar EVENTOS para `AGUARDANDO_POS_DEGUSTACAO`;
10. fechar Form Cliente;
11. registry `PROCESSADO`, expiração imediata para limpeza.

**Resultado:** Relatório + Form Interno disponíveis.  
**Erros:** registry não encontrado, metadata inválido, criação de Doc/Form, trigger/permissão.

## 6. Criação do Form Interno

**Trigger:** processamento da resposta Cliente ou recriação explícita.  
**Processamento:**

- construir categorias do cardápio completo;
- obter escolhas degustadas;
- criar campos só onde aplicável;
- criar Camarim/Staff condicionais;
- criar `DateItem` para datas;
- gerar URL pré-preenchida com escolhas/datas;
- registrar no `FORM_REGISTRY`;
- salvar `LINK_FORM_INTERNO` e `FORM_INTERNO_ID`.

**Resultado:** Form Interno operacional.

## 7. Resposta do Form Interno

**Trigger:** mesmo `onCentralFormSubmit`.  
**Processamento atual V23.1:**

1. `registrarRespostaInternaParaAprovacao_()`;
2. gravar lote `INTERNO` em `RESPOSTAS`;
3. EVENTOS permanece `AGUARDANDO_POS_DEGUSTACAO`;
4. FORM_REGISTRY -> `RESPONDIDO_AGUARDANDO_GERACAO`;
5. **não gerar** Menu Final/OS.

**Resultado:** Web App detecta resposta e libera próximo passo.

## 8. Gerar Menu Final + OS

**Trigger:** Produção clica `Gerar Menu Final + OS`.  
**Processamento:**

1. validar existência/resposta do Form Interno;
2. obter metadata;
3. ler última resposta;
4. complementar com `RESPOSTAS` para compatibilidade;
5. resolver categorias/quantidades;
6. resolver formatos de serviço;
7. montar observações;
8. gerar Menu Final DOC/PDF;
9. gerar OS DOC/PDF;
10. EVENTOS -> `MENU_FINAL_E_OS_GERADOS`;
11. marcar Form Interno `PROCESSADO` e expirar em 14 dias.

**Validações:** templates finais, respostas, metadados.  
**Ajustes não bloqueantes:** faltas/excessos viram avisos/placeholders.  
**Resultado:** evento Finalizado.

## 9. Correção/reenvio do Form Interno

Forms Internos ficam ativos por 14 dias após geração final para permitir correções. Nova resposta nesse período pode ser registrada como nova pendência de geração.

`[PRECISA VALIDAR — operacionalmente, definir procedimento explícito para distinguir “correção intencional” de reenvio acidental após finalização.]`

## 10. Atualizar PDF após editar DOC

**Trigger:** aba Arquivos -> `Atualizar PDF`.  
**Processamento:**

1. localizar DOC pelo link;
2. converter versão atual para PDF;
3. se existir PDF, tentar `PATCH` Drive API no mesmo `fileId`;
4. se falhar, criar novo PDF na pasta, tentar mandar antigo à lixeira e atualizar campo do evento;
5. registrar LOG.

**Tipos:** `ESCOLHA`, `RELATORIO`, `MENU_FINAL`, `OS`.

**Resultado:** PDF sincronizado ao DOC atual.

## 11. Retentativa automática

**Trigger:** falha durante `apiExecutarAcaoAB()`.  
**Condição:** mensagem classificada como técnica transitória e ação segura contra duplicidade.  
**Processamento:** aguardar ~3s e executar segunda tentativa.  
**Resultado:** sucesso ou evento `ERRO`.  
**Não se aplica:** erros de validação/revisão.

## 12. Workflow de aditivo — análise

**Trigger:** Aditivos -> link + estágio -> `Analisar aditivo`.  
**Processamento:**

1. validar link/PDF;
2. impedir usar contrato base como aditivo;
3. impedir link já aplicado;
4. criar registro `PROCESSANDO` em `ADITIVO_WORKFLOW`;
5. enviar contrato + aditivos anteriores + novo aditivo à OpenAI;
6. receber vínculo, confiança e diff semântico;
7. status `ANALISADO`, `REJEITADO` ou `ERRO`.

**Mutação do estado contratual:** nenhuma.

## 13. Workflow de aditivo — aplicação

**Trigger:** usuária confirma `Aplicar ao evento`.  
**Pré-condições:** workflow `ANALISADO` ou retentativa `ERRO_APLICACAO`; `pertence_ao_contrato=true`; estágio válido.  
**Processamento:**

1. snapshot de estado e artefatos atuais;
2. adicionar link sem duplicação;
3. reexecutar extração completa com contrato + todos os aditivos;
4. normalizar estado novo;
5. comparar antes/depois;
6. gravar novo estado consolidado;
7. executar plano de fluxo por estágio;
8. salvar impacto, ação e artefatos anteriores no workflow.

### 13.1 Antes da degustação

**Resultado:** reabre `AGUARDANDO_REVISAO`, invalida versão atual dos artefatos posteriores e exige nova Escolha/Form Cliente quando houver impacto A&B.

### 13.2 Depois da degustação

**Resultado:** preserva Escolha/Relatório, cria novo Form Interno, limpa final atual e exige nova geração.

### 13.3 Após OS

**Resultado:** preserva links do Menu Final/OS anterior, cria novo Form Interno e exige nova versão final.

### 13.4 Somente financeiro

**Resultado:** atualiza consolidado/valores sem invalidar fluxo operacional.

## 14. Limpeza diária de Forms

**Trigger:** time-based diário, configurado para hora 4.  
**Processamento:** `limparFormsEscalaveisExpirados()` avalia registros expirados, fecha/desvincula Forms, remove aba temporária e arquiva registry.  
**Cliente:** expiração após primeira resposta.  
**Interno:** +14 dias após geração final.

## 15. Reset de ambiente de teste

**Trigger:** execução manual de `limparAmbienteTesteAB()` + confirmação literal `LIMPAR TESTES`.  
**Processamento:** arquiva Forms, limpa dados abaixo dos cabeçalhos, remove `FORM_META_*`, triggers legados e abas temporárias da central.  
**Não usar em produção com dados reais.**  
**Limitação:** script é anterior à `ADITIVO_WORKFLOW`; essa aba não está na lista de limpeza.


===== docs/BANCO_DADOS.md =====

# BANCO_DADOS.md

## 1. Visão geral

Não existe banco relacional externo. A persistência é feita em **Google Sheets**.

Chave lógica principal: `ID_EVENTO`.

```mermaid
erDiagram
    EVENTOS ||--o{ MENU_ANEXO_II : ID_EVENTO
    EVENTOS ||--o{ TERCEIROS_REGISTRO : ID_EVENTO
    EVENTOS ||--o{ RESPOSTAS : ID_EVENTO
    EVENTOS ||--o{ ADITIVOS_APLICADOS : ID_EVENTO
    EVENTOS ||--o{ FORM_REGISTRY : ID_EVENTO
    EVENTOS ||--o{ LOG : ID_EVENTO
    EVENTOS ||--o{ ADITIVO_WORKFLOW : ID_EVENTO
```

## 2. Aba `EVENTOS`

Fonte de verdade do estado atual do evento.

| # | Campo | Tipo lógico | Origem / uso |
|---:|---|---|---|
| 1 | `ID_EVENTO` | string | chave do evento; gerado `AB-yyyyMMdd-HHmmss` |
| 2 | `LINK_CONTRATO` | URL/string | entrada |
| 3 | `LINK_PASTA_EVENTO` | URL/string | entrada |
| 4 | `RESP_PRODUCAO` | string | entrada |
| 5 | `DATA_DEGUSTACAO` | date | entrada |
| 6 | `HORARIO_DEGUSTACAO` | string | entrada |
| 7 | `LOCAL_DEGUSTACAO` | string | entrada |
| 8 | `PAX_DEGUSTACAO` | number | entrada |
| 9 | `STATUS` | enum | máquina de estado |
| 10 | `LINK_ESCOLHA_DOC` | URL | geração |
| 11 | `LINK_ESCOLHA_PDF` | URL | geração |
| 12 | `LINK_FORM_CLIENTE` | URL | geração |
| 13 | `LINK_RELATORIO_DOC` | URL | resposta cliente |
| 14 | `LINK_RELATORIO_PDF` | URL | resposta cliente |
| 15 | `LINK_FORM_INTERNO` | URL | resposta cliente/recriação |
| 16 | `LINK_MENU_FINAL_DOC` | URL | geração final |
| 17 | `LINK_MENU_FINAL_PDF` | URL | geração final |
| 18 | `LINK_OS_DOC` | URL | geração final |
| 19 | `LINK_OS_PDF` | URL | geração final |
| 20 | `JSON_CABECALHO` | JSON string | extração consolidada |
| 21 | `JSON_FIXOS` | JSON string | extração/normalização |
| 22 | `AVISOS_REVISAO` | string multiline | warnings não bloqueantes |
| 23 | `ERRO` | string | último erro relevante |
| 24 | `PROCESSADO_EM` | datetime | extração/processamento |
| 25 | `FORM_CLIENTE_ID` | string | Google Form ID |
| 26 | `FORM_INTERNO_ID` | string | Google Form ID |
| 27 | `LINKS_ADITIVOS` | string multiline | links dos aditivos correntes |
| 28 | `JSON_ADITIVOS` | JSON string | consolidação de aditivos |
| 29 | `VALOR_ADITIVOS` | number | total adicional |
| 30 | `VALOR_TOTAL_CONSOLIDADO` | number | total final consolidado |

### Status permitidos pela validação da V23.1

- `NOVO`
- `PROCESSANDO_CONTRATO`
- `AGUARDANDO_REVISAO`
- `AGUARDANDO_CLIENTE`
- `RELATORIO_GERADO`
- `AGUARDANDO_POS_DEGUSTACAO`
- `MENU_FINAL_E_OS_GERADOS`
- `ERRO`

O frontend também contém referências a `ARQUIVADO` em filtros/compatibilidade, porém esse valor não aparece na validação atual de `EVENTOS`. `[PRECISA VALIDAR — se ARQUIVADO é estado intencional de EVENTOS ou resíduo de versões anteriores.]`

### Risco de ID

`ID_EVENTO` atual usa precisão de segundos e não inclui aleatoriedade. Dois usuários diferentes criando evento no mesmo segundo podem, teoricamente, gerar colisão. Ver pendências.

## 3. Aba `MENU_ANEXO_II`

| Campo | Tipo lógico | Uso |
|---|---|---|
| `ID_EVENTO` | string | FK lógica |
| `GRUPO` | string | menu/grupo principal |
| `CATEGORIA` | string | categoria |
| `ITEM` | string | prato/item |
| `QTD_DEGUSTACAO` | number | máximo/exato do Form Cliente |
| `QTD_MENU_FINAL` | number | quantidade final contratada |
| `TIPO` | enum | classificação |

### Enum `TIPO`

- `SELECIONAVEL`
- `INCLUSO_CARDAPIO`
- `FIXO`
- `SERVICO_CONTRATADO`

## 4. Aba `TERCEIROS_REGISTRO`

| Campo | Tipo |
|---|---|
| `ID_EVENTO` | string |
| `TIPO` | string |
| `CATEGORIA` | string |
| `ITEM` | string |
| `INCLUIR_MENU_FINAL` | boolean |
| `INCLUIR_OS` | boolean |

Uso: registrar itens de terceiros (ilhas/doces/estações etc.) sem misturá-los ao menu degustável.

## 5. Aba `RESPOSTAS`

| Campo | Tipo |
|---|---|
| `ID_EVENTO` | string |
| `TIPO_FORMULARIO` | `CLIENTE` ou `INTERNO` |
| `PERGUNTA` | string |
| `RESPOSTA` | string |
| `DATA_RESPOSTA` | datetime |

Funções:

- histórico operacional;
- fallback para dados de Forms internos antigos quando `META_JSON` não mapeava campos corretamente.

## 6. Aba `ADITIVOS_APLICADOS`

| Campo | Tipo |
|---|---|
| `ID_EVENTO` | string |
| `ORDEM` | number/string |
| `DATA_ADITIVO` | string |
| `ARQUIVO` | string |
| `REFERENCIA_CONTRATO` | string |
| `TIPO_ALTERACAO` | string |
| `EFEITO_MENU` | enum/string |
| `RESUMO` | string |
| `VALOR_ADICIONAL` | number |

`EFEITO_MENU` do schema OpenAI usa:

- `SEM_ALTERACAO`
- `SUBSTITUICAO_TOTAL`
- `ALTERACAO_PARCIAL`
- `INCLUSAO`
- `REMOCAO`

Essa aba representa o resultado consolidado dos aditivos, diferente de `ADITIVO_WORKFLOW`, que registra o processo de análise/aplicação do novo aditivo.

## 7. Aba `FORM_REGISTRY`

| Campo | Tipo / uso |
|---|---|
| `FORM_ID` | chave do Form |
| `ID_EVENTO` | FK lógica |
| `TIPO` | `CLIENTE` / `INTERNO` |
| `STATUS` | estado do Form no workflow |
| `LINK_FORM` | URL publicada |
| `CENTRAL_SPREADSHEET_ID` | ID da central |
| `RESPONSE_SHEET_ID` | ID da aba temporária |
| `RESPONSE_SHEET_NAME` | nome da aba temporária |
| `META_JSON` | mapa das perguntas/categorias/campos |
| `RESPOSTAS_PROCESSADAS_JSON` | array de response IDs processados |
| `CRIADO_EM` | datetime |
| `ULTIMO_PROCESSAMENTO_EM` | datetime |
| `EXPIRA_EM` | datetime/vazio |
| `ERRO` | string |

### Status identificados

- `ATIVO`
- `AGUARDANDO_VINCULO`
- `PROCESSADO`
- `RESPONDIDO_AGUARDANDO_GERACAO`
- `ARQUIVADO`
- `ERRO`
- `ERRO_ARQUIVAMENTO`

`[PRECISA VALIDAR — podem existir valores legados adicionais em registros antigos.]`

### Estrutura de `META_JSON`

Cliente/Interno incluem conforme versão:

- `type`
- `eventId`
- `questionMap`
- `customCategoryFields`
- `categoryObservationFields`
- `serviceModeFields`
- `serviceHoursFields`
- `servicePointsFields`
- `fields`

Forms antigos podem ter metadata menor; por isso existe fallback em `RESPOSTAS`.

## 8. Aba `LOG`

| Campo | Tipo |
|---|---|
| `DATA` | datetime |
| `NIVEL` | `INFO`, `AVISO`, `ERRO` (identificados) |
| `ID_EVENTO` | string |
| `ETAPA` | string |
| `MENSAGEM` | string |

É a trilha técnica. O frontend carrega sob demanda.

## 9. Aba `ADITIVO_WORKFLOW` — V23.2

Criada automaticamente por `garantirInfraAditivosFrontAB_()`.

| Campo | Uso |
|---|---|
| `ID_EVENTO` | FK lógica |
| `ID_ADITIVO` | ID de workflow |
| `LINK_ADITIVO` | URL informada |
| `FILE_ID` | Drive file ID |
| `ARQUIVO` | nome do arquivo |
| `ESTAGIO` | momento do aditivo |
| `STATUS` | estado do workflow |
| `ANALISE_JSON` | saída da análise isolada |
| `IMPACTO_JSON` | diff/plano depois da aplicação |
| `ARTEFATOS_ANTERIORES_JSON` | snapshot de links anteriores |
| `ACAO_FLUXO` | plano final aplicado |
| `CRIADO_EM` | datetime |
| `APLICADO_EM` | datetime |
| `ERRO` | erro do workflow |

### Enum `ESTAGIO`

- `ANTES_DEGUSTACAO`
- `DEPOIS_DEGUSTACAO`
- `APOS_OS`

### Status identificados

- `PROCESSANDO`
- `ANALISADO`
- `REJEITADO`
- `APLICADO`
- `ERRO`
- `ERRO_APLICACAO`

## 10. JSON de cabeçalho

Schema OpenAI atual:

```json
{
  "numero_contrato": "",
  "evento": "",
  "local": "",
  "contratante": "",
  "data_evento": "",
  "horario": "",
  "numero_convidados": 0,
  "montagem": "",
  "desmontagem": "",
  "data_limite_menu": "",
  "valor_servicos": "",
  "valor_alimentos_bebidas": "",
  "valor_total": "",
  "dados_faturamento": "",
  "dados_contato": ""
}
```

## 11. JSON de consolidação de aditivos

Estrutura conhecida:

```text
consolidacao_aditivos
├── aditivos_encontrados
├── aditivos_aplicados[]
│   ├── ordem
│   ├── data_aditivo
│   ├── arquivo
│   ├── referencia_contrato
│   ├── tipo_alteracao
│   ├── efeito_menu
│   ├── resumo
│   └── valor_adicional
├── alimentacao_staff
│   ├── incluida
│   ├── quantidade
│   ├── valor_unitario
│   ├── valor_total
│   ├── menu
│   ├── tempo_servico
│   └── fonte
├── valor_total_original
├── valor_total_aditivos
├── valor_total_consolidado
└── alertas_identidade[]
```

## 12. JSON da análise de novo aditivo V23.2

```text
analise
├── pertence_ao_contrato : boolean
├── confianca : ALTA | MEDIA | BAIXA
├── referencia_contrato
├── resumo
├── inconsistencias[]
├── altera_menu : boolean
├── altera_valores : boolean
├── altera_operacao : boolean
├── recomenda_revisao_humana : boolean
└── alteracoes[]
    ├── area : CABECALHO | MENU | TERCEIROS | VALORES | STAFF | SERVICOS | BEBIDAS | OUTROS
    ├── acao : INCLUIR | ALTERAR | SUBSTITUIR | REMOVER | SEM_EFEITO
    ├── antes
    ├── depois
    └── impacto_fluxo
```

## 13. Planilha central de Forms

Arquivo: `CENTRAL - RESPOSTAS FORMS A&B`.

- aba permanente `CONTROLE`;
- abas temporárias criadas pelo Forms enquanto ativos;
- IDs/nome ficam no `FORM_REGISTRY`;
- trigger central está associado a essa planilha.

## 14. Script Properties

Configuração obrigatória:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `TEMPLATE_ESCOLHA_ID`
- `TEMPLATE_RELATORIO_ID`
- `TEMPLATE_MENU_FINAL_ID`
- `TEMPLATE_OS_ID`

Infra/config auto:

- `CENTRAL_RESPOSTAS_ID`
- `PAINEL_SPREADSHEET_ID`
- `METRICAS_TEMPO_AB`

Legado:

- `FORM_META_<FORM_ID>`

Valores reais: `[NÃO IDENTIFICADO NA CONVERSA]`.

## 15. Migrações/schema

- `prepararEstrutura()` cria/garante abas do backend V23.1 e valida status.
- `garantirInfraAditivosFrontAB_()` cria `ADITIVO_WORKFLOW` separadamente.
- alterações de schema devem ser idempotentes e preservar dados.
- `Reset_Producao.gs` não contempla `ADITIVO_WORKFLOW` na versão deste handoff.


===== docs/INTEGRACOES.md =====

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


===== docs/BUGS_E_LIMITACOES.md =====

# BUGS_E_LIMITACOES.md

## Bugs conhecidos ainda abertos / riscos a validar

### 1. Estágio `DEPOIS_DEGUSTACAO` valida apenas existência do Form Cliente

**Sintoma:** um aditivo pode ser aceito como “Depois da degustação” se `FORM_CLIENTE_ID` existir, mesmo que o cliente ainda não tenha respondido.  
**Impacto:** workflow pode preservar/reabrir etapas com semântica incorreta.  
**Condição:** `validarEstagioContraEstadoAB_()` verifica `FORM_CLIENTE_ID`, não resposta processada.  
**Tentativa de correção:** nenhuma identificada.  
**Hipótese:** simplificação da V23.2.  
**Prioridade:** Alta.  
**Aceite sugerido:** verificar evidência de resposta/Relatório/Form Interno antes de aceitar o estágio.

### 2. Aplicação de aditivo não é transação atômica completa

**Sintoma:** a aplicação regrava estado consolidado antes de executar todas as ações de fluxo (por exemplo, recriar Form Interno). Uma falha posterior pode deixar contrato/menu atualizado, mas workflow em `ERRO_APLICACAO`.  
**Impacto:** estado parcialmente aplicado.  
**Condição:** falha depois da escrita do novo estado e antes da conclusão do plano.  
**Tentativa:** `ERRO_APLICACAO` permite retentativa e links são deduplicados.  
**Hipótese:** ausência de transação nativa entre Sheets/Drive/Forms.  
**Prioridade:** Crítica/Alta.  
**Aceite:** implementar plano idempotente por fases/checkpoints ou rollback do snapshot.

### 3. Potencial colisão de `ID_EVENTO`

**Sintoma:** `AB-yyyyMMdd-HHmmss` tem precisão de segundo.  
**Impacto:** dois usuários criando no mesmo segundo podem gerar mesmo ID.  
**Condição:** criação concorrente por usuários diferentes; `UserLock` não é global.  
**Tentativa:** nenhuma identificada.  
**Prioridade:** Alta antes de escalar equipe.  
**Aceite:** acrescentar componente aleatório/UUID e manter compatibilidade.

### 4. Concorrência por evento entre usuários

**Sintoma:** duas colaboradoras podem executar mutações no mesmo evento simultaneamente.  
**Impacto:** links/estado podem ser sobrescritos ou artefatos duplicados.  
**Condição:** `getUserLock()` serializa por usuário, não por evento entre usuários.  
**Prioridade:** Alta.  
**Aceite:** lock global curto + chave de operação/evento ou mecanismo de optimistic concurrency.

### 5. Reset de Produção não limpa `ADITIVO_WORKFLOW`

**Sintoma:** reset limpa abas antigas, mas V23.2 adicionou `ADITIVO_WORKFLOW` depois.  
**Impacto:** testes de aditivo permanecem no backend após reset.  
**Condição:** executar `limparAmbienteTesteAB()` após usar V23.2.  
**Prioridade:** Média/Alta para ambientes de teste.  
**Aceite:** adicionar a aba à rotina com preservação de cabeçalho.

### 6. Histórico de artefatos de aditivo é por link, não cópia imutável

**Sintoma:** `ARTEFATOS_ANTERIORES_JSON` preserva URLs.  
**Impacto:** se o arquivo apontado for posteriormente alterado/substituído, o “histórico” pode não representar conteúdo imutável.  
**Prioridade:** Média.  
**Aceite:** `[PRECISA VALIDAR]` requisito de auditoria; se necessário, criar cópia versionada/imutável por aplicação.

### 7. Edição completa da revisão ainda não cobre todos os dados visíveis

**Sintoma:** cabeçalho e menu são editáveis no Web App; terceiros/aditivos aparecem na revisão, mas não possuem edição equivalente identificada.  
**Impacto:** correção de terceiro pode exigir backend/planilha, contrariando objetivo “tudo no software”.  
**Prioridade:** Média.  
**Aceite:** UI segura para editar terceiros ou ação de reextração/correção específica.

### 8. Sincronização do Form Cliente precisa de validação real

**Histórico:** usuário observou que o Form Cliente “só atualizou” após clicar numa aba da planilha. O trigger central não deveria depender disso. V23.1 adicionou polling 10s/30s para a interface.  
**Impacto:** risco de atraso ou percepção de travamento.  
**Prioridade:** Alta no smoke test.  
**Aceite:** enviar Form Cliente com Web App aberto e confirmar transição sem qualquer interação com Sheets.

### 9. Deployment/autorizações V23.2 não confirmados

**Sintoma:** não há registro explícito nesta conversa confirmando publicação da V23.2 e smoke test completo.  
**Prioridade:** Crítica operacional antes de mudanças.  
**Aceite:** confirmar `V23.2 • conectado`, triggers, permissões e fluxo ponta a ponta.

### 10. Estado `ARQUIVADO` em EVENTOS é inconsistente

Frontend trata `ARQUIVADO` como possível status, mas a validação criada em `EVENTOS` não inclui esse valor.  
**Prioridade:** Baixa/Média.  
**Aceite:** decidir se o estado pertence apenas a Forms ou também a EVENTOS.

### 11. Reenvio de Form Interno após finalização pode reabrir fluxo

Forms Internos são mantidos ativos por 14 dias para correções. Nova resposta é processável e pode colocar o evento novamente em `AGUARDANDO_POS_DEGUSTACAO`. Isso pode ser intencional para correção, mas também ocorrer por reenvio acidental.  
**Prioridade:** Média.  
**Aceite:** definir UX/política de “nova revisão” ou bloquear após geração e oferecer ação explícita de reabrir.

### 12. Função legada `obterRegraInterna()`

Existe função com regras hard-coded antigas, aparentemente sem call sites relevantes na baseline atual.  
**Impacto:** confusão para novo desenvolvedor e risco de reuso indevido.  
**Prioridade:** Baixa.  
**Aceite:** confirmar dead code e remover em refatoração controlada.

---

## Bugs corrigidos

### Quantidades hard-coded / categorias novas
**Problema:** menus diferentes falhavam ou exigiam regras específicas.  
**Causa:** dependência de caso Valentina.  
**Solução:** V4 passou a extrair `ESCOLHER X OPÇÕES` do contrato; V3 não inventa quantidade.  
**Não regressar:** nunca reintroduzir tabela fixa por contrato.

### Marca-texto vazando para pratos
**Problema:** itens herdavam vermelho/amarelo/negrito da regra.  
**Causa:** formatação de parágrafo do Google Docs herdada.  
**Solução:** V5 define estilo explicitamente para título, regra, item e espaçador.

### Aditivos não consolidados
**Problema:** contrato base não refletia aditivos posteriores.  
**Solução:** V6 adicionou múltiplos aditivos, precedência e `ADITIVOS_APLICADOS`.

### Opções duplicadas no Forms
**Problema:** Google Forms rejeita alternativas iguais.  
**Causa:** item duplicado no contrato.  
**Solução:** V10 deduplica ao gravar, carregar e criar pergunta.

### Categoria duplicada/dividida por caracteres invisíveis
**Problema:** duas perguntas visualmente iguais.  
**Solução:** V11 normaliza categoria/grupo, ignora invisíveis/pontuação/acento e consolida.

### Itens inclusos sumiam ou eram classificados errado
**Problema:** categoria gastronômica sem `ESCOLHER X` não aparecia adequadamente.  
**Solução:** V12 `INCLUSO_CARDAPIO`.

### Marcador opcional ausente travava geração
**Problema:** `{{BLOCO_SERVICOS_CONTRATADOS}}` ausente.  
**Solução:** V13 cria posição automaticamente; limpa docs incompletos em erro.

### Links finais ausentes quando trigger não rodava
**Problema:** Menu Final/OS não apareciam.  
**Solução:** V14 diagnóstico + geração manual a partir da última resposta; erro de trigger escrito em EVENTOS.

### Quantidade interna bloqueava geração
**Problema:** checklist + campo livre excedia quantidade e interrompia.  
**Solução:** V15 tornou ajuste não bloqueante. V16 alterou prioridade para checklist.

### Comentário virava prato no Menu Final
**Problema:** texto do campo livre podia entrar como item.  
**Solução:** V16 separa `Outro prato` de `Observações para cozinha` e dá prioridade ao checklist.

### Informações internas sumiam da OS
**Problema:** template/metadata incompletos.  
**Solução:** V17 bloco complementar; V18 fallback em `RESPOSTAS` + bloco de observações.

### Campos de serviço inadequados em bebidas/estrutura
**Problema:** “Formato de serviço - Cerveja Heineken” etc.  
**Solução:** V23.1 `categoriaPermiteConfiguracaoOperacional_()`.

### Form interno gerava final cedo demais
**Problema:** submit disparava Menu Final/OS antes da revisão final.  
**Solução:** V23.1 submit só registra; geração exige clique.

### Último parágrafo do Google Docs
**Problema:** `Não é possível remover o último parágrafo em uma seção do documento.`  
**Causa:** `removeFromParent()` no último parágrafo.  
**Solução:** V21.1 `removerParagrafoMarcadorSeguro_()`.

### Aba de resposta central não identificada
**Problema:** `Não foi possível identificar a aba de respostas criada na planilha central.`  
**Causa:** atraso de propagação após `setDestination`.  
**Solução:** V21.2 reabre planilha, usa `Sheet.getFormUrl()` e aceita `AGUARDANDO_VINCULO`.

### Painel V22 travado em “Carregando”
**Problema:** resposta HTML não chegava.  
**Causa:** `Date` e objeto raw não serializáveis + nomes inconsistentes.  
**Solução:** V22.1 serialização explícita e nomes corrigidos.

### Botão Criar evento sem ação
**Problema:** front/back fora de versão.  
**Solução:** V22.3 healthcheck, botão só habilita com versão compatível, listeners e chamadas separadas.

### Dependência de linha ativa
**Problema:** precisava fechar software e selecionar linha na planilha.  
**Solução:** V23 ações por `ID_EVENTO`.

### UI pequena/modal
**Problema:** planilha aparecia ao fundo.  
**Solução:** V23 Web App full-screen.

### Navegação lenta entre clientes
**Problema:** clique carregava revisão, log e Forms.  
**Solução:** V23.2 render otimista, lazy loading e caches.

---

## Limitações conhecidas

### Google Apps Script / quotas
Mesmo com arquitetura central, Drive/Docs/Forms/UrlFetch/tempo de execução têm quotas. O volume projetado (~2.400 Forms/ano) deve ser monitorado.

### Sem transações multi-serviço
Sheets, Drive, Docs, Forms e OpenAI não participam de transação única. Operações complexas precisam ser idempotentes.

### Google Forms sem rich text por alternativa via FormApp
Não foi possível colocar somente a opção pré-selecionada em negrito. Workaround: opção vem pré-marcada via URL prefilled.

### Templates são dependência externa
Mudanças manuais no Google Docs podem quebrar marcadores. Não há versionamento de template no código.

### Sem testes automatizados
Os testes são smoke/end-to-end manuais. `[NÃO IDENTIFICADO NA CONVERSA]` qualquer suíte automatizada.

### Monólito global Apps Script
Arquivos `.gs` compartilham namespace. Duplicação de função causa risco; camada V23.2 contém também regra de negócio de aditivo.

### Caches eventualmente defasados
A UI usa auto-sync e invalidação, mas há janelas de 10–30s para refletir mudança externa.

### Origem PDF pode ter texto mal segmentado
Foi observado PDF com linhas de pratos coladas. A IA deve preservar e gerar aviso; revisão humana continua necessária.

### Código/implantação não versionados por Git no histórico
Foram criadas muitas versões por arquivos/ZIP. Este handoff é o primeiro snapshot estruturado conhecido; Git/CI não foram identificados.


===== docs/DECISOES_TECNICAS.md =====

# DECISOES_TECNICAS.md

## 1. Google Sheets permanece banco/backend
**Decisão:** não migrar para banco externo durante o MVP.  
**Motivo:** aproveitar fluxo existente, reduzir complexidade e permitir rápida operação.  
**Alternativas consideradas:** “app conectado a banco” apareceu como evolução futura, não implementada.  
**Consequências:** schema por abas/colunas; limites de performance/concorrência; fácil inspeção.  
**Ainda válida?** Sim na baseline atual.

## 2. Interface Web App por cima da planilha
**Decisão:** transformar o modal do Sheets em Apps Script Web App full-screen.  
**Motivo:** Produção não deveria operar planilha crua nem ver fundo da planilha.  
**Alternativas:** modal dentro do Sheets (V22); app externo futuro.  
**Consequências:** implantação versionada `/exec`; HTML Service; mesma infraestrutura Google.  
**Ainda válida?** Sim.

## 3. Operação por `ID_EVENTO`, não linha ativa
**Decisão:** todas as ações do Web App resolvem evento por ID.  
**Motivo:** linha ativa é frágil e exige sair do software.  
**Alternativas:** wrappers `LinhaAtiva` legados.  
**Consequências:** funções rápidas de lookup/cache; link da linha apenas fallback.  
**Ainda válida?** Sim, crítica.

## 4. Quantidades derivadas do contrato
**Decisão:** não usar regras hard-coded por menu.  
**Motivo:** contratos variam e categorias novas surgem.  
**Alternativa:** tabela fixa (primeiras versões).  
**Consequências:** OpenAI/schema e revisão humana precisam capturar `ESCOLHER X`.  
**Ainda válida?** Sim.

## 5. +1 de degustação em categorias específicas
**Decisão:** Coquetel Frio, Coquetel Quente e Mini Porções/Pratos em Miniatura permitem degustar uma opção além da quantidade final.  
**Motivo:** regra operacional solicitada.  
**Alternativa:** quantidade exata para tudo.  
**Consequências:** Form Cliente usa faixa min/max.  
**Ainda válida?** Sim.

## 6. Bar fora do escopo
**Decisão:** excluir Bar/Anexo I de Drinks do fluxo.  
**Motivo:** automação é de Gastronomia/Anexo II.  
**Consequências:** prompt e classificadores precisam manter distinção com bebidas adicionais do Anexo II.  
**Ainda válida?** Sim, crítica.

## 7. `INCLUSO_CARDAPIO` separado de `FIXO`
**Decisão:** comida contratada sem escolha não deve ser tratada como bebida/finalização fixa.  
**Motivo:** precisava aparecer em todos documentos mas sem checkbox/quantidade.  
**Alternativas:** omitir; classificar tudo como FIXO.  
**Consequências:** quatro tipos de categoria.  
**Ainda válida?** Sim.

## 8. Deduplicação em múltiplas camadas
**Decisão:** deduplicar no armazenamento, carregamento e criação do Form.  
**Motivo:** Forms rejeita opções iguais; contratos podem repetir.  
**Consequências:** normalização tolerante; primeira ocorrência vence.  
**Ainda válida?** Sim.

## 9. Normalizar categoria para agrupamento
**Decisão:** ignorar caracteres invisíveis, acentos, pontuação e subtítulos para identidade da categoria.  
**Motivo:** evitar perguntas duplicadas visualmente iguais.  
**Ainda válida?** Sim.

## 10. Marcadores opcionais com fallback
**Decisão:** ausência de bloco opcional não deve quebrar documento.  
**Motivo:** modelos no Drive evoluem de forma independente.  
**Consequências:** backend injeta marcador/bloco no final ou posição alternativa.  
**Ainda válida?** Sim.

## 11. Geração final não trava por quantidade
**Decisão:** gerar com ajustes/pendências em vez de bloquear.  
**Motivo:** operação precisa continuar e usuário pediu resolução automática.  
**Alternativa:** exigir contagem exata (V7/V14).  
**Consequências:** `AVISOS_REVISAO` passa a ser fundamental; revisão humana obrigatória.  
**Ainda válida?** Sim.

## 12. Checklist tem prioridade sobre campo livre
**Decisão:** opção marcada é prato; texto livre é usado apenas como novo prato para completar vaga, e observações são campo separado.  
**Motivo:** V15 confundia comentário com escolha.  
**Alternativa:** priorizar texto livre (V15).  
**Consequências:** Menu Final fica limpo; OS recebe observações.  
**Ainda válida?** Sim (V16+).

## 13. Formato de serviço por categoria
**Decisão:** serviço operacional é atributo da categoria de comida, não campo global.  
**Motivo:** evento pode ser misto.  
**Consequências:** OS mostra serviço por categoria e cabeçalho resume.  
**Ainda válida?** Sim.

## 14. Categorias não alimentares não recebem formato de serviço
**Decisão:** remover serviço/horas/pontos/obs cozinha de Estrutura, bebidas, Bar, finalização etc.  
**Motivo:** campos sem significado operacional.  
**Alternativa:** aplicar a `cardapioCompleto` inteiro (V19/V20 inicial).  
**Ainda válida?** Sim (V23.1).

## 15. Pré-seleção em vez de negrito no Form Interno
**Decisão:** gerar URL prefilled com escolhas já marcadas.  
**Motivo:** FormApp não suporta rich-text/negrito por alternativa.  
**Consequências:** Produção confere visualmente os checkboxes e pode editar.  
**Ainda válida?** Sim.

## 16. Form Interno não gera final automaticamente
**Decisão:** submit interno só registra; Produção precisa clicar para gerar final.  
**Motivo:** evitar emissão antes da revisão operacional.  
**Alternativa:** trigger gerava imediatamente (V20/V21).  
**Consequências:** novo status registry `RESPONDIDO_AGUARDANDO_GERACAO`; UI em duas etapas.  
**Ainda válida?** Sim, crítica.

## 17. Arquitetura central de Forms
**Decisão:** `FORM_REGISTRY` + uma planilha central + um trigger.  
**Motivo:** volume e limites de triggers/Script Properties.  
**Alternativa:** `FORM_META` + trigger individual.  
**Consequências:** infraestrutura adicional, limpeza e reconciliação.  
**Ainda válida?** Sim.

## 18. Tolerar atraso na criação da aba de respostas
**Decisão:** registrar `AGUARDANDO_VINCULO` e reconciliar no primeiro submit.  
**Motivo:** `setDestination()` não materializa aba imediatamente sempre.  
**Ainda válida?** Sim.

## 19. Form Interno retido 14 dias
**Decisão:** após geração final, manter ativo por 14 dias para correções.  
**Motivo:** correções operacionais pós-preenchimento.  
**Consequências:** novas respostas podem reabrir geração; precisa disciplina operacional.  
**Ainda válida?** Sim, mas revisar UX.

## 20. Atualização de PDF tenta preservar link
**Decisão:** Drive API PATCH no mesmo `fileId`; fallback cria arquivo novo.  
**Motivo:** links podem já ter circulado.  
**Alternativa:** sempre criar novo PDF.  
**Consequências:** OAuth adicional; fallback deve atualizar EVENTOS.  
**Ainda válida?** Sim.

## 21. Lazy loading e cache no Web App
**Decisão:** clique de evento não carrega revisão/log/Forms completos.  
**Motivo:** lentidão percebida ao trocar clientes.  
**Consequências:** mais endpoints leves e cache/invalidação.  
**Ainda válida?** Sim (V23.2).

## 22. Aditivo em duas fases
**Decisão:** `Analisar` sem mutação -> `Aplicar` com confirmação.  
**Motivo:** alto risco de IA/arquivo errado alterar contrato automaticamente.  
**Alternativa:** adicionar link e reextrair imediatamente (fluxo V6).  
**Consequências:** `ADITIVO_WORKFLOW` e nova camada de auditoria.  
**Ainda válida?** Sim.

## 23. Tratamento do aditivo depende do momento
**Decisão:** Antes / Depois da degustação / Após OS.  
**Motivo:** não reescrever retroativamente uma degustação/OS já realizada.  
**Consequências:** preservação dos artefatos anteriores e reabertura seletiva.  
**Ainda válida?** Sim.

## 24. Aditivo financeiro não invalida fluxo A&B
**Decisão:** diff financeiro isolado atualiza consolidado sem recriar Forms/Docs operacionais.  
**Motivo:** evitar trabalho e risco desnecessários.  
**Ainda válida?** Sim.

## 25. Backups fora do projeto Apps Script
**Decisão:** não manter arquivos `.gs` antigos ativos como backup no mesmo projeto.  
**Motivo:** namespace global e funções duplicadas.  
**Ainda válida?** Sim.


===== docs/PENDENCIAS.md =====

# PENDENCIAS.md

## Crítico

### 1. Confirmar baseline realmente implantada
**Descrição:** validar se produção está usando backend V23.1 + MiniSoftware/HTML V23.2.  
**Estado:** documentação/code snapshot identificados; implantação não confirmada explicitamente.  
**Dependências:** acesso ao Apps Script/Deployment.  
**Critério de aceite:** topo `V23.2 • conectado`, hashes/conteúdo equivalentes e smoke test aprovado.  
**Informações necessárias:** URL `/exec`, versão da implantação, arquivos ativos.

### 2. Smoke test ponta a ponta em conta de produção
**Descrição:** testar Google Drive, Docs, Forms, triggers, OpenAI e PDF update no ambiente real.  
**Estado:** validação estática foi feita; execução externa não pôde ser simulada.  
**Critério de aceite:** fluxo completo sem intervenção manual na planilha.

### 3. Tornar aplicação de aditivo robusta a falha parcial
**Descrição:** fluxo multi-serviço pode falhar após gravar estado consolidado.  
**Estado:** retentativa existe, transação completa não.  
**Critério de aceite:** operação idempotente por checkpoint ou rollback automático que prove consistência após erro em qualquer fase.

## Alta prioridade

### 4. Corrigir validação de “Depois da degustação”
**Estado:** exige apenas `FORM_CLIENTE_ID`.  
**Critério de aceite:** exigir resposta Cliente efetivamente processada/Relatório ou estado equivalente.

### 5. Evitar colisão de `ID_EVENTO`
**Estado:** timestamp até segundos.  
**Critério de aceite:** ID único sob criação concorrente sem quebrar IDs antigos.

### 6. Concorrência por evento
**Estado:** locks principais são por usuário.  
**Critério de aceite:** duas usuárias não conseguem executar mutações incompatíveis no mesmo evento ao mesmo tempo.

### 7. Validar triggers e propriedade após migração de conta
**Estado:** houve transferência de propriedade; installable triggers pertencem a criador.  
**Critério de aceite:** diagnóstico mostra trigger central + limpeza pertencendo à conta de produção; Forms novos processam sem conta antiga.

### 8. Confirmar auto-processamento do Form Cliente sem abrir Sheets
**Estado:** polling implementado; sintoma histórico precisa prova real.  
**Critério de aceite:** resposta do cliente muda Web App para Pós-degustação em ~janela de polling sem interação com planilha.

### 9. Atualizar Reset para V23.2
**Estado:** não limpa `ADITIVO_WORKFLOW`.  
**Critério de aceite:** reset de testes contempla a aba nova e continua preservando infra/configuração.

## Média prioridade

### 10. Edição de terceiros no Web App
**Descrição:** revisão exibe terceiros, mas não foi identificada edição completa.  
**Critério de aceite:** Produção consegue corrigir terceiro sem abrir backend ou existe fluxo explícito de reextração/correção.

### 11. Versionamento imutável dos artefatos históricos de aditivo
**Estado:** snapshot preserva links.  
**Critério de aceite:** `[PRECISA VALIDAR]` se URL é suficiente; se não, gerar cópias versionadas.

### 12. Política de nova resposta do Form Interno após Finalizado
**Estado:** 14 dias de correção permitem novas respostas.  
**Critério de aceite:** UX deixa claro quando um novo submit reabre o final e por quê.

### 13. Limpar dead code legado
**Descrição:** `obterRegraInterna()` e wrappers antigos podem confundir.  
**Dependências:** análise de call graph e eventos legados.  
**Critério de aceite:** remover somente funções comprovadamente sem uso, mantendo compatibilidade.

### 14. Formalizar versionamento de templates
**Estado:** IDs externos em Properties; template real pode ser editado manualmente.  
**Critério de aceite:** cópia/version ID ou checklist de versão por release.

### 15. Monitorar quotas e métricas
**Descrição:** volume previsto ~2.400 Forms/ano.  
**Critério de aceite:** dashboard/alerta mínimo para falhas de trigger, quotas e latência.

## Baixa prioridade

### 16. Harmonizar enum `ARQUIVADO` de EVENTOS
**Critério de aceite:** remover referência ou adicionar status formal com fluxo claro.

### 17. Refatorar separação de camada
**Descrição:** V23.2 colocou regra de aditivo em `MiniSoftware.gs`.  
**Critério de aceite:** mover domínio de aditivo para módulo/backend sem regressão, mantendo APIs de front estáveis.

### 18. Melhorar índice persistente de eventos
**Estado:** cache `ID_EVENTO -> linha`; fallback varre sheet.  
**Critério de aceite:** apenas se volume demonstrar necessidade.

## Ideias futuras / requisitos históricos não implementados

### 19. Fluxo sem degustação / Menu Final direto
Constava no mapeamento original.  
**Estado:** `[PRECISA VALIDAR — não identificado no fluxo atual.]`  
**Critério de aceite:** decisão de produto se ainda é necessário; se sim, especificar branch completo.

### 20. Cronocardápio
Originalmente definido como documento master combinando OS + “Tempos e Movimentos”.  
**Estado:** não implementado na baseline identificada.  
**Critério de aceite:** especificação de fonte dos tempos, template e consumidores.

### 21. Perfis/login por usuária e auditoria por operador
Foi citado como evolução possível do front V22.  
**Estado:** `[NÃO IDENTIFICADO NA CONVERSA]` como requisito aprovado.  
**Critério de aceite:** decisão de produto/autorização.

### 22. Kanban/timeline/dashboard por responsável
Citados como evoluções possíveis, não como escopo confirmado.  
**Critério de aceite:** priorização explícita.


===== docs/CHANGELOG.md =====

# CHANGELOG.md

> Reconstrução baseada nos artefatos e decisões da conversa. Datas exatas de cada versão não são essenciais; a ordem é confiável. A baseline atual é a combinação Backend V23.1 + Front V23.2.

## MVP inicial

### Adicionado
- Google Sheets como painel/backend.
- Extração de contrato.
- `MENU_ANEXO_II`, `TERCEIROS_REGISTRO`, `RESPOSTAS`, `LOG`.
- Escolha de Menu, Form Cliente, Relatório, Form Interno, Menu Final e OS.

## V2 — regras no Relatório

### Alterado
- Relatório passou a exibir quantidade de opções da categoria a partir de `QTD_DEGUSTACAO`.
- Regra visual inicialmente vermelha/negrito/marca-texto amarelo.
- Menu Final não recebe instrução de degustação.

## V3 — categorias novas

### Corrigido
- Não inventar quantidade para categoria desconhecida.
- Falta de quantidade mantém `AGUARDANDO_REVISAO` e informa coluna.
- Validação também para `QTD_MENU_FINAL`.
- Parte 2 pode ser repetida após `ERRO`.

## V4 — quantidades contratuais

### Alterado
- Removidas quantidades hard-coded do caso Valentina.
- `QTD_MENU_FINAL` passa a vir de `ESCOLHER X OPÇÕES`.
- `QTD_DEGUSTACAO` inicia baseada na quantidade final.
- Categorias novas passam a funcionar genericamente.

## V5 — formatação de documento

### Corrigido
- Pratos não herdam mais vermelho/negrito/marca-texto da linha da regra.
- Estilos passam a ser definidos explicitamente.

## V6 — contrato + múltiplos aditivos

### Adicionado
- `LINKS_ADITIVOS`, `JSON_ADITIVOS`, `VALOR_ADITIVOS`, `VALOR_TOTAL_CONSOLIDADO` em EVENTOS.
- `ADITIVOS_APLICADOS`.
- precedência de aditivos.
- consolidação de Staff/valores.

### Regra
- Bar permanece fora do fluxo.
- Staff de aditivo vai para OS, não Form Cliente.

## V7 — degustação, títulos e campo livre

### Alterado
- Coquetel frio/quente e mini porções: degustação permite até final + 1.
- Nome completo do menu só na primeira categoria.
- Form Interno ganhou checklist + campo livre por categoria.

### Comportamento posteriormente substituído
- A geração inicialmente exigia contagem exata checklist + campo livre; V15 removeu a trava e V16 redefiniu prioridade.

## V8 — Encantamento e serviços opcionais

### Adicionado
- `ENCANTAMENTO` no Form Interno/OS.
- `SERVIÇO DE SALA`, `LANCHE DA MADRUGADA`, bebidas adicionais quando contratados.
- `{{BLOCO_SERVICOS_CONTRATADOS}}`.

## V9 — bebidas

### Alterado
- água/refri/suco padrão -> FIXO.
- bebida adicional do Anexo II -> `SERVICO_CONTRATADO`.
- título de seção normalizado para `BEBIDAS`.
- Anexo I/Bar/coquetelaria/destilados excluídos.

## V10 — opções duplicadas

### Corrigido
- Deduplicação antes de gravar/carregar/criar pergunta do Forms.
- comparação normalizada.

## V11 — categorias divididas

### Corrigido
- categorias com espaços invisíveis/subtítulos deixam de virar perguntas duplicadas.
- agrupamento normalizado e maior quantidade preservada.

## V12 — itens inclusos

### Adicionado
- `INCLUSO_CARDAPIO` para gastronomia sem escolha.
- aparece em todos artefatos relevantes, sem checkbox/quantidade.

## V13 — marcador opcional automático

### Corrigido
- ausência de `{{BLOCO_SERVICOS_CONTRATADOS}}` não trava geração.
- cópia de Doc incompleta é enviada à lixeira em falha.

## V14 — diagnóstico e geração manual final

### Adicionado
- diagnóstico de Form Interno.
- geração Menu Final + OS a partir da última resposta interna.
- erros de trigger associados ao EVENTOS.

## V15 — final sem trava

### Alterado
- excesso/falta de escolhas não bloqueiam mais geração.
- falta recebe `PENDENTE DE DEFINIÇÃO`.
- ajustes entram em `AVISOS_REVISAO` e LOG.

## V16 — Menu Final clean / observações

### Alterado
- remove explicação “ITEM JÁ INCLUSO...” dos documentos finais.
- checklist passa a ter prioridade.
- separa `Outro prato fora do checklist` de `Observações para cozinha`.
- compatibilidade com respostas antigas.

## V17 — OS completa

### Alterado
- remove `(ITEM FIXO)` de Menu Final/OS.
- OS garante todos os dados internos via marcadores ou bloco `INFORMAÇÕES OPERACIONAIS`.

## V18 — fallback de observações

### Corrigido
- respostas operacionais de Forms antigos podem ser recuperadas da aba `RESPOSTAS`.
- fallback `OBSERVAÇÕES E RESTRIÇÕES` na OS.

## V19 — serviço por categoria

### Adicionado
- Volante / Ponto de Buffet / Empratado / Não se aplica por categoria.
- horas e pontos.
- resumo global de serviço na OS.
- comando de recriar Form Interno sem nova resposta do cliente.

### Removido
- campo livre global “Tipo de serviço” do novo Form Interno.

## V20 — não degustados, Camarim, Staff

### Adicionado
- `{{BLOCO_NAO_DEGUSTADOS}}`.
- categorias não degustadas explícitas.
- Camarim Padrão/Fora do padrão condicional.
- Staff montagem/evento/desmontagem padronizado.
- contratação de Staff cliente condicional.

## V21 — Forms escaláveis

### Alterado
- novos Forms deixam de usar `FORM_META_*` + trigger individual.
- `FORM_REGISTRY` + planilha central + trigger central.
- trigger diário de limpeza.
- Forms internos retidos 14 dias.
- compatibilidade legada preservada.

## V21.1 — hotfix último parágrafo

### Corrigido
- `removeFromParent()` não é mais usado para remover o último parágrafo obrigatório do body.
- `removerParagrafoMarcadorSeguro_()`.

## V21.2 — hotfix vínculo Forms/central

### Corrigido
- atraso na materialização da aba de resposta.
- identificação via `Sheet.getFormUrl()`.
- registry pode ficar `AGUARDANDO_VINCULO` e reconciliar no primeiro submit.

## V22 — primeiro Mini Software

### Adicionado
- interface visual sobre o Sheets.
- KPIs, filtros, tabela, links e ações por evento.

## V22.1 — loading

### Corrigido
- retorno de `Date`/raw não serializável.
- nomes inconsistentes de propriedades.

## V22.2 — fluxo de produção

### Removido
- conceito de “rascunho”.

### Adicionado/Alterado
- `+ Novo evento` cria linha real `NOVO`.
- extração opcional após criação.
- próxima ação por status.
- filtro “somente abertos”.

## V22.3 — Criar evento

### Corrigido
- HTML e `.gs` fora de sincronia.
- healthcheck explícito de versão.
- botão habilita só após conexão.
- criação e extração separadas.
- erro de extração não apaga evento.

## V23 — Web App full-screen

### Adicionado
- timing, percentual e ETA.
- revisão de extração dentro do software.
- operação por `ID_EVENTO`.
- retentativa automática/manual.
- Web App full-screen `/exec`.

### Removido do fluxo normal
- dependência de linha ativa da planilha.

## V23.1 — Produção cautelosa

### Adicionado
- escolhas da degustação pré-marcadas no Form Interno via prefilled URL.
- `DateItem` + datas sugeridas de Staff.
- botão `← Voltar / fechar evento`.
- feedback no Atualizar.
- auto-sync 10s/30s.
- `Atualizar PDF` para Escolha, Relatório, Menu Final e OS.
- visual de Pós-degustação em duas etapas.

### Alterado
- serviço/horas/pontos/obs cozinha só para categorias aplicáveis.
- submit do Form Interno não gera final; apenas libera geração manual.

## V23.2 — Performance + workflow de aditivos

### Adicionado
- render otimista e lazy loading.
- caches de lista, linha e estado de Form.
- `ADITIVO_WORKFLOW`.
- análise de aditivo sem mutação.
- confirmação de aplicação.
- estágios Antes da Degustação / Depois / Após OS.
- diff de estado antes/depois.
- preservação de links de artefatos anteriores.
- aditivo somente financeiro sem invalidação operacional.

### Alterado
- navegação deixa de carregar LOG/menu/aditivos a cada clique.

## Estado do handoff

Código mais recente identificado:

- backend V23.1;
- MiniSoftware V23.2;
- HTML V23.2;
- Reset anterior à V23.2.

`[PRECISA VALIDAR — deployment efetivo e smoke test de produção.]`
