# 321-ia-e-checkin-consulta-compartilhada.spec.md

> Task solta. Origem: `PROBLEMS.md` P-081 (DOSSIE R-03).

## Objetivo

`/ia/disponibilidade` e `/checkin/situacao` são pedidas uma vez por carga de página (e uma vez por evento que as invalide), lidas por todos os componentes através de um sinal compartilhado.

## Entregáveis

1. `IaDisponibilidadeService.carregar()` não repete uma consulta em curso nem uma concluída há menos de 5 s; `carregar({ forcar: true })` pula a janela (atualização de 60 s da barra lateral e `atualizarDisponibilidade` do chat). O login (`consultar()`) também marca o instante da resposta.
2. `CheckinService.consultarSituacao()` compartilha a consulta em curso entre quem pedir (janelinha, próximo check-in, tela do check-in); resposta já concluída nunca é reaproveitada, pois o horário é sensível.
3. Testes de serviço (coalescência, `forcar`, janela, falha) e ajuste dos testes de componente que contavam requisições repetidas.

## Critérios de Aceite

- Carga completa da página: 1× `/ia/disponibilidade` e 1× `/checkin/situacao` (login: 1× de disponibilidade). Medido ao vivo com Playwright, como no dossiê.
- O comportamento visível não muda: janelinha do check-in, "Voltar para a IA", telas desabilitadas com a IA no ar.
- `npm run impacto -- frontend/src/app/core/services/ia-disponibilidade.service.ts` avaliado (serviço compartilhado) e consumidores listados no fecho.
- Lint e testes do frontend sem erro novo.

## Fora de Escopo

O intervalo de consulta do check-in (spec 322); mudar o backend.

## Dependências

Nenhuma. Faça antes da 322, que reaproveita o sinal compartilhado do check-in.
