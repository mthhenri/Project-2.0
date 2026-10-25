# demanda-tela.spec.md

> Guarda-chuva da **reorganização da tela de demandas**: a visão Lista vira três colunas (pastas, demandas da pasta e a demanda aberta
> com as descrições em primeiro plano), a aba Planejamento vira **Controle de horas** e o grafo ganha os mesmos sinais. Origem: conversa
> com o autor em 2026-10-25 (`IDEAS.md` I-029). **Não é uma task implementável**: registra as decisões; cada task ganha a sua spec (tasks
> **238–241**, tabela em "Tasks") antes de ser implementada. O visual está no canvas do autor (link em
> [`demanda-tela/referencias.md`](demanda-tela/referencias.md)); o canvas ilustra, a spec decide.

## Objetivo

Dar foco às **descrições** da demanda (técnica, cliente e documentação) e separar a navegação pela estrutura da lista de trabalho. A tela
passa a ter três visões alinhadas entre si (**Árvore**, **Grafo** e **Controle de horas**), com o mesmo status em ícone, a mesma barra de
horas e a mesma pasta escolhida.

## O que existe hoje

- `demanda-projeto.page` com três modos: **Lista** (`demanda-arvore-painel` + `demanda-arvore-item`: árvore inteira, linha com nome,
  barra e horas, status em texto, três ícones de descrição, `+` de sub-demanda nas estruturais e `⋮`), **Grafo** (`demanda-grafo`, d3 com
  força: círculo com a borda na cor do status, estrutural tracejada, hierarquia azul, conexão cinza tracejada, cartão ao passar o mouse,
  legenda que filtra) e **Planejamento** (`demanda-planejamento-painel`, só gestor e administrador: tabela plana com caminho, status, estimado ×
  executado com a cor por percentual, estouro e quem executa agora).
- O detalhe abre no `demanda-detalhe-dialog` (abas Sub-demandas, Atividades, Conexões); cada descrição abre num diálogo próprio.
- Cores dos ícones de descrição: `--app-icone-tecnica`, `--app-icone-cliente`, `--app-icone-doc` (brilho quando preenchida, cinza apagado
  quando vazia). Cores de status: `COR_NO_BORDA` (`demanda-cores.constants.ts`).

## Decisões do autor

### Árvore (antiga Lista)

1. **Três colunas:** à esquerda, as **pastas** (só as demandas de estrutura, em árvore); no meio, as demandas da pasta escolhida; à direita,
   a **demanda aberta**.
2. Clicar numa pasta mostra **só as demandas que estão direto nela**; as de uma sub-pasta aparecem ao clicar na sub-pasta.
3. **Linha da demanda:** status em ícone, nome, barra com horas ("2h de 6h") e tags debaixo do nome, e os **ícones das três descrições**
   à direita. **Sem membros na linha.**
