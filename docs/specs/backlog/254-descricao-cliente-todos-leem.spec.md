# 254-descricao-cliente-todos-leem.spec.md

> Task 1/7 da guarda-chuva [`documentacoes-e-pad.spec.md`](documentacoes-e-pad.spec.md) (decisão 1): a descrição do cliente passa a ser
> **lida por todos** em todo lugar; alterar continua só do gestor e do administrador.

## Objetivo

O desenvolvedor precisa ler o pedido do cliente para trabalhar na demanda. A regra de `SYSTEM.SPEC.md` §14 já restringe só a
**edição**, mas o chat e o plano escondem o texto dele. Esta task faz a leitura valer em todo lugar, sem abrir a edição.

## Entregáveis

1. **Chat, demanda aberta** (`modules/chat/components/demanda-leitura/`): a aba **Cliente** aparece para todos os perfis. Para o
   desenvolvedor, a aba mostra um cadeado e, acima do texto, o aviso "O pedido do cliente: você lê, só gestores alteram". O `abaAtiva`
   deixa de devolver a Checklist para quem não é gestor.
2. **Plano** (`modules/chat/components/plano-documento/` e `shared/src/utils/plano.ts`): a regra `podeVerAbaDoPlano` se divide em
   **ver** (todos) e **editar** (só gestor e administrador). A aba Cliente aparece para o desenvolvedor só para leitura (visualizador de
   Markdown, sem barra do editor, sem "alterar trecho com IA"), com o mesmo aviso. O backend (`PlanoService`) passa a devolver
   `descricaoCliente` a quem pode ver o plano e continua recusando a alteração vinda do desenvolvedor (`PlanoInternoAlterarDto`), como
   a publicação já faz.
3. **Tela de Demandas:** conferir que todo lugar que mostra a descrição do cliente (detalhe, demanda aberta, painel da árvore) a mostra
   ao desenvolvedor em leitura. Hoje esses componentes já só bloqueiam a edição (`demanda-detalhe.base.ts`, `demanda-aberta.component.ts`,
   `demanda-arvore-painel.component.ts`); a task registra a conferência e corrige o que esconder.
4. **Impacto** (skill `gerenciamento-de-impacto`): `podeVerAbaDoPlano` é regra pura do `shared` usada no front e no back
   (`npm run impacto -- shared/src/utils/plano.ts`). Todo consumidor é avaliado antes de mudar.
5. **Documentação:** `SYSTEM.SPEC.md` §14, linha "Editar `descricaoCliente`", ganha a nota "todos leem"; a decisão 15 da guarda-chuva
   `chat-execucao-por-demanda.spec.md` fica revista pela decisão 1 desta guarda-chuva (registro em `HISTORY.md`, sem reescrever a outra
   spec).

## Critérios de Aceite

- Teste da regra pura (ver e editar por tipo de usuário) no `shared`; teste da service do plano (desenvolvedor lê a descrição do cliente,
  não altera; gestor lê e altera); teste de componente da demanda aberta do chat e do documento do plano com o desenvolvedor (aba
  visível, sem edição, aviso presente).
- `npm run test` e `npm run build` de `shared`, `backend` e `frontend` aprovados.
- Verificação ao vivo (skill `verify`) com desenvolvedor e gestor, no chat (demanda aberta) e no plano, em 1920×1080, 1366×768 e
  1080×1920, com texto e sem texto na aba Cliente.

## Fora de Escopo

- Mudar quem altera a descrição do cliente.
- Abas Anotações (task 257) e tela de Documentações (task 259).

## Dependências

- `SYSTEM.SPEC.md` §14. Nenhuma task numerada antes.

## Pontos em aberto (o autor confirma ao abrir a task)

- No plano, o desenvolvedor vê o **rascunho** da descrição do cliente escrito no plano. Padrão proposto: sim, em leitura, pela mesma
  regra "todos leem" (o rascunho vira a descrição publicada).
