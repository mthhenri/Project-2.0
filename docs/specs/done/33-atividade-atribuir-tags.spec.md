# 33 — Atividade: atribuir tags na listagem

**Depende de:** 27 (frontend-atividade)
**Entrega:** botão de atribuir tags na coluna de ações da listagem de atividades; o executor pode taguear as próprias atividades (ajuste de permissão no backend).

> Frontend + um ajuste de permissão no backend.

---

## Princípio de UX

A atribuição de tags acontece **na própria listagem**, via dialog/popover — sem navegar para
outra tela/rota.

---

## Contexto

Hoje a listagem mostra as tags apenas como chips (coluna **Tags**), sem ação para editá-las.
Já existem no frontend:
- `AtividadeService.alterarTags(id, { tagIds })` e `AtividadeService.listarTags(id)`;
- `tagsPorAtividade()` no componente, com as tags já carregadas por atividade.

O `TagService` (módulo tag, `providedIn: 'root'`) tem `listar()` para obter todas as tags.

**Decisão de produto:** o desenvolvedor dono da atividade pode atribuir tags às **suas** atividades
(mesma regra de `alterar`). Hoje o endpoint `PUT /atividade/:id/tag` é `@GestorOnly`.

---

## Comportamento esperado (frontend)

- Adicionar um botão na coluna **Ações** com ícone de "+" em círculo (`pi pi-plus-circle`), tooltip "Atribuir tags".
- Visível para gestor **ou** desenvolvedor dono da atividade (`atividade.usuarioId === sessao.id()` — mesmo helper de edição usado na task 32).
- Ao clicar, abrir uma dialog (ou `p-popover`) com um `p-multiSelect` de **todas as tags disponíveis**:
  - carregar via `TagService.listar()` (injetar `TagService`);
  - pré-selecionar as tags atuais da atividade (de `tagsPorAtividade()[atividade.id]` ou `listarTags(id)`);
  - exibir cada opção com bolinha de cor + nome, no estilo dos chips já usados.
- Salvar via `AtividadeService.alterarTags(id, { tagIds })`:
  - em sucesso, recarregar as tags daquela atividade (`listarTags`) e atualizar `tagsPorAtividade`, exibir toast e fechar.

---

## Ajuste no Backend (permissão)

Em [atividade.controller.ts](../../../backend/src/modules/atividade/controllers/atividade.controller.ts) (`PUT :id/tag`):
- remover o decorator `@GestorOnly()`;
- injetar `@ActiveUser() usuarioAtivo: JwtPayload` e repassá-lo a `alterarTags`;
- atualizar `@ApiOperation`/`@ApiResponse` (deixou de ser "somente gestor").

Em [atividade.service.ts](../../../backend/src/modules/atividade/services/atividade.service.ts) (`alterarTags`):
- receber `usuarioAtivo: JwtPayload` como parâmetro;
- após `recuperar({ id })`, aplicar a **mesma** verificação de autorização já presente em `alterar()` (linhas ~159–171): quando `usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR`, exigir ser autor (`atividade.usuarioId === usuarioAtivo.sub`) **ou** ter acesso à demanda (`validarAcessoDemanda`), senão lançar `UnauthorizedAccessException`; gestor continua liberado.

> Reaproveitar exatamente o bloco de autorização de `alterar()` para manter consistência. Sem mudança em DTO, repositório ou migrations.

---

## Arquivos afetados

```
backend/src/modules/atividade/controllers/atividade.controller.ts   (PUT :id/tag: -@GestorOnly, +@ActiveUser)
backend/src/modules/atividade/services/atividade.service.ts          (alterarTags: +autorização autor-ou-membro)

frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts
frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.html
frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.scss   (se necessário)
```

---

## NÃO implementar nesta task

- Criação de novas tags a partir da listagem (apenas atribui tags existentes — criação continua na tela de tags).
- Filtro da listagem por tag.
- Edição de tags dentro da dialog de visualização.
