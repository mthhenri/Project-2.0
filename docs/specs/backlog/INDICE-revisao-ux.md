# Índice — tasks da Revisão de UI/UX (94–116)

Origem: `docs/reviews/ui-ux/` (relatório, prints com callouts, mockups HTML e análise detalhada por tela).

## Ordem sugerida de implementação

**Fase 1 — Fundações transversais** (destravam e padronizam todas as demais):

| Task | Título | Esforço estimado |
|---|---|---|
| 94 | Login: segurança da credencial + fluxo sem fricção | M |
| 95 | Topbar: chip global de execução ativa | M |
| 96 | Topbar: reorganização + atalhos globais | M |
| 97 | Padrão único de formulário em dialogs | M (mecânica, muitos arquivos) |
| 98 | Feedback otimista + skeletons | M/G |
| 99 | Undo de exclusões (endpoint restaurar) — **única com backend relevante** | M |

**Fase 2 — Telas de maior frequência de uso:**

| Task | Título |
|---|---|
| 100 | Ponto mensal: justificar inline, imprimir dev, saldo até hoje |
| 101 | Ponto equipe: triagem e nome clicável |
| 102 | Atividades: filtros persistentes, ações enxutas, massa |
| 103 | Atividades: dialogs de execução sem atrito |
| 104 | Atividade detalhe: timer, pausar/trocar em 1 clique |
| 105 | Nova Atividade: unificação + responsável/tags + IA |

**Fase 3 — Demandas e Execuções:**

| Task | Título |
|---|---|
| 106 | Demandas: busca/filtros, ações visíveis, contexto lembrado |
| 107 | Demandas grafo: tema, hover-card, legenda-filtro |
| 108 | Demanda detalhe: edição inline, tags/membros no cabeçalho |
| 109 | Demanda: formulário unificado e adaptativo |
| 110 | Execuções: contexto, linha ativa, teclado/URL |
| 111 | Relatório: auto-preview, chips de período, IA habilitada |

**Fase 4 — Telas administrativas:**

| Task | Título |
|---|---|
| 112 | Projetos: status inline, busca, resumo no detalhe |
| 113 | Usuários: switch de status, ações diretas |
| 114 | Anotações: drawer com auto-save (supera o confirm da spec 84) |
| 115 | Calendário: criação pelo clique no dia |
| 116 | Tags: quick-add e cor inline |

## Dependências entre tasks

- 97/98/99 são pré-requisitos citados pela maioria das tasks das fases 2–4.
- 95 → 96 (layout) e 95 → 104 (signal compartilhado de execução).
- 106 → 107; 110 → 111; 96 → 114.
- Única task com mudança de backend estrutural: **99** (endpoints `restaurar`); 104 pede apenas 2 campos a mais num DTO de leitura.
