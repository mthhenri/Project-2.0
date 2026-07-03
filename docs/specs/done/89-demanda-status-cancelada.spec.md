# 89 — Demanda: novo status "Cancelada"

**Depende de:** 10 (demanda-crud), 12 (demanda-grafo), 79 (enums-para-tabelas-referencia)
**Entrega:** shared + backend (migration) + frontend

---

## Problema

`TipoDemandaStatusEnum` hoje só tem `PENDENTE`, `PLANEJADA` e `CONCLUIDA` (`shared/src/enums/tipo-demanda-status.enum.ts`,
tabela de referência `tipo_demanda_status`). Não existe forma de marcar uma demanda como
**cancelada** — hoje a única saída para uma demanda que deixou de fazer sentido é o soft delete
(`DELETE /demanda/:id`), que a **remove** de toda listagem/árvore/grafo. Isso é diferente de
"cancelada": uma demanda cancelada deve continuar **visível** (histórico, auditoria, execuções já
lançadas) mas sinalizada como não vai mais ser desenvolvida — mesmo padrão que `projeto` já tem
(`TipoProjetoStatusEnum.CANCELADO`, ver `frontend/src/app/modules/projeto/pages/projeto-listagem/`).

---

## Contexto técnico (mapeado nesta sessão)

- **Enum:** `TipoDemandaStatusEnum` (`shared/src/enums/tipo-demanda-status.enum.ts`) — 3 valores hoje.
- **Banco:** desde a task 79, `demanda.status` não é mais `VARCHAR + CHECK` — é
  `demanda.tipo_demanda_status_id` (`INTEGER FK`) para a tabela de referência `tipo_demanda_status`
  (`codigo` + `descricao`), seedada pela migration `20240025_enums_para_tabelas_referencia.ts`. Uma
  migration **nova** (não editar a 20240025, já aplicada) precisa apenas **inserir** a nova linha
  de referência — não há CHECK/VARCHAR para alterar.
- **Backend:** `DemandaService`/`DemandaRepository` não implementam nenhuma máquina de estados sobre
  `status` — é um campo comum de `DemandaCriarDto`/`DemandaAlterarDto`, sem validação de transição.
  Adicionar o valor ao enum é suficiente para a API aceitá-lo; `@IsEnum(TipoDemandaStatusEnum)` nos
  DTOs de entrada valida automaticamente.
- **`DemandaRepository.listarAtribuidas`** (usada pelo seletor de demanda ao registrar/atribuir
  execução) já faz **whitelist** (`tipo_demanda_status.codigo IN ('PLANEJADA', 'PENDENTE')`), não
  blacklist — uma demanda `CANCELADA` fica **automaticamente** fora dessa lista, sem precisar tocar
  nesse método.
- **Frontend — 6 pontos com os 3 valores hardcoded** (sem fonte única de rótulo/cor hoje — reconciliar
  isso está fora de escopo, cada ponto já duplica PENDENTE/PLANEJADA/CONCLUIDA e este padrão é mantido):
  1. `frontend/src/app/modules/demanda/constants/demanda-cores.constants.ts` — `COR_NO_PREENCHIMENTO`/`COR_NO_BORDA`
     (cores fixas em hex, canvas D3 do grafo — exceção de tema já registrada em `SYSTEM.SPEC.md` §8.5).
  2. `demanda-formulario-dialog.component.ts` — select de status na **criação**.
  3. `demanda-edicao-dialog.component.ts` — select de status na **edição**.
  4. `demanda-arvore-item.component.ts` — `severidadeStatus()`/`rotuloStatus()` (badge da árvore).
  5. `demanda-detalhe-dialog.component.ts` — `severidadeStatus()`/`rotuloStatus()` (badge do diálogo de detalhe).
  6. `demanda-projeto.page.ts` — `legendaStatus` (legenda ao lado do grafo).
- **Precedente de cor/severidade** já usado por `projeto` para `CANCELADO`: `severity="danger"` nos
  badges PrimeNG (`projeto-listagem.page.ts`/`projeto-detalhe.page.ts`). Os dois `severidadeStatus()`
  de demanda hoje tipam o retorno como `'secondary' | 'info' | 'success'` — precisam ganhar `'danger'`
  na união.

