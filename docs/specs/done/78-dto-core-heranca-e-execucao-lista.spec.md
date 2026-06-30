# Task 78 — shared: Herança de DTO core e listagem de execução

## Objetivo

Esclarecer e aplicar a regra de **herança de DTOs**: um DTO de **negócio** nunca herda
outro DTO de **negócio** (declara seus próprios campos, mesmo que idênticos); um DTO de
negócio **pode/deve** herdar um DTO **core** (genérico/arquitetural). Como consequência:
(1) `PaginatedResult` passa a ser uma **classe-base core**; (2) o DTO de listagem de
execução é remodelado para herdar dela; (3) seis DTOs que hoje são subclasses vazias de
outros DTOs de negócio passam a declarar campos explícitos.

> **Referência cruzada:** audit de consistência (C1, E1, E3) e o esclarecimento da regra
> dado pelo usuário (negócio↔negócio ❌; negócio→core ✅).
> **Proibição relacionada:** §16 #23 e §5.1 — "nenhum DTO pode ser alias ou re-export de
> outro… cada DTO define os seus próprios campos explicitamente".

---

## Contexto

A proibição #23 foi redigida de forma incompleta: ela mira **herança entre DTOs de
negócio** (ex.: `Alterado extends Recuperado`), que deve ser proibida — mesmo com campos
idênticos cada um declara os seus. Mas **herdar um DTO core** (o "retorno de lista padrão"
`PaginatedResult`, etc.) é **esperado** e evita duplicação dos campos genéricos.

Hoje há dois desvios:
1. **Seis DTOs de negócio são subclasses vazias de outros DTOs de negócio** (`extends X {}`).
2. **`ExecucaoListaDto`** (wrapper de listagem) **duplica** os campos de `PaginatedResult`
   em vez de herdá-los, e o par item/wrapper está com nomes fora do padrão.

---

## Escopo

### 1. `PaginatedResult` → classe-base core

**Arquivo:** `shared/src/interfaces/paginated-result.interface.ts`

**Situação atual:**
```typescript
export interface PaginatedResult<TItem> {
  itens: TItem[];
  totalItens: number;
  paginaAtual: number;
  itensPorPagina: number;
  totalPaginas: number;
}
```

**Correção esperada:**
- Converter para `export class PaginatedResult<TItem> { … }` (mesmos campos).
- Os retornos atuais por object-literal (`{ itens, totalItens, … }` nos services) continuam
  válidos por **tipagem estrutural** — não é preciso `new`.
- Manter a localização e o barrel `shared/src/interfaces/index.ts` (mover de pasta geraria
  churn desnecessário; o import via `@project20/shared` não muda).
- `StandardResponse` **permanece interface** (nenhum DTO de negócio a herda; o wrapper de
  resposta é montado pelo interceptor).

### 2. Listagem de execução — item/wrapper (rename escolhido)

**Arquivos:** `shared/src/dtos/execucao/ExecucaoResumoDto.ts`, `ExecucaoListaDto.ts`, `index.ts`

**Situação atual:**
```typescript
// ExecucaoResumoDto.ts (item — 13 campos)
export class ExecucaoResumoDto { id; atividadeId; nomeAtividade; demandaId; nomeDemanda;
  projetoId; nomeProjeto; descricao; inicioData; fimData; duracaoMinutos; usuarioId; nomeUsuario; }

// ExecucaoListaDto.ts (wrapper — duplica PaginatedResult)
export class ExecucaoListaDto {
  itens: ExecucaoResumoDto[];
  totalItens; paginaAtual; itensPorPagina; totalPaginas;
  totalMinutosDia: number;
}
```

**Correção esperada:**
- Renomear o **item**: classe `ExecucaoResumoDto` → **`ExecucaoItemDto`** (arquivo `ExecucaoItemDto.ts`), **exportado** (usado por `PontoService`, repositório e frontend), mesmos 13 campos.
- Substituir o **wrapper** por um novo `ExecucaoResumoDto` que **herda o core**:
  ```typescript
  import { PaginatedResult } from '../../interfaces/paginated-result.interface';
  import { ExecucaoItemDto } from './ExecucaoItemDto';

  export class ExecucaoResumoDto extends PaginatedResult<ExecucaoItemDto> {
    totalMinutosDia: number;
  }
  ```
  (não redeclarar `itens`/`totalItens`/… — vêm do core).
- **Remover** `ExecucaoListaDto.ts`; atualizar o barrel `shared/src/dtos/execucao/index.ts`.
- **Atualizar importadores** (grep `ExecucaoResumoDto|ExecucaoListaDto`):
  - Backend: `execucao.repository.ts` (retorno de `listar`), `execucao.service.ts` (`listar` retorna `ExecucaoResumoDto`), `ponto.service.ts` (item vira `ExecucaoItemDto[]`), `shared/src/dtos/ponto/PontoDiarioDto.ts` (import relativo do item → `ExecucaoItemDto`).
  - Frontend: `modules/execucao/services/execucao.service.ts`, `pages/execucao-historico`, `modules/atividade/services/atividade.service.ts`, `pages/atividade-listagem`, `pages/atividade-detalhe`, `components/atividade-visualizar-dialog`.
