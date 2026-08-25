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
