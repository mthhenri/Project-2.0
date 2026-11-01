# 301 — Booleanos sem prefixo

> Origem: I-036 de `docs/context/IDEAS.md` (parte dos nomes). Avaliação feita com o autor em 2026-10-31. Independente da task 300; pode vir antes ou depois dela.

## Objetivo

Uniformizar o nome das colunas e campos booleanos de negócio: sem prefixo `is_`/`eh_`, no adjetivo ou particípio. Hoje convivem três padrões: `is_` (`is_estrutural`, `is_solo`, `is_arquivado`), `eh_` (`eh_bidirecional`) e sem prefixo (`ativo`, `rascunho`, `recorrente`, `silenciada`, `contem_codigo` e outros, a maioria). `is_deleted` fica: é conceito genérico em inglês, da `BaseEntity`.

## Entregáveis

1. **Migration** (próximo número livre; skill `sql-migrations`) com `RENAME COLUMN`, sem mexer em dados:
   - `demanda.is_estrutural` → `estrutural`;
   - `demanda_conexao.eh_bidirecional` → `bidirecional`;
   - `plano.is_solo` → `solo` e `plano.is_arquivado` → `arquivado`.
   Índices, constraints e triggers que citem o nome antigo são renomeados junto. `-- DOWN` desfaz. Rollback testado.
2. **`shared/`**: `isEstrutural` → `estrutural`, `ehBidirecional` → `bidirecional`, `isSolo` → `solo`, `isArquivado` → `arquivado` em todos os DTOs (demanda, conexão, grafo, plano, ferramentas da IA), incluindo o `@Transform` do filtro `DemandaListarDto`. `shared/src/utils/plano.ts` e seus testes acompanham.
3. **Backend**: repositories (`demanda`, `plano`), as CTEs de hierarquia (`demanda_filho`, `caminho_demanda`, `arvore_demanda`), services, executores e ferramentas da IA que citam os campos.
4. **Frontend**: formulário e árvore de demanda, controle de horas, grafo, lista de conexões, cartão de proposta do chat e cabeçalho/documento do plano, com templates e specs.
5. **Dados de apoio e documentação**: seeds, `fabricas.ts`, `docs/SCHEMA.md`, `docs/SYSTEM.SPEC.md` e `CONVENTIONS.md` (registrar a regra: booleano de negócio sem prefixo; `is_deleted` é a exceção genérica). Ao fechar: concluir a parte de nomes do I-036 e registrar no `HISTORY.md`.

## Critérios de Aceite

- `npm run impacto` por campo antes de mexer; nenhum consumidor esquecido.
- Nenhuma referência restante aos nomes antigos fora de migrations históricas e de `done/`.
- Resposta da API idêntica em valor; só mudam as chaves renomeadas.
- Migration aplica e reverte; `npm run test:integracao`, testes dos quatro workspaces, builds e `npm run repo:verificar` passam.
- Verificação ao vivo (skill `verify`): criar demanda estrutural, conexão bidirecional e unidirecional no grafo, plano solo e arquivado. Gate de UI nos três tamanhos para as telas de demanda e do plano.
- Falhas preexistentes e a ausência de lint relatadas à parte.

## Fora de Escopo

Renomear `is_deleted`; renomear booleanos que já não têm prefixo; alterar regra de negócio; editar migrations já aplicadas.

## Dependências

Skills `sql-migrations`, `gerenciamento-de-impacto` e `project20-dto-conventions`; `SCHEMA.md`, `SYSTEM.SPEC.md` §9. Coordenar com qualquer trabalho em andamento nas telas de demanda e do plano (por exemplo, o ajuste dos skeletons), que tocam os mesmos arquivos do frontend.
