# Task 155 — Chat do gestor: entrevista de demanda

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 9. Fluxo do gestor, item "Entrevista de demanda".

## Objetivo

Fazer a IA entrevistar o gestor (o que o cliente pediu e o que será feito) e propor as duas descrições da demanda, no nível analítico.

## Entregáveis

1. Executor `DESCREVER_DEMANDA`: altera `descricao_cliente` e `descricao_tecnica` (Markdown) pelo `DemandaService`, com desfazer que restaura os textos anteriores se ainda forem os que a IA gravou.
2. Ferramenta de proposta `propor_descrever_demanda` com a redação no nível **analítico** (prompt `ENTREVISTA_DEMANDA`, nova versão de seed): a IA pergunta o que falta antes de redigir e nunca inventa o que o cliente pediu.
3. Cartão com as duas descrições renderizadas em Markdown, editáveis antes de confirmar.
4. Testes: executor, desfazer com texto já editado por outra pessoa recusado, nível analítico no pedido de redação.

## Critérios de Aceite

- Na aplicação real, a entrevista termina com duas descrições propostas; confirmar grava nas duas colunas; o texto aparece no detalhe da demanda em Markdown.
- `1920×1080`, `1366×768` e `1080×1920`, temas claro e escuro, estados vazio, carregando, cheio e erro (análogo registrado na task).
- Testes de `backend` (node:test) e builds de `backend` e `frontend` passam; frontend sem lint (P-001), declarado no fecho.

## Fora de Escopo

- Conexões e lugar na árvore (156) e entrevista por voz.

## Dependências

`154`, `134` (Markdown) e `131` (prompts).

## Riscos e Mitigação

- Custo: o nível analítico é o mais caro; a redação roda uma vez por proposta e o resumo do contexto do projeto é limitado.
