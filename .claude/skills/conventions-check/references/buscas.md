# Buscas mecânicas do Project 2.0

Rode sobre o **recorte do diff** (troque o caminho pelos arquivos de `git diff --name-only HEAD`).
Todas foram exercitadas na `master` de 2026-10-16: as marcadas "limpa" voltaram vazias; as demais
têm os acertos esperados descritos. Fonte das regras: `docs/CONVENTIONS.md`, "Proibições — Resumo
Rápido", e `docs/SYSTEM.SPEC.md` §16.

| # | Busca | O que significa | Estado na master / falsos positivos |
|---|---|---|---|
| 1 | `rg -n "\bVALUES\b" backend/src --glob '*.ts'` | INSERT deve ser `INSERT ... SELECT :campo ... RETURNING` | limpa |
| 2 | `rg -n "DELETE FROM" backend/src --glob '*.ts'` | DELETE físico é proibido; use `executarSoftDelete(id)` | limpa |
| 3 | `rg -n "process\.env" backend/src` | config só pelo `ConfigService` | acerta em `config.service.ts` (é a camada de config) e `knexfile.ts` (CLI do Knex, comentado como intencional); qualquer outro é violação |
| 4 | `rg -n "NgModule\|ngModel\|BehaviorSubject\|new Subject" frontend/src` | standalone + Signals + Reactive Forms | limpa |
| 5 | `rg -n ' style="' frontend/src --glob '*.html'` | sem `style=""` inline | limpa |
| 6 | `rg -n "class \w+Dto extends" shared/src` | DTO de negócio nunca herda DTO de negócio; só DTO core (`PaginatedResult`, `StandardResponse`) | um acerto permitido: `ExecucaoResumoDto extends PaginatedResult<...>` |
| 7 | `rg -n -i "atualizar\|atualizado" backend/src shared/src frontend/src --glob '*.ts'` | o verbo é `alterar`/`alterado` | acertos em comentários e em `atualizarHora` (relógio da topbar) são texto, não método de negócio |
| 8 | `rg -n "\b\w+_at\b\|\w+_em\b" backend/src --glob '*.ts'` | datas são `_date` (genérica) ou `_data` (negócio) | limpa |
| 9 | `rg -c "is_deleted" backend/src/modules --glob '*.repository.ts'` | todo repositório com `SELECT` filtra `is_deleted = false` | só indica presença; leia cada `SELECT` novo no diff (exceção: `recuperarExcluid[oa]()` filtra `is_deleted = true` de propósito, para restaurar) |
| 10 | `rg -n "\?\s*[,)]" backend/src/modules --glob '*.repository.ts'` | parâmetro posicional `?` em SQL | limpa (ternários TS seriam falso positivo; leia o acerto antes de concluir) |

Acrescente uma linha aqui quando uma violação nova escapar do passe e puder ser achada por texto.
