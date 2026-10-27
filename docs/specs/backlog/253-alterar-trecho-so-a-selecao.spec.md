# 253-alterar-trecho-so-a-selecao.spec.md

> Task 2/7 da guarda-chuva [`documentacoes-e-pad.spec.md`](documentacoes-e-pad.spec.md) (decisão 9): o "alterar trecho com IA" manda à
> IA **só o texto selecionado** para mudar. Corrige `PROBLEMS.md` P-037.

## Objetivo

No modo formatado do editor, o botão direito sobre uma seleção entrega o **bloco inteiro** em Markdown (`blocoSelecionadoEmMarkdown`,
`frontend/src/app/shared/components/markdown-editor/markdown-formatado.ts`), e o plano pede à IA para alterar esse bloco. Quem seleciona
três palavras recebe o parágrafo todo reescrito. O bloco existe por um motivo real: a troca no backend
(`alterar-trecho-do-plano.executor.ts`, `substituirTrechoUnico`) procura o Markdown exato do trecho antigo, e o texto renderizado não bate
com o Markdown (`**negrito**`, listas, links).

## Entregáveis

1. **Editor** (`markdown-editor.component.ts`, `markdown-formatado.ts`): o evento do menu de contexto (`MenuContextoEditorEvento`) passa
   a entregar **o bloco** (Markdown exato, como hoje) e **a seleção** (o texto selecionado, como aparece). No modo Markdown cru, bloco e
   seleção são o mesmo trecho selecionado, como hoje.
2. **Pedido à IA no plano** (`montarPedidoDeAlteracaoDoTrecho`, `modules/chat/utils/plano.util.ts`): a mensagem leva o bloco como
   contexto e a seleção como **o único alvo**, pedindo o bloco de volta igual, mudando só a seleção. O popover do pedido mostra a seleção
   (não o bloco) e o aviso "Só o trecho marcado é alterado. O parágrafo vai junto como contexto e não muda."
3. **Ferramenta da IA** (`propor-alterar-trecho-do-plano.ferramenta.ts`) e prompt `PLANEJAMENTO`: a descrição orienta a mandar o bloco
   inteiro como `trechoAntigo` e o bloco com só a seleção alterada como `trechoNovo`. O texto novo do prompt entra por migration (a
   próxima livre na hora; hoje `0068`, skill `sql-migrations`). A troca exata e a expiração no backend continuam como estão.
4. **Diff da proposta:** o cartão continua usando o diff por palavra (`shared/src/utils/diff-por-palavra.ts`, task 224); como só a
   seleção muda, o diff fica restrito a ela.
5. **Impacto:** o evento do editor tem dois consumidores (`plano-documento` e `usuario-anotacoes-dialog`, o "Enviar para" do pad). O
   "Enviar para" continua usando o bloco (decisão do agente na guarda-chuva); a mudança não altera o comportamento dele.

## Critérios de Aceite

- Teste do editor (componente): seleção de parte de um parágrafo com negrito entrega o bloco em Markdown e a seleção em texto; no modo
  cru, os dois iguais. Teste de `montarPedidoDeAlteracaoDoTrecho` com bloco e seleção.
- Teste de prompt (aba Prompts das Configurações da IA): três pedidos (palavra no meio do parágrafo, item de lista, trecho com negrito);
  a proposta só muda a seleção e encaixa (não expira). Relatos em `.artifacts/253-alterar-trecho-so-a-selecao/`, com modelo e data.
- `npm run test` e `npm run build` de `shared`, `backend` e `frontend` aprovados.
- Verificação ao vivo no plano (skill `verify`), em 1920×1080, 1366×768 e 1080×1920: selecionar, pedir, ver o diff só na seleção,
  aceitar e desfazer.
- `PROBLEMS.md` P-037 sai do arquivo, com o relato em `HISTORY.md`.

## Fora de Escopo

- O "alterar trecho" na tela de Documentações (task 258).
- Mudar o "Enviar para" do pad.

## Dependências

- Task 234 (a IA no plano) e 224 (diff por palavra), concluídas.

## Pontos em aberto (o autor confirma ao abrir a task)

- Seleção que atravessa dois blocos (fim de um parágrafo e início do outro). Padrão proposto: os dois blocos vão como contexto e a
  seleção continua sendo o único alvo.
