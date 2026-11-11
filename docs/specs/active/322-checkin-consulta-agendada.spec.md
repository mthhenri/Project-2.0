# 322-checkin-consulta-agendada.spec.md

> Task solta. Origem: `PROBLEMS.md` P-079 (DOSSIE R-01). Decisão do autor (2026-11-11): agendar pelo `proximoCheckinData`.

## Objetivo

A situação do check-in deixa de ser consultada por intervalo fixo de 20 s (3 s na janela `/checkin`) e passa a ser consultada nos momentos em que pode ter mudado.

## Entregáveis

1. `checkin-janelinha.component.ts`: sem `setInterval` de 20 s. Consulta ao abrir, ao início/fim de execução (`ExecucaoAtivaService`), ao voltar a aba visível e no instante de `proximoCheckinData` (já existe o `setTimeout`). Sem execução ativa, não consulta em intervalo. Mantém uma consulta de segurança longa (valor fechado no passo de implementação, justificado no fecho) para cobrir execução alterada em outra aba/máquina.
2. `checkin.page.ts`: o intervalo de 3 s é revisto no mesmo critério (consulta quando há motivo; com o check-in disparado a página precisa de resposta ágil, e o valor mantido, se for o caso, é justificado).
3. Testes das funções puras em `checkin.util.ts` e do componente (fake timers) cobrindo: sem execução, nenhum polling; com execução, consulta no horário; evento de execução reconsulta.

## Critérios de Aceite

- Repouso de 150 s sem execução ativa: 0 consultas além da carga (dossiê: 8). Com execução, a janelinha continua aparecendo no horário sorteado (verificado ao vivo, com a IA configurada ou o estado simulado pelo teste).
- Lint e testes do frontend sem erro novo.

## Fora de Escopo

Mudar o backend do check-in e o algoritmo do horário sorteado.

## Dependências

Spec 321 (consulta da situação compartilhada entre os componentes).
