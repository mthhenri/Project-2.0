# 82 — Ponto: Imprimir e Justificar (com usuário filtrado)

**Depende de:** 17 (backend ponto), 29 (frontend ponto), 38 (dia não útil / fração de meta), 16/30 (calendário), 06 (usuário)
**Entrega:** na tela de **Ponto**, quando o gestor **filtra um usuário** (visão mensal), surgem duas ações:
1. **Imprimir** — gera uma folha imprimível com o mês inteiro do usuário (tempos trabalhados e intervalos por dia), totais do mês e uma área de **assinatura** para o gestor que imprime e para o usuário filtrado.
2. **Justificar** — registra uma **justificativa de ponto** para aquele usuário num dia específico, descontando da meta daquele dia uma quantidade de horas acordada com o gestor (dia inteiro, metade, ou parcial).

---

## Contexto

A tela de Ponto ([ponto.page.ts](../../../frontend/src/app/modules/ponto/pages/ponto/ponto.page.ts) /
[ponto.page.html](../../../frontend/src/app/modules/ponto/pages/ponto/ponto.page.html)) tem dois modos:

- **`todos`** — gestor sem usuário filtrado vê os cards de "hoje" de todos os usuários ativos;
- **`mensal`** — desenvolvedor (sempre o próprio) **ou** gestor com um usuário filtrado vê o resumo do mês (cards Meta/Trabalhado/Saldo + uma linha por dia).

Hoje os dias não úteis vivem na tabela **global** `dia_nao_util` (feriado/recesso/ponto facultativo, com `duracao` INTEGRAL/MEIO_PERIODO) e valem para **todos**. Não existe nenhum mecanismo **por usuário** para abonar/justificar horas de um dia específico, nem qualquer recurso de impressão.

Esta task adiciona:
- uma entidade nova **`ponto_justificativa`** (por usuário, criada pelo gestor) que desconta horas da meta de um dia específico daquele usuário;
- a impressão do espelho de ponto mensal do usuário filtrado.

## Decisões de Design (já validadas)

- **Tabela nova e dedicada `ponto_justificativa`** — **não** se reaproveita `dia_nao_util` (que permanece 100% global). A justificativa é sempre **de um usuário** e tem controle fino de horas.
- **`horas_cobertas` unifica os três cenários** descritos pelo usuário — não há enum de "modo":
  - `horas_cobertas == horas_diarias_necessarias` do usuário → o dia **não conta horas** (meta zera nesse dia);
  - `horas_cobertas == metade` → conta **metade**;
  - `0 <= horas_cobertas < jornada` (inclusive `0`) → conta horas normalmente mas o dia fica **registrado/justificado** (motivo da ausência fica gravado, descontando só a fração combinada).
  - **Limite:** `horas_cobertas` nunca pode exceder a `horas_diarias_necessarias` do usuário (validação de negócio no service — não há como exprimir esse teto em CHECK cross-table).
- **Criação e exclusão são exclusivas do gestor** (a justificativa carrega o `gestor_id` de quem a criou). O desenvolvedor **não** cria justificativas, mas o ponto **dele** reflete as que foram criadas para ele (o `PontoService` lê a tabela direto, server-side).
- **`descricao` é obrigatória** — toda justificativa exige o motivo combinado (rastreabilidade do acordo gestor↔usuário). `nome` (título curto) também é obrigatório.
- **`dia_data` é obrigatória** — a justificativa é sempre de **um dia específico**. (Campo intrínseco ao conceito; o usuário descreveu "aquele dia" — incluído explicitamente.)
- **Uma justificativa ativa por usuário+dia** — ao criar, o service valida que não há outra ativa para o mesmo `usuario_id` + `dia_data` (`BusinessException`). Para trocar, exclui-se a anterior.
- **Impressão é do frontend** (layout `@media print` + `window.print()`), reaproveitando os dados do `consultarMensal`. O único acréscimo de backend necessário para a impressão é expor **intervalos por dia** no payload mensal (hoje só existem no diário).
- **Ambas as ações aparecem só** quando `eGestor() && modo() === 'mensal' && usuarioId` filtrado — exatamente "quando for filtrado usuário".

---

## Shared

### Novos DTOs — `shared/src/dtos/ponto-justificativa/`

Entidade **`PontoJustificativa`** → prefixo de DTO `PontoJustificativa` (§5.1). Criar barrel `index.ts` exportando todos. Sem enum novo (`horas_cobertas` é numérico).

