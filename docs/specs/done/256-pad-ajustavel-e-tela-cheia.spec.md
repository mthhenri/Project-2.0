# 256-pad-ajustavel-e-tela-cheia.spec.md

> Task 3/7 da guarda-chuva [`documentacoes-e-pad.spec.md`](../../backlog/documentacoes-e-pad.spec.md) (decisão 7): o pad vira **um componente
> reaproveitável**, e o painel lateral ganha **largura ajustável** e **tela cheia**.

## Objetivo

O pad hoje é um `p-drawer` de 520 px fixos (`modules/usuario/components/usuario-anotacoes-dialog/`). O autor quer alargar o painel
arrastando a borda e, quando precisar, ocupar a tela toda. As tasks 257 e 259 mostram o mesmo pad em outros lugares, então o conteúdo do
pad sai do drawer para um componente próprio.

## Entregáveis

1. **Componente do pad** (no módulo `usuario`, ao lado do drawer, ou em `shared/components` se a análise de impacto pedir): as cinco
   seções em acordeão, o editor por seção, Limpar, "Enviar para", o estado de gravação ("Salvo às…", "Salvando…", erro) e o Salvar com
   Ctrl+S, exatamente como hoje. Entradas para o contêiner escolher o cabeçalho (com ou sem título, e quais botões) e as seções abertas
   no início.
2. **Um estado do pad só**: o drawer e os outros lugares que mostram o pad compartilham o mesmo estado no frontend (service com
   Signals), para não haver duas cópias editando a mesma seção.
3. **Drawer com largura ajustável:** alça na borda esquerda (cursor de redimensionar), arrastar muda a largura entre **380 px** e a
   largura da janela menos 120 px; **duplo clique volta aos 520 px**. Enquanto arrasta, uma etiqueta mostra a largura em px. A alça
   responde ao teclado (setas mudam 16 px) e tem `aria-label`. A largura fica guardada no navegador, por usuário.
4. **Tela cheia:** botão no cabeçalho do drawer, ao lado do fechar ("Tela cheia" / "Sair da tela cheia"). Em tela cheia o pad cobre a
   janela inteira, e o conteúdo fica numa coluna centralizada de até 880 px. Esc continua fechando (salva sozinho, como hoje). A tela
   cheia não fica guardada: o pad reabre na última largura.
5. **Impacto** (skill `gerenciamento-de-impacto`): o drawer é aberto pela barra superior (`topbar.component.ts`) e por outros pontos;
   todos são avaliados.

## Critérios de Aceite

- Teste de componente do pad (seções, editar, salvar, erro) e do drawer (largura pelo teclado, limites, duplo clique, tela cheia e
  volta, Esc fecha). Regra pura dos limites de largura com teste (`*.test.ts`).
- `npm run test` e `npm run build` do `frontend` aprovados; sem mudança no backend.
- Verificação ao vivo (skill `verify`) em 1920×1080, 1366×768 e 1080×1920: arrastar até os limites, reabrir na mesma largura, tela cheia,
  tema claro e escuro, pad vazio, carregando e com erro de gravação. Análogo: o drawer atual do pad.

## Fora de Escopo

- Mudar o backend do pad, as seções ou o "Enviar para".
- O pad em Documentações (task 259) e no chat (task 257).

## Dependências

- Nenhuma task numerada antes.

## Pontos em aberto (o autor confirma ao abrir a task)

- Onde mora o componente: padrão proposto, `modules/usuario/components/pad-painel/` (o pad é do usuário); vai para
  `shared/components` só se a análise de impacto mostrar consumidor fora dos módulos de usuário, chat e documentação.
