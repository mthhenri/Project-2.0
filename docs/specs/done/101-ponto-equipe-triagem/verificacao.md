# Task 101 — verificação

Data: 2026-10-16. Frontend apenas. Implementada junto com a 100.

## O que foi feito

- Barra de triagem acima do grid: "N pessoas · M trabalhando agora" e toggle "Somente ativos" (filtro no cliente);
  ordem estável com quem está trabalhando primeiro. Execução ativa = alguma `execucoes[]` com `fimData === null`.
- Badge no card: ● Trabalhando agora (verde, pulsante) / Pausado / Sem registros hoje (não há "Férias").
- Nome + avatar de iniciais clicáveis (tooltip "Ver o mês de X") → `patchValue({usuarioId})` + `aoMudarUsuario()`.
- `p-select` do usuário com busca (`filterBy="nomeCompleto"`) e placeholder "Equipe (hoje)".
- Tooltip do contador de pausas ("N pausas ≥ 15 min", com `ambiente.intervaloMinimoMinutos`).
- Empty states: sem usuários → "Gerenciar usuários" (rota `/usuario`); filtro sem resultado → "Mostrar todos".

## Verificado ao vivo (Chromium, API real)

- "5 pessoas · 1 trabalhando agora"; o Gestor (execução aberta) aparece primeiro com "Trabalhando agora" e os
  demais "Sem registros hoje"; "Somente ativos" deixa 1 card; sem ninguém ativo mostra "Ninguém está trabalhando
  agora" + "Mostrar todos". Após pausar, o card do gestor mostra "Pausado" e a contagem cai a 0.
- Tooltip "Ver o mês de Dev2"; o clique no nome abre o mensal de Dev2 com o select preenchido (1 clique);
  limpar o select volta ao placeholder "Equipe (hoje)"; digitar "gest" filtra o select para "Gestor Inicial".
- 360×800 sem overflow. Capturas em `.artifacts/101-ponto-equipe-triagem/`.

## Limites / pendente

- Frontend sem testes automatizados (P-001).

## Verificações complementares (2026-10-16, após o fecho)

- **Tooltip das pausas:** com duas execuções do gestor no dia (13–14 h e 14:30–15:30 UTC, mais a de 16:42), o card mostra
  o chip "2" e o tooltip "2 pausas ≥ 15 min".
- **"Gerenciar usuários":** com `/ponto/todos` interceptado devolvendo lista vazia, o estado vazio mostra
  "Nenhum usuário ativo encontrado." e o clique no botão navega para `/usuario`.
