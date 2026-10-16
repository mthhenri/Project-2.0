# 101 — Ponto equipe (gestor): triagem, nome clicável e busca no seletor

**Origem:** Revisão de UI/UX — print `prints/04-ponto-equipe.png`, análise `analise-detalhada/ponto.md`

**Depende de:** —

**Entrega:** visão "Equipe · hoje" com status legível em 0 cliques: contagem "N pessoas · M trabalhando agora", badge por card (● Trabalhando agora / Pausado / Sem registros hoje), toggle "Somente ativos", ativos ordenados primeiro e nome do card clicável abrindo o mensal do usuário.

> **Frontend apenas.** Execução ativa = alguma `execucoes[]` com `fimData === null` (computed client-side).

---

## Escopo

1. Barra de triagem acima do grid + toggle "Somente ativos" (filtro client-side) + sort estável (ativos primeiro).
2. Badge de status no card. **Não existe "Férias" por usuário** — dias não úteis são globais; o 4º estado é apenas "Sem registros hoje".
3. Nome/avatar clicável → `patchValue({usuarioId})` + `aoMudarUsuario()` (100% client-side); tooltip "Ver o mês de X".
4. `[filter]` no `p-select` de usuário (`filterBy="nomeCompleto"`); placeholder "Equipe (hoje)".
5. Tooltip no contador de pausas: "N pausas ≥ {intervaloMinimoMinutos} min".
6. Empty state acionável: botão "Gerenciar usuários" → rota **`/usuario`** (singular).

## Critérios de aceite

- Abrir o mensal de alguém a partir do card: 1 clique. Quem está ativo é visível sem escanear execuções.

## NÃO implementar nesta task

- Mudanças na visão mensal (task 100).
