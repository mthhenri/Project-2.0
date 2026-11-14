# 333-checkin-dialogo-conferencia-por-evento.spec.md

> Task 5/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-005 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-01.
> Severidade: Média. Área: frontend/checkin. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Com o diálogo do check-in aberto, a página deixa de pedir `GET /checkin/situacao` a cada 3 s sem limite e passa a conferir quando algo muda.

## Contexto

**A-005 · Média · Diálogo do check-in aberto confere GET /checkin/situacao a cada 3 s sem teto de tempo**

Com o check-in em andamento a página confere a cada 3 s até o estado mudar; a única guarda é a aba oculta. O diálogo não tem fechar, então quem saiu da mesa com a execução rodando deixa a aba fazendo 1.200 requisições por hora. Os dois desfechos que o intervalo espera quase sempre nascem na própria página (confirmar o cartão ou o fim do fluxo da conversa), e o fim do fluxo já confere por conta própria. No Electron a guarda de aba oculta não vale: a janela oculta continua com visibilityState 'visible'.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/checkin/pages/checkin/checkin.page.ts:22 — INTERVALO_DA_SITUACAO_MS = 3000
- frontend/src/app/modules/checkin/pages/checkin/checkin.page.ts:348-351 — setInterval(conferirSituacao, 3000) enquanto EM_ANDAMENTO
- frontend/src/app/modules/checkin/pages/checkin/checkin.page.ts:358-373 — só para quando o estado deixa de ser EM_ANDAMENTO; única guarda é document.visibilityState === 'hidden'
- frontend/src/app/modules/checkin/pages/checkin/checkin.page.ts:287-292 — o finally do envio já chama conferirSituacao()
- frontend/src/app/modules/checkin/components/checkin-janelinha/checkin-janelinha.component.ts:17-21 — a janelinha não tem fechar
- frontend/src/app/core/services/project-desktop.service.ts:59 — comentário: o Electron mantém visibilityState em 'visible' com a janela oculta

Como observar: Com execução ativa, esperar o horário do check-in (ou reduzir o intervalo na configuração da IA), deixar o diálogo aberto sem responder e olhar a aba de rede: 1 GET /checkin/situacao a cada 3 s, indefinidamente.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

A task 322 decidiu "a cada 3 s, só com a aba visível". O diálogo não tem fechar: quem sai da mesa com a aba à vista deixa 1.200 requisições por hora.

**Antes:** intervalo fixo de 3 s enquanto o check-in estiver em andamento e a aba visível.

**Opções:**

1. Conferir por evento (execução ativa mudou; fim de cada fluxo da conversa, que já confere) e manter um intervalo de segurança espaçado (30 s ou mais).
2. Manter os 3 s e acrescentar um teto: depois de N minutos sem interação, o intervalo cresce.
3. Manter como está.

Recomendação da auditoria: opção 1.

## Entregáveis

1. Em `modules/checkin/pages/checkin/checkin.page.ts`, a conferência passa a reagir à mudança de `ExecucaoAtivaService.ativa()` e ao fim de cada fluxo; o intervalo fixo vira a rede de segurança escolhida pelo autor.
2. Teste da página: sem evento, não há consulta dentro do intervalo antigo; com a execução encerrada por fora, a página percebe pela rede de segurança.

## Critérios de Aceite

- Ao vivo com o diálogo aberto por 2 minutos sem interação: o número de `GET /checkin/situacao` cai de cerca de 40 para o da rede de segurança escolhida.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

A janelinha (task 322) e o processo do Desktop (spec própria).

## Dependências

Decisão do autor acima. Convém depois de `331-execucao-ativa-consulta-com-guarda`.

