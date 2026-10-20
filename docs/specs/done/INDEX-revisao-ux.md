# Índice — tasks da Revisão de UI/UX (94–117)

Origem: `docs/specs/done/revisao-ui-ux/` (relatório, prints com callouts, mockups HTML e análise detalhada por tela).

## Ordem sugerida de implementação

**Fase 1 — Fundações transversais** (destravam e padronizam todas as demais):

| Task | Título | Esforço estimado |
|---|---|---|
| ~~94~~ | ~~Login: segurança da credencial + fluxo sem fricção~~ — **concluída** (`../done/`) | — |
| ~~95~~ | ~~Topbar: chip global de execução ativa~~ — **concluída** (`../done/`) | — |
| ~~96~~ | ~~Topbar: reorganização + atalhos globais~~ — **concluída** (`../done/`) | — |
| ~~97~~ | ~~Padrão único de formulário em dialogs~~ — **concluída** (`../done/`) | — |
| ~~98~~ | ~~Feedback otimista + skeletons~~ — **concluída** (`../done/`) | — |
| ~~99~~ | ~~Undo de exclusões (endpoint restaurar)~~ — **concluída** (`../done/`) | — |

**Fase 2 — Telas de maior frequência de uso:**

| Task | Título |
|---|---|
| ~~100~~ | ~~Ponto mensal: justificar inline, imprimir dev, saldo até hoje~~ — **concluída** (`../done/`) |
| ~~101~~ | ~~Ponto equipe: triagem e nome clicável~~ — **concluída** (`../done/`) |
| ~~102~~ | ~~Atividades: filtros persistentes, ações enxutas, massa~~ — **concluída** (`../done/`; descartada em 2026-10-16 e reativada em 2026-10-18) |
| ~~103~~ | ~~Atividades: dialogs de execução sem atrito~~ — **concluída** (`../done/`; descartada em 2026-10-16 e reativada em 2026-10-18) |
| ~~104~~ | ~~Atividade detalhe: timer, pausar/trocar em 1 clique~~ — **concluída** (`../done/`; descartada em 2026-10-16 e reativada em 2026-10-18) |
| ~~105~~ | ~~Nova Atividade: unificação + responsável/tags + IA~~ — **concluída** (`../done/`; descartada em 2026-10-16 e reativada em 2026-10-18) |

**Fase 3 — Demandas e Execuções:**

| Task | Título |
|---|---|
| ~~106~~ | ~~Demandas: busca/filtros, ações visíveis, contexto lembrado~~ — **concluída** (`../done/`) |
| ~~107~~ | ~~Demandas grafo: tema, hover-card, legenda-filtro~~ — **concluída** (`../done/`) |
| ~~108~~ | ~~Demanda detalhe: edição inline, tags/membros no cabeçalho~~ — **concluída** (`../done/`) |
| ~~109~~ | ~~Demanda: formulário unificado e adaptativo~~ — **concluída** (`../done/`) |
| ~~110~~ | ~~Execuções: contexto, linha ativa, teclado/URL~~ — **concluída** (`../done/`, reativada em 2026-10-17) |
| ~~111~~ | ~~Relatório: auto-preview, chips de período, IA habilitada~~ — **concluída** (`../done/`, reativada em 2026-10-17) |

**Fase 4 — Telas administrativas:**

| Task | Título |
|---|---|
| ~~112~~ | ~~Projetos: status inline, busca, resumo no detalhe~~ — **concluída** (`../done/`) |
| ~~113~~ | ~~Usuários: switch de status, ações diretas~~ — **concluída** (`../done/`) |
| ~~114~~ | ~~Anotações: drawer com auto-save (supera o confirm da spec 84)~~ — **concluída** (`../done/`) |
| ~~115~~ | ~~Calendário: criação pelo clique no dia~~ — **concluída** (`../done/`) |
| ~~116~~ | ~~Tags: quick-add e cor inline~~ — **concluída** (`../done/`) |

## Descartadas (2026-10-16) e depois reativadas

Decisão do autor em 2026-10-16: tudo que mexe **diretamente** nas telas de Atividades fica de fora —
**102, 103, 104 e 105**. **Em 2026-10-17 o autor reativou as tasks da tela de
Execuções (110 e 111)** e **em 2026-10-18 as de Atividades (102–105)**; todas foram implementadas e estão em `done/`. O que mexe nelas só
indiretamente continua na lista (97, 98, 99, 95, 96, 108, 116 e as demais). Nenhuma task restante depende de uma descartada.

## Dependências entre tasks

- 97/98/99 (concluídas em 2026-10-16) eram pré-requisitos citados pela maioria das tasks das fases 2–4: o
  padrão de dialogs (`dialogFormulario`), o feedback otimista/esqueletos (`app-skeleton-lista`,
  `app-barra-recarga`) e o "Desfazer" (`DesfazerService`) já existem e devem ser reutilizados.
- 95 → 96 (layout). (~~95 → 104~~: a 104 foi descartada.)
- 106 → 107; 96 → 114. 110 → 111 (ambas concluídas).
- Única task com mudança de backend estrutural foi a **99** (endpoints `restaurar`, já feita); 104 pede apenas 2 campos a mais num DTO de leitura.

## Observações de organização (2026-10-16)

- Os arquivos da revisão vivem em `revisao-ui-ux/`, dona: [`revisao-ui-ux.spec.md`](revisao-ui-ux.spec.md).
  Os prints estão em `docs/assets/revisao-ui-ux/prints/`.
- A task **117** (remover a descrição da atividade) não pertence à revisão; foi renumerada de 94
  para 117 por colisão com a 94 desta revisão.
