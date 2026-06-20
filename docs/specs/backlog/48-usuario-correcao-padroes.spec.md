# Task 48 — usuario: Correção de Padrões

## Objetivo

Corrigir os desvios de conformidade do módulo **usuario** identificados pela
auditoria da **task 44** (`docs/AUDITORIA.md` §4.1 e §8 — errata), e — por ser o
módulo canônico — **reconciliar a contradição documental §7.2 × §16 #21** registrada
em `docs/AUDITORIA.md` §5. Nenhuma mudança de comportamento: apenas conformidade de
assinatura/nomenclatura + reforço documental.

> **Referência cruzada:** task 44 (auditoria) · `docs/AUDITORIA.md` §4.1, §5 e §8.
> **Padrão estrutural (param único DTO):** `ExecucaoRepository.alterar(dto)`
> (`backend/src/modules/execucao/repositories/execucao.repository.ts:328`).
> **Padrão de nomenclatura (verbo no fim — SPEC §5, linhas 149-155):**
> `DemandaMembroInternoAtribuirDto`. ⚠️ Os nomes `ExecucaoAlterarInternoDto` /
> `ExecucaoEncerrarInternoDto` **violam** a regra (verbo antes de `Interno`) e são
> corrigidos na spec `56-execucao-correcao-padroes` — **não** copiar a ordem deles.

---

## Contexto

A task 20 ("Zero Primitivos") estabeleceu `recuperar(dto: EntidadeRecuperarDto)` e
converteu vários helpers, mas **não alcançou** o `alterar` do repositório de usuario,
que permaneceu recebendo o **primitivo `id`** e um **objeto anônimo inline**. Os
próprios critérios de verificação #3 e #4 da task 20 permanecem, portanto, não
atendidos para este método.

Além disso, a errata da auditoria (`docs/AUDITORIA.md` §8) constatou que
`UsuarioAlterarSenhaInternoDto` **viola a regra de nomenclatura do §5** (o verbo
`Alterar` aparece no meio do complemento, antes de `Senha`/`Interno`). O nome correto
é `UsuarioSenhaInternoAlterarDto` (complemento `SenhaInterno` antes do verbo `Alterar`).

---

## Escopo

### 1. `UsuarioRepository.alterar` — eliminar primitivo e objeto anônimo

**Arquivo:** `backend/src/modules/usuario/repositories/usuario.repository.ts:171`

**Situação atual:**
```typescript
async alterar(id: number, dados: {
  nomeCompleto?: string;
  cargoTitulo?: string;
  anotacoes?: string;
  horasDiariasNecessarias?: number;
  status?: UsuarioStatusEnum;
}): Promise<UsuarioAlteradoDto> { ... }
```

**Correção esperada:**
- Criar `shared/src/dtos/usuario/UsuarioInternoAlterarDto.ts` (nome no padrão
  **verbo-no-fim** do §5: complemento `Interno` antes do verbo `Alterar`):
  ```typescript
  import { UsuarioStatusEnum } from '../../enums/usuario-status.enum';

  export class UsuarioInternoAlterarDto {
    id: number;
    nomeCompleto?: string;
    cargoTitulo?: string;
    anotacoes?: string;
    horasDiariasNecessarias?: number;
    status?: UsuarioStatusEnum;
  }
  ```
  > ⚠️ Espelhar **exatamente** os campos hoje lidos no SET dinâmico do `alterar` — são
  > **cinco**, incluindo `status?: UsuarioStatusEnum` (que flui de `UsuarioAlterarDto` e
  > é gravado em `usuario.repository.ts:197-200`). **Não** omitir `status`.
- Exportar no barrel `shared/src/dtos/usuario/index.ts`.
- Mudar a assinatura para `async alterar(dto: UsuarioInternoAlterarDto): Promise<UsuarioAlteradoDto>`,
  lendo `dto.id` no `WHERE` e os demais campos no SET dinâmico (lógica de SQL inalterada).
- Atualizar a chamada em `UsuarioService.alterar` (`backend/src/modules/usuario/services/usuario.service.ts:105`)
  para montar e passar o DTO (`{ id, ...dto }`).
- Manter o JSDoc do método.

### 2. `UsuarioAlterarSenhaInternoDto` → `UsuarioSenhaInternoAlterarDto` (errata §8)

**Violação de nomenclatura (§5):** verbo `Alterar` antes do complemento `SenhaInterno`.

**Correção esperada:**
- Renomear o arquivo/classe `shared/src/dtos/usuario/UsuarioAlterarSenhaInternoDto.ts`
  → `shared/src/dtos/usuario/UsuarioSenhaInternoAlterarDto.ts` (classe `UsuarioSenhaInternoAlterarDto`).
- Atualizar o barrel `shared/src/dtos/usuario/index.ts:12`.
- Atualizar o import e o uso em `backend/src/modules/usuario/repositories/usuario.repository.ts:14,223`
  (`alterarSenha(dto: UsuarioSenhaInternoAlterarDto)`).
- Sem mudança de campos nem de comportamento — apenas o nome.

### 3. Boundary controller→service DTO-only (decisão da reconciliação §7.2 × §16 #21)

