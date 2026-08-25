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
