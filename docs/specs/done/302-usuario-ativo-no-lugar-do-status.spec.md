# 302 — Usuário `ativo` no lugar do status

> Origem: I-036 de `docs/context/IDEAS.md`, primeira prioridade em `PRIORITIES.md` (triagem de 2026-10-31). Avaliação feita com o autor em 2026-10-31. A task 301 (nomes dos booleanos) é independente e vem depois.

## Objetivo

Trocar a tabela de referência `tipo_usuario_status` (só `ATIVO` e `INATIVO`) pela coluna booleana `usuario.ativo`. Não há outro estado previsto para o usuário (afastado, férias): `CONTEXT.md` registra que não existe estado "Férias" por usuário. O comportamento do sistema não muda.

## Entregáveis

1. **Migration** (próximo número livre, conferido pelo diretório; skill `sql-migrations`): adiciona `usuario.ativo BOOLEAN`, preenche a partir do `codigo` de `tipo_usuario_status` (`ATIVO` → `true`), aplica `NOT NULL`, remove `tipo_usuario_status_id` (e a FK `fk_usuario_tipo_usuario_status`) e a tabela `tipo_usuario_status`. Sem `DEFAULT`. `-- DOWN` recria a tabela, os dois valores e a FK, e restaura `tipo_usuario_status_id` a partir de `ativo`. Rollback testado: aplicar, reverter, aplicar de novo.
2. **`shared/`**: o campo `status` dos DTOs de usuário vira `ativo: boolean` (`UsuarioCriarDto`, `UsuarioAlterarDto`, `UsuarioInternoAlterarDto`, `UsuarioListarDto`, `UsuarioCriadoDto`, `UsuarioAlteradoDto`, `UsuarioRecuperadoDto`, `UsuarioResumoDto`); o filtro de listagem vira `ativo?: boolean` (com o `@Transform` de boolean já usado nos filtros). `TipoUsuarioStatusEnum` (`tipo-usuario-status.enum.ts`) é removido do pacote, do `index` e do stub do frontend.
3. **Backend**: `usuario.repository.ts` deixa de juntar `tipo_usuario_status` (some o `INNER JOIN`, o subselect de gravação e o filtro por `codigo`) e passa a ler e gravar `usuario.ativo`; `usuario.model.ts`, `usuario.service.ts`, `autenticacao.service.ts`, `jwt.strategy.ts` e as ferramentas da IA (`listar-usuarios.ferramenta.ts`) usam o booleano. Regra de negócio igual: usuário inativo não faz login nem aparece como atribuível.
4. **Frontend**: `usuario-listagem.page.ts` (filtro e coluna), formulário de usuário, `atividade-listagem.page.ts`, `execucao-historico.page.ts` e demais pontos que leem o status. Visual e textos ("Ativo"/"Inativo") iguais.
5. **Dados de apoio**: seeds (`seed-desenvolvimento.ts`, `seed-historico-desenvolvimento.sql`), `backend/src/testes/fabricas.ts` e `frontend/src/testes/usuarios-teste.ts`.
6. **Documentação**: `docs/SCHEMA.md` (tabela `usuario`, lista de tabelas de referência e tabela de rótulos), `docs/SYSTEM.SPEC.md` (§5.4, a descrição da tabela `usuario` e a tabela de enums por coluna), `CONVENTIONS.md` se citar o status. Ao fechar: retirar I-036 do `IDEAS.md` e do `PRIORITIES.md`, registrar no `HISTORY.md`.

## Critérios de Aceite

- `npm run impacto` rodado nos DTOs e no enum antes de mexer (skill `gerenciamento-de-impacto`); nenhum consumidor esquecido, e o que mudar além do pedido vai ao autor antes.
- Nenhuma referência restante a `tipo_usuario_status`, `TipoUsuarioStatusEnum` ou `usuario.status` fora de migrations históricas e de `done/`.
- Migration aplica e reverte sem erro; `npm run test:integracao` passa (repository de usuário reescrito, com teste de integração ajustado).
- Testes de `shared`, `backend` e `frontend` passam; builds de backend e frontend passam; `npm run repo:verificar` limpo.
- Verificação ao vivo (skill `verify`): listar usuários filtrando por ativo/inativo, inativar e reativar um usuário, e confirmar que o inativo não faz login. A tela de usuários é alterada: seguir o gate de UI (análogo, 1920×1080, 1366×768 e 1080×1920) com os estados vazio, cheio e erro.
- Falhas preexistentes e a ausência de lint relatadas à parte no fecho.

## Fora de Escopo

Renomear `is_estrutural`, `is_solo`, `is_arquivado` e `eh_bidirecional` (task 301); mexer nas demais tabelas `tipo_*`, que ficam como estão; novo estado de usuário (afastado, férias); editar migrations já aplicadas.

## Dependências

Tasks 297–299 (padronização, lint e SQL) já fechadas, para o repository já estar no formato novo. Skills `sql-migrations`, `gerenciamento-de-impacto` e `project20-dto-conventions`; `SYSTEM.SPEC.md` §5.4 e §9, `SCHEMA.md`.
