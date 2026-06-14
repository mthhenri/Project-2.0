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

**Regras adicionais:**
- Toda recuperação individual usa `EntidadeRecuperarDto { id: number }` — nunca primitivo
- Toda operação usa DTO mesmo que tenha um único campo — zero primitivos em assinaturas
- Nenhum DTO pode ser alias ou re-export de outro — cada um define os próprios campos

**Localização:** sempre em `shared/src/dtos/[modulo]/` — nunca dentro de `backend/` ou `frontend/`

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

**Nomes:**
- Tabelas: singular português — `usuario`, `demanda`, `dia_nao_util`
- Colunas de negócio: snake_case português — `nome_completo`, `horas_estimadas`
- Colunas BaseEntity: snake_case inglês — `is_deleted`, `created_at`, `updated_at`
- Hierarquias e grafos: CTEs recursivos do PostgreSQL

---

## Camadas — Regras Rápidas

### Controller → burra
Só expõe endpoint e repassa. Sem if, sem try/catch, sem lógica:
```typescript
@Post()
criar(@Body() dto: UsuarioCriarDto) {
  return this.usuarioService.criar(dto);   // apenas isso
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
// shared/src/enums/usuario-tipo.enum.ts
export enum UsuarioTipoEnum {
  DESENVOLVEDOR = 'DESENVOLVEDOR',
  GESTOR        = 'GESTOR',
}
```

Sempre: string enum, valor igual ao nome, em SCREAMING_SNAKE_CASE.

---

## Estilos

**Extensão:** sempre `.scss`, nunca `.css`
**Utilitários:** Tailwind CSS para layout, espaçamento, cores e tipografia
**Classes customizadas:** arquitetura BEM em SCSS — `bloco__elemento--modificador`
**Idioma:** classes BEM em português (negócio): `.usuario-cartao`, `.demanda-arvore-item`

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
| `existe*` em nome de método | `validar*` (ex: `validarLogin`, `validarNome`, `validarCodigo`) |
| DTO como alias ou re-export de outro DTO | Cada DTO define seus próprios campos explicitamente |
| `Atualizar`/`Atualizado` em DTO ou método | `Alterar`/`Alterado` |
| Query de módulo A no repositório de módulo B | Usar o repositório do módulo correto |
