# 115 — Calendário: criação pelo clique no dia, popover de registro e navegação rápida

**Origem:** Revisão de UI/UX — print `prints/24-calendario.png`, análise `analise-detalhada/calendario.md`

**Depende de:** 97

**Entrega:** o calendário deixa de ser só visualização: clique em dia vazio abre o dialog de criação com a **data preenchida** (foco na Descrição); clique em dia marcado abre **popover** com resumo + Editar/Excluir (e destaca a linha na tabela); navegação com "Hoje" + stepper de ano; legenda fixa; tabela com badges compactos.

> **Frontend apenas.** DTOs mantidos (`diaData` imutável na edição).

---

## Escopo

1. Célula de dia (gestor): hover com `+` fantasma; clique vazio → dialog com Data = dia clicado; clique em marcado → popover (nome, data, badges, Editar/Excluir).
2. Barra: "Hoje" + stepper `‹ 2026 ›` (mantém o mês); título do mês clicável (overlay mês/ano do PrimeNG).
3. Legenda sob o calendário: ● Feriado ● Recesso ● Ponto Facultativo ○ anel = meio período (mesma codificação nas células).
4. Tabela: Data "qui, 24/12"; colunas Duração/Recorrente fundidas em badges na célula Tipo ("Meio período" e "↻ Todo ano" só quando aplicáveis); ações sempre visíveis; linha destacada quando selecionada pelo calendário.
5. Dialog: autofocus na Descrição quando a Data veio preenchida; "Salvar e adicionar outro" (mantém Tipo/Duração/Recorrente, limpa Data/Descrição); na edição, hint "A data não pode ser alterada… **Excluir e recriar**" (link exclui e reabre a criação pré-preenchida, só a data editável).
6. Empty do mês: CTA "Cadastrar dia não útil" (datepicker no mês exibido) + dica "ou clique em um dia no calendário".

## Critérios de aceite

- Cadastrar feriado num dia visto no calendário: clique no dia + descrição + Enter.
- Corrigir a data de um registro: 3 cliques via "Excluir e recriar", sem redigitar.
- Dezembro do ano seguinte: 2 cliques.

## NÃO implementar nesta task

- Alterar `DiaNaoUtilAlterarDto` para aceitar data (contorno via excluir+recriar).
