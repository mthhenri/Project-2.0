# 233-plano-tela.spec.md

> Task 3/7 da guarda-chuva [`chat-planejamento.spec.md`](../backlog/chat-planejamento.spec.md): a tela do modo planejamento e o novo seletor no
> topo do chat. Ainda sem IA: o plano é lido e editado à mão.

## Objetivo

O chat ganha a chave **Perguntas / Planejamento**, o **documento ao lado** com abas e um divisor arrastável, e o histórico deixa a
lateral e vira um **seletor no topo**, nos dois modos.

## Entregáveis

1. **Seletor no topo** em `frontend/src/app/modules/chat/`, no lugar de `components/historico` (`app-chat-historico`, hoje usado em
   `pages/chat/chat.page.html`): busca, duas listas, **Planos** e **Conversas do dia**, e a ação **Novo plano**. Vale para os dois
   modos. O que o histórico faz hoje (abrir conversa de outro dia, busca, nome da conversa) migra para o seletor sem perder função.
2. **Lateral direita livre.** A barra do histórico sai e a lateral fica vazia; a task 245 de `chat-execucao-por-demanda.spec.md` a
   ocupa com "Minhas demandas". Esta task **não** cria essa lista.
3. **Chave de modo** no campo de mensagem, trocável no meio da conversa. Sem plano aberto, Planejamento abre o último plano em
   andamento da pessoa ou, sem nenhum, o seletor com "Novo plano". A conversa do dia não migra para o plano.
4. **Documento ao lado do chat** com **divisor arrastável** (largura escolhida pela pessoa e lembrada como as outras preferências de
   tela do chat) e **abas** descrição técnica, descrição do cliente e documentação. A aba do cliente só aparece para gestor e
   administrador (regra pura do `shared`, da 232).
5. **Edição à mão** com o editor de Markdown formatado do sistema (`shared/components/markdown-editor`, task 134), gravando com a
   `versao` lida; conflito de versão avisa a pessoa e oferece recarregar.
6. **Cabeçalho do plano:** título editável, projeto, marca de **solo** (só o criador), demanda ligada (ligar e trocar usam a API da
   232), arquivar e excluir com confirmação. Plano amplo mostra "pessoal".
7. **Estados:** vazio (sem planos), carregando, cheio, erro e IA desligada (documento legível e editável; a conversa mostra o aviso
   de hoje).
8. Teste de componente (`*.spec.ts`) do seletor, da chave de modo e do documento; regra pura nova com teste (`*.test.ts`).

## Critérios de Aceite

- `npm run test --workspace=frontend` e `npm run build --workspace=frontend` aprovados.
- **Análogo:** a tela atual do chat (`pages/chat`) e o `proposta-cartao`. Verificação ao vivo pelo agente principal (skill `verify`)
  com desenvolvedor, gestor e administrador, em 1920×1080, 1366×768 e 1080×1920, temas claro e escuro, em todos os estados do item 7,
  comparando com o chat de antes da mudança. O mockup do canvas do autor é ilustração.
- O histórico antigo não deixa resíduo (componente, estilo, spec) e a busca continua achando as conversas de dias anteriores.

## Fora de Escopo

IA no plano (234), pontos em aberto (235), material de fora (236), publicar e "nasceu do plano" (237). A lista "Minhas demandas"
(245). Diff por palavra (224; aqui o documento é só texto).

## Dependências

232 (API). A 224 não é requisito. Esta task libera a lateral para a 245 de `chat-execucao-por-demanda.spec.md`.

## Riscos e Mitigação

`chat.page` já é extensa: o documento e o seletor entram como componentes próprios, sem acrescentar responsabilidade à página além
de orquestrar modo e plano aberto. Aplicar `gerenciamento-de-impacto` ao retirar `app-chat-historico`.

## Pontos em aberto (o autor confirma ao abrir a task)

- Largura inicial e mínima do documento; o divisor em 1080×1920 (padrão proposto: documento abaixo do chat quando a largura não
  comportar os dois).

## Resultado (fechamento, 2026-10-26)

Largura inicial do documento 50%, de 30% a 70%, lembrada em `localStorage`; abaixo de 64rem de largura do chat o documento vai para baixo da conversa e o divisor some.
Relato completo e achados da verificação ao vivo em `docs/context/HISTORY.md` (bloco de 2026-10-26, task 233).
