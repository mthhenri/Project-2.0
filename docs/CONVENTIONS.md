# CONVENTIONS.md — Project 2.0

> Referência rápida. Para contexto completo e justificativas, consulte o `SYSTEM.SPEC.md`.

---

## Regra de Linguagem

**Teste:** "Esse conceito existiria em qualquer projeto de software?"
- **Sim → inglês** (pastas arquiteturais, classes genéricas, campos de BaseEntity, exceptions, decorators)
- **Não → português** (arquivos de entidade, métodos, variáveis, DTOs, valores de enum, nomes de tabela)

| ✅ Inglês | ✅ Português |
|---|---|
| `controllers/` `services/` `repositories/` `domain/` `core/` `shared/` | `usuario.service.ts` `demanda.repository.ts` |
| `BaseEntity` `BaseRepository` `StandardResponse` | `criarUsuario()` `encerrarExecucao()` |
| `isDeleted` `createdDate` `updatedDate` `deletedDate` (TS e SQL) | `nomeCompleto` `descricaoTecnica` `horasEstimadas` |
| `BusinessException` `ResourceNotFoundException` | `UsuarioCriarDto` `DemandaStatusEnum` |
| `@Public()` `@GestorOnly()` `@ActiveUser()` | `DESENVOLVEDOR` `GESTOR` `PLANEJADA` |
| `auth-token.interceptor.ts` `global-exception.filter.ts` | `autenticacao.guard.ts` `data-brasileira.pipe.ts` |

---

## Nomes de Arquivo

```
usuario.service.ts          ← entidade de negócio → português
usuario.repository.ts
usuario.controller.ts
base.repository.ts          ← padrão genérico → inglês
global-exception.filter.ts  ← padrão técnico → inglês
auth-token.interceptor.ts   ← padrão técnico → inglês
autenticacao.guard.ts       ← comportamento de negócio → português
usuario-formulario.component.ts
usuario-listagem.page.ts
```

---

## DTOs

**Padrão:** `Entidade + Complemento (se houver) + Verbo + Dto`

**Entrada** (verbo no infinitivo) / **Saída** (verbo no particípio):

| Entrada | Saída | Quando usar |
|---|---|---|
| `UsuarioCriarDto` | `UsuarioCriadoDto` | operação no modelo inteiro |
| `UsuarioRecuperarDto` | `UsuarioRecuperadoDto` | recuperação individual — entrada sempre `{ id: number }` |
| `UsuarioListarDto` | `UsuarioResumoDto` | listagem — saída sempre resumida |
| `UsuarioAlterarDto` | `UsuarioAlteradoDto` | alteração completa — nunca "Atualizar/Atualizado" |
| `UsuarioSenhaAlterarDto` | `UsuarioSenhaAlteradaDto` | sub-aspecto específico (complemento) |
| `DemandaTagAtribuirDto` | `DemandaTagAtribuidaDto` | um item do sub-aspecto |
| `DemandaTagsAtribuirDto` | `DemandaTagsAtribuidasDto` | coleção do sub-aspecto (plural) |
| `AssistenteDescricaoAuxiliarDto` | `AssistenteDescricaoAuxiliadaDto` | complemento + verbo |

**Regras do complemento:**
- Omitir quando a operação representa o modelo inteiro
- Usar quando a operação atinge apenas um sub-aspecto (`Senha`, `Avatar`, `Descricao`)
- Quando múltiplos campos → agrupar num substantivo semântico: `senha + email` → `Credenciais`
- Quando coleção → plural do complemento: `Tag` → `Tags`
- **Quando o complemento tem mais de uma palavra → todas as palavras vêm antes do verbo, sem exceção:**
  - `membro interno` (complemento 2 palavras) + `atribuir` → `DemandaMembroInternoAtribuirDto` ✅
  - `DemandaMembroAtribuirInternoDto` ❌ — verbo no meio do complemento
  - `tag interno` + `remover` → `DemandaTagInternoRemoverDto` ✅
  - `interno` (único complemento) + `alterar` → `ExecucaoInternoAlterarDto` ✅ — nunca `ExecucaoAlterarInternoDto` ❌
  - `interno` (único complemento) + `encerrar` → `ExecucaoInternoEncerrarDto` ✅ — nunca `ExecucaoEncerrarInternoDto` ❌

