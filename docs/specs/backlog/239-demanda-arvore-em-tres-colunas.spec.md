# 239-demanda-arvore-em-tres-colunas.spec.md

> Task 2/4 da guarda-chuva `demanda-tela.spec.md` (reorganização da tela de demandas; origem `IDEAS.md` I-029). Fase 2: a visão Lista vira a
> **Árvore** em três colunas e a demanda aberta troca o `demanda-detalhe-dialog` dentro dela.

## Objetivo

A visão Lista (árvore inteira numa coluna, detalhe em diálogo) passa a ter **três colunas**: pastas, demandas da pasta escolhida e a
**demanda aberta** com as descrições em primeiro plano. A pasta escolhida é uma só e fica na URL (`?pasta=`).

## Decisões da guarda-chuva (autor, 2026-10-25)

1. À esquerda, as **pastas** (só as demandas de estrutura, em árvore); no meio, as demandas da pasta; à direita, a **demanda aberta**.
2. Clicar numa pasta mostra **só as demandas que estão direto nela**; as de uma sub-pasta aparecem ao clicar na sub-pasta.
3. **Linha da demanda:** status em bolinha (task 238), nome, barra com horas ("2h de 6h") e tags debaixo do nome, e os **ícones das três
   descrições** à direita. **Sem membros na linha.**
4. **Demanda aberta:** caminho, nome, status, barra de horas, **membros com bolinha e nome** e tags; abas **Técnica, Cliente, Documentação,
   Atividades e Conexões**, todas com ícone (as três descrições com o ícone e a cor delas, apagado quando vazia). O texto aparece para
   leitura, com **Editar** e **Planejar com a IA**.
5. **Ações:** sub-demanda sai da linha e vira **"Demanda aqui"** no topo da pasta; mais ações e editar vão para a demanda aberta.
6. A tela cabe com a **barra lateral aberta e fechada** e não fica pesada.

## Decisões do agente (padrão proposto; o autor confirma ao abrir a task)

- O nome da visão passa a ser **Árvore** (rótulo do seletor de modo; o tipo `ModoVisualizacao` em `models/demanda.model.ts` ganha o valor
  `arvore`). `?modo=lista` e o último modo guardado como `lista` continuam aceitos e abrem a Árvore, como `?modo=planejamento` na task 240.
- **"Sem pasta":** primeira entrada da coluna de pastas, com as demandas sem pai que não são de estrutura.
- **Pasta escolhida** vive na página (`demanda-projeto.page`), é uma só para as três visões e fica na URL (`?pasta=<demandaId>`) ao lado de
  `projetoId` e `modo`; `?pasta=sem-pasta` (ou valor equivalente a definir) vale para "Sem pasta". Pasta inexistente ou de outro projeto na URL
  é ignorada (cai na primeira pasta ou em "Sem pasta").
- **Busca** procura em todas as pastas e abre a pasta do resultado; os filtros de status e tags valem dentro da pasta escolhida.
- A demanda aberta **substitui o `demanda-detalhe-dialog` na Árvore**. O que abria o diálogo hoje: clique na linha e menu de contexto da
  Árvore (via `demanda-arvore-painel`), clique no nó do grafo e "Ver" do menu do Planejamento (via `painel.abrirDetalhe`); os dois últimos
  passam a abrir a demanda na Árvore (tasks 240 e 241).
- Demanda aberta fica na URL? **Ponto em aberto:** o autor não decidiu; padrão proposto é não (só a pasta), como o diálogo de hoje.

## Fatos do código (2026-10-25)

- Componentes de hoje: `demanda-arvore-painel` (árvore inteira, teclado ↑↓→←/Enter, expansão, e **hospeda os diálogos** de detalhe, edição,
  nova filha, tags, membros e descrição), `demanda-arvore-item` (linha recursiva), `demanda-projeto.page` (modos, filtros, atalhos `/` e `C`).
- `demanda-arvore.util.ts` monta a árvore a partir dos nós do grafo (`construirArvoreDemandas`); `demanda-filtro.util.ts` recorta por busca,
  status e tags (`recortarArvore`). A coluna de pastas e a lista da pasta saem do mesmo dado (`GET /demanda/grafo`), sem endpoint novo.
- **Não achei no código nenhum uso do `demanda-detalhe-dialog` fora do `demanda-arvore-painel`.** Chat e atividade só navegam para
  `/demanda?projetoId=` (`compositor.util.ts` `destinoDaReferencia`, `atividade-detalhe.page.html`). A guarda-chuva diz que o diálogo
  "continua onde é aberto de fora (chat, atividade)": isso hoje não procede (ver Pontos em aberto).

