# 461-desktop-janelinha-um-so-consultor.spec.md

> Task 133/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-178 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-01.
> Severidade: Média. Área: desktop e frontend/checkin.

## Objetivo

Com o check-in pendente no Desktop, deixam de correr até três consultas de 3 s à mesma rota (processo principal, página da janelinha e o diálogo embutido da janela principal oculta), e a abertura da janelinha deixa de repetir as leituras que o processo principal acabou de fazer.

## Contexto

**A-178 · Média · Check-in pendente no Desktop: até três consultas de 3 s à mesma rota ao mesmo tempo, e a abertura da janelinha repete as duas leituras que o processo principal acabou de fazer**

Com a janelinha aberta o processo principal passa a pedir /checkin/situacao a cada 3 s e a página da janelinha faz o mesmo por conta própria. A janela principal oculta ainda monta o diálogo embutido (a regra não olha se a janela está oculta) e a guarda dele usa document.visibilityState, que segundo o próprio código fica 'visible' no Electron oculto: seria o terceiro consultor. Na abertura, situação e disponibilidade da IA são pedidas pelo processo principal e de novo pela página, em menos de um segundo.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- desktop/src/main.ts:29,573 — CONFERENCIA_COM_JANELINHA_MS = 3_000 enquanto a janelinha existe
- frontend/src/app/modules/checkin/pages/checkin/checkin.page.ts:22,202,348-351 — INTERVALO_DA_SITUACAO_MS = 3000, iniciado ao carregar com EM_ANDAMENTO
- frontend/src/app/modules/checkin/pages/checkin/checkin.page.ts:361 — a única guarda do tique é document.visibilityState === 'hidden'
- desktop/src/main.ts:214 — comentário: o Electron mantém visibilityState em 'visible' com a janela oculta (mesma afirmação em frontend/src/app/core/services/project-desktop.service.ts:59)
- frontend/src/app/modules/checkin/components/checkin-janelinha/checkin-janelinha.component.html:1-12 e frontend/src/app/modules/checkin/utils/checkin.util.ts:22-25 — o diálogo embutido monta app-checkin-page quando disparado, sem consultar ProjectDesktopService.oculto
- desktop/src/main.ts:556,567 e frontend/src/app/modules/checkin/pages/checkin/checkin.page.ts:184,191 — checkin/situacao e ia/disponibilidade pedidas pelo processo principal e de novo no ngOnInit da página
- desktop/src/main.ts:799-801 — a página já avisa o fim por IPC (checkin:encerrar)

Como observar: Execução em andamento, Project na bandeja, esperar o horário do check-in: abre a janelinha. No log do backend aparecem GET /checkin/situacao em rajadas de 3 s vindas de origens distintas (Node e Chromium); no DevTools da janelinha (só no app não empacotado) aparece 1 a cada 3 s, e no da janela principal oculta, se o terceiro consultor se confirmar, outro.

Verificação na auditoria: código, por um auditor; o Electron não roda no ambiente da auditoria.

## Entregáveis

1. Enquanto a janelinha está aberta, o processo principal confia no aviso `checkin:encerrar` e reduz a própria conferência a uma rede de segurança lenta.
2. O diálogo embutido da janela principal não é montado (nem confere) com a janela oculta: a guarda usa `ProjectDesktopService.paginaOculta()`, não `document.visibilityState`.
3. Teste da política do Desktop e teste de componente da janelinha embutida.

## Critérios de Aceite

- No Desktop real com check-in pendente por 1 minuto: cerca de 20 `GET /checkin/situacao` (uma consulta de 3 s), não 60.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Depois de `329-desktop-checkin-conferencia-agendada`.

