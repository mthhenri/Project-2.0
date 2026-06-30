# 85 — Seletor de Demanda Pai: exibir apenas demandas estruturais

**Depende de:** 10 (demanda CRUD), 11 (hierarquia), 26 (frontend demanda)
**Entrega:** frontend apenas — sem backend, sem shared, sem migration

---

## Problema

No cadastro e na edição de demandas, o seletor de **Demanda Pai** carrega todas as demandas do
projeto (`isEstrutural: true` e `false`), incluindo demandas operacionais/folhas que não podem
ser pai de outras. Apenas demandas estruturais (`isEstrutural = true`) devem aparecer como opção
de pai — isso é consistente com a regra de negócio que usa o campo `isEstrutural` para distinguir
nós de estrutura (galhos) de folhas de trabalho.

O campo `isEstrutural?: boolean` já existe em `DemandaListarDto` e é suportado pelo backend;
o filtro precisa ser ativado apenas no frontend.

---

## Escopo

### Arquivos a alterar (apenas frontend)

| Arquivo | Mudança |
|---|---|
| `frontend/src/app/modules/demanda/components/demanda-formulario-dialog/demanda-formulario-dialog.component.ts` | `carregarDemandasPai()`: adicionar `isEstrutural: true` na chamada `listar()` |
| `frontend/src/app/modules/demanda/components/demanda-edicao-dialog/demanda-edicao-dialog.component.ts` | `carregarDemandasPai()`: adicionar `isEstrutural: true` na chamada `listar()` |

---

## Implementação

### `demanda-formulario-dialog.component.ts` — `carregarDemandasPai()`

```typescript
// Antes
private carregarDemandasPai(): void {
  this.demandaService
    .listar({ projetoId: this.projetoId, itensPorPagina: 200 })
    .subscribe({ ... });
}

// Depois
private carregarDemandasPai(): void {
  this.demandaService
    .listar({ projetoId: this.projetoId, isEstrutural: true, itensPorPagina: 200 })
    .subscribe({ ... });
}
```

### `demanda-edicao-dialog.component.ts` — `carregarDemandasPai()`

```typescript
// Antes
private carregarDemandasPai(): void {
  this.demandaService
    .listar({ projetoId: this.projetoId, itensPorPagina: 200 })
    .subscribe({ ... });
}

// Depois
private carregarDemandasPai(): void {
  this.demandaService
    .listar({ projetoId: this.projetoId, isEstrutural: true, itensPorPagina: 200 })
    .subscribe({ ... });
}
```

> O filtro `demanda.id !== this.demandaId` existente no `demanda-edicao-dialog` deve ser mantido
> (evita que a própria demanda apareça como opção de pai de si mesma).

---

## Verificação

1. `npm run build --workspace=frontend` — sem erros.
2. No formulário de criação de demanda, o seletor de Demanda Pai exibe apenas demandas com
   `isEstrutural = true` do projeto.
3. No diálogo de edição de demanda, o mesmo seletor também exibe apenas demandas estruturais
   (excluindo a própria demanda).
4. Demandas não-estruturais (`isEstrutural = false`) não aparecem como opção de pai em nenhum
   dos dois dialogs.
