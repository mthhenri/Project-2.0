# Verificação — reduzir-dialogs (tasks 278–282)

Feita em 2026-10-31 no stack de desenvolvimento (backend `:3000`, front `:4200`, base reseedada), uma task por commit. A narrativa de cada uma está em `docs/context/HISTORY.md`.

## Gates automáticos

Frontend (Vitest): 2368 → 2353 testes ao final, em 187 arquivos (os specs dos componentes eliminados saíram; entraram os do editor de descrição, do contêiner Dividido, da tela em modo Dividido, da linha de usuário e da edição do nome da tag). Build do frontend e `npm run repo:verificar` ok a cada commit. Backend, shared e desktop não mudaram. Sem lint (`PROBLEMS.md` P-001).

## O que foi eliminado e o clique que sobrou

| Task | Dialog | Agora |
|---|---|---|
| 281 | `demanda-detalhe-dialog` | inalcançável antes (painel escondido); `DemandaDetalheBase` foi para `components/demanda-detalhe-base/` |
| 279 | `atividade-visualizar-dialog` | Atividades sem o olho; nome da atividade é texto em Execuções e no Ponto |
| 280 | `usuario-perfil-dialog` | clicar na linha (ou Enter) abre o Editar, só para quem pode editar |
| 282 | `tag-edicao-dialog` | clicar no nome ou no lápis edita o nome na linha (Enter, Esc, sair do campo) |
| 278 | `demanda-descricao-dialog` | modo Dividido: lista estreita e `demanda-descricao-editor` ao lado, sem véu |

## Ao vivo

Navegador embutido, gestor. Tamanhos reais conseguidos: **1024×768** (a pane não chega a 1366 nem a 1920 de largura) e **1080×1920**; **tema claro e escuro** na Árvore em modo Dividido (1080×1920). O modo Dividido foi visto em Demandas e no detalhe do projeto: abre pelo Editar da aba, troca de demanda na lista (com texto digitado aparece "Alterações não salvas"; Descartar leva o editor à outra demanda, que abre com o texto dela), Cancelar volta às três colunas na demanda escolhida.

## Limites (não verificado)

- **1366×768 e 1920×1080** não foram percorridos (limite da pane); o tema escuro só em 1080×1920. As telas das tasks 279, 280 e 282 foram vistas só no tema claro.
- Não visto na tela: o desenho do cartão do Ponto e do detalhe do dia com execuções (sem dados hoje), o Salvar do modo Dividido gravando de fato (só por teste), o erro de nome repetido e o Esc na edição da tag.
- Entrar no modo Dividido recria a lista de demandas: a posição de rolagem dela volta ao topo.
- **O `demanda-arvore-painel` escondido ainda tem a sua própria janela de descrição**, aberta pelo menu de contexto do Controle de horas (`abrirDialogDescricaoPorId`). Ela não é o `demanda-descricao-dialog` da spec, mas é um modal de descrição que continua existindo; trocá-la é decisão do autor.
- A linha da spec sobre `usuario-anotacoes-dialog` ("conferir se abre da barra do topo em qualquer tela") não faz parte de nenhuma das tasks 278–282 e **ficou sem conferir**.
- Divergência da 280: não foi criado o menu ⋯ da linha de usuário, porque lápis, cadeado e a coluna Anotações já eram ações da linha.
