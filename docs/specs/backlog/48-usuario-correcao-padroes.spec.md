# Task 48 — usuario: Correção de Padrões

## Objetivo

Corrigir os desvios de conformidade do módulo **usuario** identificados pela
auditoria da **task 44** (`docs/AUDITORIA.md` §4.1), e — por ser o módulo canônico —
**reconciliar a contradição documental §7.2 × §16 #21** registrada em
`docs/AUDITORIA.md` §5. Nenhuma mudança de comportamento: apenas conformidade de
assinatura + reforço documental.

> **Referência cruzada:** task 44 (auditoria) · `docs/AUDITORIA.md` §4.1 e §5.
> **Padrão de referência conforme:** `ExecucaoRepository.alterar(dto: ExecucaoAlterarInternoDto)`
> (`backend/src/modules/execucao/repositories/execucao.repository.ts:328`).

---

## Contexto

A task 20 ("Zero Primitivos") estabeleceu `recuperar(dto: EntidadeRecuperarDto)` e
converteu vários helpers, mas **não alcançou** o `alterar` do repositório de usuario,
que permaneceu recebendo o **primitivo `id`** e um **objeto anônimo inline**. Os
próprios critérios de verificação #3 e #4 da task 20 permanecem, portanto, não
atendidos para este método.

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
}): Promise<UsuarioAlteradoDto> { ... }
```

**Correção esperada:**
- Criar `shared/src/dtos/usuario/UsuarioAlterarInternoDto.ts`:
  ```typescript
  export class UsuarioAlterarInternoDto {
    id: number;
    nomeCompleto?: string;
    cargoTitulo?: string;
    anotacoes?: string;
    horasDiariasNecessarias?: number;
  }
  ```
- Exportar no barrel `shared/src/dtos/usuario/index.ts`.
- Mudar a assinatura para `async alterar(dto: UsuarioAlterarInternoDto): Promise<UsuarioAlteradoDto>`,
  lendo `dto.id` no `WHERE` e os demais campos no SET dinâmico (lógica de SQL inalterada).
- Atualizar a chamada em `UsuarioService.alterar` (`backend/src/modules/usuario/services/usuario.service.ts:94`)
  para montar e passar o DTO.
- Manter o JSDoc do método.

### 2. Reconciliação documental §7.2 × §16 #21 (cross-cutting — ver `docs/AUDITORIA.md` §5)

As services de CRUD recebem o `id` como primitivo (`recuperar(id)`, `alterar(id, dto)`,
`excluir(id)`, `alterarSenha(id, dto)`), seguindo o **exemplo de controller do §7.2**,
que contradiz o **§16 #21**. Esta spec **decide e documenta** a regra de forma
inequívoca (item obrigatório abaixo). A aplicação do que for decidido às assinaturas
de service de todos os módulos pode ser feita aqui (para usuario) e referenciada pelas
specs 49–53; **não reabrir** a discussão em cada uma.

> Decisão recomendada (a confirmar na implementação): o boundary **service** e
> **repository** não recebe `id` primitivo; o controller, ao extrair `@Param('id')`,
> monta o `EntidadeRecuperarDto`/`...AlterarInternoDto`. O §7.2 deve ser reescrito
> para refletir isso. Caso se decida o contrário (carve-out para o `id` de `@Param`),
> documentar explicitamente o carve-out no §16 #21.

---

## Atualização de Documentação (obrigatória)

1. **`CONVENTIONS.md`** — na tabela "Proibições — Resumo Rápido", acrescentar a linha:
   | `repository.alterar(id: number, dados)` — primitivo no `alterar` | `alterar(dto: EntidadeAlterarInternoDto)` — id dentro do DTO, como `recuperar(dto)` |
2. **`SYSTEM.SPEC.md` §7.4** — adicionar o par ✅/❌ mostrando `alterar(dto: UsuarioAlterarInternoDto)`
   (✅) versus `alterar(id: number, dados: {...})` (❌), citando que `alterar` segue a
   mesma regra DTO de `recuperar`.
3. **Reconciliação §7.2 × §16 #21** — reescrever o exemplo de controller do **§7.2**
   e/ou o texto do **§16 #21** de modo que deixem de se contradizer, conforme a decisão
   tomada no Escopo §2. Registrar a decisão em `docs/CONTEXT.md` (seção "Decisões Tomadas").

---

## Verificação

1. `npm run build --workspace=shared` — sem erros.
2. `npm run build --workspace=backend` — sem erros de TypeScript.
3. Checagem negativa: `UsuarioRepository.alterar` **não** recebe `id: number` nem objeto anônimo.
4. Checagem negativa: nenhum método de `usuario.repository.ts` recebe primitivo
   (`number`/`string`/`boolean`) como parâmetro de assinatura pública.
5. `SYSTEM.SPEC.md §7.2` e `§16 #21` **não se contradizem** após a edição.

---

## NÃO implementar nesta task

- Qualquer mudança nos módulos projeto/demanda/atividade/calendario/tag/ponto/core —
  cada um tem sua própria spec (49–55).
- Alterar comportamento, validações ou SQL do `alterar` — apenas a assinatura/DTO.
- Tocar no frontend (o `UsuarioService` Angular usa `id` na URL — fora do escopo do §16 #21).
