# 111 — Relatório de execuções: preview automático, chips de período e revisão IA

**Origem:** Revisão de UI/UX — print `prints/15-relatorio-dialog.png`, análise `analise-detalhada/execucao-historico.md`

**Depende de:** 110 (ponto de entrada no header de Execuções)

**Entrega:** dialog de relatório que abre **já carregado** (defaults Mensal/mês atual são sempre válidos), recarrega a cada mudança de filtro com o resultado antigo esmaecido (nunca dados obsoletos como atuais), períodos em chips de 1 clique, "Baixar CSV" como ação primária e **"Revisar com IA" habilitado** (endpoint `POST /relatorio/execucao/revisar` e DTOs já existem) com achados priorizados.

> **Frontend apenas.** Contratos mantidos (`projetoId` obrigatório, períodos ANUAL/MENSAL/CUSTOM, CSV).

---

## Escopo

1. Select "Projeto" com busca como primeiro campo (pré-selecionado quando aberto do detalhe do projeto; selecionável quando aberto de Execuções).
2. Chips: "Este mês" (default) · "Mês passado" · "Este ano" · "Personalizado…" (revela o range); selects Ano/Mês como ajuste fino.
3. Auto-preview ao abrir e a cada filtro (debounce ~400ms); botão "Pré-visualizar" removido; durante refetch, opacidade 50% + progresso; totais como stat-tiles.
4. "Revisar com IA": habilitar o botão; apresentar resumo + contadores por severidade (`N ALTA · N MÉDIA · N BAIXA`) + cards ordenados ALTA→BAIXA (`RelatorioRevisaoDto` como está). Remover o botão "Fechar" do rodapé (X/Esc bastam).

## Critérios de aceite

- Abrir o dialog já mostra o mês atual; "Mês passado" = 1 clique.
- Impossível baixar CSV de período diferente do exibido.

## NÃO implementar nesta task

- Links clicáveis dos achados da IA para linhas (a `referencia` é texto livre).
