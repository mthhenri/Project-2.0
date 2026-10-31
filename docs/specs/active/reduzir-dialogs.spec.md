# reduzir-dialogs.spec.md

> Guarda-chuva (tasks **278–282**, só a spec). Origem: `IDEAS.md` I-038, levantada tela a tela com o autor em 2026-10-30 (artifact "Levantamento de dialogs", versão 4, nos temas claro e escuro).

## Objetivo

Reduzir os dialogs do sistema ao que realmente é uma janela: o que for tela inteira, edição longa, leitura sem uso ou campo único sai do dialog. A descrição da demanda passa a ser editada num modo **Dividido** (lista estreita e editor ao lado), sem janela sobreposta.

## Decisões do autor (19 dialogs)

**Continuam dialog (nada muda):** nova atividade, prioridades das atividades, registro de execução, formulário e volume do projeto, justificativa do ponto, grupo da Modelagem, formulário e senha do usuário, formulário da demanda, publicar plano, teste de prompt e dica de atalhos.

**Mudam:**

| Dialog | Decisão |
|---|---|
| `demanda-descricao-dialog` | **Dividido**: lista estreita à esquerda, editor ao lado, sem véu; trocar de demanda na lista troca o editor. |
| `tag-edicao-dialog` | **Inline**: nome e cor editados na própria linha da tabela de Tags. |
| `atividade-visualizar-dialog` | **Eliminar.** O autor considerou a visualização inútil; só sobrava a lista das últimas execuções. |
| `usuario-perfil-dialog` | **Eliminar.** Clicar no usuário abre direto o Editar; Alterar senha e Anotações viram ações da linha (menu ⋯). |
| `demanda-detalhe-dialog` | **Eliminar (proposta confirmada pelo autor).** Achado no código: o dialog só vive no painel escondido da árvore antiga (`raizes=[]`) e só abriria pelo Enter nessa árvore vazia. A visão real é a Árvore em três colunas (`app-demanda-aberta`). |
| `usuario-anotacoes-dialog` | Já é painel lateral; conferir se abre da barra do topo em qualquer tela e, se não, só então mover para o layout. |

## Quebra em tasks

| Task | Entrega |
|---|---|
| **278** | Modo **Dividido** reutilizável (lista estreita + editor) e a descrição da demanda nele. |
| **279** | Eliminar `atividade-visualizar-dialog`: remover os pontos de abertura (Atividades, histórico de execuções, Ponto) e definir o clique que sobra em cada um. |
| **280** | Eliminar `usuario-perfil-dialog`: clique abre o Editar; Alterar senha e Anotações viram ações da linha. |
| **281** | Eliminar `demanda-detalhe-dialog` e a base compartilhada só dele (`DemandaDetalheBase` é herdada também por `demanda-aberta`: manter o que a Árvore usa); manter o painel escondido que hospeda os outros dialogs. |
| **282** | Edição inline de tag (nome e cor na linha). |

## Critérios de Aceite (da guarda-chuva)

- Os dialogs eliminados não existem mais no código nem em nenhuma rota; nenhum clique do sistema tenta abri-los.
- Nenhum dialog que continua dialog muda de aparência ou comportamento.
- Verificação ao vivo (skill `verify`) nos dois temas, em 1920×1080, 1366×768 e 1080×1920, em cada tela tocada.

## Fora de Escopo

- **Melhorar o formulário de criação do projeto.** O autor pediu "ajustar algumas formas do cadastro", sem dizer quais: vira ideia nova em `IDEAS.md`, não entra aqui.
- Trocar o componente de diálogo compartilhado ou o tema dos dialogs que ficam.
- A edição inline do detalhe do projeto (271) e o relatório em página (269) já saíram do dialog antes.

## Dependências

- Nenhuma de outra spec. A task 278 é anterior à 274 da `chat-proposta-no-documento.spec.md` (ver lá).
- **Impacto:** rodar `gerenciamento-de-impacto` por dialog eliminado: `atividade-visualizar-dialog` é aberto de Atividades, execuções e Ponto; `usuario-perfil-dialog` abre Editar, Senha e Anotações; `demanda-detalhe-dialog` está dentro de `demanda-arvore-painel`, usado por `demanda-projeto` e `projeto-detalhe`.

## Riscos e Mitigação

- **Consumidor esquecido:** um link que abria o dialog eliminado vira clique morto. Mitigação: a skill `gerenciamento-de-impacto` por dialog e teste de componente nas telas de origem.
- **Perder a lista de últimas execuções:** ela sai com a visualização da atividade; continua na tela de execuções e no Ponto.
