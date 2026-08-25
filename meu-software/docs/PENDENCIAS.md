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