- **`PontoJustificativaCriarDto`** (entrada — `@Body`):
  - `usuarioId: number` — `@IsInt() @IsPositive()` (usuário justificado).
  - `diaData: string` — `@IsDateString()` (dia justificado, `YYYY-MM-DD`).
  - `nome: string` — `@IsString() @IsNotEmpty() @MaxLength(255)` (título curto).
  - `descricao: string` — `@IsString() @IsNotEmpty()` (motivo — obrigatório).
  - `horasCobertas: number` — `@IsNumber() @Min(0)` (horas do dia que **não** contam; teto = jornada do usuário, validado no service).
  - **`gestorId` NÃO entra no DTO** — vem do `@ActiveUser()` (JWT) no service.
- **`PontoJustificativaCriadaDto`** (saída): `id`, `usuarioId`, `diaData`, `nome`, `descricao`, `horasCobertas`, `gestorId`, `createdDate`.
- **`PontoJustificativaResumoDto`** (item de listagem): `id`, `usuarioId`, `nomeUsuario`, `diaData`, `nome`, `descricao`, `horasCobertas`, `gestorId`, `nomeGestor`, `createdDate`.
- **`PontoJustificativaRecuperarDto`** — `{ id: number }` (recuperação/exclusão individual).
- **`PontoJustificativaListarDto`** (filtros): `usuarioId: number`, `ano: number`, `mes: number` — lista as justificativas de um usuário num mês (consumido pela dialog de Justificar e pelo `PontoService`).

> Sem `*AlterarDto`: edição não está no escopo (troca = excluir + criar).

### DTOs de ponto — enriquecer o payload mensal

- **`PontoDiaResumoDto`** ([arquivo](../../../shared/src/dtos/ponto/PontoDiaResumoDto.ts)) — acrescentar:
  - `metaMinutos: number` — meta **efetiva** do dia (já descontada a justificativa) — facilita exibição/impressão sem recálculo no front;
  - `intervalos: IntervaloDto[]` — intervalos do dia (para a impressão "tempos trabalhados e intervalos");
  - `justificativaNome: string | null` — título da justificativa do dia, se houver;
  - `justificativaMinutosCobertos: number | null` — minutos descontados pela justificativa naquele dia (`null` se não houver).

---

## Banco de Dados

### Nova migration — `20240026_criar_ponto_justificativa.ts` (criar `ponto_justificativa`)

> **Número (`20240026`):** última migration do backlog reorganizado — roda depois de todas as
> demais (`20240020`–`20240025`). Confirmar o maior número aplicado antes de nomear.

Tabela de negócio (português), com BaseEntity em inglês, **sem DEFAULT** em nenhuma coluna, sem `VALUES` (não se aplica — é DDL):

```sql
CREATE TABLE ponto_justificativa (
  id              SERIAL        PRIMARY KEY,
  usuario_id      INTEGER       NOT NULL REFERENCES usuario(id),
  gestor_id       INTEGER       NOT NULL REFERENCES usuario(id),
  dia_data        DATE          NOT NULL,
  nome            VARCHAR(255)  NOT NULL,
  descricao       TEXT          NOT NULL,
  horas_cobertas  NUMERIC(4,2)  NOT NULL,
  created_date    TIMESTAMP     NOT NULL,
  updated_date    TIMESTAMP     NOT NULL,
  is_deleted      BOOLEAN       NOT NULL,
  deleted_date    TIMESTAMP,
  CONSTRAINT ck_ponto_justificativa_horas_cobertas CHECK (horas_cobertas >= 0)
);
```

