# 341-sessao-expirada-limpa-o-estado-em-memoria.spec.md

> Task 13/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-025, A-026, A-027 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: frontend/casca.

## Objetivo

Sessão expirada limpa o mesmo estado que o logout limpa (usuário, execução ativa e o que mais o logout zera), para o próximo login na mesma aba não herdar dados do anterior.

## Contexto

**A-025 · Média · Sessão expirada (401) apaga só o localStorage: usuário e execução ativa da sessão anterior ficam em memória para o próximo login**

O logout limpa UsuarioSessaoService e ExecucaoAtivaService. O caminho do 401 (interceptor e stream do chat) remove as chaves do localStorage e navega, sem limpar os serviços. Se outra pessoa entra em seguida no mesmo navegador, o chip nasce com a execução ativa da sessão anterior (jaCarregou continua verdadeiro, então nem o esqueleto aparece) até o GET /execucao/ativa responder; se esse GET falhar, fica.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/core/interceptors/error-handler.interceptor.ts:23-28 — 401 remove access_token e usuario_sessao e navega
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-eventos.service.ts:71-76 — o mesmo no stream
- frontend/src/app/core/services/autenticacao.service.ts:34-39 — só o logout chama sessao.limpar() e execucaoAtiva.limpar()
- frontend/src/app/core/services/execucao-ativa.service.ts:23 e 50-53 — primeiraCarga depende de _jaCarregou, que só limpar() zera
- frontend/src/app/shared/layout/topbar/chip-execucao-ativa/chip-execucao-ativa.component.html:1-18 — fora da primeira carga o chip mostra ativa() como está

Como observar: Logar como A com execução ativa, invalidar o token (ou esperar expirar) até cair no login, logar como B sem recarregar a página: o chip mostra por um instante a descrição da execução de A. Não executei.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

**A-026 · Média · 401 limpa só o localStorage: usuário e execução ativa ficam em memória, diferente do logout**

No 401 o interceptor remove 'access_token' e 'usuario_sessao' e navega para /autenticacao?returnUrl, mas não chama UsuarioSessaoService.limpar() nem ExecucaoAtivaService.limpar(), que o logout() chama. O signal do usuário anterior e a execução ativa dele seguem em memória; quem entrar em seguida na mesma aba herda o _ativa anterior (com _jaCarregou true, sem esqueleto) até GET /execucao/ativa responder. O tratamento de sessão expirada do SSE do chat repete o mesmo código, e requisições com ERRO_TRATADO_PELA_TELA nem passam pelo tratamento de 401.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/core/interceptors/error-handler.interceptor.ts:23-27 — case 401: removeItem das duas chaves e roteador.navigate; nenhum limpar() de service
- frontend/src/app/core/interceptors/error-handler.interceptor.ts:18 — requisição com ERRO_TRATADO_PELA_TELA sai antes do catchError (401 incluído)
- frontend/src/app/core/services/autenticacao.service.ts:34-38 — logout() chama sessao.limpar() e execucaoAtiva.limpar()
- frontend/src/app/core/services/execucao-ativa.service.ts:50-53 — _ativa e _jaCarregou só zeram em limpar()
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-eventos.service.ts:73-74 — mesma remoção direta das duas chaves no 401 do stream

Como observar: Com execução ativa, invalidar o token (expirar ou apagar no servidor), provocar uma requisição, cair no login e entrar com outro usuário na mesma aba: observar o chip da topbar antes da resposta de GET /execucao/ativa. Não executado nesta auditoria.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

**A-027 · Média · Logout não zera services singleton nem as chaves do navegador que não são por usuário**

logout() limpa token, sessão e execução ativa e navega sem recarregar a página; o resto dos services providedIn root mantém o estado. Ficam depois de sair: login, nome completo e cor do último usuário (tela de login, por decisão registrada no código), narrativas de teste de prompt em texto livre, o modo convencional da IA (signal e sessionStorage) e uma oferta de desfazer ainda dentro do prazo. O chat em memória é zerado e as chaves de documentação e posição do popup são por usuário.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/core/services/autenticacao.service.ts:34-39 — logout: removeItem do token, sessao.limpar(), execucaoAtiva.limpar(), router.navigate
- frontend/src/app/modules/autenticacao/pages/login/login.page.ts:181-187 — CHAVE_ULTIMO_LOGIN guarda login, nomeCompleto e corAvatar ('O usuário é sempre lembrado')
- frontend/src/app/modules/configuracao-ia/components/prompt-teste-dialog/prompt-teste-dialog.component.ts:133 — narrativas gravadas em localStorage com chave só por tipo de prompt
- frontend/src/app/core/services/ia-disponibilidade.service.ts:28 e 103-107 — modoConvencional em signal de service root e em sessionStorage
- frontend/src/app/core/services/desfazer.service.ts:35-43 — oferta de desfazer em service root, removida só pelo temporizador
- frontend/src/app/modules/mensagem-direta/components/mensagem-direta-popup/mensagem-direta-popup.component.ts:157-158 — ngOnDestroy chama estado.parar() (chat zerado ao sair da casca)

Como observar: Sair e inspecionar localStorage e sessionStorage no DevTools; a tela de login mostra o nome do último usuário. Entrar com outro usuário na mesma aba logo após uma exclusão com 'Desfazer' pendente.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Entregáveis

1. Um método único no `AutenticacaoService` para encerrar a sessão, usado pelo logout, pelo 401 do interceptor e pelo stream de eventos do chat; o 401 acrescenta o `returnUrl`.
2. Esse método zera os services com estado (`providedIn: root`: catálogos em memória, chat, pad, execução ativa) ou recarrega a página, e remove do navegador as chaves que guardam conteúdo; chave de conteúdo passa a levar o id do usuário.
3. Teste: depois de um 401, `UsuarioSessaoService` e `ExecucaoAtivaService` estão vazios.

## Critérios de Aceite

- Ao vivo: expirar o token com execução ativa na tela, logar como outro usuário na mesma aba e conferir que o chip da execução do anterior não aparece.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

O que fica de propósito na tela de login (último login e nome, decisão registrada no código).

## Dependências

Nenhuma.