- **Sem mudança de SQL nem de campos** — só nomes/tipos de retorno e a herança.

> ⚠️ Atenção ao duplo papel: onde hoje `ExecucaoResumoDto` é o **item** (`ExecucaoResumoDto[]`),
> passa a `ExecucaoItemDto[]`; onde é o **retorno de `listar`** (o wrapper), continua
> `ExecucaoResumoDto` (agora estendendo o core).

### 3. Seis DTOs negócio-estende-negócio → campos explícitos

Cada um hoje é `export class X extends Y {}` (subclasse vazia de DTO de negócio).
Substituir por declaração explícita dos mesmos campos do "pai" (copiando os decorators
`@ApiProperty`/`@ApiPropertyOptional` correspondentes). **Não** herdar de outro DTO de negócio.

| Arquivo | Atual | Campos a declarar (espelhar) |
|---|---|---|
| `shared/src/dtos/usuario/UsuarioAlteradoDto.ts` | `extends UsuarioRecuperadoDto {}` | id, login, nomeCompleto, cargoTitulo, anotacoes, tipo, status, horasDiariasNecessarias, createdDate |
| `shared/src/dtos/projeto/ProjetoRecuperadoDto.ts` | `extends ProjetoCriadoDto {}` | id, nome, codigo, cor, status, inicioData, previsaoFimData, createdDate |
| `shared/src/dtos/projeto/ProjetoAlteradoDto.ts` | `extends ProjetoRecuperadoDto {}` | (mesmos de ProjetoRecuperadoDto) |
| `shared/src/dtos/tag/TagRecuperadaDto.ts` | `extends TagCriadaDto {}` | id, nome, cor, createdDate |
| `shared/src/dtos/tag/TagAlteradaDto.ts` | `extends TagCriadaDto {}` | id, nome, cor, createdDate |
| `shared/src/dtos/demanda/DemandaAlteradaDto.ts` | `extends DemandaRecuperadaDto {}` | id, projetoId, demandaPaiId, nome, descricaoTecnica, descricaoCliente, documentacao, horasEstimadas, prioridade, status, isEstrutural, previsaoFimData, createdDate, podeEditar |

> Os DTOs "pais" (`UsuarioRecuperadoDto`, `ProjetoCriadoDto`, `TagCriadaDto`,
> `DemandaRecuperadaDto`) permanecem como estão. Apenas as **subclasses vazias** ganham
> corpo próprio. Conferir que os tipos de campo batem com o pai (ex.: `Projeto*.createdDate: Date`,
> `Demanda*.createdDate: string`).

---

## Atualização de Documentação (obrigatória)

1. **`SYSTEM.SPEC.md` §5.1 e §16 #23** — reescrever a regra: *DTO de negócio nunca herda
   outro DTO de negócio (declara seus campos, mesmo idênticos); DTO de negócio herda DTO
   **core** (`PaginatedResult`, etc.), sem duplicar os campos genéricos.* Acrescentar o
   par item/wrapper de execução como exemplo (`ExecucaoResumoDto extends PaginatedResult<ExecucaoItemDto>` ✅).
2. **`CONVENTIONS.md`** (seção DTOs e tabela de proibições) — atualizar a linha de alias/
   re-export para distinguir herança **de negócio** (❌) de herança **de core** (✅).
3. **`CONTEXT.md`** (Decisões Tomadas) — registrar a regra esclarecida e o rename do par
   de execução.

---

## Verificação

1. `npm run build --workspace=backend` (nest build — cobre o type-check do `shared`) sem erros.
2. `npm run build --workspace=frontend` OK (só warnings pré-existentes de budget/CommonJS).
3. `grep -rn "extends .*Dto {}" shared/src/dtos` — **nenhuma** subclasse vazia de DTO de negócio.
4. `grep -rn "ExecucaoListaDto" .` (fora de `docs/`) — nenhuma ocorrência; `ExecucaoListaDto.ts` removido.
5. `ExecucaoResumoDto` estende `PaginatedResult<ExecucaoItemDto>` e **não** redeclara `itens`/`totalItens`/`paginaAtual`/`itensPorPagina`/`totalPaginas`.
6. `GET /execucao` retorna `{ itens: ExecucaoItemDto[], totalItens, …, totalMinutosDia }` (forma preservada em runtime).
7. Os 6 DTOs declaram os campos esperados (com decorators) e não usam `extends` de DTO de negócio.

---

## NÃO implementar nesta task

- Converter `StandardResponse` em classe (permanece interface — ninguém a herda).
- Criar wrappers nomeados para listagens que já usam `PaginatedResult<XResumoDto>` via genérico (não duplicam campos — sem mudança).
- Reconciliação documental de schema/comportamento (task 69), constraints (task 70), `!`/JSDoc (task 72), `ngModel` (task 73).
- Mudar SQL, validações ou regras — apenas a forma/herança dos DTOs e seus importadores.
