# Task 20 — Backend: Correção de RecuperarDto e Zero Primitivos

## Objetivo

Eliminar todos os parâmetros primitivos em assinaturas de métodos de service e repository, criando DTOs para cada operação. Padronizar a recuperação individual de entidade via `recuperar(dto: EntidadeRecuperarDto)`.

> **Pré-requisito:** Task 19 concluída (renomeações de nomenclatura já aplicadas).

---

## Contexto

O padrão do projeto exige que nenhum método de service ou repository receba parâmetros primitivos (`string`, `number`, `boolean`, `Date`) diretamente — mesmo para operações com um único campo. Toda operação usa DTO. Além disso, a recuperação individual de uma entidade por ID deve sempre ser chamada `recuperar` e receber `EntidadeRecuperarDto { id: number }`.

---

## Escopo

### 1. Criar `*RecuperarDto` nos módulos que ainda não têm

O `UsuarioRecuperarDto` já existe em `shared/src/dtos/usuario/`. Criar os demais:

| Arquivo a criar | Conteúdo |
|---|---|
| `shared/src/dtos/projeto/ProjetoRecuperarDto.ts` | `export class ProjetoRecuperarDto { id: number; }` |
| `shared/src/dtos/demanda/DemandaRecuperarDto.ts` | `export class DemandaRecuperarDto { id: number; }` |
| `shared/src/dtos/atividade/AtividadeRecuperarDto.ts` | `export class AtividadeRecuperarDto { id: number; }` |
| `shared/src/dtos/execucao/ExecucaoRecuperarDto.ts` | `export class ExecucaoRecuperarDto { id: number; }` |
| `shared/src/dtos/calendario/CalendarioRecuperarDto.ts` | `export class CalendarioRecuperarDto { id: number; }` |
| `shared/src/dtos/tag/TagRecuperarDto.ts` | `export class TagRecuperarDto { id: number; }` |

Atualizar o `index.ts` de cada módulo para exportar o novo DTO.

---

### 2. Renomear `buscarIdentificador(id: number)` → `recuperar(dto: EntidadeRecuperarDto)` nos repositories

| Repository | Assinatura atual | Assinatura nova |
|---|---|---|
| `projeto.repository.ts` | `buscarIdentificador(id: number)` | `recuperar(dto: ProjetoRecuperarDto)` |
| `demanda.repository.ts` | `buscarIdentificador(id: number, usuarioId?: number)` | `recuperar(dto: DemandaRecuperarDto, usuarioId?: number)` — o `usuarioId` opcional também deve virar DTO: `recuperar(dto: DemandaRecuperarDto, filtro?: DemandaFiltroAcessoDto)` |
| `atividade.repository.ts` | `buscarIdentificador(id: number)` | `recuperar(dto: AtividadeRecuperarDto)` |
| `execucao.repository.ts` | `buscarIdentificador(id: number)` | `recuperar(dto: ExecucaoRecuperarDto)` |
| `calendario.repository.ts` | `buscarIdentificador(id: number)` | `recuperar(dto: CalendarioRecuperarDto)` |
| `tag.repository.ts` | `buscarIdentificador(id: number)` | `recuperar(dto: TagRecuperarDto)` |

Nota: `usuario.repository.ts` já possui `recuperar(dto: UsuarioRecuperarDto)` — verificar se está alinhado com este padrão e ajustar se necessário.

Criar `DemandaFiltroAcessoDto` em `shared/src/dtos/demanda/`:
```typescript
export class DemandaFiltroAcessoDto {
  usuarioId: number;
}
```

Atualizar todas as chamadas nos services correspondentes.

---

### 3. Criar DTOs para helpers internos com primitivos

Estes são métodos internos de repositório que recebem primitivos. Cada um deve receber um DTO.

#### demanda.repository.ts

