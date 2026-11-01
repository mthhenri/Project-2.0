# Relatório da task 300 — esqueletos fiéis às telas (parcial, em andamento)

> Estado em 2026-11-01: **concluída**. Todas as telas e painéis foram medidos contra a tela real.

## Método

Stack isolado (banco `project20_verify` com o seed de histórico, backend 3001, `ng serve` 4201; removidos ao fim). Esqueleto capturado atrasando só as chamadas de dados (`fetch`/`XMLHttpRequest` com `setTimeout`) e comparado com a tela carregada medindo no DOM (largura de coluna, altura de linha, topo e altura de cada bloco). Captura visual: Atividades a 1366×768 nos temas escuro e claro; Árvore a 960×1080; demais a 1920×1080 (escuro).

## Inventário e decisão

| Tela / painel | Antes | Decisão e resultado |
|---|---|---|
| Atividades (lista) | 10 colunas (Projeto, Demanda… já fundidos em Atividade), linha de 5,25 rem, 5 linhas | **Refeito**: 8 colunas reais (caixa de seleção só do gestor), linha de 3,9375 rem (medida 63 px), 10 linhas (página real), células de duas linhas, avatar, selos, ícones |
| Usuários | colunas certas, células de texto | **Ajustado**: pesos medidos a 1920, avatar, selo, interruptor e ícones |
| Execuções (histórico) | linha de 4,5 rem, 4 linhas | **Ajustado**: linha de 4,125 rem (66 px), pesos medidos, avatar, células de duas linhas, 8 linhas |
| Calendário (tabela do mês) | coluna Ações sempre | **Ajustado**: Ações só para o gestor, linha de 3 rem (48 px), selo no Tipo |
| Tags | cartão 52 px, espaço 12 px | **Ajustado**: 49 px e espaço de 10 px (medidos) |
| Ponto — equipe | 2 colunas de cartões, 8,6 rem | **Refeito**: 3 colunas (mesma regra de grade da tela), cartão 8,75 rem, faixa da triagem reservada |
| Ponto — mensal | cartões 5,8 rem, linhas com espaço | **Ajustado**: título, cartões 5,875 rem com espaço de 1 rem, linhas de 1,9375 rem coladas |
| Árvore de demandas | linhas genéricas | **Esqueleto próprio** (`app-demanda-arvore-esqueleto`): três colunas 20/28/52, mesmos pontos de quebra da tela, faixa da barra reservada |
| Controle de horas | linhas genéricas | **Esqueleto próprio** (`app-demanda-controle-horas-esqueleto`): resumo, barra, tabela, dois cartões; alturas conferidas (78 / 35 / 317 px) |
| Detalhe do projeto | duas linhas | **Refeito**: cartão do cabeçalho e, nas demandas, barra + árvore; topo e altura iguais aos da tela (271/61 e 340/692 px) |
| Detalhe da atividade | seis linhas | **Refeito**: trilha, cabeçalho, faixa e dois blocos com as alturas da tela |
| Volume do projeto | 3 cartões de 52 px | **Ajustado**: um cartão de 23,625 rem (mensal; real 378 px) |
| IA — Custos | dois cartões de 52 px | **Ajustado**: 13,125 rem e 22 rem (medidos); resumo já era fiel |
| IA — abas Comportamento e Autonomia | 14 rem e 20 rem | **Ajustado**: 17,375 rem (real 310 px) e 35 rem (real 1284 px; limitado ao que cabe na tela) |
| Projetos (cartões) | grade e altura certas | **Mantido** |
| IA — aba Provedor | 24 rem contra 24,6 rem | **Mantido** |
| IA — Prompts | lista e editor | **Mantido** (não medido) |

## Segunda rodada (painéis)

