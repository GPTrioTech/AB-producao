# Guia de operação

[Início](../../README.md) · [Documentação](README.md) · [Fluxos detalhados](FLUXOS.md)

Roteiro baseado no comportamento documentado do snapshot. A equipe deve conferir a versão ativa antes de adotar este guia como procedimento do ambiente real.

## 1. Preparar o evento

Tenha o contrato em PDF, a pasta do evento e os dados de degustação: responsável, data, horário, local e quantidade de pessoas. Inclua os aditivos existentes para que a extração considere o contrato vigente.

No Web App, use **+ Novo evento**. A criação e a extração são etapas separadas: uma falha de extração não significa que o evento deixou de existir.

## 2. Extrair e revisar

Depois da extração, abra **Revisão da extração**. Confira:

- identificação do evento e contratante;
- datas, local e número de convidados;
- categorias, pratos e quantidades previstas no contrato;
- itens inclusos e serviços contratados;
- aditivos considerados e avisos de revisão.

Cabeçalho e menu podem ser editados no Web App. Terceiros e aditivos exibidos nessa tela não têm a mesma cobertura de edição; consulte as limitações antes de tentar corrigi-los.

A extração auxilia a leitura. A conferência humana define quando os dados estão prontos para seguir.

## 3. Gerar a escolha do cliente

Após a revisão, execute a ação de geração da **Escolha de Menu + Form Cliente**. Confira os documentos e o formulário antes de compartilhar os links pelo canal utilizado pela equipe.

O cliente informa as escolhas, restrições e observações. O processamento da resposta deve disponibilizar o Relatório de Degustação e o Form Interno. A atualização automática sem abrir Sheets ainda faz parte dos testes pendentes do ambiente real.

## 4. Registrar a decisão pós-degustação

Abra o **Form Interno** pelo Web App. Revise as opções pré-selecionadas e preencha os campos operacionais aplicáveis, como serviço, staff, cozinha e salão.

Enviar o formulário **não gera os documentos finais**. A Produção precisa conferir o retorno e executar a ação seguinte.

## 5. Gerar Menu Final e OS

Quando a resposta interna estiver disponível, use **Gerar Menu Final + OS**.

| Documento | Conferência |
|---|---|
| Menu Final | Pratos e informações voltadas ao cliente |
| OS A&B | Serviço, quantidades e demais orientações operacionais |

O sistema pode gerar documentos com avisos ou marcadores de definição pendente quando houver diferença de quantidade. Leia os avisos e confira o resultado antes de distribuir.

## 6. Atualizar documentos

Se um DOC for editado manualmente, abra **Arquivos** e use **Atualizar PDF** para o documento correspondente. Depois, confira o PDF e o link exibido no evento.

## 7. Receber um novo aditivo

1. Abra **Aditivos** e informe o documento.
2. Escolha o momento correto: antes da degustação, depois da degustação ou após a OS.
3. Use **Analisar aditivo**.
4. Confira vínculo com o contrato, alterações e impacto.
5. Só então confirme a aplicação ao evento.

A aplicação pode reabrir revisão ou exigir um novo Form Interno. O histórico preserva referências aos arquivos anteriores; essas referências não equivalem a cópias imutáveis.

## Se algo não acontecer como esperado

| Situação | Próximo passo |
|---|---|
| Extração falhou | Consulte o erro e os links do contrato; confirme se o evento já foi criado |
| Cliente respondeu, mas a etapa não mudou | Use Atualizar e confira Erros & histórico; encaminhe o ID do evento à equipe técnica |
| Geração final bloqueada | Confirme a resposta do Form Interno e os avisos apresentados |
| PDF diferente do DOC | Execute Atualizar PDF e confira o arquivo resultante |
| Dados parecem pertencer a outro evento | Feche a ficha e abra novamente, confirmando o ID antes de editar ou salvar |
| Falha ao aplicar aditivo | Confira histórico e estado antes de repetir; há risco conhecido de aplicação parcial |

Não use o utilitário de reset para resolver falhas de um evento. Ele é administrativo e voltado à limpeza de testes.

## Conferência antes de entregar

- [ ] Evento e contrato corretos.
- [ ] Dados extraídos revisados.
- [ ] Escolhas e informações internas conferidas.
- [ ] Avisos e pendências do documento avaliados.
- [ ] Menu Final e OS gerados após ação explícita da Produção.
- [ ] PDFs correspondem aos DOCs atuais.
- [ ] Links de entrega conferidos.

[Regras completas](REGRAS_NEGOCIO.md) · [Bugs e limitações](BUGS_E_LIMITACOES.md)
