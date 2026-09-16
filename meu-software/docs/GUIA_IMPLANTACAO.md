# Guia de implantação e validação

[Início](../../README.md) · [Documentação](README.md) · [Instruções de desenvolvimento](../AGENTS.md)

Este guia organiza o procedimento já descrito no projeto. A implantação ativa, a conta executora e as permissões do ambiente ainda precisam de conferência. Não há pipeline de publicação automática identificado neste snapshot.

## 1. Identificar o ambiente

Registre no controle interno da equipe:

- URL da implantação existente;
- versão publicada e data da conferência;
- conta proprietária do projeto e dos triggers;
- commit do GitHub usado na comparação;
- versão dos templates;
- resultado do último teste completo.

Compare os arquivos ativos com [SOURCE_SNAPSHOT.md](../SOURCE_SNAPSHOT.md). A baseline documentada combina backend V23.1 com controller e HTML V23.2.

## 2. Preparar a configuração

| Script Property | Finalidade |
|---|---|
| `OPENAI_API_KEY` | Credencial da integração de extração |
| `OPENAI_MODEL` | Modelo utilizado pelo projeto |
| `TEMPLATE_ESCOLHA_ID` | Modelo da Escolha de Menu |
| `TEMPLATE_RELATORIO_ID` | Modelo do Relatório de Degustação |
| `TEMPLATE_MENU_FINAL_ID` | Modelo do Menu Final |
| `TEMPLATE_OS_ID` | Modelo da OS A&B |

Os valores pertencem à configuração do Apps Script. Não os registre no README nem em arquivos de exemplo.

A infraestrutura mantém também propriedades como `CENTRAL_RESPOSTAS_ID` e `PAINEL_SPREADSHEET_ID`. Confira sua relação com as planilhas do ambiente antes de executar rotinas de preparação.

## 3. Conferir estrutura e integrações

Na preparação inicial, o menu documentado oferece:

1. **0. Preparar estrutura**.
2. **0B. Preparar produção escalável**.
3. **Diagnosticar arquitetura de Forms**.
4. **Testar configurações**.

Confirme os templates e seus marcadores, o acesso às pastas e os triggers centrais. Consulte [Integrações](INTEGRACOES.md) e [Banco de dados](BANCO_DADOS.md) para a estrutura esperada.

Não mantenha backups `.gs` com funções duplicadas dentro do mesmo projeto. Preserve a cópia anterior fora do Apps Script.

## 4. Validar com evento controlado

Execute o smoke test completo de [AGENTS.md](../AGENTS.md#10-validação-mínima-de-qualquer-alteração) com dados de teste:

- criar e extrair um evento;
- revisar e gerar Escolha + Form Cliente;
- responder o cliente e confirmar Relatório + Form Interno;
- responder o Form Interno e verificar que a geração final não ocorreu automaticamente;
- aprovar e gerar Menu Final + OS;
- editar DOC, atualizar PDF e conferir o resultado;
- conferir registry, histórico, aditivos e navegação rápida entre eventos.

**Registre o que foi executado.** Validação de documentação ou análise estática não substitui teste de Google Sheets, Drive, Docs, Forms, templates e triggers.

## 5. Atualizar a implantação

Depois de conferir a versão e concluir a validação:

1. Salve os arquivos atualizados no projeto Apps Script.
2. Abra **Implantar > Gerenciar implantações**.
3. Edite a implantação existente.
4. Selecione ou crie a versão correspondente.
5. Preserve a URL `/exec`.
6. Abra o Web App e confira a compatibilidade indicada no topo.
7. Registre a versão, o commit e o resultado da verificação.

Confira as opções de execução e acesso com a configuração existente do ambiente. A documentação atual não define uma configuração universal para essas opções.

## Registro de validação

| Campo | Preencher pela equipe |
|---|---|
| Data e responsável | — |
| Ambiente de teste | — |
| Commit e versão Apps Script | — |
| Templates conferidos | — |
| Fluxo completo | Não executado / aprovado / falhou |
| Cenários de aditivo | Não executado / aprovado / falhou |
| Sincronização sem abrir Sheets | Não executado / aprovado / falhou |
| Troca rápida entre eventos | Não executado / aprovado / falhou |
| Pendências e evidências | — |

O reset de testes tem limitações documentadas e não faz parte da publicação normal. Consulte [Bugs e limitações](BUGS_E_LIMITACOES.md) antes de qualquer uso administrativo.