## Funções do `demanda-detalhe-dialog` que a demanda aberta precisa ter

Levantadas do `demanda-detalhe-dialog.component.ts/.html`; cada uma é conferida na verificação ao vivo:

1. **Carregar tudo** da demanda: `recuperar`, ancestrais, árvore (filhos), tags, membros, conexões e, se membro, atividades; catálogo de tags
   e (só gestor) lista de usuários para membros, uma vez por abertura.
2. **Título:** exibir; **editar inline** pelo lápis (só gestor): Enter salva, Esc cancela, valida vazio e caracteres proibidos
   (`REGEX_SEM_CARACTERES_PROIBIDOS`), otimista com rollback. Ícone de pasta nas estruturais.
3. **Caminho (breadcrumb)** clicável pelos ancestrais, e **histórico de navegação** com "← Voltar" (pilha de estados, sem nova chamada).
4. **Status** editável pelo gestor (otimista, com rollback; emite `statusAlterado` para atualizar nó e linhas sem recarregar).
5. **Tags** editáveis pelo gestor (`app-demanda-tags-cabecalho`; emite `tagsAlteradas`) e **membros** (`app-demanda-membros-cabecalho`:
   adicionar, remover e "Participar"), com as regras de `SYSTEM.SPEC.md` §14.
6. **Métricas** (`app-demanda-metricas`): horas estimadas e previsão de fim, click-to-edit só do gestor, com reversão se a API recusar.
7. **Descrições:** ver técnica, cliente e documentação; editar no editor Markdown (`app-markdown-editor`) com o assistente
   (`app-assistente-descricao`), salvar, e perguntar antes de fechar com alteração não salva (confirmação "Salvar/Descartar").
   Regras: descrição do cliente só o gestor edita; técnica e documentação, o gestor e o membro (`podeEditar`); os demais só leem.
8. **Sub-demandas** (só estrutural): listar, abrir uma, editar, criar nova filha (gestor) e abrir a descrição de uma filha. Na Árvore isto
   passa a ser a lista da pasta e o "Demanda aqui"; a aba **Sub-demandas deixa de existir** na demanda aberta (as abas são as cinco acima).
9. **Atividades** (só membro; gestor sempre): listar com status, prioridade, executor e tempo (`tempoExibicao`), **Nova atividade**
   (`app-atividade-nova-dialog` já com a demanda) e **Ver todas** (abre `/atividade?demandaId=` em outra aba).
10. **Conexões** (`app-demanda-conexao-lista`): listar, criar e excluir (gestor), abrir a demanda conectada.
11. **Editar tudo** (`app-demanda-formulario-dialog`, gestor) e **Excluir** com confirmação e desfazer (`DesfazerService`); depois de excluir,
    a pasta volta a mostrar a lista e a demanda aberta se fecha.
12. **Planejar com a IA:** botão novo, só leva ao modo planejamento do chat (`chat-planejamento.spec.md`, fora desta task). **Ponto em
    aberto:** enquanto a spec do modo planejamento não é implementada, o botão fica oculto ou desabilitado com tooltip? Padrão: oculto.
13. **Aba inicial:** hoje Atividades para membro e Conexões para não membro; na demanda aberta a aba inicial é **Técnica** (as descrições vêm
    em primeiro plano), com a regra de quem não vê Atividades mantida.

## Entregáveis

1. **Coluna de pastas:** árvore só de demandas estruturais, com "Sem pasta" no topo, expansão e recolhimento, a pasta escolhida realçada e
   navegação por teclado equivalente à da árvore de hoje; contagem de demandas diretas em cada pasta (padrão proposto).
2. **Coluna da pasta:** lista das demandas diretas da pasta, com a linha nova (decisão 3), e **"Demanda aqui"** no topo (gestor) que cria
   a demanda já dentro da pasta (reaproveita o formulário de nova filha). Estado vazio e carregando.
3. **Coluna da demanda aberta:** componente novo, `app-demanda-aberta`, com as funções 1 a 13 acima e as cinco abas com ícone. O
   `demanda-detalhe-dialog` fica de fora desta coluna; a lógica comum (carregar tudo, título, descrições) é extraída para o que os dois
   usarem, **sem duplicar** (o dialog tem 638 linhas: a extração é parte da entrega, não acréscimo).
