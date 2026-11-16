# 487-desktop-checkin-conferencia-agendada.spec.md

> Task 1/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-001, A-002, A-003, A-004 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-01.
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

**A-002 · Alta · Processo principal do Desktop pede GET /checkin/situacao a cada 15 s, com ou sem execução, com a janela à vista ou na bandeja**

O temporizador do processo principal não tem condição nenhuma além de haver token: são 240 requisições por hora por Desktop aberto, o dia inteiro (o app nunca fecha, só oculta). Com a janela à vista o resultado só alimenta o tooltip e o menu da bandeja, porque a janelinha separada só abre com o Project oculto e o diálogo embutido da página já cuida do resto. A SPA já foi corrigida (300 s, só com execução, mais o horário sorteado); o processo principal ficou com o intervalo fixo.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- desktop/src/main.ts:28 — CONFERENCIA_OCIOSA_MS = 15_000
- desktop/src/main.ts:571-577 — agendarConferencia encadeia setTimeout de 15 s (3 s com a janelinha aberta) sem olhar execução, visibilidade ou situação anterior; iniciado em main.ts:816
- desktop/src/main.ts:552-556 — conferirCheckin: única guarda é `if (!token) return`; depois chamarApi('checkin/situacao', token)
- desktop/src/main.ts:453-461 — o token vem de janela.webContents.executeJavaScript("localStorage.getItem('access_token')") a cada tique
- desktop/src/main.ts:463-465 — fetch do Node com Authorization: Bearer e AbortSignal.timeout(8000)
- desktop/src/main.ts:557-566 — com a janela à vista o resultado só atualiza ultimaSituacao e o tooltip; abrir a janelinha exige principalMinimizada() && situacao.disparado
- desktop/src/politica-do-checkin.ts:7 — a resposta já traz proximoCheckinData
- frontend/src/app/modules/checkin/components/checkin-janelinha/checkin-janelinha.component.ts:13,41-43 — a SPA usa 300 s e só com execução ativa

Como observar: Abrir o Project Desktop logado, sem execução, e deixar parado (à vista ou na bandeja). A requisição sai do processo principal (fetch do Node), então não aparece no DevTools da janela: olhar o log do backend/proxy, que mostra 1 GET /api/v1/checkin/situacao a cada 15 s.

Verificação na auditoria: código lido pelo agente principal (`desktop/src/main.ts:28`, `:552` e `:571`); o Electron não roda no ambiente da auditoria, então o tráfego não foi medido.

**A-003 · Alta · Processo principal pede GET /mensagem-direta/preferencia a cada 60 s só para saber o atalho global**

A cada minuto o processo principal relê a preferência do chat para sincronizar o atalho global, valor que só muda quando o próprio usuário salva na tela de configurações (ou troca de login). A página já carrega essa preferência ao abrir, mas a ponte não tem canal para entregá-la. Efeito colateral: trocar o atalho fica 'pendente' por até 60 s.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- desktop/src/main.ts:55 — CONFERENCIA_DO_CHAT_MS = 60_000
- desktop/src/main.ts:762-767 — agendarConferenciaDoChat se reagenda sempre, sem condição
- desktop/src/main.ts:744-756 — conferirChat: chamarApi('mensagem-direta/preferencia', token) e sincronizarAtalho(preferencia.atalhoGlobal)
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:209 e frontend/src/app/modules/mensagem-direta/services/mensagem-direta-avisos.service.ts:63 — a página já pede a mesma preferência ao iniciar
- frontend/src/app/modules/mensagem-direta/components/mensagem-direta-configuracoes/mensagem-direta-configuracoes.component.ts:135-136 — gravar o atalho marca 'pendente' e chama alterarPreferencia; linhas 111-116 comparam com situacaoDoAtalho()
- desktop/src/preload.ts:20-32 — não há função para a página informar o atalho ao Desktop

Como observar: Desktop logado e parado: no log do backend, 1 GET /api/v1/mensagem-direta/preferencia por minuto vindo do processo principal. Nas configurações do chat, gravar outro atalho: o estado fica 'pendente' até o próximo tique.

Verificação na auditoria: código lido pelo agente principal (`desktop/src/main.ts:28`, `:552` e `:571`); o Electron não roda no ambiente da auditoria, então o tráfego não foi medido.

**A-004 · Alta · GET /ia/disponibilidade a cada 15 s enquanto o check-in está disparado e a janelinha não pode abrir**

Com o Project oculto e o check-in disparado, o processo principal pede a disponibilidade da IA a cada tique antes de decidir abrir a janelinha. Se a IA não está no ar a janelinha não abre e o par situação + disponibilidade se repete a cada 15 s indefinidamente. A condição também não testa haCheckin nem suspenso antes de pedir, embora a regra pura os exija.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- desktop/src/main.ts:566 — `if (!situacao || !principalMinimizada() || !situacao.disparado) return;` não usa checkinExigido
- desktop/src/main.ts:567-568 — chamarApi('ia/disponibilidade') antes de deveAbrirJanelinha
- desktop/src/politica-do-checkin.ts:47-51 — deveAbrirJanelinha devolve false com IA diferente de NO_AR ou sem checkinExigido
- desktop/src/politica-do-checkin.ts:31-33 — checkinExigido exige haCheckin, disparado e não suspenso

Como observar: IA desligada, execução em andamento, Project na bandeja, passar do horário do check-in. No log do backend aparece o par GET /checkin/situacao e GET /ia/disponibilidade a cada 15 s.

Verificação na auditoria: código lido pelo agente principal (`desktop/src/main.ts:28`, `:552` e `:571`); o Electron não roda no ambiente da auditoria, então o tráfego não foi medido.

## Entregáveis

1. Em `desktop/src/main.ts`, a conferência ociosa sai do intervalo fixo de 15 s: confere ao logar, agenda a próxima por `proximoCheckinData` da última situação e mantém uma rede de segurança de 5 minutos só quando a situação diz que há check-in a esperar.
2. A decisão de quando conferir vira função pura em `desktop/src/politica-do-checkin.ts` (o módulo já existe), com teste: sem execução não agenda; com horário sorteado agenda para ele; com a janelinha aberta mantém o ritmo curto atual.
3. O início e o fim de execução feitos na página chegam ao processo principal pela ponte que já existe (`preload.ts`), para ele reconferir na hora em vez de esperar a rede de segurança.
4. `GET /mensagem-direta/preferencia`, hoje lido a cada 60 s pelo mesmo processo só para saber o atalho global, passa a ser lido ao logar e quando a página avisar que a preferência mudou.
5. `GET /ia/disponibilidade` só é pedido quando a situação exige check-in, e o estado da IA fica guardado por cerca de 60 s no processo principal.

## Critérios de Aceite

- Teste da política cobre os quatro casos acima (`npm run test --workspace=desktop`).
- No Project Desktop real, parado e sem execução ativa por 10 minutos: nenhuma chamada a `/checkin/situacao` além da inicial (medido no log do backend). Com execução ativa, a janelinha continua abrindo no horário sorteado.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

A conferência de 3 s com a janelinha aberta (spec do diálogo do check-in) e a checagem de versão do Desktop.

## Dependências

Nenhuma.