---

## Decisões de escopo (registradas)

1. **Sem máquina de estados.** Esta task só adiciona o valor `CANCELADA` ao domínio — não introduz
   validação de transição (ex.: impedir `CONCLUIDA → CANCELADA` ou reabrir uma cancelada). O campo
   `status` continua sendo alterado livremente via `DemandaAlterarDto`, igual aos 3 valores existentes.
2. **Cancelar ≠ excluir.** Não mexe no soft delete (`DemandaExcluirDto`/`excluirDemanda()`). Uma
   demanda cancelada continua com `is_deleted = false`, aparece normalmente em listagens/árvore/grafo,
   só que com o status/cor/badge de cancelada.
3. **`listarAtribuidas` não muda.** Por já ser whitelist (`PLANEJADA`, `PENDENTE`), uma demanda
   `CANCELADA` já fica de fora do seletor de demanda ao lançar execução — comportamento correto sem
   nenhuma alteração de código nesse método.
4. **Nome do enum: `CANCELADA`** (feminino, concorda com "demanda" — mesmo padrão de `CONCLUIDA`),
   não `CANCELADO` (que é o valor usado em `TipoProjetoStatusEnum`, masculino, concorda com "projeto").
5. **Selecionável em ambos os diálogos** (criação e edição), mesmo padrão do `projeto`, que oferece
   `Cancelado` no mesmo formulário usado para criar e editar.

---

## Shared

### `shared/src/enums/tipo-demanda-status.enum.ts`

```typescript
export enum TipoDemandaStatusEnum {
  PENDENTE  = 'PENDENTE',
  PLANEJADA = 'PLANEJADA',
  CONCLUIDA = 'CONCLUIDA',
  CANCELADA = 'CANCELADA',
}
```

Nenhum DTO precisa mudar — todos já usam `TipoDemandaStatusEnum` (`@IsEnum`), o novo valor passa a
ser aceito automaticamente.

---

## Backend

### Nova migration `backend/src/database/migrations/20240027_adicionar_status_cancelada_demanda.ts`

Apenas **insere** a linha nova na tabela de referência já existente — não recria tabela, não mexe em
CHECK/VARCHAR (isso já não existe desde a task 79):

```typescript
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(
    `INSERT INTO tipo_demanda_status (codigo, descricao, created_date, updated_date, is_deleted)
     SELECT :codigo, :descricao, NOW(), NOW(), false
     RETURNING id`,
    { codigo: 'CANCELADA', descricao: 'Cancelada' },
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(
    `DELETE FROM tipo_demanda_status WHERE codigo = :codigo`,
    { codigo: 'CANCELADA' },
  );
}
```

> `down` usa `DELETE` físico (não `executarSoftDelete`) por ser migration de schema/seed, não código
> de aplicação — mesmo padrão de todas as migrations existentes (elas não passam pelo `BaseRepository`).
> Se alguma demanda já estiver com `status = 'CANCELADA'` no momento do rollback, o `DELETE` falha por
> violar a FK `fk_demanda_tipo_demanda_status` — comportamento aceito (mesmo risco que rollback de
> qualquer valor de enum em uso).

Nenhuma outra alteração de backend — `DemandaController`/`DemandaService`/`DemandaRepository` não
hardcodam a lista de status (usam o enum via DTO), então passam a aceitar `CANCELADA` sem tocar em
código.

---

## Frontend

### 1. `frontend/src/app/modules/demanda/constants/demanda-cores.constants.ts`

Acrescentar a 4ª entrada nos dois `Record`, num tom vermelho (coerente com o `danger`/vermelho já
usado para `CANCELADO` de projeto, e com o esquema de cores do canvas escuro do grafo — cinza/azul/verde
já ocupados por PENDENTE/PLANEJADA/CONCLUIDA):

