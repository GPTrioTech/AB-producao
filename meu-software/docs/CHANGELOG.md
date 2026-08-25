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
