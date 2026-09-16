# Documentação A&B Produção

[Apresentação do projeto](../../README.md) · [Referência técnica](../README.md)

## Guias de entrada

| Objetivo | Documento |
|---|---|
| Operar um evento | [Guia de operação](GUIA_OPERACAO.md) |
| Preparar e validar uma implantação | [Guia de implantação](GUIA_IMPLANTACAO.md) |
| Contribuir com o projeto | [Como contribuir](../../CONTRIBUTING.md) |
| Entender as regras para desenvolvimento | [AGENTS.md](../AGENTS.md) |

## Produto e operação

| Documento | O que você encontra |
|---|---|
| [Contexto do projeto](CONTEXTO_PROJETO.md) | Problema, usuários e objetivos |
| [Regras de negócio](REGRAS_NEGOCIO.md) | Menu, bebidas, quantidades, revisão e aditivos |
| [Fluxos](FLUXOS.md) | Entradas, etapas, pré-condições e resultados |
| [Pendências](PENDENCIAS.md) | Prioridades, dependências e critérios de aceite |

## Engenharia e manutenção

| Documento | O que você encontra |
|---|---|
| [Arquitetura](ARQUITETURA.md) | Componentes, comunicação, cache e automações |
| [Banco de dados](BANCO_DADOS.md) | Abas, campos e relações no Google Sheets |
| [Integrações](INTEGRACOES.md) | Drive, Docs, Forms, IA e configuração |
| [Decisões técnicas](DECISOES_TECNICAS.md) | Motivos das escolhas e cuidados com regressões |
| [Bugs e limitações](BUGS_E_LIMITACOES.md) | Problemas conhecidos e comportamentos a validar |
| [Histórico](CHANGELOG.md) | Evolução funcional e revisões |
| [Origem do código](../SOURCE_SNAPSHOT.md) | Correspondência entre snapshot e arquivos de origem |
| [Handoff completo](../HANDOFF_COMPLETO.md) | Registro consolidado de transição |

## Como interpretar o estado do projeto

- **Implementado no snapshot:** consta no código versionado; não confirma implantação.
- **Precisa validar:** depende de conferência no ambiente real ou decisão de negócio.
- **Ideia futura:** não deve ser apresentada como funcionalidade entregue.

Baseline documentada: backend **V23.1**, controller e HTML **V23.2**. A combinação é intencional.