**DTOs de relatório / consulta computada** (não são CRUD, descrevem um recorte calculado) → `Entidade + Recorte + Dto`, **sem verbo**:
- `PontoDiarioDto`, `PontoMensalDto` — o DTO de parâmetros de entrada, se houver, segue o padrão normal (`PontoDiarioConsultarDto`)

**Value-objects / sub-estruturas** (sem entidade nem ciclo de vida, só agrupam campos) → nome do conceito, **sem entidade nem verbo**:
- `IntervaloDto` — `{ inicioData, fimData, duracaoMinutos }`

**Regras adicionais:**
- Toda recuperação individual usa `EntidadeRecuperarDto { id: number }` — nunca primitivo
- Toda operação usa DTO mesmo que tenha um único campo — zero primitivos em assinaturas
- O `id` de `@Param`/`@Query` é injetado no DTO **pela controller** — service e repository nunca recebem `id`/`*Id` solto
- `alterar` segue a mesma regra de `recuperar`: id dentro do DTO (`EntidadeInternoAlterarDto`), nunca `alterar(id, dados)`
- Nenhum DTO pode ser alias ou re-export de outro — cada um define os próprios campos

**Herança de DTO — negócio nunca herda negócio; negócio herda core:**
- Um DTO de **negócio** nunca herda outro DTO de **negócio** (nem subclasse vazia `extends X {}`) — declara os próprios campos explicitamente, mesmo idênticos. Pares `Criado`/`Alterado` divergem com o tempo.
- Um DTO de negócio **herda** um DTO **core** (`PaginatedResult<TItem>`, `StandardResponse<TData>` de `shared/src/interfaces/`) — evita duplicar os campos genéricos. `PaginatedResult` é **classe** para poder ser estendida.
- Par item/wrapper de listagem: o **item** é DTO de negócio com campos explícitos; o **wrapper** herda o core e acrescenta só o específico.

```typescript
// ❌ negócio herda negócio          // ✅ negócio herda core
class ProjetoRecuperadoDto extends    class ExecucaoResumoDto extends
  ProjetoCriadoDto {}                   PaginatedResult<ExecucaoItemDto> { totalMinutosDia: number; }
```

**Localização:** sempre em `shared/src/dtos/[modulo]/` — nunca dentro de `backend/` ou `frontend/`

**Caracteres proibidos em nomes e descrição de execução:**

Os **nomes** de projeto, demanda, atividade e tag e a **descrição de execução** não podem conter
`` '  "  `  ~  ^  \  ´ `` (aspas simples/duplas, crase, til, circunflexo, barra invertida, acento agudo) — higiene de
dados (não é defesa contra SQL injection, que continua sendo os parâmetros nomeados). A regra
(regex + mensagem) mora numa **fonte única** no `shared` — `shared/src/validators/caracteres-proibidos.validator.ts`
(`REGEX_SEM_CARACTERES_PROIBIDOS`, `MENSAGEM_CARACTERES_PROIBIDOS`) — **nunca** redeclarar a regex.

- **Backend (autoritativo):** `@Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })`
  no campo do DTO de **entrada** (`*Criar`/`*Alterar`/`ExecucaoIniciar`/`Encerrar`/`Registrar`/`Alterar`).
  Em campos opcionais, `@IsOptional` vem antes e curto-circuita quando ausente.
- **Frontend (espelho):** `Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)` no control e a mensagem
  `MENSAGEM_CARACTERES_PROIBIDOS` exibida quando `errors?.['pattern']`.
- **Fora do escopo:** cor, código de projeto, descrições de demanda, descrição de atividade,
  anotações e login/senha não têm esta validação.

**Paginação e `allRows` em DTOs de filtro:**

Toda listagem paginada usa os query params `pagina`, `itensPorPagina`, `ordenarPor`, `direcao`
(§9.3 do SYSTEM.SPEC). O DTO de filtro pode ainda expor `allRows?: boolean` — nome **em inglês**
(conceito técnico genérico, existiria em qualquer software; nunca `todasAsLinhas`). Quando
`allRows = true`, o repositório **omite `LIMIT`/`OFFSET`** e retorna todos os registros, e o service
monta o `PaginatedResult<T>` de forma coerente (`totalItens = itensPorPagina = itens.length`,
`paginaAtual = totalPaginas = 1`). A **estrutura da resposta não muda** — quem consome só lê `itens`.

