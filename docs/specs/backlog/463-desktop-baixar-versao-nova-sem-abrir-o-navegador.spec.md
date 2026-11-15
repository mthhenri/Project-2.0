# 463-desktop-baixar-versao-nova-sem-abrir-o-navegador.spec.md

> Task 135/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-181 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: desktop.

## Objetivo

O item "Nova versão disponível" da bandeja deixa de abrir o Project no navegador do sistema (carga inteira da aplicação, com stream) só para iniciar um download que ainda cai no login se o navegador não tiver sessão.

## Contexto

**A-181 · Baixa · Baixar a versão nova pela bandeja abre o Project inteiro no navegador só para iniciar um download**

O item 'Nova versão disponível' abre o endereço do Project com ?baixar-desktop=1 no navegador do sistema. Isso carrega a SPA inteira (as 10 requisições da carga inicial, com o stream que fica aberto) para só então chamar GET /desktop/download; sem login no navegador, cai antes na tela de autenticação. A janela principal do Desktop já está carregada e logada.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- desktop/src/main.ts:274-275 — item da bandeja chama shell.openExternal(enderecoParaBaixar(urlDoProject))
- desktop/src/politica-da-versao.ts:40-44 — a URL é a do Project com baixar-desktop=1
- frontend/src/app/shared/layout/topbar/topbar.component.ts:125-132 — no NavigationEnd lê o parâmetro e chama desktopDownload.baixar()
- frontend/src/app/core/guards/autenticacao.guard.ts:5-10 — sem token, redireciona para /autenticacao com parâmetros de retorno
- .artifacts/revisao-requisicoes-e-permissoes/trafego/ADMINISTRADOR.txt:3-13 — a carga inicial tem 10 requisições, incluindo /mensagem-direta/eventos

Como observar: Com um executável mais novo publicado, clicar com o botão direito na bandeja e escolher 'Nova versão disponível (vX): baixar'. Abre uma aba no navegador com a carga inicial completa e depois GET /desktop/download; a aba fica aberta com o stream ativo.

Verificação na auditoria: código, por um auditor; o Electron não roda no ambiente da auditoria.

## Entregáveis

1. O download é disparado pela janela principal já carregada (canal novo da ponte que chama `DesktopDownloadService.baixar()`) ou pelo processo principal com o token que ele já lê; teste da política.

## Critérios de Aceite

- No Desktop real: clicar em "Nova versão disponível" inicia o download sem abrir o navegador.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

