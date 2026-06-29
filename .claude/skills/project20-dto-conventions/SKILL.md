---
name: project20-dto-conventions
description: >
  Convenções completas de nomenclatura, estrutura e localização de DTOs do Project 2.0.
  Use esta skill sempre que for criar, nomear, revisar, listar ou validar DTOs do projeto —
  mesmo que o usuário não mencione "DTO" explicitamente. Se a tarefa envolve entrada ou saída
  de dados entre camadas (controller, service, repository, frontend), consulte esta skill antes
  de escrever qualquer nome de classe. Erros de nomenclatura de DTO são uma das falhas mais
  frequentes em tasks de implementação — esta skill existe para eliminá-los.
---

# Convenções de DTO — Project 2.0

> **Leia antes de nomear qualquer DTO.** Estas regras são inegociáveis e derivam do
> `CONVENTIONS.md` e `SYSTEM.SPEC.md` do projeto.

---

## Fórmula Geral

```
Entidade + Complemento (se houver) + Verbo + Dto
```

- **Entrada** → verbo no **infinitivo**: `CriarDto`, `AlterarDto`, `RecuperarDto`
- **Saída** → verbo no **particípio**: `CriadoDto`, `AlteradoDto`, `RecuperadoDto`
- **Complemento** → aparece apenas quando a operação atinge um sub-aspecto da entidade, não o modelo inteiro

---

## Tabela de Referência

| Entrada | Saída | Situação |
|---|---|---|
| `UsuarioCriarDto` | `UsuarioCriadoDto` | Operação no modelo inteiro |
| `UsuarioAlterarDto` | `UsuarioAlteradoDto` | Alteração completa |
| `UsuarioRecuperarDto` | `UsuarioRecuperadoDto` | Recuperação individual |
| `UsuarioListarDto` | `UsuarioResumoDto` | Listagem — saída **sempre** resumida |
| `UsuarioSenhaAlterarDto` | `UsuarioSenhaAlteradaDto` | Sub-aspecto (complemento simples) |
| `DemandaTagAtribuirDto` | `DemandaTagAtribuidaDto` | Um item do sub-aspecto |
| `DemandaTagsAtribuirDto` | `DemandaTagsAtribuidasDto` | Coleção do sub-aspecto (plural) |
| `AssistenteDescricaoAuxiliarDto` | `AssistenteDescricaoAuxiliadaDto` | Complemento composto + verbo |

---

## Regras do Complemento

### Quando usar
- **Omitir** quando a operação representa o modelo inteiro → `UsuarioAlterarDto`
- **Usar** quando a operação atinge apenas um sub-aspecto → `UsuarioSenhaAlterarDto`

### Quando o complemento cobre múltiplos campos
Agrupar num substantivo semântico — nunca concatenar dois complementos:
```
senha + email       → Credenciais   → UsuarioCredenciaisAlterarDto  ✅
nome + cargoTitulo  → Perfil        → UsuarioPerfilAlterarDto        ✅
```
Se não existe substantivo natural que agrupe os campos, a operação provavelmente é uma
alteração completa do modelo → omitir o complemento.

### Quando o complemento é uma coleção
Usar o plural do complemento:
```
AtribuirUmaTag    → DemandaTagAtribuirDto   ✅
AtribuirVáriasTags → DemandaTagsAtribuirDto ✅
```

### Quando o complemento tem mais de uma palavra
**Todo o complemento — todas as palavras — vem antes do verbo, sem exceção.**
Qualificadores como `Interno` fazem parte do complemento quando modificam seu substantivo:

```
membro + interno → complemento "MembroInterno" → DemandaMembroInternoAtribuirDto  ✅
                                               → DemandaMembroAtribuirInternoDto  ❌

tag + interno    → complemento "TagInterno"    → DemandaTagInternoRemoverDto      ✅
tags + interno   → complemento "TagsInterno"   → DemandaTagsInternoAtribuirDto    ✅
```

Quando `Interno` é o **único** complemento, a regra é a mesma — continua antes do verbo:
```
ExecucaoInternoAlterarDto   ✅      ExecucaoAlterarInternoDto   ❌
ExecucaoInternoEncerrarDto  ✅      ExecucaoEncerrarInternoDto  ❌
```

---

## Casos Especiais

### DTOs Internos (service → repository)
Operações internas que nunca chegam ao frontend usam `Interno` como complemento:
```
ProjetoInternoAlterarDto
DemandaInternoAlterarDto
AtividadeInternoAlterarDto
ExecucaoInternoAlterarDto
ExecucaoInternoEncerrarDto
CalendarioInternoAlterarDto
TagInternoAlterarDto
```