- Como query params chegam como **string**, o campo precisa do mesmo `@Transform` de boolean já
  usado em `DemandaListarDto.isEstrutural` (converte `'true'`/`'false'`), senão `@IsBoolean()` rejeita:

  ```typescript
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  allRows?: boolean;
  ```
- Aplica-se apenas às listagens que retornam `PaginatedResult<T>`. Listagens que **já** retornam
  todos os registros sem paginação (`Tag.listar`, `listarAtribuidas`, `listarDescendentes`,
  `recuperarArvore`, `recuperarGrafo`) **não** recebem `allRows`.

---

## Métodos

Padrão: `verbo + entidade`, sem preposições, sem abreviações:

```typescript
// ✅
criarUsuario()          listarUsuarios()        recuperarUsuario()
alterarUsuario()        excluirUsuario()        validarLogin()
buscarLogin()           iniciarExecucao()       encerrarExecucao()
calcularHorasTrabalhadas()  identificarIntervalos()  verificarCriariaCiclo()

// ❌
createUser()            getUser()               findByLogin()
calcHrs()               checkCycle()
atualizarUsuario()      existeLogin()           existeNome()
```

---

## Variáveis

Sem abreviações. Sempre explícitas:

```typescript
// ✅
const usuarioEncontrado   = await this.usuarioRepositorio.buscarLogin(login);
const totalPaginas        = Math.ceil(totalItens / itensPorPagina);
const senhaEstaCorreta    = await bcrypt.compare(senhaNaoEncriptada, senhaEncriptada);

// ❌
const u   = await this.repo.find(l);
const tp  = Math.ceil(ti / ipp);
const ok  = await bcrypt.compare(p, h);
```

---

## SQL

```sql
-- ✅ Parâmetros nomeados com objeto
SELECT * FROM usuario WHERE login = :login AND is_deleted = false
{ login }

-- ✅ INSERT com SELECT — BaseEntity sempre explícito (sem DEFAULT)
INSERT INTO usuario (login, nome_completo, status, created_date, updated_date, is_deleted)
SELECT :login, :nomeCompleto, :status, NOW(), NOW(), false
RETURNING id, login, nome_completo, created_date
{ login, nomeCompleto, status }

-- ✅ Soft delete via BaseRepository
executarSoftDelete(identificador)  -- nunca DELETE físico

-- ✅ Aliases descritivos em self-join
FROM demanda AS demanda_filho
INNER JOIN arvore_demanda ON demanda_filho.demanda_pai_id = arvore_demanda.id

-- ❌ Nunca
SELECT * FROM usuario WHERE login = ?            -- posicional proibido
INSERT INTO usuario VALUES (...)                 -- VALUES proibido
WHERE login = '${login}'                        -- interpolação proibida
SELECT * FROM usuario                           -- sem filtro is_deleted proibido
INNER JOIN atividade a ON a.id = e.atividade_id -- alias abreviado proibido
cor VARCHAR(7) NOT NULL DEFAULT '#6366f1'       -- DEFAULT proibido
```

**Nomes de campo de data:**
- BaseEntity (inglês): `created_date`, `updated_date`, `deleted_date`
- Negócio (português): `inicio_data`, `fim_data`, `previsao_fim_data`, `dia_data`
- Padrão: `[contexto]_date` ou `[contexto]_data` — nunca `_at`, nunca `_em`, nunca `data_[contexto]`

**Tipo de coluna de data:**
- Com instante (data + hora): `timestamptz` — `created_date`, `updated_date`, `deleted_date`, `inicio_data`, `fim_data`. Banco armazena UTC; sessão fixada em `APP_TIMEZONE` para `NOW()`/bucketing por dia
- Calendário puro (sem hora/fuso): `date` — `dia_data`, `previsao_fim_data`, `projeto.inicio_data`

**Nomes:**
- Tabelas: singular português — `usuario`, `demanda`, `dia_nao_util`
- Colunas de negócio: snake_case português — `nome_completo`, `horas_estimadas`
- Colunas BaseEntity: snake_case inglês — `is_deleted`, `created_date`, `updated_date`, `deleted_date`
- Hierarquias e grafos: CTEs recursivos do PostgreSQL