- `horas_cobertas` é `NUMERIC(4,2)` para acomodar metades em jornadas ímpares (ex.: `3.50`).
- O **teto** (`<= horas_diarias_necessarias`) é regra de negócio (não dá para CHECK cross-table) — validado no service.
- Trigger de `updated_date` no padrão das demais tabelas (`trg_ponto_justificativa_updated_date` → `fn_set_updated_date()`), nomes de objeto genérico em inglês (§9.2 #12).
- **Rollback:** `DROP TABLE ponto_justificativa` (e o trigger).

---

## Backend — Novo módulo `ponto-justificativa`

Seguir o padrão de módulo (controller burra → service → repository), em `backend/src/modules/ponto-justificativa/`:

```
controllers/ponto-justificativa.controller.ts
services/ponto-justificativa.service.ts
repositories/ponto-justificativa.repository.ts
domain/models/ponto-justificativa.model.ts   (class PontoJustificativa extends BaseEntity)
ponto-justificativa.module.ts
```

- **Model** `PontoJustificativa`: `usuarioId`, `gestorId`, `diaData: Date`, `nome`, `descricao`, `horasCobertas: number` + BaseEntity.
- **`PontoJustificativaRepository extends BaseRepository`** (SQL bruto, parâmetros nomeados, `is_deleted = false` em todo SELECT, INSERT com `SELECT ... RETURNING`):
  - `inserir(dados)` — INSERT com `created_date/updated_date = NOW()`, `is_deleted = false`, RETURNING dos campos do `CriadaDto`.
  - `listar(dto: PontoJustificativaListarDto)` — justificativas de um usuário no mês (`usuario_id = :usuarioId AND EXTRACT(YEAR FROM dia_data) = :ano AND EXTRACT(MONTH FROM dia_data) = :mes`), JOIN em `usuario` para `nomeUsuario`/`nomeGestor` (alias descritivo: `usuario_justificado`, `usuario_gestor`), ordenado por `dia_data`.
  - `recuperar(dto: PontoJustificativaRecuperarDto)` — por id.
  - `listarPorUsuarioEMes(dto: PontoJustificativaListarDto)` — mapa para o `PontoService` (mesma query do `listar`, ou reutilizar).
  - `recuperarPorUsuarioEDia(dto: { usuarioId, diaData })` — usado pelo `PontoService` na visão diária/"todos".
  - `validarPorUsuarioEDia(dto: { usuarioId, diaData })` — `SELECT EXISTS(...)` para a regra "uma ativa por usuário+dia" (nome `validar*`, nunca `existe*` — §16 #22).
  - Exclusão via `executarSoftDelete(id)` herdado.
- **`PontoJustificativaService`** (JSDoc obrigatório nos métodos públicos):
  - `criar(dto: PontoJustificativaCriarDto, usuarioAtivo: JwtPayload)`:
    1. recupera o usuário (`usuarioRepositorio.recuperar`), 404 se não existir;
    2. **valida o teto**: `horasCobertas > usuario.horasDiariasNecessarias` → `BusinessException('A justificativa não pode cobrir mais horas que a jornada diária do usuário')`;
    3. **valida unicidade** dia: já existe ativa p/ `usuarioId`+`diaData` → `BusinessException('Já existe uma justificativa para esse usuário nesse dia')`;
    4. insere com `gestorId = usuarioAtivo.sub`.
  - `listar(dto: PontoJustificativaListarDto)`.
  - `excluir(dto: PontoJustificativaRecuperarDto)` — soft delete.
- **`PontoJustificativaController`** — `@UseGuards(JwtAuthGuard)` + **`@GestorOnly()`** em todos os endpoints (recurso exclusivo de gestor). A controller monta o DTO a partir de `@Param`/`@Body` injetando o `id`/contexto (§7.2), repassa o `@ActiveUser()` no `criar`:
  - `POST   /ponto-justificativa` → `criar({ ...dto }, usuarioAtivo)`
  - `GET    /ponto-justificativa` (`@Query() dto: PontoJustificativaListarDto`) → `listar(dto)`
  - `DELETE /ponto-justificativa/:id` → `excluir({ id })`

## Backend — Integração no módulo Ponto

O `PontoService` passa a **descontar** as horas justificadas da meta do usuário no dia. Como a justificativa é **por usuário** (e `resolverInfoDia` é compartilhado entre usuários), o desconto é aplicado **por usuário**, não em `resolverInfoDia`.

- **Injetar** `PontoJustificativaRepository` no `PontoService` (cross-module: a query é responsabilidade do módulo `ponto-justificativa` — §16 #25 — então o ponto **consome o repositório do módulo correto**, não escreve SQL próprio). Atualizar `ponto.module.ts` para importar o módulo/expor o repositório.
- **`montarPontoDiario(usuario, data, infoDia)`** (diário e "todos"):
  - buscar `recuperarPorUsuarioEDia({ usuarioId: usuario.id, diaData: data })`;
  - `minutosCobertos = Math.round(horasCobertas * 60)` (0 se não houver);
  - **meta efetiva** = `max(0, metaMinutos - minutosCobertos)` aplicada **depois** do cálculo de fração de meta existente (a justificativa reduz a meta já reduzida por meio período);
  - recomputar `saldoMinutos`/`minutosTrabalhadosDiaUtil`/`minutosTrabalhadosExtra` com a meta efetiva, preservando o comportamento atual quando não há justificativa (verificação obrigatória: `minutosCobertos === 0` ⇒ resultado **idêntico** ao de hoje).
- **`consultarMensal`**:
  - carregar `listarPorUsuarioEMes({ usuarioId, ano, mes })` num mapa por dia (número do dia);
  - por dia, calcular a meta efetiva como acima e usá-la no `saldoMinutos` do dia e no acumulado **`metaMinutosMes`** (a meta do mês passa a somar metas efetivas — dias com justificativa reduzem a meta mensal proporcionalmente);
  - preencher os campos novos do `PontoDiaResumoDto`: `metaMinutos` (efetiva), `intervalos` (reutilizar a lógica de `calcularIntervalos` — extrair/compartilhar com a visão diária para não duplicar), `justificativaNome`, `justificativaMinutosCobertos`.
- Preservar as regras de acesso atuais (desenvolvedor só o próprio; gestor qualquer um).

---

## Frontend — Módulo Ponto

### Botões na barra de filtros (`ponto.page.html` / `ponto.page.ts`)

Quando `sessao.eGestor() && modo() === 'mensal' && formularioFiltros.value.usuarioId`, exibir, ao lado da navegação de mês, dois `p-button`:
- **Imprimir** (`icon="pi pi-print"`, severity secondary) → abre/gera a folha de impressão do mês visível para o usuário filtrado.
- **Justificar** (`icon="pi pi-calendar-plus"`) → abre a dialog de justificativa.

Após criar/excluir uma justificativa, **recarregar** o mensal (`carregar()`) para refletir meta/saldo atualizados.

### Dialog de Justificar — novo `PontoJustificativaDialogComponent`

Standalone, método imperativo `abrir(usuarioId, mesAno)` + output `aoAlterar` (criou/excluiu). `modules/ponto/components/ponto-justificativa-dialog/`.

- **Formulário reativo** (Reactive Forms): `diaData` (`p-datepicker`, restrito ao mês visível, `Validators.required`), `nome` (`Validators.required`, `maxLength(255)`), `descricao` (textarea, `Validators.required`), `horasCobertas` (`p-inputnumber`, `min=0`, `max = horasDiariasNecessarias do usuário`, `Validators.required`).
  - Para o `max`, buscar a jornada do usuário via `UsuarioService.recuperar(usuarioId)` (o `UsuarioResumoDto` da listagem **não** traz `horasDiariasNecessarias`); o teto é validado também no servidor.
- **Lista das justificativas existentes** do usuário no mês (via `PontoJustificativaService.listar`) com ação de **remover** (soft delete, com `p-confirmDialog`) — permite trocar a do dia.
- **Salvar** → `PontoJustificativaService.criar` → toast de sucesso, recarrega a lista interna e emite `aoAlterar`.
- Estilo via mixins de `shared/styles/_form` + SCSS BEM em português; `appendTo="body"` nos overlays. Sem `style=""` inline, sem `.css`.

### Novo `PontoJustificativaService` (Angular)

`modules/ponto/services/ponto-justificativa.service.ts` — `criar(dto)`, `listar(usuarioId, ano, mes)` (monta `HttpParams`), `excluir(id)`, sobre `StandardResponse<...>`.

### Impressão — novo `PontoImpressaoComponent`

Componente standalone que renderiza o **espelho de ponto** do mês para impressão (layout `@media print`; acionado por `window.print()`):

- **Cabeçalho:** nome do usuário, cargo, mês/ano, jornada diária e os totais do mês (Meta efetiva / Trabalhado / Saldo).
- **Tabela do mês inteiro** (um por dia): data + dia da semana, entrada (`primeiroInicioData`) → saída (`ultimoFimData`), **intervalos** do dia (lista `inicio→fim`), total trabalhado, saldo e, quando houver, o `motivoNaoUtil` / `justificativaNome` (com as horas cobertas).
- **Área de assinatura** ao final da página: duas linhas de assinatura —
  - "Gestor responsável: ____________" com o nome do gestor logado (`sessao`);
  - "Colaborador: ____________" com o nome do usuário filtrado.
- Reaproveita os dados já carregados em `pontoMensal()` (agora com `intervalos`/`metaMinutos` por dia). Pipes existentes (`MinutosParaHorasPipe`, datas brasileiras) para formatação.

> Implementação sugerida: um bloco oculto na própria tela de ponto (ou rota dedicada de impressão) visível apenas em `@media print`, populado com o mês corrente — sem nova chamada de API. Definir o caminho exato na implementação, desde que o resultado impresso contenha o mês inteiro + assinaturas.

---

## NÃO implementar nesta task

- Edição (`alterar`) de justificativa — troca é excluir + criar.
- Justificativa para **vários dias** de uma vez (intervalo de datas) — uma justificativa cobre **um** dia.
- Desenvolvedor criar/justificar o próprio ponto — exclusivo do gestor.
- Geração de PDF server-side / e-mail do espelho — a impressão é via navegador (`window.print()`).
- Distinção manhã/tarde da justificativa — o controle é por **quantidade de horas** (`horas_cobertas`), não por turno.
- Qualquer mudança em `dia_nao_util` (permanece global e intacta).
- Aprovação/fluxo de workflow da justificativa (status, aceite do colaborador) — criação direta pelo gestor.
```
