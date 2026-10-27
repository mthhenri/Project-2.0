# 255-chat-aba-anotacoes.spec.md

> Task 4/7 da guarda-chuva [`documentacoes-e-pad.spec.md`](documentacoes-e-pad.spec.md) (decisão 8): no chat, o pad vira a aba
> **Anotações** da demanda aberta.

## Objetivo

Na demanda aberta do chat (`modules/chat/components/demanda-leitura/`, task 245), o desenvolvedor conversa com a IA à esquerda e lê a
demanda à direita. Com o pad numa aba ali, ele anota sem abrir o painel lateral por cima da conversa.

## Entregáveis

1. **Aba Anotações** entre Checklist e Técnica: **Checklist · Anotações · Técnica · Cliente · Documentação**. Ícone do pad e, ao lado
   do nome, a quantidade de itens em aberto em Pendências (sem número quando zero).
2. **Conteúdo da aba:** o componente do pad da task 254, sem o cabeçalho próprio (o nome já está na aba), com edição, gravação e
   "Enviar para" como no drawer. Ocupa a altura toda da área da demanda, com rolagem interna.
3. **Aba aberta por padrão:** ao abrir uma demanda no chat, a aba **Anotações** vem selecionada (decisão do autor de 2026-10-27).
4. **Mesmo estado do pad:** editar na aba e abrir o drawer pela barra superior mostra o mesmo texto (o estado único da task 254).

## Critérios de Aceite

- Teste de componente da demanda aberta: ordem das abas, Anotações aberta ao abrir a demanda, contador de pendências, troca de aba sem
  perder o que foi digitado.
- `npm run test` e `npm run build` do `frontend` aprovados.
- Verificação ao vivo (skill `verify`) com desenvolvedor e gestor, em 1920×1080, 1366×768 e 1080×1920: a aba com o pad cheio, vazio,
  carregando e com erro de gravação; editar na aba e conferir no drawer. Análogo: a demanda aberta atual do chat.

## Fora de Escopo

- O pad na tela de Documentações (task 257); a aba Cliente legível (task 252).

## Dependências

- Tasks 252 (a aba Cliente já aparece para o desenvolvedor) e 254 (componente e estado do pad).
