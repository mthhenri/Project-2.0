# 102 — Atividades: filtros persistentes, ações enxutas e ações em massa

**Origem:** Revisão de UI/UX — print `prints/06-atividade-listagem.png`, análise `analise-detalhada/atividade-listagem.md`

**Depende de:** 98 (update otimista), 99 (excluir com undo), 97 (dialogs)

**Entrega:** listagem de Atividades com filtros serializados na URL, chip-toggle "Minhas atividades", chip de contexto de demanda removível, coluna de ações reduzida a Play/Pause + Visualizar + kebab ⋮, indicador único de documentos da demanda e seleção múltipla com barra de ações em massa (gestor).

> **Frontend apenas.**

---

## Escopo

1. **Filtros na URL** (`?busca=&status=&usuarioId=&periodo=`), restaurados ao voltar; debounce 400ms na busca; "Limpar filtros (N)" só aparece com filtro fora do default; chip removível "Demanda: X ✕" quando houver `?demandaId`; chip-toggle "Minhas atividades" (gestor) aplica `usuarioId = eu`.
2. **Ações da linha**: Play/Pause maior (primário-suave; quando o status não permite iniciar → **disabled com tooltip** "Mude o status para Planejada ou Desenvolvendo", em vez de `visibility:hidden`), Visualizar, e kebab ⋮ com Atribuir tags / Registrar execução (gestor) / Excluir (gestor). Tags viram popover inline na célula (chips, salva ao fechar — padrão já usado).
3. **Indicador de documentos**: os 3 icon-buttons por linha viram 1 ícone `pi-file` com até 3 pontinhos coloridos; clique abre popover nomeado; dialog de leitura passa de 95vw para 56rem/80vh.
4. **Linha em execução**: destaque de fundo + tag com cronômetro (o global fica no chip da topbar — task 95).
5. **Seleção múltipla (gestor)**: checkbox por linha + barra flutuante "N selecionadas — Mudar status · Atribuir tags · Excluir" (itera os endpoints existentes por item).
6. **Empty states**: sem registros → CTA "Nova Atividade"; com filtros → "Limpar filtros" + "Nova Atividade".
7. Atalhos: `/` foca busca, `N` abre Nova Atividade.

## Critérios de aceite

- Sair e voltar à tela preserva todos os filtros; "Minhas" em 1 clique.
- Mudar status de 5 atividades: ≤4 interações via barra em massa.
- Play indisponível explica o porquê no tooltip.

## NÃO implementar nesta task

- Dialogs de execução (103) e unificação do formulário de criação (105).
