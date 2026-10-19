# Task 171 — Testes: banco de teste para repositories

> Task 1/17 da guarda-chuva [`testes-automatizados.spec.md`](../backlog/testes-automatizados.spec.md). Origem: decisão do autor em
> 2026-10-18 de testar os repositories contra PostgreSQL real ([análise](../backlog/testes-automatizados/ANALISE.md) §3).

## Objetivo

Dar ao backend uma infraestrutura de teste de integração: um banco PostgreSQL de teste com todas as migrations, isolamento
entre testes, fábricas de dados que respeitam o schema e um comando próprio — e provar que ela funciona com um
repository de referência.

## Entregáveis

1. **Banco de teste.** Um banco separado (`<DB_NOME>_teste`, ou o nome de `DB_NOME_TESTE`) no mesmo PostgreSQL 16 do
   `docker-compose.yml`, criado se não existir e migrado até a última migration antes da suíte. Configuração pelo mesmo
   caminho do backend (`ConfigService`/`knexfile`), nunca `process.env` espalhado nos testes; a variável nova vai para
   `.env.example` e `README.md`. As extensões que as migrations exigem (incluindo `unaccent`) são criadas pelas próprias
   migrations — se alguma depender de criação manual, registrar.
2. **Isolamento por teste.** Helper que dá a cada teste uma conexão isolada e descarta tudo no fim. Padrão preferido:
   transação por teste com rollback, entregando a transação ao repository no lugar da conexão (as transações internas
   dos repositories viram savepoints). **Provar** com um teste que um repository que abre a própria transação
   (`usuario.repository`, linha ~167) funciona dentro do isolamento. Se não funcionar, usar `TRUNCATE ... RESTART
   IDENTITY CASCADE` das tabelas de dados (preservando as de referência/enum) e registrar o motivo.
3. **Instanciar repository sem Nest.** Helper `criarRepositorio(Classe, conexao)` que monta o repository com a conexão
   de teste, sem subir módulo Nest.
4. **Fábricas de dados.** Funções que inserem linhas válidas preenchendo **todos** os campos (nenhuma coluna tem
   `DEFAULT`), com sobrescrita por parâmetro: usuário (desenvolvedor, gestor, administrador), projeto, demanda (raiz e
   filha), `demanda_usuario`, tag, atividade, execução (com `inicio_data`/`fim_data` explícitos), dia não útil. As
   fábricas usam SQL direto com parâmetros nomeados e ficam em `backend/src/testes/` (ou pasta equivalente de conceito
   genérico, em inglês se for o caso, decidida pela regra de idioma de `SYSTEM.SPEC.md` §4).
5. **Comando.** `npm run test:integracao --workspace=backend` roda `src/**/*.integracao.test.ts`; o `test` atual
   **exclui** esses arquivos, para `npm test` seguir rodando sem Docker. Script de raiz `npm run test:integracao`.
6. **CI.** Job do `ci.yml` com serviço `postgres:16`, migrations e `test:integracao`.
7. **Repository de referência.** `tag.repository` coberto por inteiro como modelo para as tasks de domínio: listagem
   ignora excluída, soft delete grava `is_deleted`/`deleted_date`, unicidade de nome entre ativas, restauração.
8. **Documentação.** Seção "Testes de integração" em `docs/CONVENTIONS.md` (como escrever, isolamento, fábricas,
   armadilha do `NOW()`), comando novo em `CLAUDE.md`/`AGENTS.md` (idênticos) e na tabela de gates da skill `task-flow`
   (`.claude` e `.agents` idênticos).

## Critérios de Aceite

- Com o banco no ar, `npm run test:integracao --workspace=backend` passa duas vezes seguidas sem limpar nada à mão (prova
  do isolamento).
- Com o banco **fora** do ar, `npm test` na raiz passa; `test:integracao` falha com mensagem clara ("banco de teste
  indisponível em host:porta"), não com stack do driver.
- Teste prova que o banco de desenvolvimento não é tocado (o nome do banco usado termina em `_teste` ou é o de
  `DB_NOME_TESTE`; o helper recusa outro nome).
- Teste do item 2 (transação interna dentro do isolamento) verde.
- Job de integração verde no CI.
- `npm run repo:verificar` e `diff` de `CLAUDE.md`/`AGENTS.md` e das skills sem diferença.

## Fora de Escopo

- Testar os demais repositories (cada task de domínio cobre o seu).
- Mudar SQL de qualquer repository.
- Seed de desenvolvimento (`seed-desenvolvimento.ts`) — as fábricas são independentes dele.
- OpenSearch/Elasticsearch.

## Dependências

Nenhuma. Fontes: `docs/SYSTEM.SPEC.md` §7.4–§7.5 e §9, `docs/SCHEMA.md`, skill `sql-migrations`.

## Riscos e Mitigação

- **`NOW()` congelado na transação de teste:** documentar e fazer as fábricas exigirem datas explícitas.
- **Apontar para o banco errado:** a trava de nome do critério 3 é obrigatória, não opcional.
- **Migrations lentas a cada rodada:** migrar uma vez por suíte (setup global), não por arquivo.