4. **Pasta na URL** (`?pasta=`) com `projetoId` e `modo`, restaurada ao recarregar e compartilhável; a Árvore abre na pasta da URL.
5. **Busca e filtros** conforme as decisões do agente acima; a toolbar segue a mesma.
6. **Renomear Lista para Árvore** no seletor de modo, com os valores antigos aceitos.
7. **Ajustes do que sai da linha:** sem membros, sem `+` de sub-demanda e sem `⋮`; as ações do menu de contexto vão para a demanda aberta
   (mais ações) e o botão direito na linha continua abrindo o menu de contexto de hoje.
8. **Largura:** as três colunas cabem com a barra lateral aberta e fechada em 1366×768 (colunas com largura mínima e rolagem própria; a
   demanda aberta pode ser recolhida se faltar espaço, decisão da task).
9. Remover o que fica sem uso na Árvore: o diálogo de detalhe hospedado no `demanda-arvore-painel` (conforme o ponto em aberto abaixo).

## Gerenciamento de impacto

Aplicar `npm run impacto` em `demanda-arvore-painel`, `demanda-arvore-item`, `demanda-detalhe-dialog`, `demanda.model.ts` e
`demanda-projeto.page` antes de editar. Hoje o grafo e o Planejamento chamam `painel.abrirDetalhe`; até as tasks 240 e 241 chegarem, a
página encaminha esses cliques para abrir a demanda na Árvore (troca de modo + pasta), para não deixar o clique sem destino.

## Critérios de Aceite

- Testes: utilitário da pasta (demandas diretas, "Sem pasta", pasta de uma demanda, busca que acha a pasta) com `*.test.ts`; testes de
  componente das três colunas e da demanda aberta (cada função 1 a 13 com o perfil certo: gestor, desenvolvedor membro, desenvolvedor não
  membro); teste da página para `?pasta=` e `?modo=lista`. `npm run test --workspace=frontend` e `npm run build --workspace=frontend` passam;
  falha preexistente relatada à parte. Não há mudança de backend nem de `shared`.
- Verificação ao vivo (skill `verify`) em 1920×1080, 1366×768 e 1080×1920, **barra lateral aberta e fechada**, temas claro e escuro, com
  gestor, desenvolvedor membro e desenvolvedor não membro; estados: projeto vazio, pasta vazia, carregando, cheio, erro e demanda sem descrição.
  Conferir cada função do levantamento acima, uma a uma, no relatório de verificação.
- Análogo aprovado: a tela atual de demandas (`modules/demanda/pages/demanda-projeto`) e a barra lateral da task 223 (largura e recolhimento).
  Comparar densidade da linha e peso da tela com a Lista de hoje; corrigir divergência antes de apresentar.

## Fora de Escopo

- Controle de horas (task 240) e grafo (task 241), exceto o encaminhamento provisório do clique descrito em "Gerenciamento de impacto".
- O modo planejamento do chat e a lógica do "Planejar com a IA"; arrastar demanda entre pastas; mudar regra de permissão, de status ou de
  hierarquia; mudar o assistente de descrição ou o editor Markdown.
- Mobile.

## Dependências

- Task 238 em `done/` (bolinha de status e ícones das descrições).
- `docs/SYSTEM.SPEC.md` §14 (demanda, estrutural, descrição do cliente).

## Riscos e Mitigação

- **Tela pesada:** três colunas com a barra lateral aberta em 1366×768. Verificar nas três resoluções, aberta e fechada, antes de fechar.
- **Perder o que o diálogo faz:** a lista de funções acima é o checklist; cada item é conferido ao vivo e no teste.
- **Arquivo extenso:** o `demanda-arvore-painel` (489 linhas) e o `demanda-detalhe-dialog` (638) já são grandes. Não acrescentar responsabilidade
  neles; extrair antes (ver entregável 3).

## Pontos em aberto (o autor decide ao abrir a task)

1. O `demanda-detalhe-dialog` **não tem outro consumidor** hoje. A guarda-chuva diz que ele continua "onde é aberto de fora (chat,
   atividade)". Ou se mantém um diálogo fino para uso futuro (código sem uso) ou ele é removido junto com os specs. Padrão proposto: remover
   o que ficar sem consumidor e extrair a lógica comum para a demanda aberta.
2. Demanda aberta na URL (padrão: não) e o valor de `?pasta=` para "Sem pasta".
3. Botão "Planejar com a IA" antes de existir o modo planejamento (padrão: oculto).