### Relatórios / Consultas Computadas
Não representam operação CRUD — descrevem um **recorte calculado**.
Fórmula: `Entidade + Recorte + Dto` — **sem verbo**:
```
PontoDiarioDto    ← resumo de ponto de um dia
PontoMensalDto    ← resumo de ponto de um mês
```
O DTO de parâmetros de entrada, quando existe, segue o padrão normal:
```
PontoDiarioConsultarDto
PontoMensalListarDto
```

### Value-Objects / Sub-estruturas
Estruturas reutilizáveis sem ciclo de vida próprio: apenas o **nome do conceito**, sem entidade nem verbo:
```
IntervaloDto    ← { inicioData, fimData, duracaoMinutos }
```

---

## Regras Absolutas

| Regra | ✅ Correto | ❌ Proibido |
|---|---|---|
| Palavra `Alterar`, nunca `Atualizar` | `UsuarioAlterarDto` | `UsuarioAtualizarDto` |
| Saída de listagem sempre `Resumo` | `UsuarioResumoDto` | `UsuarioListadoDto` |
| Recuperação individual sempre `{ id: number }` | `UsuarioRecuperarDto { id: number }` | parâmetro primitivo `id: number` |
| Toda operação com parâmetros usa DTO | `validarLogin(dto: UsuarioValidarLoginDto)` | `validarLogin(login: string)` |
| `id` de `@Param` injetado no DTO **pela controller** | `service.alterar({ ...dto, id })` | `service.alterar(id, dto)` |
| `extends` só de DTOs **core** | `class UsuarioListadosDto extends PaginatedResult<UsuarioResumoDto>` | `class X extends OutroDtoDeNegocio {}` |
| DTOs de negócio declaram os próprios campos | campos explícitos em cada classe | herança vazia entre DTOs de negócio |
| Nenhum DTO é alias ou re-export | — | `export { UsuarioCriarDto as UsuarioDto }` |

---

## Herança de DTOs

DTOs de negócio **nunca** estendem outros DTOs de negócio — cada um declara os próprios campos
explicitamente, mesmo que sejam idênticos. A única herança permitida é de DTOs **core**
(genéricos/arquiteturais do `shared/interfaces/`).

### ✅ Herança permitida — DTOs core
```typescript
// Listagem paginada: estende PaginatedResult com o DTO de item
export class UsuarioListadosDto extends PaginatedResult<UsuarioResumoDto> {}

// Resposta padrão: estende StandardResponse quando necessário
export class UsuarioCriadoDto extends StandardResponse<{ id: number }> {}
```

DTOs core são identificados por serem **genéricos e arquiteturais** — existiriam em qualquer projeto.
Exemplos: `PaginatedResult<T>`, `StandardResponse<T>`.

### ❌ Herança proibida — DTOs de negócio
```typescript
// Nunca um DTO de negócio estende outro DTO de negócio
export class UsuarioAlteradoDto extends UsuarioCriadoDto {}     // ❌
export class DemandaDetalheDto  extends DemandaResumoDto {}     // ❌
export class ProjetoAlterarDto  extends ProjetoCriarDto {}      // ❌

// Herança vazia entre DTOs de negócio também é proibida
export class ExecucaoIniciadaDto extends ExecucaoCriadaDto {}   // ❌
```

A razão: pares de DTOs (ex. `Criado`/`Alterado`) tendem a divergir ao longo do tempo.
Herança permanente entre eles cria acoplamento frágil e viola a regra de campos explícitos.

---

## Localização

```
shared/src/dtos/
  usuario/
  projeto/
  demanda/
  atividade/
  execucao/
  ponto/
  calendario/
  tag/
  assistente/
```

DTOs **nunca** são criados dentro de `backend/` ou `frontend/`.

### Import correto
```typescript
import { UsuarioCriarDto }  from '@project20/shared/dtos/usuario';
import { PontoDiarioDto }   from '@project20/shared/dtos/ponto';
import { IntervaloDto }     from '@project20/shared/dtos/ponto';
```

---

## Anti-padrões Frequentes

```
❌ UsuarioAtualizarDto          → ✅ UsuarioAlterarDto
❌ UsuarioListadoDto            → ✅ UsuarioResumoDto
❌ DemandaMembroAtribuirInternoDto → ✅ DemandaMembroInternoAtribuirDto
❌ ExecucaoEncerrarInternoDto   → ✅ ExecucaoInternoEncerrarDto
❌ DtoNegocio extends OutroDtoNegocio  → ✅ campos explícitos em cada DTO de negócio
❌ export class X extends Y {} (vazio entre negócio) → ✅ estender só DTOs core (PaginatedResult, StandardResponse)
❌ alterar(id: number, dados)   → ✅ alterar(dto: EntidadeInternoAlterarDto)
❌ DTO criado em backend/       → ✅ sempre em shared/src/dtos/[modulo]/
```
