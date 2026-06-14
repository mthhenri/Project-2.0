# Task 19 — Backend: Correção de Nomenclatura

## Objetivo

Aplicar as correções de padrão identificadas na revisão pós-task 18. Esta task cobre **renomeações puras** — sem criar novas estruturas, apenas corrigir nomenclaturas existentes e expandir DTOs que são aliases ilegítimos.

---

## Contexto

A revisão identificou as seguintes violações nos padrões do projeto:
- DTOs e métodos usando `atualizar`/`atualizado` em vez de `alterar`/`alterado`
- Três DTOs definidos como re-export/alias de outro DTO em vez de terem campos próprios
- Métodos de repositório nomeados com `existe*` (não é verbo de ação)
- `DemandaRepository` com query direta na tabela `usuario` (responsabilidade errada de módulo)

---

## Escopo

### 1. Renomear DTOs: `Atualizar` → `Alterar`, `Atualizado`/`Atualizada` → `Alterado`/`Alterada`

#### shared/src/dtos/usuario/
- Renomear arquivo `UsuarioAtualizarDto.ts` → `UsuarioAlterarDto.ts`; classe interna idem
- Renomear arquivo `UsuarioAtualizadoDto.ts` → `UsuarioAlteradoDto.ts`; classe interna idem
- Atualizar `index.ts` do módulo

#### shared/src/dtos/projeto/
- Renomear `ProjetoAtualizarDto.ts` → `ProjetoAlterarDto.ts`; classe idem
- Renomear `ProjetoAtualizadoDto.ts` → `ProjetoAlteradoDto.ts`; classe idem
- Atualizar `index.ts`

#### shared/src/dtos/demanda/
- Renomear `DemandaAtualizarDto.ts` → `DemandaAlterarDto.ts`; classe idem
- Renomear `DemandaAtualizadaDto.ts` → `DemandaAlteradaDto.ts`; classe idem
- Atualizar `index.ts`

#### shared/src/dtos/atividade/
- Renomear `AtividadeAtualizarDto.ts` → `AtividadeAlterarDto.ts`; classe idem
- **Expandir** `AtividadeAtualizadaDto.ts` (hoje re-export proibido) → renomear para `AtividadeAlteradaDto.ts` com campos próprios:
  ```typescript
  import { AtividadeStatusEnum } from '../../enums/atividade-status.enum';
  export class AtividadeAlteradaDto {
    id: number;
    demandaId: number;
    usuarioId: number;
    nomeUsuario: string;
    nome: string;
    descricao: string | null;
    status: AtividadeStatusEnum;
    ordemExibicao: number;
    createdDate: Date;
  }
  ```
- Atualizar `index.ts`

#### shared/src/dtos/execucao/
- Renomear `ExecucaoAtualizarDto.ts` → `ExecucaoAlterarDto.ts`; classe idem
- **Expandir** `ExecucaoAtualizadaDto.ts` (hoje re-export proibido) → renomear para `ExecucaoAlteradaDto.ts` com campos próprios:
  ```typescript
  export class ExecucaoAlteradaDto {
    id: number;
    atividadeId: number;
    descricao: string;
    inicioData: Date;
    fimData: Date | null;
    duracaoMinutos: number | null;
  }
  ```
- Atualizar `index.ts`

#### shared/src/dtos/calendario/
- Renomear `DiaNaoUtilAtualizarDto.ts` → `DiaNaoUtilAlterarDto.ts`; classe idem
- **Expandir** `DiaNaoUtilAtualizadoDto.ts` (hoje re-export proibido) → renomear para `DiaNaoUtilAlteradoDto.ts` com campos próprios:
  ```typescript
  import { DiaNaoUtilTipoEnum } from '../../enums';
  export class DiaNaoUtilAlteradoDto {
    id: number;
    diaData: string;
    descricao: string;
    tipo: DiaNaoUtilTipoEnum;
    recorrente: boolean;
    createdDate: Date;
  }
  ```
- Atualizar `index.ts`

#### shared/src/dtos/tag/
- Renomear `TagAtualizarDto.ts` → `TagAlterarDto.ts`; classe idem
- Renomear `TagAtualizadaDto.ts` → `TagAlteradaDto.ts`; classe idem
- Atualizar `index.ts`

---

### 2. Renomear método `atualizar()` → `alterar()` no backend

