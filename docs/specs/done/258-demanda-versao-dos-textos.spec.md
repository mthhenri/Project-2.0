# 258-demanda-versao-dos-textos.spec.md

> Task 5/7 da guarda-chuva [`documentacoes-e-pad.spec.md`](../../backlog/documentacoes-e-pad.spec.md) (decisão 5): os textos da demanda ganham
> **trava de versão**, como o plano, para a tela de Documentações não sobrescrever quem gravou antes.

## Objetivo

A tela de Documentações (task 259) é um editor de escrita longa dos três textos da demanda. Enquanto alguém escreve, outra pessoa pode
gravar o mesmo texto pela tela de Demandas, pela publicação do plano ou por uma proposta da IA. O plano já resolve isso com
`plano.versao`; a demanda não tem coluna equivalente.

## Entregáveis

1. **Migration** (a próxima livre na hora; hoje `0068`, skill `sql-migrations`): coluna `demanda.versao INTEGER NOT NULL`, sem
   `DEFAULT`. A migration cria a coluna anulável, grava 1 em todas as linhas e então a torna `NOT NULL`. `docs/SCHEMA.md` atualizado.
2. **Todo INSERT e UPDATE de demanda** passa a fornecer a versão: o INSERT grava 1; todo UPDATE que muda `descricao_tecnica`,
   `descricao_cliente` ou `documentacao` soma 1 na mesma instrução. Caminhos que gravam esses textos: `DemandaService` (alterar), os
   executores da IA que descrevem ou alteram a demanda, a publicação do plano e o restaurar do desfazer. A análise de impacto lista todos.
3. **Endpoint de textos com versão:** `PATCH /demanda/:id/textos` com `DemandaTextosAlterarDto` (`descricaoTecnica?`,
   `descricaoCliente?`, `documentacao?`, `versao`) e saída `DemandaTextosAlteradosDto` (os três textos e a versão nova). O `UPDATE`
   compara a versão e grava na mesma instrução; versão diferente é recusada com o mesmo erro e mensagem do plano ("alguém gravou uma
   versão mais nova"). Permissões de §14 sem mudança: desenvolvedor só se for membro e nunca a descrição do cliente.
4. **Leitura com versão:** o DTO que a tela de Documentações lê da demanda (`DemandaRecuperadaDto` ou o de leitura que a 259 usar) passa
   a trazer `versao`.
5. **Documentação:** `SYSTEM.SPEC.md` (entidade demanda) e `docs/SCHEMA.md`.

## Critérios de Aceite

- Teste de integração (`npm run test:integracao`) do repository: INSERT com versão 1, UPDATE de texto sobe a versão, gravação com versão
  velha não muda nada e é recusada.
- Testes unitários da service (permissões, recusa por versão, gestor e desenvolvedor membro e de fora) e dos DTOs no `shared`.
- `npm run build` de `shared` e `backend` aprovados; `npm run db:migrate` e `db:rollback` da migration conferidos.

## Fora de Escopo

- A tela de Documentações (task 259). As outras telas continuam gravando como hoje, sem recusar por versão; elas só sobem a versão.
- Histórico de versões.

## Dependências

- `docs/SCHEMA.md` (`demanda`) e o padrão de `plano.versao` (task 232). Nenhuma task numerada antes.
