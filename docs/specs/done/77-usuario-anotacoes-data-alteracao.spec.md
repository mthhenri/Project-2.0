# 77 — Usuário: data da última alteração das anotações (campo + exibição no dialog)

**Depende de:** 06 (usuario-module), 24 (frontend-usuario), 47 (perfil/anotações em dialog), 48 (usuario-correcao-padroes — `UsuarioInternoAlterarDto`)

**Entrega:** o `usuario` ganha um campo que registra **quando suas anotações foram alteradas pela última vez**. No frontend, o **dialog de anotações** (`UsuarioAnotacoesDialogComponent`) passa a exibir, **logo abaixo do título**, a **data da última alteração** dessas anotações.

> Backend: **nova migration** (coluna em `usuario`) + model + repository (`recuperar`/`alterar`) + DTO de saída. Shared: `UsuarioRecuperadoDto` ganha o campo. Frontend: cabeçalho customizado do dialog de anotações com a data. **Sem novo módulo, sem novo endpoint.**

---

## Contexto

A entidade `Usuario` tem o campo `anotacoes` (`TEXT | NULL`, HTML do `p-editor`) — ver §13 do `SYSTEM.SPEC.md` e [usuario.model.ts](../../../backend/src/modules/usuario/domain/models/usuario.model.ts). As anotações são editadas pelo
[usuario-anotacoes-dialog.component.ts](../../../frontend/src/app/modules/usuario/components/usuario-anotacoes-dialog/usuario-anotacoes-dialog.component.ts),
que carrega via `UsuarioService.recuperar(id)` e salva via `UsuarioService.alterar(id, { anotacoes })` (botão "Salvar", auto-save a cada 30s e "Limpar"). Hoje **não há** registro de quando as anotações foram alteradas.

O `alterar` do backend já tem o ponto exato onde as anotações mudam:
[usuario.repository.ts](../../../backend/src/modules/usuario/repositories/usuario.repository.ts) — o ramo `if (dto.anotacoes !== undefined)` do SET dinâmico. É nesse ramo que a data de alteração deve ser carimbada.

O dialog hoje usa `[header]="tituloDialog()"` (string simples). Para exibir uma segunda linha abaixo do título, será preciso trocar para o **template de cabeçalho** do PrimeNG 21 (`<ng-template #header>`), exatamente como já foi feito em `AtividadeVisualizarDialogComponent` (task 68) — ver [atividade-visualizar-dialog.component.html](../../../frontend/src/app/modules/atividade/components/atividade-visualizar-dialog/atividade-visualizar-dialog.component.html).

---

## Decisões de escopo (registradas)

