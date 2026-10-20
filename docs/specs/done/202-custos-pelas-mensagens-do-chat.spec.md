# 202-custos-pelas-mensagens-do-chat.spec.md

> Task solta, correção de rumo da task 201 (aba Custos). O combinado era gravar tokens nas mensagens
> do chat, sem tabela própria de uso; a 201 criou `ia_uso` por conta própria.

## Objetivo

A aba "Custos" passa a somar os tokens que já estão gravados nas mensagens do chat (task 188), e o
preço por modelo passa a morar na configuração da IA. As tabelas `ia_uso` e `ia_modelo_preco` saem.

## Entregáveis

1. **Migration `0048`.** Coluna `configuracao_ia.precos_modelo` (JSONB, modelo → preços de entrada,
   saída e cache por milhão de tokens), preenchida em todas as versões com os preços de
   `ia_modelo_preco` antes de ela ser derrubada; depois `DROP` de `ia_uso` e `ia_modelo_preco`.
   Sem `DEFAULT` na coluna. O `DOWN` recria as duas tabelas (vazias) e devolve os preços.
2. **Preço na configuração.** Salvar uma versão nova da configuração copia os preços da versão
   anterior. Editar um preço na aba altera **a versão ativa no lugar** (sem criar versão), sob o
   mesmo lock consultivo de `inserirNovaVersao`.
3. **Soma no contrato do armazenamento.** `ArmazenamentoDeChat.somarTokens` (período, dia ou mês)
   nos três armazenamentos (Postgres, OpenSearch, Elasticsearch), com o mesmo teste de contrato.
   Conta toda mensagem com modelo e tokens gravados, de qualquer contexto e de qualquer usuário.
4. **Custo.** `IaCustoService` lê os tokens do armazenamento e os preços da configuração. O custo
   de uma mensagem usa o preço do modelo gravado nela (aproximação quando o turno mistura níveis).
   Sai o registro por chamada: `IaService` deixa de gravar uso e `IaUsoRegistrarDto` é removido.
5. **Aba Custos.** "Chamadas" vira "Mensagens" (`chamadas` → `mensagens` nos DTOs). O texto da aba
   diz que o custo cobre só as mensagens do chat e que é estimativa; relatório, assistente de
   descrição, nomeação e sugestões não entram.
6. **Docs.** `SCHEMA.md`, `SYSTEM.SPEC.md`, `CONTEXT.md`, `HISTORY.md`, `IDEAS.md` (medição exata por
   modelo e do que está fora do chat).

## Critérios de Aceite

- `npm run test --workspace=shared`, `--workspace=backend`, `--workspace=frontend` e
  `npm run test:integracao` verdes; builds do backend e do frontend ok.
- A migration `0048` aplicada sobre um banco com `ia_modelo_preco` preenchida mantém os preços na
  versão ativa e nas anteriores; `db:rollback` volta.
- Teste de integração: `somarTokens` por dia e por mês, só mensagens com modelo e tokens, e
  `alterarPreco` na versão ativa sem criar versão; salvar versão nova mantém os preços.
- Aba verificada ao vivo (skill `verify`) em 1920×1080, 1366×768 e 1080×1920, com uma mensagem
  do chat gravada: os tokens e o custo batem com os da mensagem.

## Fora de Escopo

- Medir o que está fora do chat (relatório, assistente, nomeação, sugestões) e a precisão por
  modelo dentro de um turno misto: anotado em `IDEAS.md`.
- Importar o histórico do Console da Anthropic.
- Prompt caching (`cache_creation_input_tokens`).

## Dependências

Specs 188 (tokens na mensagem), 162/163 (armazenamentos do chat) e 201 (aba Custos), em `done/`.

## Riscos e Mitigação

- **As 22 chamadas já gravadas em `ia_uso` (US$ 0,02) são descartadas** com a tabela (decisão do
  autor). O chat de hoje continua contado, pelas mensagens.
- **Agregação nos índices (OpenSearch/Elasticsearch)** só roda de verdade com o serviço no ar:
  cobrir a consulta montada em teste unitário e o contrato com `CHAT_INTEGRACAO=1` quando houver
  serviço; declarar no fecho o que não rodou.
