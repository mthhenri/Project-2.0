# 338-desktop-versao-so-ao-abrir-o-menu.spec.md

> Task 10/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-019, A-020, A-021 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/casca.

## Objetivo

A versão do Project Desktop deixa de ser pedida em toda carga da aplicação: sai na primeira abertura do menu do perfil, onde o botão de download aparece.

## Contexto

**A-019 · Baixa · GET /desktop/versao é pedido em toda carga da aplicação, mas só aparece dentro do menu do perfil**

O construtor da topbar pede a versão publicada do Project Desktop em toda carga. O único uso é o item 'Baixar Project Desktop' dentro do popover do perfil. O link ?baixar-desktop=1 chama baixar() direto e não depende dessa leitura. No backend a rota lê a pasta e o arquivo a cada chamada.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/shared/layout/topbar/topbar.component.ts:119 — this.desktopDownload.carregar() no construtor
- frontend/src/app/shared/layout/topbar/topbar.component.html:182-202 — desktopDownload.versao() só é lido dentro do <p-popover #perfilPopover>
- frontend/src/app/shared/layout/topbar/topbar.component.ts:129-133 — o deep-link chama baixar() sem usar versao()
- backend/src/modules/desktop/services/desktop.service.ts:36-56 — readdir e stat a cada consulta
- .artifacts/revisao-requisicoes-e-permissoes/trafego/DESENVOLVEDOR.txt — GET /desktop/versao na carga inicial

Como observar: F5 em qualquer tela: GET /desktop/versao aparece na carga, mesmo sem abrir o menu do perfil e mesmo dentro do próprio Project Desktop.

Verificação na auditoria: medido na aplicação rodando: `GET /desktop/versao` aparece em toda carga, para os quatro perfis.

**A-020 · Baixa · Perfil: `GET /desktop/versao` sai em toda carga da casca para um botão que fica dentro do menu do perfil**

O construtor da topbar chama `desktopDownload.carregar()`. O único uso de `versao()` é o botão "Baixar Project Desktop", dentro do popover do perfil. O deep-link `?baixar-desktop=1` chama `baixar()`, que não depende dessa leitura.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/shared/layout/topbar/topbar.component.ts:117-119 — `this.desktopDownload.carregar()` no construtor
- frontend/src/app/core/services/desktop-download.service.ts:22-29 — `GET /desktop/versao` sem guarda
- frontend/src/app/shared/layout/topbar/topbar.component.html:182-199 — único uso, dentro do `p-popover` do perfil
- frontend/src/app/shared/layout/topbar/topbar.component.ts:129-131 — o deep-link chama `baixar()` direto

Como observar: Recarregar qualquer página logado: `GET /api/desktop/versao` aparece na rede sem o menu do perfil ter sido aberto.

Verificação na auditoria: medido na aplicação rodando: `GET /desktop/versao` aparece em toda carga, para os quatro perfis.

**A-021 · Baixa · GET /desktop/versao em toda carga da aplicação web, para um botão que só existe dentro do popover do perfil**

O construtor da topbar pede a versão publicada em toda carga da casca, no navegador e dentro do Desktop. O único uso é o botão 'Baixar Project Desktop' dentro do popover do perfil, que a maioria das cargas nunca abre. No backend cada chamada lista a pasta e faz stat do arquivo, sem cache; dentro do Desktop o processo principal ainda pede a mesma rota por conta própria.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/shared/layout/topbar/topbar.component.ts:117-119 — constructor chama this.desktopDownload.carregar()
- frontend/src/app/core/services/desktop-download.service.ts:22-29 — GET /desktop/versao sem guarda nem reaproveitamento
- frontend/src/app/shared/layout/topbar/topbar.component.html:96,182-197,215 — único uso de desktopDownload.versao(): dentro de <p-popover #perfilPopover>
- .artifacts/revisao-requisicoes-e-permissoes/trafego/ADMINISTRADOR.txt:6 — GET /desktop/versao [200] na carga inicial
- backend/src/modules/desktop/services/desktop.service.ts:36-55 — readdir da pasta e stat do arquivo a cada chamada
- desktop/src/main.ts:547 — o processo principal pede desktop/versao por conta própria

Como observar: F5 em qualquer tela: GET /desktop/versao aparece na aba de rede. O dado só é visto ao clicar no avatar do perfil.

Verificação na auditoria: medido na aplicação rodando: `GET /desktop/versao` aparece em toda carga, para os quatro perfis.

## Entregáveis

1. A topbar chama `DesktopDownloadService.carregar()` no `(onShow)` do popover do perfil, com guarda de "já carregado" na sessão da aba.
2. O parâmetro `?baixar-desktop` continua funcionando (carrega na hora).
3. Teste de componente: montar a topbar não pede a versão; abrir o menu pede uma vez.

## Critérios de Aceite

- Ao vivo: a carga inicial tem uma requisição a menos; o botão "Baixar Project Desktop" aparece ao abrir o menu.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

