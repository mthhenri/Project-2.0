# 332-leituras-de-fundo-sem-toast-de-erro.spec.md

> Task 4/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-004 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: frontend/casca.

## Objetivo

Requisição que o usuário não pediu (disponibilidade da IA, situação do check-in, execução ativa, reconferência da sessão) falha em silêncio, mantendo o tratamento do 401.

## Contexto

**A-004 · Média · Leituras de fundo da casca mostram o toast global de erro quando falham (a cada 60 s, a cada foco e a cada 3 s no check-in)**

As leituras automáticas da casca usam comFeedbackProprio(), que só desliga o overlay; o errorHandlerInterceptor continua mostrando toast para qualquer erro que não seja 401. Com o backend fora do ar (deploy, rede, VPN) o usuário recebe 'Erro interno. Tente novamente.' sem ter feito nada: a cada 60 s pela barra lateral, a cada foco pela topbar, a cada 3 s com o diálogo do check-in aberto e na abertura pelo atualizarSessao. Os serviços tratam a falha em silêncio (catchError, error: () => undefined), mas o interceptor avisa antes.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/core/interceptors/error-handler.interceptor.ts:18 — só requisição com ERRO_TRATADO_PELA_TELA pula o interceptor
- frontend/src/app/core/interceptors/error-handler.interceptor.ts:41-42 — qualquer outro status vira toast 'Erro interno. Tente novamente.'
- frontend/src/app/core/interceptors/loading.interceptor.ts:17-19 — comFeedbackProprio() define só SEM_OVERLAY_GLOBAL
- frontend/src/app/core/services/ia-disponibilidade.service.ts:40 e 59 — GET /ia/disponibilidade com comFeedbackProprio()
- frontend/src/app/modules/checkin/services/checkin.service.ts:18 — GET /checkin/situacao com comFeedbackProprio()
- frontend/src/app/core/services/execucao-ativa.service.ts:30 — GET /execucao/ativa com comFeedbackProprio()
- frontend/src/app/core/services/autenticacao.service.ts:50-55 — GET /usuario/:id sem contexto; o comentário diz que falha de rede 'deixa a sessão como está'
- frontend/src/app/modules/checkin/pages/checkin/checkin.page.ts:348-351, 362-372 — conferência a cada 3 s com error: () => undefined

Como observar: Com a aplicação aberta, parar o backend (ou marcar 'Offline' no DevTools) e esperar: um toast de erro por minuto sem tocar em nada; alt-tab e voltar mostra outro; com a janelinha do check-in aberta, um a cada 3 s.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. Um contexto de requisição "leitura de fundo" ao lado de `comFeedbackProprio()` (em `core/interceptors/`): o `errorHandlerInterceptor` continua tratando o 401 e não mostra toast para os demais status.
2. O contexto passa a ser usado em `IaDisponibilidadeService`, `CheckinService.consultarSituacao`, `ExecucaoAtivaService.carregar`, `AutenticacaoService.atualizarSessao` e `DesktopDownloadService.carregar`.
3. Teste do interceptor: erro 500 e erro de rede em leitura de fundo não chamam o serviço de mensagens; o 401 continua redirecionando.

## Critérios de Aceite

- Ao vivo, com o backend parado e a aplicação aberta por 3 minutos: nenhum toast "Erro interno" aparece sem ação do usuário; uma ação do usuário continua mostrando o erro.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Mensagens de erro das ações que o usuário dispara.

## Dependências

Nenhuma.

