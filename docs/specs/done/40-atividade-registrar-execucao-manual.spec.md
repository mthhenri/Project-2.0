# 40 — Atividade: registrar execução manual (gestor)

**Depende de:** 15 (execucao-module), 27 (frontend-atividade), 33 (atividade-atribuir-tags)
**Entrega:** o gestor, pela listagem de atividades, registra uma execução **já encerrada** (início, fim e descrição) para a atividade — ou seja, para o dono dela. Inclui validação de sobreposição de execuções do mesmo usuário. Mais um ajuste visual nos ícones de ação.

> Backend (novo endpoint + validação) + frontend (botão e dialog na listagem).

---

## Princípio de UX

O registro acontece **na própria listagem**, via dialog — sem navegar para outra tela/rota,
no mesmo padrão das ações de tags (task 33) e iniciar/encerrar execução já existentes.

---

## Contexto

A execução **não tem usuário próprio**: ela pertence a uma atividade, e a atividade tem um dono
(`atividade.usuario_id`). Portanto "registrar uma execução para um usuário" significa registrar uma
execução na atividade daquele usuário — o dono da linha. **Não há seletor de usuário**; o usuário é
sempre o dono da atividade.

Hoje só é possível criar execução via `POST /execucao` (`iniciar`), que grava `inicio_data = NOW()` e
`fim_data = NULL` (execução em andamento). Não existe forma de lançar uma execução retroativa/manual
com início e fim definidos. Esta task adiciona isso, restrito a gestor.

---

## Backend

### Novos DTOs (`shared/src/dtos/execucao/`)

**`ExecucaoRegistrarDto`** (entrada) — registrar uma execução já encerrada:
```typescript
import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class ExecucaoRegistrarDto {
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  atividadeId: number;

  @IsDateString()
  inicioData: string;

  @IsDateString()
  fimData: string;

  @IsString()
  @IsNotEmpty()
  descricao: string;
}
```

**`ExecucaoRegistradaDto`** (saída) — campos próprios (sem alias/re-export, conforme convenção):
```typescript
export class ExecucaoRegistradaDto {
  id: number;
  atividadeId: number;
  descricao: string;
  inicioData: Date;
  fimData: Date;
  duracaoMinutos: number;
}
```

**`ExecucaoSobreposicaoValidarDto`** (interno) — usado pelo repositório para checar sobreposição:
```typescript
export class ExecucaoSobreposicaoValidarDto {
  usuarioId: number;
  inicioData: Date;
  fimData: Date;
}
```

Exportar os três em `shared/src/dtos/execucao/index.ts`.

### Repositório (`ExecucaoRepository`)

**`registrar(...)`** — novo `INSERT ... SELECT` com `inicio_data` e `fim_data` preenchidos
(o `inserir` atual permanece intocado, gravando `fim_data = NULL`):
```sql
INSERT INTO execucao (atividade_id, descricao, inicio_data, fim_data, created_date, updated_date, is_deleted)
SELECT :atividadeId, :descricao, :inicioData, :fimData, NOW(), NOW(), false
RETURNING
  id,
  atividade_id AS "atividadeId",
  descricao,
  inicio_data  AS "inicioData",
  fim_data     AS "fimData",
  EXTRACT(EPOCH FROM (fim_data - inicio_data))::int / 60 AS "duracaoMinutos"
```

**`validarSobreposicao(dto: ExecucaoSobreposicaoValidarDto): Promise<boolean>`** — true se existe
alguma execução do mesmo usuário cujo intervalo se sobrepõe ao informado. Execuções em andamento
(`fim_data IS NULL`) são tratadas como se estendendo ao "infinito":
```sql
SELECT EXISTS (
  SELECT 1
  FROM execucao
  INNER JOIN atividade
    ON atividade.id = execucao.atividade_id
    AND atividade.is_deleted = false
  WHERE execucao.is_deleted = false
    AND atividade.usuario_id = :usuarioId
    AND execucao.inicio_data < :fimData
    AND :inicioData < COALESCE(execucao.fim_data, 'infinity'::timestamptz)
) AS "existe"
```
> Dois intervalos `[a,b]` e `[c,d]` se sobrepõem quando `a < d AND c < b`. Aqui `[c,d]` é o novo
> intervalo e `d` da execução existente vira `'infinity'` quando ela está em andamento.

### Service (`ExecucaoService.registrar(dto: ExecucaoRegistrarDto, usuarioAtivo: JwtPayload)`)

1. `recuperar` a atividade (`atividadeRepositorio.recuperar({ id: dto.atividadeId })`) → 404
   `ResourceNotFoundException('Atividade')` se não encontrada.
2. Converter `inicioData`/`fimData` para `Date` e validar (mesmas regras de `alterar()`):
   - nenhuma data no futuro → `BusinessException`;
   - `fim <= inicio` → `BusinessException('A data de fim deve ser posterior à data de início')`.
