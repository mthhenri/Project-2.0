# 31 — Atividade: clique na linha não abre a visualização

**Depende de:** 27 (frontend-atividade)
**Entrega:** na listagem de atividades, a visualização passa a abrir apenas pelo ícone de olho — clicar na linha não abre mais nada.

> Frontend apenas. Sem backend, sem shared.

---

## Contexto

Em [atividade-listagem.page.html](../../../frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.html), cada linha da tabela tem hoje:

```html
<tr class="atividade-listagem__linha" (click)="abrirAtividade(atividade)">
```

Ou seja, **clicar em qualquer lugar da linha** abre a dialog de visualização. O ícone de olho
(`pi pi-eye`) na coluna de ações já chama o mesmo `abrirAtividade(...)`.

---

## Comportamento esperado

- Remover o `(click)="abrirAtividade(atividade)"` do `<tr>`.
- A visualização passa a abrir **apenas** pelo ícone de olho já existente na coluna de ações.
- A célula de ações usa `(click)="$event.stopPropagation()"` para não propagar o clique à linha; como a linha não tem mais handler, esse `stopPropagation` pode ser mantido (inócuo) ou removido — preferir remover para não deixar código morto.
- Remover também estilos de hover/cursor que sugiram que a linha inteira é clicável (classe `atividade-listagem__linha`), se existirem, para não confundir o usuário.

---

## Arquivos afetados

```
frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.html
frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.scss   (se houver estilo de linha clicável)
```

---

## NÃO implementar nesta task

- Qualquer mudança no conteúdo ou comportamento da dialog de visualização em si.
- Mudanças nas demais ações da coluna (play/pause, excluir).
