# 10 — Módulo Demanda — CRUD Base

**Depende de:** 07, 09
**Entrega:** CRUD de demandas com auto-atribuição na criação

---

## Objetivo

CRUD base do módulo de demandas. Hierarquia (task 11), grafo (task 12) e
tags/atribuições (task 13) são implementados nas tasks seguintes.

---

## DTOs a Criar em `shared/src/dtos/demanda/`

```typescript
// DemandaCriarDto.ts
projetoId: number           @IsNumber @Min(1)
demandaPaiId?: number       @IsOptional @IsNumber
nome: string                @IsString @MinLength(3) @MaxLength(255)
descricaoTecnica?: string   @IsOptional @IsString
descricaoCliente?: string   @IsOptional @IsString
documentacao?: string       @IsOptional @IsString
horasEstimadas: number      @IsNumber @Min(0)
prioridade: DemandaPrioridadeEnum  @IsEnum
status: DemandaStatusEnum          @IsEnum
isEstrutural: boolean       @IsBoolean
previsaoFimData?: string    @IsOptional @IsDateString
ordemExibicao: number       @IsNumber @Min(0)

// DemandaCriadaDto.ts
id, projetoId, demandaPaiId, nome, horasEstimadas, prioridade,
status, isEstrutural, previsaoFimData, ordemExibicao, createdDate

// DemandaResumoDto.ts — item de listagem
id, nome, prioridade, status, isEstrutural, horasEstimadas, ordemExibicao

// DemandaRecuperadaDto.ts — busca individual
Todos os campos incluindo descricaoTecnica, descricaoCliente, documentacao

// DemandaListarDto.ts
projetoId: number           @IsNumber (obrigatório)
demandaPaiId?: number       @IsOptional (null = raiz)
status?: DemandaStatusEnum  @IsOptional
prioridade?: DemandaPrioridadeEnum @IsOptional
isEstrutural?: boolean      @IsOptional
pagina?: number, itensPorPagina?: number

// DemandaAtualizarDto.ts
Todos os campos de DemandaCriarDto como opcionais, exceto projetoId

// DemandaAtualizadaDto.ts = DemandaRecuperadaDto
```

Exportar tudo no `shared/src/dtos/demanda/index.ts`.

---

## Model — `demanda.model.ts`

Todos os campos da tabela `demanda` mapeados para TypeScript.

---

## Repository — `demanda.repository.ts`

```typescript
async inserir(dados: DemandaInserirDados): Promise<DemandaCriadaDto>
async buscarIdentificador(id: number): Promise<DemandaRecuperadaDto | null>
async listar(filtros: DemandaListarDto): Promise<{ itens: DemandaResumoDto[]; total: number }>
async atualizar(id: number, dados: Partial<Demanda>): Promise<DemandaRecuperadaDto>
async excluir(id: number): Promise<void>

// Para auto-atribuição — busca IDs de todos os gestores ativos
async buscarIdGestoresAtivos(): Promise<number[]>

// Insere uma linha em demanda_usuario
async inserirDemandaUsuario(demandaId: number, usuarioId: number): Promise<void>

// Verifica se usuário tem acesso ao projeto via demanda_usuario
async usuarioTemAcessoProjeto(projetoId: number, usuarioId: number): Promise<boolean>

/**
 * Retorna todos os nós e arestas do grafo de demandas de um projeto.
 * Sem paginação — retorna tudo para o grafo D3.
 */
async recuperarGrafo(projetoId: number): Promise<DemandaGrafoDto>
```

---

## Service — `demanda.service.ts`

```typescript
async criar(dto: DemandaCriarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<DemandaCriadaDto>>
async listar(filtros: DemandaListarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PaginatedResult<DemandaResumoDto>>>
async recuperar(id: number, usuarioAtivo: JwtPayload): Promise<StandardResponse<DemandaRecuperadaDto>>
async atualizar(id: number, dto: DemandaAtualizarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<DemandaRecuperadaDto>>
async excluir(id: number): Promise<StandardResponse<void>>
```

**Regras de `criar`:**
1. Verificar que o projeto existe e não está excluído
2. Se `demandaPaiId` fornecido, verificar que a demanda pai existe no mesmo projeto
3. Se desenvolvedor, verificar que tem acesso ao projeto via `usuarioTemAcessoProjeto`
4. Inserir a demanda
5. **Auto-atribuição:** inserir o criador em `demanda_usuario`
6. **Auto-atribuição:** buscar todos os gestores ativos e inserir cada um em `demanda_usuario` (ignorar duplicatas — o criador pode ser gestor)
7. Usar transação Knex para garantir atomicidade dos passos 4-6

**Regras de `listar`:**
- Desenvolvedor: filtrar por `demanda_usuario.usuario_id = usuarioAtivo.id`
- Gestor: sem filtro de usuário

**Regras de `atualizar`:**
- Desenvolvedor só pode atualizar demandas onde está atribuído

---

## Controller — `demanda.controller.ts`

```
POST   /api/v1/demanda       → criar (qualquer autenticado com acesso ao projeto)
GET    /api/v1/demanda       → listar (query param projetoId obrigatório)
GET    /api/v1/demanda/:id   → recuperar
PUT    /api/v1/demanda/:id   → atualizar
DELETE /api/v1/demanda/:id   @GestorOnly() → excluir
GET /api/v1/demanda/grafo    → recuperarGrafo (query param projetoId obrigatório)
```

---

## Transação na Criação

```typescript
await this.conexaoBancoDados.transaction(async (transacao) => {
  const demandaCriada = await this.inserir(dados, transacao);
  await this.inserirDemandaUsuario(demandaCriada.id, criadorId, transacao);
  for (const gestorId of gestorIds) {
    if (gestorId !== criadorId) {
      await this.inserirDemandaUsuario(demandaCriada.id, gestorId, transacao);
    }
  }
  return demandaCriada;
});
```

O `BaseRepository.executarConsulta` deve aceitar um parâmetro opcional de transação Knex.

---

## NÃO implementar nesta task

- Hierarquia e árvore (task 11)
- Grafo de conexões (task 12)
- Atribuição manual de usuários e tags (task 13)
- Endpoints de subdemandas
