# 341-sessao-expirada-limpa-o-estado-em-memoria.spec.md

> Task 13/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-016 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/casca.

## Objetivo

Sessão expirada limpa o mesmo estado que o logout limpa (usuário, execução ativa e o que mais o logout zera), para o próximo login na mesma aba não herdar dados do anterior.

## Contexto

**A-016 · Baixa · Sessão expirada (401) apaga só o localStorage: usuário e execução ativa da sessão anterior ficam em memória para o próximo login**

O logout limpa UsuarioSessaoService e ExecucaoAtivaService. O caminho do 401 (interceptor e stream do chat) remove as chaves do localStorage e navega, sem limpar os serviços. Se outra pessoa entra em seguida no mesmo navegador, o chip nasce com a execução ativa da sessão anterior (jaCarregou continua verdadeiro, então nem o esqueleto aparece) até o GET /execucao/ativa responder; se esse GET falhar, fica.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/core/interceptors/error-handler.interceptor.ts:23-28 — 401 remove access_token e usuario_sessao e navega
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-eventos.service.ts:71-76 — o mesmo no stream
- frontend/src/app/core/services/autenticacao.service.ts:34-39 — só o logout chama sessao.limpar() e execucaoAtiva.limpar()
- frontend/src/app/core/services/execucao-ativa.service.ts:23 e 50-53 — primeiraCarga depende de _jaCarregou, que só limpar() zera
- frontend/src/app/shared/layout/topbar/chip-execucao-ativa/chip-execucao-ativa.component.html:1-18 — fora da primeira carga o chip mostra ativa() como está

Como observar: Logar como A com execução ativa, invalidar o token (ou esperar expirar) até cair no login, logar como B sem recarregar a página: o chip mostra por um instante a descrição da execução de A. Não executei.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. Um método único no `AutenticacaoService` para encerrar a sessão, usado pelo logout, pelo 401 do interceptor e pelo stream de eventos do chat; o 401 acrescenta o `returnUrl`.
2. Teste: depois de um 401, `UsuarioSessaoService` e `ExecucaoAtivaService` estão vazios.

## Critérios de Aceite

- Ao vivo: expirar o token com execução ativa na tela, logar como outro usuário na mesma aba e conferir que o chip da execução do anterior não aparece.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

O estado do pad (spec `344-pad-encerrar-zera-o-estado`) e os catálogos em memória (spec de permissões na interface, se houver).

## Dependências

Nenhuma.