**Objetos genéricos de banco (funções, triggers de infraestrutura): inglês.**
Mecanismos que existiriam em qualquer projeto (manutenção de BaseEntity, etc.) seguem a regra de linguagem genérica → inglês. Objetos de **negócio** (tabelas/colunas) permanecem em português.

```sql
-- ✅ Função/trigger genérico de infraestrutura → inglês
CREATE FUNCTION fn_set_updated_date() ...      -- mantém updated_date da BaseEntity
CREATE TRIGGER trg_usuario_updated_date ...

-- ❌ Verbo português em objeto genérico
CREATE FUNCTION fn_atualizar_updated_date() ... -- idioma misto: proibido

-- ✅ Negócio permanece em português
CREATE TABLE dia_nao_util ( nome_completo VARCHAR ... )
```

**Nomes de constraints, índices, triggers e funções: prefixo por tipo.**
Padrão `<prefixo>_<tabela>_<proposito>` (nomes genéricos em inglês; nunca deixar o PostgreSQL
auto-gerar — sempre nomear explicitamente):

| Objeto | Prefixo | Exemplo |
|---|---|---|
| Primary key | `pk_` | `pk_usuario` |
| Foreign key | `fk_` | `fk_demanda_projeto` |
| Unique index | `uix_` | `uix_usuario_login_ativo` |
| Index | `ix_` | `ix_demanda_status` |
| Check constraint | `chk_` | `chk_execucao_periodo_valido` |
| Trigger | `trg_` | `trg_usuario_updated_date` |
| Function | `fn_` | `fn_set_updated_date` |

```sql
-- ✅ Constraint nomeada com prefixo chk_
ADD CONSTRAINT chk_dia_nao_util_duracao CHECK (duracao IN ('INTEGRAL', 'MEIO_PERIODO'))

-- ❌ Prefixo fora do padrão / nome auto-gerado pelo PostgreSQL
ADD CONSTRAINT ck_dia_nao_util_duracao CHECK (...)   -- prefixo ck_ proibido (use chk_)
CHECK (status IN (...))                              -- gera demanda_status_check: proibido
```

---

## Camadas — Regras Rápidas

### Controller → burra
Só expõe endpoint e repassa. Sem if, sem try/catch, sem lógica de negócio. A **única microinteligência** permitida é montar o DTO — injetar o `id` de `@Param`/`@Query` no DTO para a service nunca receber primitivo:
```typescript
@Post()
criar(@Body() dto: UsuarioCriarDto) {
  return this.usuarioService.criar(dto);              // apenas isso
}

@Get(':id')
recuperar(@Param('id', ParseIntPipe) id: number, @ActiveUser() usuarioAtivo: JwtPayload) {
  return this.usuarioService.recuperar({ id }, usuarioAtivo);   // id entra no DTO
}

@Put(':id')
alterar(@Param('id', ParseIntPipe) id: number, @Body() dto: UsuarioAlterarDto) {
  return this.usuarioService.alterar({ ...dto, id });          // id mesclado ao corpo
}
```

### Service → inteligente
Toda lógica de negócio, validações de regra, orquestração de repositórios:
```typescript
async criar(dto: UsuarioCriarDto) {
  if (await this.usuarioRepositorio.validarLogin({ login: dto.login }))
    throw new BusinessException('Login já está em uso');
  // ... lógica
}
```

### Repository → só SQL
Sem lógica de negócio. Apenas executa queries via `executarConsulta()` / `executarComando()`:
```typescript
async validarLogin(dto: UsuarioValidarLoginDto): Promise<boolean> {
  const resultado = await this.executarConsulta<{ existe: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM usuario WHERE login = :login AND is_deleted = false) AS existe`,
    { login: dto.login },
  );
  return resultado[0].existe;
}
```

O repositório **nunca** recebe primitivo nem `Partial<Model>` — o `alterar` segue a mesma regra de `recuperar`, com o `id` dentro do DTO interno:
```typescript
// ❌ Nunca — primitivo id + Partial do model de banco
async alterar(id: number, dados: Partial<Projeto>): Promise<ProjetoAlteradoDto> { ... }

