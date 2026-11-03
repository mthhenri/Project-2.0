# 303 — Próximo check-in no menu do perfil

> Origem: I-046 de `docs/context/IDEAS.md`, pedido do autor em 2026-11-03: no Project Web não há nenhuma indicação de quando é o próximo check-in (só o menu da bandeja do Project Desktop mostra, task 161).

## Objetivo

Mostrar, no menu do perfil da barra superior (o popover que abre ao clicar no usuário), quanto falta para o próximo check-in, entre a linha do tipo do usuário e a seção "Tempos em dias", como o autor pediu.

## Entregáveis

1. **Componente `app-checkin-proximo`** em `frontend/src/app/modules/checkin/components/checkin-proximo/`: ao nascer consulta `GET /checkin/situacao` (o `CheckinService.consultarSituacao` que já existe, sem loading global) e, enquanto está na tela, atualiza a contagem a cada segundo. Some com o popover (o PrimeNG só monta o conteúdo do popover aberto), então não há consulta periódica nova.
2. **Regra pura** `textoDoProximoCheckin(situacao, agora)` em `modules/checkin/utils/checkin.util.ts`, com os casos:
   - situação ainda não chegou → "Próximo check-in: consultando…";
   - falha na consulta → "Próximo check-in: indisponível";
   - check-ins suspensos ("Estou em reunião") → "Check-ins suspensos";
   - sem execução em andamento → "Sem check-in: nenhuma execução em andamento";
   - horário já chegou (`disparado`) ou contagem zerada → "Check-in agora";
   - execução sem horário sorteado → "Próximo check-in: indisponível";
   - senão → "Próximo check-in em MM:SS", ou "H:MM:SS" a partir de uma hora (o mesmo formato da bandeja do Desktop).
3. **Topbar**: o componente entra no popover do perfil logo abaixo da linha do tipo, no mesmo estilo dela (ícone pequeno e texto `text-sm` atenuado). Nada muda no backend nem no `shared`.
4. **Documentação**: retirar I-046 do `IDEAS.md`; `HISTORY.md`; ponteiro no `MEMORY.md`.

## Critérios de Aceite

- Testes da regra pura cobrindo todos os casos acima; teste de componente: consulta ao nascer, contagem que anda com o relógio, estado de falha.
- Testes, build e `npm run lint:tudo` do frontend limpos; `npm run repo:verificar` limpo.
- Verificação ao vivo (skill `verify`) com execução em andamento, sem execução e com check-ins suspensos, nos temas claro e escuro e nos cinco formatos de desktop. Análogo: a própria linha do tipo do usuário no mesmo popover.

## Fora de Escopo

Mostrar o próximo check-in fora do menu do perfil (topbar, chip da execução); mudar a agenda do check-in no backend; mostrar o motivo ou o fim da suspensão.

## Dependências

Tasks 160 e 161 (agenda do check-in no backend e `proximoCheckinData` em `CheckinSituacaoConsultadaDto`).
