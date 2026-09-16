# Como contribuir

[Apresentação](README.md) · [Documentação](meu-software/docs/README.md)

## Antes de começar

Leia [AGENTS.md](meu-software/AGENTS.md), as [regras de negócio](meu-software/docs/REGRAS_NEGOCIO.md) e o documento da área que será alterada. A [procedência do snapshot](meu-software/SOURCE_SNAPSHOT.md) explica por que o código deve ser comparado com o ambiente Google antes de qualquer atualização operacional.

## Preparar uma mudança

1. Descreva o problema e o resultado esperado.
2. Identifique os arquivos e fluxos afetados.
3. Trabalhe em uma branch com escopo definido.
4. Preserve compatibilidade dos dados, APIs e eventos legados.
5. Registre as verificações executadas e as limitações.
6. Atualize a documentação relacionada.

Uma alteração apenas editorial deve deixar claro que não muda o comportamento do aplicativo. Mudanças de código precisam dos testes previstos em AGENTS.md e da validação em ambiente controlado.

## Conteúdo de uma proposta de alteração

- **Problema:** o que acontece hoje e em qual situação.
- **Resultado:** o que passa a acontecer.
- **Escopo:** arquivos, regras e integrações afetados.
- **Validação:** testes realizados, resultado e o que ainda falta.
- **Implantação:** necessidade de atualizar Apps Script, templates ou configuração.

Não inclua contratos, dados de clientes, chaves ou valores de Script Properties em exemplos públicos. Use casos fictícios ao documentar o comportamento.

## Regras essenciais

- Não duplicar funções globais em arquivos de backup dentro do Apps Script.
- Não reordenar colunas sem avaliar as leituras por índice.
- Não emitir Menu Final e OS automaticamente no submit interno.
- Não criar um trigger por novo Form.
- Não aplicar um aditivo antes da análise e confirmação.
- Não executar o reset administrativo como parte de testes comuns.

## Verificação de documentação

Execute `node tools/validate.cjs` para conferir sintaxe, compatibilidade das versões do front e destinos locais de links. O mesmo comando roda no GitHub Actions. Consulte [Configuração do repositório](docs/CONFIGURACAO_REPOSITORIO.md) para o escopo e as limitações dessa verificação.

Confira caminhos relativos, títulos, diagramas, nomes das funções citadas e coerência com o código. Diferencie claramente **implementado no snapshot**, **validado no ambiente real** e **proposto**.

## Publicação

O GitHub guarda o código, mas a aplicação roda no Google Apps Script. Alterar o repositório não atualiza automaticamente o Web App. Siga o [guia de implantação](meu-software/docs/GUIA_IMPLANTACAO.md) quando houver uma mudança de aplicativo.