**Decisão tomada (cross-cutting — `docs/AUDITORIA.md` §5):** padronizar **DTO em tudo**.
Service e repository **nunca** recebem `id`/`*Id` primitivo; o controller é o único ponto
autorizado a montar o DTO — ao extrair `@Param('id')` (ou `@Query`), injeta o id no DTO
antes de repassar. Objetos de contexto (`usuarioAtivo: JwtPayload` de `@ActiveUser()`)
**não** são primitivos e permanecem como parâmetro próprio. O §7.2, §7.4 e §16 #21 do
`SYSTEM.SPEC.md` já foram reescritos para refletir isto (esta spec apenas aplica ao código
de usuario). As specs 49–53 e 56 aplicam o mesmo padrão aos seus módulos referenciando
esta decisão — **não reabrir** a discussão em cada uma.

As services de CRUD de usuario recebem o `id` como primitivo:
`recuperar(id, usuarioAtivo)`, `alterar(id, dto, usuarioAtivo)`, `excluir(id)`,
`alterarSenha(id, dto)` (`backend/src/modules/usuario/services/usuario.service.ts:75,94,115,131`).

**Correção esperada (usuario):**
- `UsuarioService`:
  - `recuperar(dto: UsuarioRecuperarDto, usuarioAtivo)` — lê `dto.id`.
  - `alterar(dto: UsuarioInternoAlterarDto, usuarioAtivo)` — o mesmo DTO interno do item §1; `dto.id` é o alvo.
  - `excluir(dto: UsuarioRecuperarDto)` — reutiliza `{ id }`.
  - `alterarSenha(dto: UsuarioSenhaInternoAlterarDto)` — id dentro do DTO (item §2).
- `UsuarioController` (`backend/src/modules/usuario/controllers/usuario.controller.ts:124,148,172,192`):
  monta o DTO a partir de `@Param('id')` — `recuperar({ id }, usuarioAtivo)`,
  `alterar({ ...dto, id }, usuarioAtivo)`, `excluir({ id })`,
  `alterarSenha({ ...dto, id })`. Nenhuma outra lógica.
- Sem mudança de validação, regra ou SQL — apenas o formato da assinatura.

---

## Atualização de Documentação (obrigatória)

1. **`CONVENTIONS.md`** — na tabela "Proibições — Resumo Rápido", acrescentar a linha:
   | `repository.alterar(id: number, dados)` — primitivo no `alterar` | `alterar(dto: EntidadeInternoAlterarDto)` — id dentro do DTO, como `recuperar(dto)` |
2. **`SYSTEM.SPEC.md` §7.4** — adicionar o par ✅/❌ mostrando `alterar(dto: UsuarioInternoAlterarDto)`
   (✅) versus `alterar(id: number, dados: {...})` (❌), citando que `alterar` segue a
   mesma regra DTO de `recuperar`.
3. **Reforço da regra de nomenclatura §5 (verbo no fim)** — confirmar que o exemplo
   `EntidadeInternoAlterarDto` ✅ / `EntidadeAlterarInternoDto` ❌ está coberto pelos
   exemplos do §5 (linhas 149-155); se necessário, acrescentar o caso do qualificador
   `Interno` **sem** outro complemento (`UsuarioInternoAlterarDto`).
4. **Reconciliação §7.2 × §16 #21** — **já aplicada** no `SYSTEM.SPEC.md` (§7.2 reescrito
   com a microinteligência do controller, §7.4 com o par `alterar(dto)` ✅/❌, §16 #21
   esclarecido) e no `CONVENTIONS.md` (exemplos de controller/service + linhas na tabela
   de proibições). Resta **registrar a decisão em `docs/CONTEXT.md`** (seção "Decisões
   Tomadas"): "DTO em tudo — controller injeta o `id` de `@Param`/`@Query` no DTO; service
   e repository nunca recebem primitivo".

---

## Verificação

1. `npm run build --workspace=shared` — sem erros.
2. `npm run build --workspace=backend` — sem erros de TypeScript.
3. Checagem negativa: `UsuarioRepository.alterar` **não** recebe `id: number` nem objeto anônimo.
4. Checagem negativa: nenhum método de `usuario.repository.ts` recebe primitivo
   (`number`/`string`/`boolean`) como parâmetro de assinatura pública.
5. `UsuarioInternoAlterarDto` expõe os **cinco** campos opcionais (incl. `status`) +
   `id` — o `alterar` continua podendo gravar `status` (sem regressão).
6. Nenhum DTO de usuario tem o verbo no meio do complemento: `grep -r "AlterarInternoDto\|AlterarSenhaInternoDto" shared/src/dtos/usuario` não retorna nada.
7. `SYSTEM.SPEC.md §7.2` e `§16 #21` **não se contradizem** após a edição.
8. Checagem negativa (boundary controller→service): nenhum método de `UsuarioService`
   recebe `id: number` solto — `recuperar`/`alterar`/`excluir`/`alterarSenha` recebem DTO.
   O `UsuarioController` monta o DTO a partir de `@Param('id')`; nenhuma outra lógica.

---

## NÃO implementar nesta task

- Qualquer mudança nos módulos projeto/demanda/atividade/calendario/tag/ponto/core/execucao —
  cada um tem sua própria spec (49–56).
- Alterar comportamento, validações ou SQL do `alterar` — apenas a assinatura/DTO/nome.
- Tocar no frontend (o `UsuarioService` Angular usa `id` na URL — fora do escopo do §16 #21).
