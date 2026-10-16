# 99 — Exclusões com "Desfazer": endpoint de restauração + toasts com undo

**Origem:** Revisão de UI/UX — achado global G4 (`docs/reviews/ui-ux/README.md`, seção 4 "Notas de verificação")

**Depende de:** 98 (remoção otimista)

**Entrega:** exclusão de registros passa a ser imediata (sem confirm dialog) com toast de 6s "**X excluído — Desfazer**"; o Desfazer restaura o registro. Onde a remoção é uma associação (membro/conexão/tag de atividade), o undo é um re-POST/PUT (sem backend novo). Para entidades soft-deletadas, criar **endpoint de restauração**.

> **Backend + shared + frontend.** O sistema é 100% soft delete — o dado nunca se perde; falta só o caminho de volta.

---

## Backend

- Novo endpoint `PATCH /:id/restaurar` (`@GestorOnly` onde a exclusão é gestor-only) nos módulos: atividade, projeto, usuario, tag, calendario (dia não útil), demanda. Repositório: `UPDATE ... SET is_deleted = false WHERE id = :id AND is_deleted = true RETURNING ...` (respeitando o padrão `BaseRepository`/SQL do projeto — sem DELETE físico, sem `?` posicional).
- Regras: restaurar demanda **não** restaura filhos em cascata (escopo mínimo); validar unicidade onde aplicável (ex.: nome de tag/código de projeto recriado no intervalo → 400 com mensagem clara).

## Frontend

- Substituir os `p-confirmDialog` de exclusão por remoção otimista + toast com ação "Desfazer" (6s). Exceção mantida com confirm: **excluir demanda** (efeito em cascata na árvore) — mas com texto honesto: "Sub-demandas e atividades deixarão de ser exibidas" (remover o falso "não pode ser desfeita").
- Remoções de associação (membro da demanda, conexão, sair da demanda): imediato + undo por re-POST (endpoints existentes).

## Critérios de aceite

- Excluir e desfazer uma atividade/tag/projeto restaura o registro idêntico (mesmo id).
- Excluir sem clicar em Desfazer mantém o comportamento atual de soft delete.

## NÃO implementar nesta task

- Restauração em cascata de hierarquias; lixeira/listagem de excluídos.
