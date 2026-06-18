# 32 — Atividade: mudar status pelo chip (inline)

**Depende de:** 27 (frontend-atividade)
**Entrega:** na listagem de atividades, o chip de status fica clicável e permite trocar o status da atividade sem sair da listagem.

> Frontend apenas. O backend já suporta a alteração de status (nenhuma mudança necessária).

---

## Princípio de UX

A troca de status acontece **na própria listagem**, via popover/select inline — sem navegar
para outra tela/rota. Manter o contexto da listagem.

---

## Contexto

Em [atividade-listagem.page.html](../../../frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.html), a coluna **Status** exibe um `p-tag` somente leitura:

```html
<p-tag [value]="rotuloStatus(atividade.status)" [severity]="severidadeStatus(atividade.status)" />
```

As opções de status estão em `ATIVIDADE_STATUS_OPCOES` ([atividade.model.ts](../../../frontend/src/app/modules/atividade/models/atividade.model.ts)):
Planejada, Pendente, Desenvolvendo, Desenvolvida.

O backend já aceita `status` em `AtividadeAlterarDto` via `PUT /atividade/:id`, e `AtividadeService.alterar`
já aplica a regra autor-ou-membro para desenvolvedor — **nenhuma mudança de backend**.

---

## Comportamento esperado

- O `p-tag` de status passa a ser clicável (cursor de ponteiro) **para quem pode editar a atividade**.
- Ao clicar, abre um seletor de status (ex.: `p-popover`/`p-overlayPanel` com a lista, ou `p-select` inline) com as 4 opções de `ATIVIDADE_STATUS_OPCOES`, destacando o status atual.
- Ao escolher um status diferente, chamar `AtividadeService.alterar(id, { status })`:
  - em sucesso, atualizar o status da linha no signal `atividades()` (sem refazer a busca inteira) e exibir toast de sucesso;
  - em erro, manter o status anterior (o `errorHandlerInterceptor` já exibe o toast de erro).
- **Quem pode mudar:** gestor, ou desenvolvedor dono da atividade (`atividade.usuarioId === sessao.id()`). Reutilizar a lógica de `podeExecutar(atividade)` ou extrair um helper `podeEditar(atividade)` com a mesma regra.
- Para quem não pode editar, o chip permanece como hoje (somente leitura, sem cursor de ponteiro).

---

## Arquivos afetados

```
frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts
frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.html
frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.scss   (se necessário)
```

---

## NÃO implementar nesta task

- Mudança de status em lote (várias atividades de uma vez).
- Edição de status dentro da dialog de visualização.
- Qualquer alteração de backend.
