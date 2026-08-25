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