| Painel | Decisão e resultado |
|---|---|
| Chat — conversa | **Refeito**: balões do usuário (71 px) e da IA (133 px, com avatar) no ritmo da tela; as linhas ficam iguais às reais. O topo do esqueleto está 40 px abaixo do da conversa carregada (cabeçalho da página difere durante a carga); não investiguei |
| Chat — seletor de conversas | **Ajustado**: duas seções com cabeçalho de 20 px e itens de 57 px |
| Chat — documento do plano | **Ajustado**: cabeçalho 78, corpo 682 e rodapé 44 px (medidos) |
| Documentações — demanda | **Ajustado**: cabeçalho 35, abas 57, editor 691 e rodapé 44 px |
| Documentações — seletor de demanda | **Ajustado**: passo de 67 px entre os projetos |
| Pad do usuário | **Refeito**: cinco cabeçalhos de seção (passo de 61 px, como o acordeão) |
| Prioridades em cores | **Ajustado**: cinco linhas, passo de 67 px |
| Mensagens diretas — lista | **Ajustado**: passo de 67 px |
| Mensagens diretas — nova conversa | **Ajustado**: passo de 58 px |
| Supervisão do chat — lista | **Ajustado**: itens de 80 px com passo de 96 px |
| Mensagens diretas — conversa | **Mantido**: balões de uma linha (38 px) de altura variável; o esqueleto já tem tamanhos plausíveis |
| Chat — Minhas demandas e demanda aberta | **Sem tela**: os dois componentes são importados em `chat.page.ts` mas nenhum template os usa hoje; não há o que comparar |

## Terceira rodada (restantes)

| Painel | Decisão e resultado |
|---|---|
| Plano — pontos | **Ajustado**: três cartões de 125 px com 6 px de intervalo |
| Plano — fontes | **Ajustado**: dois itens de 101 px |
| Plano — diálogo de publicar | **Ajustado**: três abas de 50 px com 14 px de intervalo |
| Aba Prompts da IA | **Ajustado**: faixa de aviso de 47 px, lista de tipos (63 px, passo de 67) e editor |
| Check-in | **Ajustado**: o rodapé de 172 px fica reservado embaixo; conferido a 520×640 com a situação simulada no navegador (esqueleto 79–452 contra conversa 87–452) |
| Cartão de referência (mensagens diretas) | **Mantido**: 36 px de esqueleto mais 18 px de moldura dão os 54 px do cartão real |
| Diálogo de teste de prompts | **Mantido**: o tamanho depende do texto gerado pela IA |

Achados que não são do esqueleto: no chat o esqueleto fica 9 px mais abaixo (conversa carregada rolada ao fim) e o rodapé cresce 42 px com a fileira de sugestões, que só existe com mensagens; no check-in o cabeçalho ganha uma linha de subtítulo (8 px) depois da carga. "Minhas demandas" e "demanda aberta" do chat estão importados mas nenhum template os usa.

Formatos (todos conferidos, 1920×1080 primeiro): 1920×1080, 1366×768 (escuro e claro), 960×1080 (Árvore: a demanda aberta desce), 720×1280 e 1080×1920 (capturas das Atividades em claro e escuro, da Árvore e do Controle de horas; medida de `scrollWidth` sem estouro horizontal em Atividades, Usuários, Execuções, Controle de horas, Árvore, Ponto, Tags e Calendário a 720 no escuro).

Achado do 720×1280: as tabelas reais têm largura mínima e rolam na horizontal (Atividades 959 px, Usuários 757, Execuções 588), e o esqueleto as espremia (cabeçalhos quebrados em "Prio rida de"). O `app-skeleton-lista` ganhou `larguraMinimaTabela` (60 rem, 47,25 rem e 36,75 rem nessas três telas): a rolagem do esqueleto passou a medir 960, 756 e 588 px, iguais às reais.

## Testes e gates

- `npm run test --workspace=frontend`: 195 arquivos, 2422 testes, verde (inclui testes novos do `app-skeleton-lista` com formas de célula, espaçamento e gap, de `montarEsqueletoDeTabela` e dos dois esqueletos novos; três testes antigos passaram a procurar o novo esqueleto).
- `npm run lint:tudo`: sem erros. `npm run build --workspace=frontend`: concluído (avisos de orçamento e NG8107 já existentes).
- Não rodei o teste de integração do backend (nada no backend mudou).

## Fecho

Sem pendências. Spec movida para `done/`; registro em `docs/context/HISTORY.md`.