```typescript
export const COR_NO_PREENCHIMENTO: Record<TipoDemandaStatusEnum, string> = {
  [TipoDemandaStatusEnum.PENDENTE]:  '#3a3f4b',
  [TipoDemandaStatusEnum.PLANEJADA]: '#0a3d58',
  [TipoDemandaStatusEnum.CONCLUIDA]: '#104a22',
  [TipoDemandaStatusEnum.CANCELADA]: '#5a1414',
};

export const COR_NO_BORDA: Record<TipoDemandaStatusEnum, string> = {
  [TipoDemandaStatusEnum.PENDENTE]:  '#9ea8b8',
  [TipoDemandaStatusEnum.PLANEJADA]: '#22d3ee',
  [TipoDemandaStatusEnum.CONCLUIDA]: '#40e878',
  [TipoDemandaStatusEnum.CANCELADA]: '#f87171',
};
```

### 2. `demanda-formulario-dialog.component.ts` (criação)

Acrescentar a opção ao array de opções do select de status:

```typescript
{ label: 'Pendente',  value: TipoDemandaStatusEnum.PENDENTE },
{ label: 'Planejada', value: TipoDemandaStatusEnum.PLANEJADA },
{ label: 'Concluída', value: TipoDemandaStatusEnum.CONCLUIDA },
{ label: 'Cancelada', value: TipoDemandaStatusEnum.CANCELADA },
```

### 3. `demanda-edicao-dialog.component.ts` (edição)

Mesma alteração no array de opções do select de status.

### 4. `demanda-arvore-item.component.ts`

Ampliar a união de retorno e os dois mapas:

```typescript
severidadeStatus(status: TipoDemandaStatusEnum): 'secondary' | 'info' | 'success' | 'danger' {
  const mapa: Record<TipoDemandaStatusEnum, 'secondary' | 'info' | 'success' | 'danger'> = {
    [TipoDemandaStatusEnum.PENDENTE]:  'secondary',
    [TipoDemandaStatusEnum.PLANEJADA]: 'info',
    [TipoDemandaStatusEnum.CONCLUIDA]: 'success',
    [TipoDemandaStatusEnum.CANCELADA]: 'danger',
  };
  return mapa[status];
}

rotuloStatus(status: TipoDemandaStatusEnum): string {
  const mapa: Record<TipoDemandaStatusEnum, string> = {
    [TipoDemandaStatusEnum.PENDENTE]:  'Pendente',
    [TipoDemandaStatusEnum.PLANEJADA]: 'Planejada',
    [TipoDemandaStatusEnum.CONCLUIDA]: 'Concluída',
    [TipoDemandaStatusEnum.CANCELADA]: 'Cancelada',
  };
  return mapa[status];
}
```

### 5. `demanda-detalhe-dialog.component.ts`

Exatamente a mesma alteração de `severidadeStatus()`/`rotuloStatus()` do item 4 (código duplicado
hoje entre os dois componentes — reconciliar essa duplicação está fora de escopo desta task).

### 6. `demanda-projeto.page.ts`

Acrescentar a 4ª entrada em `legendaStatus`:

```typescript
readonly legendaStatus = [
  { rotulo: 'Pendente',  cor: COR_NO_BORDA[TipoDemandaStatusEnum.PENDENTE] },
  { rotulo: 'Planejada', cor: COR_NO_BORDA[TipoDemandaStatusEnum.PLANEJADA] },
  { rotulo: 'Concluída', cor: COR_NO_BORDA[TipoDemandaStatusEnum.CONCLUIDA] },
  { rotulo: 'Cancelada', cor: COR_NO_BORDA[TipoDemandaStatusEnum.CANCELADA] },
];
```

---

## Atualização de Documentação (obrigatória ao implementar)

1. **`docs/SYSTEM.SPEC.md`** — linha de exemplo do enum em §5.4 (`tipo-demanda-status.enum.ts`,
   hoje só lista `PENDENTE`/`PLANEJADA`/`CONCLUIDA`), a nota da coluna `tipo_demanda_status_id` em
   §"Demanda" (`INTEGER FK → tipo_demanda_status (PENDENTE, PLANEJADA, CONCLUIDA)`) e qualquer outra
   menção literal aos 3 valores de status de demanda: acrescentar `CANCELADA`.
