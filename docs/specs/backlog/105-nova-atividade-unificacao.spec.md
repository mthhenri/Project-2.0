# 105 — Nova Atividade: unificar página e dialog + responsável/tags + IA confiável

**Origem:** Revisão de UI/UX — prints `prints/16-atividade-formulario.png` e `prints/17-assistente-ia-dialog.png`, análises `atividade-formulario.md`

**Depende de:** 97

**Entrega:** um único componente de formulário de criação de atividade compartilhado entre o dialog da listagem e a rota `/atividade/nova` (deep-link com `?demandaId`), expondo **Responsável** (gestor) e **Tags** (o `AtividadeCriarDto` já aceita `usuarioId` e `tagIds`), status em botões segmentados com default único **Desenvolvendo**, "Salvar e criar outra" e assistente de IA alinhado ao contrato do backend.

> **Frontend apenas.**

---

## Escopo

1. **Unificação**: extrair o formulário do dialog da listagem (que já tem seletor de demanda com busca e pré-seleção via `?demandaId`) para componente compartilhado; `/atividade/nova` passa a usá-lo. Sem `demandaId`, o seletor fica vazio, focado, com hint inline — nunca beco sem saída com toast tardio.
2. **Campos novos na criação**: Responsável (select com busca, só gestor, default "Eu mesmo") e Tags (chips clicáveis, mesmo padrão da listagem).
3. **Status**: botões segmentados (Pendente | Planejada | Desenvolvendo | Desenvolvida), default Desenvolvendo nos dois pontos de entrada.
4. **"Salvar e criar outra"**: mantém Demanda/Status/Responsável/Tags, limpa Nome/Descrição, refoca o Nome; toast com link "Ver atividade".
5. **Assistente IA**: botão habilita só com ≥10 caracteres (tooltip explica — o DTO exige `MinLength(10)`); `contextoEntidade` sempre preenchido (nome da demanda ou da atividade); resultado em dialog com sugestão em **textarea editável**, "Regenerar" e, pós-aceite, toast com "Desfazer" (5s) em vez de substituição destrutiva.

## Critérios de aceite

- Criar atividade com 2 tags para outro dev: 1 fluxo único (antes: impossível/9+ cliques em 2 fluxos).
- Nenhum 400 silencioso do assistente; sugestão ajustável antes de aceitar.
- Página e dialog têm exatamente os mesmos campos e defaults.

## NÃO implementar nesta task

- Permitir reatribuir responsável na edição (o `AtividadeAlterarDto` não aceita `usuarioId` — mudança de contrato fora de escopo).