1. **Nome do campo (§16 #9 — data de negócio em português):** `anotacoes_alteracao_data` (coluna SQL) / `anotacoesAlteracaoData` (TypeScript). O contexto é "anotações alteração", então o sufixo `_data` vem no fim — nunca `data_anotacoes` nem `anotacoes_alteracao_at`/`_em`.
2. **Tipo e nulidade:** `TIMESTAMPTZ` **NULL** (sem `DEFAULT`, §16 #7). `NULL` = anotações nunca alteradas desde a criação do usuário. Coluna nullable adicionada sem `DEFAULT` deixa as linhas existentes com `NULL` (sem violar a proibição de `DEFAULT`).
   - **Por que `timestamptz` e não `timestamp`:** a coluna guarda um **instante** (gravado por `NOW()`), como `created_date`/`updated_date`. O padrão-alvo do projeto para colunas de data **com hora** é `timestamptz` — é exatamente a tese da spec 75. Criar uma coluna nova já em `timestamp` naïve nasceria fora desse padrão **e** a spec 75 **não** a converteria (a lista de colunas da 75 é fixa: os `*_date` de auditoria + `execucao.inicio_data/fim_data`; uma coluna de negócio nova não entra nela). Como a coluna é escrita por `NOW()`, `timestamptz` é **seguro e correto desde já**, sem depender da 75: `NOW()` sobre `timestamptz` grava o instante real independentemente do fuso da sessão, e o driver `pg`/frontend leem o instante certo. As preocupações de bucketing da 75 (`DATE(...)`, `inicio_data` escrita pelo driver em frame naïve) **não** se aplicam a um carimbo de exibição feito por `NOW()`. Aceita-se a assimetria temporária de `usuario` ter esta coluna em `timestamptz` enquanto as irmãs seguem `timestamp` naïve até a 75 — em nome da correção e na direção já documentada.
3. **Quando carimbar:** a data só é atualizada quando o conteúdo de `anotacoes` **realmente muda**. No SET do `alterar`, usar `CASE WHEN anotacoes IS DISTINCT FROM :anotacoes THEN NOW() ELSE anotacoes_alteracao_data END`. Isso evita que o **auto-save a cada 30s** (que reenvia o mesmo conteúdo) bombardeie a data sem haver mudança real. Como em `UPDATE`, as referências de coluna na RHS do SET enxergam o **valor antigo**, a comparação é "antigo vs. novo" — exatamente o desejado.
4. **Carimbar só quando `anotacoes` está no DTO:** a data vive dentro do ramo `if (dto.anotacoes !== undefined)`. Alterações de perfil que não tocam anotações (nome, cargo, tipo, status, horas) **não** mexem em `anotacoes_alteracao_data`.
5. **Sem novo DTO de entrada:** a data é **derivada** no repositório, nunca recebida do cliente. `UsuarioInternoAlterarDto`/`UsuarioAlterarDto` **não** ganham o campo. Apenas o DTO de **saída** (`UsuarioRecuperadoDto`, do qual `UsuarioAlteradoDto` herda) passa a expô-la.
6. **Exibição:** apenas no **dialog de anotações** (foi o pedido explícito). O dialog de perfil, a listagem (`UsuarioResumoDto`) e qualquer outra tela ficam fora do escopo.
7. **Formato em tela:** data **com hora** — `dd/MM/yyyy HH:mm` via `DatePipe` nativo do Angular (o `DataBrasileiraPipe` existente é só data, sem hora). Quando `anotacoesAlteracaoData` for `null`, exibir o texto neutro **"Sem alterações registradas"** (não esconder a linha, para o usuário entender o estado).

---

## Backend

### Migration (nova) — `backend/src/database/migrations/20240024_adicionar_anotacoes_alteracao_data_usuario.ts`

> **Número da migration (`20240024`):** fixado pela ordem de execução do backlog — esta task roda **depois** da spec 75 (`20240022_converter_datas_para_timestamptz`) e da spec 76 (`20240023_remover_prioridade_demanda`), e **antes** da spec 79 (`20240025_enums_para_tabelas_referencia`). Como a coluna é gravada por `NOW()` em `timestamptz`, é correta independentemente de a 75 já ter rodado. Confirmar `ls backend/src/database/migrations/` antes de nomear (maior aplicado deve ser `20240023`).

Segue o padrão da `20240014` (ALTER ADD COLUMN / down com DROP COLUMN). **Coluna `timestamptz` nullable, sem `DEFAULT`:**

```typescript
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE usuario ADD COLUMN anotacoes_alteracao_data TIMESTAMPTZ;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE usuario DROP COLUMN IF EXISTS anotacoes_alteracao_data;
  `);
}
```

> Não há backfill: linhas existentes ficam `NULL` (= "sem alteração registrada"), coerente com a semântica da decisão #2.

### Model — [usuario.model.ts](../../../backend/src/modules/usuario/domain/models/usuario.model.ts)

Adicionar, junto a `anotacoes`:

```typescript
anotacoesAlteracaoData: Date | null;
```

### Repository — [usuario.repository.ts](../../../backend/src/modules/usuario/repositories/usuario.repository.ts)

**`recuperar`** — incluir a coluna no SELECT (para o frontend recebê-la ao abrir o dialog):

```sql
usuario.anotacoes,
usuario.anotacoes_alteracao_data  AS "anotacoesAlteracaoData",
```

**`alterar`** — no ramo `if (dto.anotacoes !== undefined)`, além de setar `anotacoes`, carimbar a data **só quando o conteúdo muda** (decisão #3):

```typescript
if (dto.anotacoes !== undefined) {
  setClauses.push('anotacoes = :anotacoes');
  setClauses.push(
    'anotacoes_alteracao_data = CASE WHEN anotacoes IS DISTINCT FROM :anotacoes THEN NOW() ELSE anotacoes_alteracao_data END',
  );
  parametros.anotacoes = dto.anotacoes;
}
```

E incluir a coluna no `RETURNING` do `alterar` (já que `UsuarioAlteradoDto extends UsuarioRecuperadoDto`, o retorno precisa do campo):

```sql
anotacoes,
anotacoes_alteracao_data  AS "anotacoesAlteracaoData",
```

> **Não** tocar em `inserir` (na criação não há anotações; a coluna nasce `NULL`), `alterarSenha`, `listar` (`UsuarioResumoDto` fora de escopo), nem nos demais métodos.

### Service — [usuario.service.ts](../../../backend/src/modules/usuario/services/usuario.service.ts)

**Sem mudança de lógica.** A data é responsabilidade do SQL do repositório; o `alterar` do service continua repassando o `UsuarioInternoAlterarDto` como hoje. As guardas de autorização existentes (desenvolvedor só altera o próprio perfil, etc.) permanecem intactas.

---

## Shared

### `UsuarioRecuperadoDto` — [UsuarioRecuperadoDto.ts](../../../shared/src/dtos/usuario/UsuarioRecuperadoDto.ts)

Adicionar o campo de saída (logo após `anotacoes`):

```typescript
@ApiProperty({ example: '2026-06-25T14:30:00.000Z', nullable: true })
anotacoesAlteracaoData: Date | null;
```

> `UsuarioAlteradoDto extends UsuarioRecuperadoDto` — herda automaticamente, sem edição. **Nenhum** outro DTO muda: `UsuarioInternoAlterarDto`, `UsuarioAlterarDto`, `UsuarioCriarDto`, `UsuarioResumoDto` ficam como estão (a data nunca é entrada nem aparece na listagem).

---

## Frontend

### `UsuarioAnotacoesDialogComponent`

[.component.ts](../../../frontend/src/app/modules/usuario/components/usuario-anotacoes-dialog/usuario-anotacoes-dialog.component.ts)

- Novo signal de estado: `readonly anotacoesAlteracaoData = signal<Date | string | null>(null);`
- Em `carregarAnotacoes()`, no `next`, capturar a data do retorno:
  ```typescript
  this.anotacoesAlteracaoData.set(resposta.dados.anotacoesAlteracaoData ?? null);
  ```
- Após um salvamento bem-sucedido (`salvar()` e também `salvarSilencioso()` quando relevante), atualizar a data exibida a partir do `resposta.dados.anotacoesAlteracaoData` (o `alterar` já retorna `UsuarioAlteradoDto`). Assim a linha reflete o salvamento sem precisar reabrir o dialog. (No `salvarSilencioso` o `subscribe()` hoje é vazio; adicionar um `next` que faz `anotacoesAlteracaoData.set(resposta.dados?.anotacoesAlteracaoData ?? this.anotacoesAlteracaoData())`.)
- Importar `DatePipe` (de `@angular/common`) na lista de `imports` do componente standalone para uso no template.
- `tituloDialog()` permanece como está (continua sendo a primeira linha do cabeçalho).

[.component.html](../../../frontend/src/app/modules/usuario/components/usuario-anotacoes-dialog/usuario-anotacoes-dialog.component.html)

- Remover `[header]="tituloDialog()"` do `<p-dialog>` e introduzir um `<ng-template #header>` (padrão PrimeNG 21 da task 68), com **duas linhas**: o título e, **abaixo dele**, a data da última alteração:

```html
<ng-template #header>
  <div class="anotacoes-dialog__cabecalho">
    <span class="anotacoes-dialog__titulo">{{ tituloDialog() }}</span>
    <span class="anotacoes-dialog__alteracao">
      <i class="pi pi-history"></i>
      @if (anotacoesAlteracaoData()) {
        Última alteração: {{ anotacoesAlteracaoData() | date: 'dd/MM/yyyy HH:mm' }}
      } @else {
        Sem alterações registradas
      }
    </span>
  </div>
</ng-template>
```

> O `X` de fechar do dialog é independente do template de cabeçalho (permanece). O resto do corpo (editor, rodapé, `p-confirmDialog`) **não muda**.

[.component.scss](../../../frontend/src/app/modules/usuario/components/usuario-anotacoes-dialog/usuario-anotacoes-dialog.component.scss)

- Classes BEM novas (português): `&__cabecalho` (coluna, `gap` pequeno), `&__titulo` (peso/tamanho do título atual) e `&__alteracao` (texto secundário — `text-surface-600` via Tailwind/token, fonte menor, ícone alinhado). Sem `style=""` inline, sem seletor de ID.

> **`UsuarioService` (frontend) não muda** — `recuperar`/`alterar` já retornam `UsuarioRecuperadoDto`/`UsuarioAlteradoDto`, que agora carregam o campo.