| Método atual | DTO a criar |
|---|---|
| `inserirDemandaUsuario(demandaId: number, usuarioId: number)` | `DemandaAtribuirMembroInternoDto { demandaId: number; usuarioId: number }` |
| `inserirComAtribuicao(dados, criadorId: number, gestorIds: number[])` | manter interface interna, mas `criadorId` e `gestorIds` devem ser parte do tipo `DemandaInserirAtribuicaoDto { dados: DemandaCriarDados; criadorId: number; gestorIds: number[] }` |
| `verificarCriariaCiclo(origemId: number, destinoId: number)` | já corrigido na task 19 via `DemandaValidarConexaoDto` — reutilizar |
| `conexaoPertenceADemanda(conexaoId: number, demandaId: number)` | `DemandaConexaoVerificarDto { conexaoId: number; demandaId: number }` |
| `listarTagsDemanda(demandaId: number)` | `DemandaListarTagsDto { demandaId: number }` |
| `atribuirTagsDemanda(demandaId: number, tagIds: number[])` | `DemandaAtribuirTagsInternoDto { demandaId: number; tagIds: number[] }` |
| `removerTagDemanda(demandaId: number, tagId: number)` | `DemandaRemoverTagInternoDto { demandaId: number; tagId: number }` |
| `listarMembrosDemanda(demandaId: number)` | `DemandaListarMembrosDto { demandaId: number }` |
| `atribuirMembroDemanda(demandaId: number, usuarioId: number)` | `DemandaAtribuirMembroInternoDto` (reuso do criado acima) |
| `removerMembroDemanda(demandaId: number, usuarioId: number)` | `DemandaRemoverMembroInternoDto { demandaId: number; usuarioId: number }` |
| `membroJaAtribuido(demandaId: number, usuarioId: number)` | `DemandaVerificarMembroDto { demandaId: number; usuarioId: number }` |
| `contarMembrosDemanda(demandaId: number)` | `DemandaListarMembrosDto` (reuso) |
| `excluirConexao(conexaoId: number)` | `DemandaConexaoExcluirDto { conexaoId: number }` |

#### atividade.repository.ts

| Método atual | DTO a criar |
|---|---|
| `excluir(id: number)` | `AtividadeExcluirDto { id: number }` |
| `usuarioTemAcessoDemanda(demandaId: number, usuarioId: number)` | `DemandaVerificarAcessoDto { demandaId: number; usuarioId: number }` — criar em shared/dtos/demanda |
| `listarTags(atividadeId: number)` | `AtividadeListarTagsDto { atividadeId: number }` |
| `atualizarTags(atividadeId: number, tagIds: number[])` → `alterarTags` | `AtividadeAlterarTagsDto { atividadeId: number; tagIds: number[] }` |

#### execucao.repository.ts

| Método atual | DTO a criar |
|---|---|
| `encerrar(id: number, fimData: Date, descricao: string)` | `ExecucaoEncerrarInternoDto { id: number; fimData: Date; descricao: string }` |
| `buscarExecucaoAtiva(usuarioId: number)` | `ExecucaoBuscarAtivaDto { usuarioId: number }` |
| `alterar(id: number, descricao: string)` (após task 19) | `ExecucaoAlterarInternoDto { id: number; descricao: string }` |
| `excluir(id: number)` | `ExecucaoExcluirDto { id: number }` |
| `buscarUsuarioExecucao(execucaoId: number)` | `ExecucaoBuscarUsuarioDto { execucaoId: number }` |

#### usuario.repository.ts

| Método atual | DTO a criar |
|---|---|
| `atualizarSenha` → `alterarSenha(id: number, senhaEncriptada: string)` (após task 19) | `UsuarioAlterarSenhaInternoDto { id: number; senhaEncriptada: string }` |
| `excluir(id: number)` | `UsuarioExcluirDto { id: number }` |
| `listarGestoresAtivos()` | sem parâmetros — mantém |

#### projeto.repository.ts

| Método atual | DTO a criar |
|---|---|
| `listarPorUsuario(usuarioId: number, filtros: ProjetoListarDto)` | `ProjetoListarPorUsuarioDto` com `usuarioId: number` integrado ao `ProjetoListarDto`, OU manter separado: `ProjetoListarPorUsuarioFiltroDto { usuarioId: number; filtros: ProjetoListarDto }` |
| `excluir(id: number)` | `ProjetoExcluirDto { id: number }` |

#### calendario.repository.ts

| Método atual | DTO a criar |
|---|---|
| `excluir(id: number)` | `CalendarioExcluirDto { id: number }` |
| `ehDiaNaoUtil(data: Date)` | `CalendarioVerificarDiaDto { data: Date }` |
| `buscarTipoPorData(data: Date)` | `CalendarioVerificarDiaDto` (reuso) |

#### tag.repository.ts

| Método atual | DTO a criar |
|---|---|
| `excluir(id: number)` | `TagExcluirDto { id: number }` |

---

### 4. Localização dos DTOs internos

DTOs que são **exclusivamente internos** (nunca chegam ao frontend) ainda assim devem ficar em `shared/src/dtos/` por ser o local único de DTOs no monorepo. Nomear com sufixo `Interno` quando a operação é de camada interna e não é exposta pela API (ex: `DemandaAtribuirMembroInternoDto`).

---

## Verificação

1. `npm run build --workspace=backend` — sem erros de TypeScript
2. `npm run build --workspace=shared` — sem erros
3. Verificar que nenhum método público de service recebe `string`, `number`, `Date` ou `boolean` como parâmetro direto (exceto `JwtPayload` do decorator `@ActiveUser()`)
4. Verificar que nenhum método de repository recebe primitivos (exceto internamente dentro do próprio método, em chamadas ao knex)
5. Verificar que todos os repositories têm o método `recuperar(dto)` em vez de `buscarIdentificador(id)`
