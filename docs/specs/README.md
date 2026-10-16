# Fluxo de Specs

Três pastas, um ciclo de vida por arquivo:

- `backlog/` — tasks a implementar, ainda não iniciadas.
- `active/` — a task em andamento nesta sessão. Mover para cá é o primeiro passo antes de tocar
  código; normalmente só há uma spec aqui por vez.
- `done/` — tasks concluídas. **Registro histórico — nunca reescrever, só ler.** Se algo mudou
  desde então, a mudança vira uma spec nova, não uma edição retroativa.

Specs de escopo grande (uma fase/milestone inteira) são quebradas em tasks numeradas antes da
implementação — nunca implemente o arquivo guarda-chuva direto.

Sem spec ainda para o pedido? Escreva uma nova a partir de `TEMPLATE.spec.md` antes de tocar
código.

Ver a skill `task-flow` (em `../skills/task-flow/SKILL.md`) para o fluxo completo: abrir,
implementar, gates de qualidade, fechar.
