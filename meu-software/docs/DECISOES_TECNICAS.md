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