4. **Status em bolinha**, todos o mesmo círculo visto de jeitos diferentes: pendente vazio; planejada com **um ponto no meio** ("está no
   jogo, pode ser executada", não "agendada"); concluída cheia com ✓; cancelada com um risco. O nome do status vai no tooltip e no painel.
5. **Ícones das descrições:** técnica **terminal**, cliente **pessoa** (o de hoje), documentação **folha com texto**, com as cores e o
   brilho de hoje (`--app-icone-*`).
6. **Demanda aberta:** caminho, nome, status, barra de horas, **membros com bolinha e nome** e tags; abas **Técnica, Cliente, Documentação,
   Atividades e Conexões**, todas com ícone (as três descrições com o ícone e a cor delas, apagado quando vazia). O texto aparece para
   leitura, com Editar e "Planejar com a IA".
7. **Ações:** sub-demanda sai da linha e vira **"Demanda aqui"** no topo da pasta; mais ações e editar vão para a demanda aberta.
8. A tela precisa caber com a **barra lateral aberta e fechada**, e não pode ficar pesada.

### Controle de horas (antiga aba Planejamento)

9. **Renomear** para "Controle de horas" (o nome "planejamento" fica para o modo do chat, `chat-planejamento.spec.md`).
10. **Em árvore**, como a Árvore: pastas e sub-pastas (abrem e fecham) com o total delas, e as demandas dentro, com o status em bolinha.
11. **Barra:** vai até 150% do estimado, com um **risco nos 100%**, e mantém a cor de hoje (azul até 75%, depois amarelo, laranja e vermelho;
    acima de 100%, vermelho escuro). Ao lado, **quanto passou** ("+3h (150%)") ou **quanto resta**.
12. **Executando agora:** na **cor do tema**, com bolinha, nome e há quanto tempo. No **resumo do topo** (estimado, executado, estouro,
    executando agora), quem executa aparece **só como bolinhas sobrepostas**, com o nome no tooltip e "+N" para o excedente.
13. **Cartões embaixo da árvore:** demandas **sem estimativa** (com campo para estimar ali) e demandas **paradas**.
14. Clicar numa demanda abre ela na Árvore, com a pasta dela escolhida.

### Grafo

15. **Mexe pouco:** continua o grafo de hoje (força, círculos, cores, linhas). Muda: o nó mostra a marca do status (ponto, ✓ ou risco), o
    cartão do mouse usa a barra do Controle de horas, **clicar no nó abre a demanda na Árvore** (na pasta, muda o foco) e o grafo **começa
    focado na pasta escolhida** (o resto apagado, com botões para trocar o foco).

## Decisões do agente (padrão proposto; o autor confirma na spec de cada task)

- **Nomes:** a visão Lista passa a se chamar **Árvore**. `?modo=planejamento` e o último modo guardado como `planejamento` continuam
  aceitos e abrem o Controle de horas (links antigos não quebram).
- **Cor da planejada (autor, 2026-10-25):** **uma cor só em todas as telas**, numa constante única que a Árvore, o Controle de horas,
  o grafo e os filtros leem. Hoje há duas (ciano no grafo, na toolbar e na legenda; o `info` do status chip na lista); a task da fase 1
  escolhe a que fica mais bonita na tela e aplica nas outras. O status vira um componente só, usado na Árvore, no Controle de horas, no
  grafo e nos filtros.
- **"Sem pasta":** primeira entrada da coluna de pastas, com as demandas sem pai que não são de estrutura.
- **Pasta escolhida** é uma só para as três visões e fica na URL (`?pasta=`), como o projeto e o modo.
- **Demanda aberta** troca o `demanda-detalhe-dialog` na Árvore; o diálogo continua onde é aberto de fora (chat, atividade).
- **Quem vê o quê não muda:** Controle de horas segue só do gestor e do administrador (`GET /demanda/planejamento` é `@GestorOnly`, que é `temPermissaoDeGestor`); a visibilidade e a edição
  das descrições seguem as regras de hoje (`SYSTEM.SPEC.md` §14).
- **Paradas:** demanda com estimativa, não concluída nem cancelada, sem execução há mais de 7 dias (ou sem nenhuma, criada há mais de 7).
  Pede dado novo no `DemandaPlanejamentoDto` (última execução) e sai do backend; o prazo é constante no `shared`.
- **Estimar pelo cartão** usa a alteração de demanda de hoje (só gestor e administrador alteram horas).
- **Busca** procura em todas as pastas e abre a pasta do resultado; os filtros de status e tags valem dentro da pasta escolhida.

## Fora de Escopo

- O modo planejamento do chat e o "Planejar com a IA" além do botão que leva para ele (`chat-planejamento.spec.md`).
- Mudar regras de permissão, de status ou de hierarquia; mexer no layout de força do grafo, no zoom ou na legenda.
- Arrastar demanda entre pastas.

## Dependências

- `docs/SYSTEM.SPEC.md` §14 (demanda, estrutural, descrição do cliente) e a tabela de módulos (`demanda`).
- Aplicar a skill `gerenciamento-de-impacto` antes de trocar o status chip, os ícones de descrição e as cores (usados também fora da tela).

## Riscos e Mitigação

- **Tela pesada:** três colunas com a barra lateral aberta em 1366×768. Mitigação: verificar nas três resoluções do gate, com a barra
  aberta e fechada, antes de fechar a task da Árvore.
- **Perder o que o diálogo de detalhe faz** (sub-demandas, atividades, conexões, editar título, histórico de navegação). Mitigação: listar as
  funções do `demanda-detalhe-dialog` e conferir cada uma na demanda aberta.

## Tasks (238–241)

| # | Task | Escopo | Depende de |
|---|---|---|---|
| 238 | [Status em bolinha e ícones das descrições](../done/238-demanda-status-em-bolinha.spec.md) | componente de status único, ícones novos com as cores de hoje, cor única da planejada, aplicados na tela atual (lista, grafo, planejamento, filtros); gerenciamento de impacto | — |
| 239 | [Árvore em três colunas](../done/239-demanda-arvore-em-tres-colunas.spec.md) | pastas, lista da pasta, demanda aberta com as abas, "Demanda aqui", "Sem pasta", `?pasta=`; demanda aberta no lugar do diálogo, com as funções do diálogo listadas | 238 |
| 240 | [Controle de horas](240-demanda-controle-de-horas.spec.md) | renomear, árvore com totais, barra até 150%, executando agora, resumo com bolinhas, cartões de sem estimativa e paradas (dado novo no `DemandaPlanejamentoDto`, prazo de 7 dias no `shared`) | 238, 239 |
| 241 | [Grafo](241-demanda-grafo-integrado.spec.md) | marca do status, cartão com a barra nova, clique abre na Árvore, foco na pasta | 238, 239, 240 |

**Ordem:** 238 → 239 → 240 → 241. A 238 é pequena e independente; a 239 deixa um encaminhamento provisório do clique do grafo e do
Controle de horas até a 240 e a 241.

Para UI, o análogo aprovado é a tela atual de demandas (`modules/demanda/pages/demanda-projeto`) e a barra lateral da task 223.