3. Checar sobreposição: `validarSobreposicao({ usuarioId: atividade.usuarioId, inicioData, fimData })`;
   se true → `BusinessException('Já existe uma execução deste usuário que se sobrepõe a este período')`.
4. `registrar` no repositório e retornar `StandardResponse<ExecucaoRegistradaDto>` com mensagem
   "Execução registrada com sucesso".

> A regra de "execução ativa única por usuário" **não se aplica** aqui — a execução já entra encerrada
> (`fim_data` preenchido). A autorização de gestor é garantida pelo `@GestorOnly()` no controller.

### Controller (`ExecucaoController`)

Novo endpoint `POST /execucao/registro`, `@GestorOnly()`, com `@ActiveUser() usuarioAtivo`:
```typescript
@Post('registro')
registrar(@Body() dto: ExecucaoRegistrarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
  return this.execucaoService.registrar(dto, usuarioAtivo);
}
```
Caminho distinto do `POST /execucao` (`iniciar`) — sem conflito de rota. Importar `ExecucaoRegistrarDto`.

---

## Frontend

### `ExecucaoService`

Novo método `registrar(dto: ExecucaoRegistrarDto)` → `POST /execucao/registro`, retornando
`ExecucaoRegistradaDto` no padrão dos demais métodos.

### `AtividadeListagemPage`

**Coluna Ações:**
- **Novo botão (só gestor):** `icon="pi pi-history"`, `severity="help"` (roxo), `[text]`, `size="small"`,
  tooltip "Registrar execução", `(onClick)="abrirDialogRegistro(atividade)"`.
- **Botão de tags existente** (`pi pi-plus-circle`, "Atribuir tags"): adicionar `severity="secondary"`
  (cinza) para não se confundir visualmente com o novo botão.

**Novo dialog "Registrar execução"** (segue o padrão do dialog de iniciar/encerrar execução):
- Cabeçalho/topo: `projeto · atividade` e, como já é gestor, o dono com avatar
  (`iniciais(atividade.nomeUsuario)` + nome) — reaproveitar `atividade-listagem__executor`.
- Campos (Reactive Form):
  - **Início**: `p-datepicker` com `[showTime]="true"`, `dateFormat="dd/mm/yy"` — obrigatório.
  - **Fim**: `p-datepicker` com `[showTime]="true"` — obrigatório.
  - **Descrição**: `textarea` (`pTextarea`) obrigatória + `app-assistente-descricao`
    (`tipoEntidade="execucao"`), consistente com os outros dialogs de execução.
- Validação inline: campos obrigatórios e `fim > inicio` (validador cross-field; exibir mensagem).
- Salvar (`p-button` "Registrar", ícone `pi pi-history` ou `pi pi-check`, com `[loading]`):
  chama `ExecucaoService.registrar({ atividadeId, inicioData, fimData, descricao })` enviando as datas
  como ISO string.
  - Em sucesso: toast de sucesso, fechar o dialog e **recarregar a página atual da tabela**
    (re-executar a busca atual) para a coluna **Tempo executado** (task 36) refletir a nova execução.
  - Em erro de negócio (sobreposição, datas inválidas), o interceptor global já exibe o toast.

Novos signals/membros sugeridos: `mostrarDialogRegistro`, `salvandoRegistro`, `atividadeRegistro`,
`formularioRegistro`; métodos `abrirDialogRegistro`, `salvarRegistro`, `aceitarDescricaoAssistenteRegistro`.

---

## Arquivos afetados

```
shared/src/dtos/execucao/ExecucaoRegistrarDto.ts              (novo)
shared/src/dtos/execucao/ExecucaoRegistradaDto.ts             (novo)
shared/src/dtos/execucao/ExecucaoSobreposicaoValidarDto.ts    (novo)
shared/src/dtos/execucao/index.ts                             (exportar os 3)

backend/src/modules/execucao/repositories/execucao.repository.ts  (registrar, validarSobreposicao)
backend/src/modules/execucao/services/execucao.service.ts          (registrar)
backend/src/modules/execucao/controllers/execucao.controller.ts    (POST /registro @GestorOnly)

frontend/src/app/modules/execucao/services/execucao.service.ts     (registrar)
frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts
frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.html
frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.scss   (se necessário)
```

Sem migration — nenhuma mudança de schema.

---

## NÃO implementar nesta task

- Registro manual por desenvolvedor (apenas gestor).
- Edição/exclusão da execução por esta tela (já existem na tela de histórico de execuções).
- Validação de sobreposição no fluxo de `alterar` existente (mantém o comportamento atual; aqui a
  validação cobre apenas o novo registro manual).
- Seletor de usuário no dialog (o usuário é sempre o dono da atividade).