// ✅ DTO interno único — id no WHERE, demais campos no SET dinâmico
async alterar(dto: ProjetoInternoAlterarDto): Promise<ProjetoAlteradoDto> { ... }
```

A regra vale para **todo** módulo: `alterar(id, Partial<Demanda>)` ❌ → `alterar(dto: DemandaInternoAlterarDto)` ✅, `alterar(id, Partial<Atividade>)` ❌ → `alterar(dto: AtividadeInternoAlterarDto)` ✅, `alterar(id, Partial<DiaNaoUtil>)` ❌ → `alterar(dto: CalendarioInternoAlterarDto)` ✅, `alterar(id, Partial<Tag>)` ❌ → `alterar(dto: TagInternoAlterarDto)` ✅, e assim por diante. O **parâmetro de restrição de escopo** de uma listagem também é DTO — não há carve-out para primitivo (decisão "DTO em tudo"): use `listar(filtros, restricao?: DemandaAcessoFiltrarDto)`, nunca `listar(filtros, usuarioId?: number)`.

---

## Imports do Shared

```typescript
import { UsuarioCriarDto }      from '@project20/shared/dtos/usuario';
import { UsuarioTipoEnum }      from '@project20/shared/enums';
import { StandardResponse }     from '@project20/shared/interfaces';
import { PaginatedResult }      from '@project20/shared/interfaces';
```

DTOs e enums **nunca** são redefinidos dentro de `backend/` ou `frontend/`.

---

## Enums

```typescript
// shared/src/enums/tipo-usuario.enum.ts
export enum TipoUsuarioEnum {
  DESENVOLVEDOR = 'DESENVOLVEDOR',
  GESTOR        = 'GESTOR',
}
```

Sempre: string enum, valor igual ao nome, em SCREAMING_SNAKE_CASE.

**Todo enum é uma tabela de referência no banco** — nunca `VARCHAR + CHECK` nem `ENUM` nativo.
O enum TypeScript continua sendo o contrato tipado (`@IsEnum`, DTOs, frontend) e espelha os
`codigo` da tabela. Nome da tabela: `tipo_<tabela>_<complemento?>` (`TIPO + TABELA + COMPLEMENTO`,
snake_case singular). **O nome do enum TS = nome da tabela em PascalCase + `Enum`** (arquivo em
kebab-case + `.enum.ts`):

```
usuario.tipo        → tabela tipo_usuario              → TipoUsuarioEnum             → coluna tipo_usuario_id
atividade.status    → tabela tipo_atividade_status     → TipoAtividadeStatusEnum     → coluna tipo_atividade_status_id
dia_nao_util.duracao→ tabela tipo_dia_nao_util_duracao → TipoDiaNaoUtilDuracaoEnum   → coluna tipo_dia_nao_util_duracao_id
```

A tabela de referência segue a BaseEntity + `codigo` (= valor do enum) + `descricao` (rótulo). A
coluna de negócio é `INTEGER` FK para o `id` dela. O repositório traduz `codigo ⇄ id` no SQL
(subselect por `codigo` no INSERT/UPDATE; JOIN com `codigo AS <campo>` no SELECT) — DTOs/services/
frontend nunca veem o id.

---

## Frontend (Angular)

- **Standalone components** sempre — nunca `NgModule` por feature
- **Signals** (`signal`/`computed`/`effect`) para estado reativo — evitar `Subject`/`BehaviorSubject`
- **Reactive Forms** em **todos** os formulários — **sem template-driven forms**, **sem `ngModel`/`FormsModule`**
- **Lazy loading** por rota via `loadComponent`/`loadChildren`

**Embrulhar um controle de terceiros (ex.: `p-colorpicker`):** implementar `ControlValueAccessor`
e dirigir o controle interno por um `FormControl` + `[formControl]` — **nunca** `[ngModel]`/`(ngModelChange)`.
O `ngModel` é template-driven e está proibido mesmo dentro de um CVA.

```typescript
// ✅ CVA com FormControl interno (Reactive Forms)
readonly controleCor = new FormControl<string>('#3b82f6', { nonNullable: true });
writeValue(valor: string | null) { this.controleCor.setValue(valor ?? '#3b82f6', { emitEvent: false }); }
// template: <p-colorpicker [formControl]="controleCor" />

