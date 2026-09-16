# Configuração do repositório

[Início](../README.md)

## Recursos preparados

| Recurso | Finalidade |
|---|---|
| README e capa | Apresentação do projeto |
| Descrição, site e tópicos | Identificação e descoberta no GitHub |
| Guias de operação e implantação | Orientação da equipe |
| Formulários de issues | Relato de erro e proposta de melhoria |
| Modelo de pull request | Descrever escopo e evidências de validação |
| SECURITY e SUPPORT | Canais de relato e consulta |
| EditorConfig e gitignore | Edição consistente e exclusão de configurações locais |
| GitHub Actions | Checagem de sintaxe, versões do front e links locais |

## Executar a verificação local

Com Node.js 20 ou superior:

```sh
node tools/validate.cjs
```

A verificação compila a sintaxe dos arquivos JavaScript/Apps Script e scripts embutidos no HTML sem executá-los. Também confere a versão declarada pelo HTML e pelo controller e os destinos locais de links Markdown. Não valida âncoras, links externos, chamadas Google, permissões, regras de negócio nem implantação.

O workflow é executado em push na main, em pull requests e manualmente. Possui acesso de leitura ao repositório, não usa credenciais Google e não publica o Web App.

## Decisões ainda dependentes do ambiente ou do proprietário

- **Apps Script:** identificar projeto, implantação, conta executora, templates e Script Properties.
- **Validação operacional:** executar o smoke test com evento controlado.
- **Licença:** não foi adicionada uma licença de distribuição; a empresa precisa definir os termos antes de conceder direitos a terceiros.
- **Proteção da branch e revisão obrigatória:** definir quem revisa e qual processo deve ser exigido antes de ativar regras.
- **Releases:** publicar uma versão operacional somente com escopo e testes registrados.
- **Packages:** o snapshot não contém pacote distribuível; a seção foi ocultada da apresentação.
- **GitHub Pages:** não é a hospedagem deste aplicativo; ele roda no Apps Script.

Não há configuração fictícia de produção nem credenciais no repositório. A ausência de uma release operacional não significa que falte um campo obrigatório do GitHub.
