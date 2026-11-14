# 329-desktop-checkin-conferencia-agendada.spec.md

> Task 1/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-001 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-01.
> Severidade: Alta. Área: desktop.

## Objetivo

O processo principal do Project Desktop deixa de pedir `GET /checkin/situacao` a cada 15 s e passa a conferir como a janelinha do front (task 322): ao iniciar, no horário sorteado e numa rede de segurança espaçada, só com check-in possível.

## Contexto

**A-001 · Alta · Project Desktop: o processo principal pede GET /checkin/situacao a cada 15 s, com ou sem execução (240/h por usuário)**

A sondagem de 20 s saiu da página (task 322), mas o processo principal do Electron continua lendo a situação a cada 15 s enquanto houver login, sem olhar se há execução ativa nem se a janela está à vista. Com a janelinha do Desktop aberta o intervalo cai para 3 s e soma com o intervalo de 3 s da própria página /checkin carregada dentro dela. O mesmo processo ainda pede GET /mensagem-direta/preferencia a cada 60 s só para saber o atalho global. Com execução ativa, cada GET /checkin/situacao custa no backend a listagem de todas as execuções da atividade (ver achado próprio).

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- desktop/src/main.ts:28-29 — CONFERENCIA_OCIOSA_MS = 15_000 e CONFERENCIA_COM_JANELINHA_MS = 3_000
- desktop/src/main.ts:552-556 — conferirCheckin() só confere se há token e chama chamarApi('checkin/situacao', token), sem condição de execução
- desktop/src/main.ts:571-577 — agendarConferencia() reagenda sempre, com 3 s se a janelinha está aberta e 15 s senão
- desktop/src/main.ts:816 — agendarConferencia() parte no app.whenReady()
- desktop/src/main.ts:55, 754, 762-766 — GET mensagem-direta/preferencia a cada CONFERENCIA_DO_CHAT_MS = 60_000
- desktop/src/politica-do-checkin.ts:11-22 — lerSituacao já extrai haCheckin e proximoCheckinData, que permitiriam agendar em vez de sondar
- frontend/src/app/modules/checkin/pages/checkin/checkin.page.ts:22, 348-351 — a página /checkin dentro da janelinha também confere a cada 3 s
- docs/specs/backlog/auditoria-requisicoes-telas/verificacao-320-325.md:45 — registrado como limite: o Desktop tem a própria conferência (15 s / 3 s) e não foi tocado

Como observar: Abrir o Project Desktop logado e deixar parado 1 min olhando o log do backend (ou um proxy): 4 GET /api/v1/checkin/situacao e 1 GET /api/v1/mensagem-direta/preferencia por minuto, mesmo sem execução ativa e com a janela minimizada. Com o check-in disparado e o Project minimizado, a janelinha abre e as leituras passam a 2 por cada 3 s (processo principal + página).

Verificação na auditoria: código lido pelo agente principal (`desktop/src/main.ts:28`, `:552` e `:571`); o Electron não roda no ambiente da auditoria, então o tráfego não foi medido.

## Entregáveis

1. Em `desktop/src/main.ts`, a conferência ociosa sai do intervalo fixo de 15 s: confere ao logar, agenda a próxima por `proximoCheckinData` da última situação e mantém uma rede de segurança de 5 minutos só quando a situação diz que há check-in a esperar.
2. A decisão de quando conferir vira função pura em `desktop/src/politica-do-checkin.ts` (o módulo já existe), com teste: sem execução não agenda; com horário sorteado agenda para ele; com a janelinha aberta mantém o ritmo curto atual.
3. O início e o fim de execução feitos na página chegam ao processo principal pela ponte que já existe (`preload.ts`), para ele reconferir na hora em vez de esperar a rede de segurança.
4. `GET /mensagem-direta/preferencia`, hoje lido a cada 60 s pelo mesmo processo, passa a ser lido ao logar e quando a página avisar que a preferência mudou.

## Critérios de Aceite

- Teste da política cobre os quatro casos acima (`npm run test --workspace=desktop`).
- No Project Desktop real, parado e sem execução ativa por 10 minutos: nenhuma chamada a `/checkin/situacao` além da inicial (medido no log do backend). Com execução ativa, a janelinha continua abrindo no horário sorteado.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

A conferência de 3 s com a janelinha aberta (spec do diálogo do check-in) e a checagem de versão do Desktop.

## Dependências

Nenhuma.