// ❌ Proibido — template-driven dentro do componente
// template: <p-colorpicker [ngModel]="cor()" (ngModelChange)="atualizar($event)" />
```

---

## Estilos

**Extensão:** sempre `.scss`, nunca `.css`
**Utilitários:** Tailwind CSS para layout, espaçamento e tipografia
**Classes customizadas:** arquitetura BEM em SCSS — `bloco__elemento--modificador`
**Idioma:** classes BEM em português (negócio): `.usuario-cartao`, `.demanda-arvore-item`
**Escopo:** estilos de componente ficam no `.scss` do próprio componente; `styles.scss` só recebe o que é verdadeiramente global

**Cores — dois sistemas de tokens, usos distintos:**
- `surface-*` (via Tailwind): base estrutural — fundos, bordas, texto de interface
- `primary` (via CSS var): acento pontual — estados ativos, botões, títulos de identidade

```scss
// ✅ Estrutura de página — surface
bg-surface-0        // branco (painéis, topbar)
bg-surface-50       // cinza claríssimo (fundo de conteúdo)
border-surface-200  // bordas e divisores
text-surface-700    // texto de interface

// ✅ Destaque e identidade — primary (azul)
var(--p-primary-50)   // fundo de item ativo
var(--p-primary-600)  // ícone/texto ativo, títulos em destaque
```

---

## Proibições — Resumo Rápido

| ❌ Nunca fazer | ✅ Fazer em vez disso |
|---|---|
| Abreviar nomes | Nome completo sempre |
| Lógica na controller | Mover para a service |
| ORM / query builder | `knex.raw()` com SQL bruto |
| `SELECT` sem `is_deleted = false` | Sempre filtrar registros deletados |
| `?` posicional em SQL | `:nomeParametro` com objeto |
| `VALUES` no INSERT | `INSERT ... SELECT ... RETURNING` |
| `DEFAULT` em coluna SQL | Aplicação sempre fornece todos os valores |
| `VARCHAR + CHECK` ou `ENUM` nativo para enum | Tabela de referência `tipo_<tabela>` (`codigo` + `descricao`) + coluna `INTEGER` FK; enum TS espelha os `codigo` |
| Alias abreviado em SQL (`a`, `d`, `e`) | Nome completo ou alias descritivo (`demanda_filho`) |
| Campo de data fora do padrão (`iniciado_em`, `data_inicio`) | `inicio_data`, `fim_data`, `created_date` |
| `process.env` diretamente | `ConfigService` injetado |
| Conceito de negócio em inglês | Português para tudo que é do projeto |
| Conceito genérico em português | Inglês para tudo que é arquitetural |
| Criar `projeto_usuario` | Não existe — acesso via `demanda_usuario` |
| DELETE físico | `executarSoftDelete()` sempre |
| Duas execuções ativas no mesmo usuário | Validar na service antes de iniciar |
| Extrapolar escopo da task | Implementar exatamente o que a spec define |
| DTO dentro de `backend/` ou `frontend/` | Sempre em `shared/src/dtos/` |
| NgModule em componentes Angular | Sempre standalone components |
| Arquivo `.css` | Sempre `.scss` |
| `style=""` inline no HTML | SCSS ou classe Tailwind |
| Seletor de ID em SCSS (`#elemento`) | Classe BEM ou Tailwind |
| Primitivo como parâmetro de método (`id: number`, `login: string`) | DTO, mesmo que tenha um único campo |
| `id` de `@Param` repassado solto à service (`service.alterar(id, dto)`) | Controller injeta no DTO: `service.alterar({ ...dto, id })` |
| `repository.alterar(id: number, dados)` — primitivo no `alterar` | `alterar(dto: EntidadeInternoAlterarDto)` — id dentro do DTO, como `recuperar(dto)` |
| `existe*` em nome de método | `validar*` (ex: `validarLogin`, `validarNome`, `validarCodigo`) |
| DTO como alias, re-export ou subclasse de outro DTO **de negócio** (mesmo vazio) | Cada DTO de negócio define seus campos; herança só de DTO **core** (`PaginatedResult`/`StandardResponse`) |
| `Atualizar`/`Atualizado` em DTO ou método | `Alterar`/`Alterado` |
| Query de módulo A no repositório de módulo B | Usar o repositório do módulo correto |