2. **`docs/CONTEXT.md`** — ao concluir: mover a spec para `done/`, registrar a task em "Implementado"
   (shared + migration + frontend, sem endpoint/rota nova) e atualizar "Próxima Task".

---

## Arquivos afetados

```
shared/src/enums/tipo-demanda-status.enum.ts                                        (+ CANCELADA)

backend/src/database/migrations/20240027_adicionar_status_cancelada_demanda.ts       (novo)

frontend/src/app/modules/demanda/constants/demanda-cores.constants.ts                (+ CANCELADA)
frontend/src/app/modules/demanda/components/demanda-formulario-dialog/demanda-formulario-dialog.component.ts   (+ opção select)
frontend/src/app/modules/demanda/components/demanda-edicao-dialog/demanda-edicao-dialog.component.ts           (+ opção select)
frontend/src/app/modules/demanda/components/demanda-arvore-item/demanda-arvore-item.component.ts               (+ severidade/rótulo)
frontend/src/app/modules/demanda/components/demanda-detalhe-dialog/demanda-detalhe-dialog.component.ts         (+ severidade/rótulo)
frontend/src/app/modules/demanda/pages/demanda-projeto/demanda-projeto.page.ts                                 (+ legenda)

docs/SYSTEM.SPEC.md   (menções literais aos valores de status de demanda)
docs/CONTEXT.md       (ao concluir a task)
```

---

## Verificação

1. `npm run build --workspace=shared`, `--workspace=backend` e `--workspace=frontend` sem erros
   (o novo valor do enum precisa tipar corretamente nos `Record<TipoDemandaStatusEnum, …>` do
   frontend — se algum mapa esquecer `CANCELADA`, o TypeScript acusa "Property is missing").
2. `npm run db:migrate --workspace=backend` aplica a migration nova; `SELECT * FROM tipo_demanda_status`
   mostra a linha `CANCELADA`/`Cancelada`; `npm run db:rollback --workspace=backend` remove a linha
   sem erro (com nenhuma demanda usando o status ainda).
3. Subir a API + front: no diálogo de **criação** de demanda, o select de status lista **Cancelada**;
   criar uma demanda com esse status e confirmar `GET /demanda/:id` retornando `status: "CANCELADA"`.
4. No diálogo de **edição**, alterar uma demanda existente para `Cancelada` e salvar — sem erro 400.
5. Na **árvore** e no **detalhe** da demanda, o badge da demanda cancelada aparece com severidade
   `danger` (vermelho) e rótulo "Cancelada".
6. No **grafo** (visão canvas), o nó da demanda cancelada aparece com o preenchimento/borda vermelhos
   novos, e a **legenda** ao lado do grafo passa a ter a 4ª entrada "Cancelada".
7. No seletor de demanda ao **registrar/iniciar uma execução** (que usa `listarAtribuidas`), a
   demanda cancelada **não aparece** — confirma que a whitelist existente já cobre o caso sem mudança
   de código.
8. Demandas com os 3 status antigos continuam funcionando normalmente (regressão).

---

## NÃO implementar nesta task

- **Máquina de estados / restrição de transição** (ex.: impedir cancelar uma `CONCLUIDA`, ou proibir
  voltar de `CANCELADA` para outro status) — decisão de escopo #1.
- **Qualquer efeito cascata** sobre sub-demandas, atividades ou execuções ao cancelar uma demanda
  estrutural (ex.: cancelar automaticamente os filhos) — fora de escopo, não pedido.
- **Filtro dedicado de "excluir canceladas"** em listagens/relatórios além do que `listarAtribuidas`
  já resolve por ser whitelist — decisão de escopo #3.
- **Reconciliar a duplicação** de `severidadeStatus()`/`rotuloStatus()` entre `demanda-arvore-item` e
  `demanda-detalhe-dialog` numa função/constante compartilhada — mantido o padrão existente (cada
  componente já duplicava os 3 valores anteriores).
- **Endpoint ou rota nova** — nenhuma mudança de contrato HTTP além do valor aceito pelo `@IsEnum`
  já existente.