---

## Arquivos afetados

```
backend/src/database/migrations/20240024_adicionar_anotacoes_alteracao_data_usuario.ts     (novo)
backend/src/modules/usuario/domain/models/usuario.model.ts                               (+ campo)
backend/src/modules/usuario/repositories/usuario.repository.ts                           (recuperar SELECT + alterar SET/RETURNING)
shared/src/dtos/usuario/UsuarioRecuperadoDto.ts                                          (+ campo de saída)

frontend/src/app/modules/usuario/components/usuario-anotacoes-dialog/usuario-anotacoes-dialog.component.ts    (signal + DatePipe + captura da data)
frontend/src/app/modules/usuario/components/usuario-anotacoes-dialog/usuario-anotacoes-dialog.component.html  (ng-template #header com 2 linhas)
frontend/src/app/modules/usuario/components/usuario-anotacoes-dialog/usuario-anotacoes-dialog.component.scss  (BEM do cabeçalho)
```

Atualizar também a documentação de schema/entidade ao concluir:
```
docs/SCHEMA.md            (CREATE TABLE usuario — registrar a coluna anotacoes_alteracao_data TIMESTAMPTZ)
docs/SYSTEM.SPEC.md §13   (linha da tabela Usuario — nova coluna anotacoes_alteracao_data)
```
> Como esta coluna entra em `timestamptz` enquanto as demais de `usuario` seguem `timestamp` até a spec 75, registrar o tipo explicitamente onde a linha for adicionada (a nota de convenção de tipos de data — `timestamp` vs `timestamptz` — é introduzida pela spec 75).

---

## Verificação

1. `npm run db:migrate --workspace=backend` aplica a nova migration; `npm run db:rollback --workspace=backend` reverte (coluna some) e re-aplica sem erro. Confirmar via `information_schema.columns` que `anotacoes_alteracao_data` é `timestamp with time zone`.
2. `npm run build --workspace=backend` (nest build — cobre o type-check do `shared`) sem erros.
3. `npm run build --workspace=frontend` OK (só warnings pré-existentes de budget/CommonJS).
4. **Carimbo só com mudança real:** `PUT /usuario/:id` com `anotacoes` **diferente** atualiza `anotacoes_alteracao_data` para agora; reenviar o **mesmo** conteúdo (simulando o auto-save de 30s) **não** altera a data. Alterar só nome/cargo/status (sem `anotacoes`) **não** mexe na data.
5. `GET /usuario/:id` retorna `anotacoesAlteracaoData` (ISO) — `null` para usuário que nunca teve anotações alteradas.
6. **Tela:** ao abrir o dialog de anotações, abaixo do título aparece "Última alteração: dd/MM/yyyy HH:mm"; usuário sem alteração mostra "Sem alterações registradas". Após salvar uma mudança real, a linha passa a refletir o horário do salvamento sem reabrir o dialog.
7. Linguagem/SQL: coluna de negócio em português com `_data` no fim (§16 #9); SELECT do `recuperar` segue com `is_deleted = false` e parâmetros nomeados; nenhum `DEFAULT`/`VALUES`/alias abreviado introduzido.

---

## NÃO implementar nesta task

- Exibir a data em **outras telas** (dialog de perfil, listagem de usuários, `UsuarioResumoDto`) — escopo é só o dialog de anotações.
- **Histórico** de alterações das anotações (versões, auditoria, quem alterou) — apenas a **última** data.
- Registrar **autor** da alteração ou qualquer coluna além de `anotacoes_alteracao_data`.
- Mudar o comportamento de **auto-save** (intervalo, debounce) ou a regra de "Limpar".
- **Converter as colunas pré-existentes** (`created_date`/`updated_date`/`deleted_date` de `usuario` e demais tabelas, `execucao.inicio_data/fim_data`) para `timestamptz`, fixar o fuso da sessão do banco (`APP_TIMEZONE`/`SET TIME ZONE`) e ajustar bucketing por dia — **tudo isso é escopo da spec 75**. Esta task apenas **nasce** já no tipo-alvo (`timestamptz`) para a coluna nova; não toca nas colunas existentes nem na configuração de fuso.
- Criar novo pipe de data/hora — usar o `DatePipe` nativo do Angular.
```