Em **todos** os repositories e services dos módulos abaixo, renomear o método `atualizar` para `alterar` e atualizar os imports de DTO correspondentes:

- `backend/src/modules/usuario/repositories/usuario.repository.ts`
- `backend/src/modules/usuario/services/usuario.service.ts`
- `backend/src/modules/usuario/controllers/usuario.controller.ts`
- `backend/src/modules/projeto/repositories/projeto.repository.ts`
- `backend/src/modules/projeto/services/projeto.service.ts`
- `backend/src/modules/projeto/controllers/projeto.controller.ts`
- `backend/src/modules/demanda/repositories/demanda.repository.ts`
- `backend/src/modules/demanda/services/demanda.service.ts`
- `backend/src/modules/demanda/controllers/demanda.controller.ts`
- `backend/src/modules/atividade/repositories/atividade.repository.ts`
- `backend/src/modules/atividade/services/atividade.service.ts`
- `backend/src/modules/atividade/controllers/atividade.controller.ts`
- `backend/src/modules/execucao/repositories/execucao.repository.ts`
- `backend/src/modules/execucao/services/execucao.service.ts`
- `backend/src/modules/execucao/controllers/execucao.controller.ts`
- `backend/src/modules/calendario/repositories/calendario.repository.ts`
- `backend/src/modules/calendario/services/calendario.service.ts`
- `backend/src/modules/calendario/controllers/calendario.controller.ts`
- `backend/src/modules/tag/repositories/tag.repository.ts`
- `backend/src/modules/tag/services/tag.service.ts`
- `backend/src/modules/tag/controllers/tag.controller.ts`

Nota: o método `atualizarSenha` em `UsuarioRepository` e `UsuarioService` deve ser renomeado para `alterarSenha`.
Nota: o método `atualizarTags` em `AtividadeRepository`/`AtividadeService` e `demandaRepositorio.atribuirTagsDemanda` (que já usa nome diferente) não precisa de mudança se já estiver bem nomeado — verificar caso a caso.

---

### 3. Renomear `existe*` → `validar*` nos repositories

| Arquivo | Método atual | Método novo |
|---|---|---|
| `usuario.repository.ts` | `existeLogin(login: string)` | `validarLogin(dto: UsuarioValidarLoginDto)` |
| `tag.repository.ts` | `existeNome(nome: string)` | `validarNome(dto: TagValidarNomeDto)` |
| `projeto.repository.ts` | `existeCodigo(codigo: string)` | `validarCodigo(dto: ProjetoValidarCodigoDto)` |
| `demanda.repository.ts` | `existeConexao(origemId, destinoId)` | `validarConexao(dto: DemandaValidarConexaoDto)` |

Criar os DTOs correspondentes **em `shared/src/dtos/`** no módulo correto:
- `shared/src/dtos/usuario/UsuarioValidarLoginDto.ts` → `{ login: string }`
- `shared/src/dtos/tag/TagValidarNomeDto.ts` → `{ nome: string }`
- `shared/src/dtos/projeto/ProjetoValidarCodigoDto.ts` → `{ codigo: string }`
- `shared/src/dtos/demanda/DemandaValidarConexaoDto.ts` → `{ demandaOrigemId: number; demandaDestinoId: number }`

Atualizar as chamadas nos services correspondentes para passar o DTO.

---

### 4. Mover responsabilidade: `buscarIdGestoresAtivos`

**Remover** de `DemandaRepository`:
- Método `buscarIdGestoresAtivos()` — realiza query na tabela `usuario`, o que não é responsabilidade do módulo demanda

**Ajustar** `DemandaService`:
- Injetar `UsuarioRepository` (já disponível via `UsuarioModule` importado no `DemandaModule`)
- Substituir `this.demandaRepositorio.buscarIdGestoresAtivos()` por `this.usuarioRepositorio.listarGestoresAtivos()`
- O método `listarGestoresAtivos()` já existe em `UsuarioRepository`

---

## Verificação

1. `npm run build --workspace=backend` — compilar sem erros
2. `npm run build --workspace=shared` — compilar sem erros
3. Verificar que nenhum arquivo em `shared/src/dtos/` contém `export { ... as ... }` (alias proibido)
4. Verificar que nenhum repository contém método chamado `existe*`
5. Verificar que nenhum service ou repository contém o nome `atualizar` (exceto em strings SQL como `UPDATE`)
