# 464-desktop-download-do-instalador-direto-em-disco.spec.md

> Task 136/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-182 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/desktop e frontend/casca. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

O executável do Project Desktop (dezenas de MB) deixa de ser baixado inteiro para a memória da aba antes de virar arquivo, sem progresso do navegador.

## Contexto

**A-182 · Baixa · Instalador é baixado inteiro para a memória da página antes de ser salvo**

O download usa HttpClient com responseType 'blob': o executável inteiro fica na memória da aba e só depois vira um link de download, sem progresso do navegador. O backend já entrega em stream com Content-Length; o desvio existe porque a rota exige o token no cabeçalho.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/core/services/desktop-download.service.ts:35 — http.get(.../desktop/download, { responseType: 'blob', observe: 'response' })
- frontend/src/app/core/services/desktop-download.service.ts:44-53 — cria object URL do blob e clica num <a download>
- frontend/src/app/core/services/desktop-download.service.ts:31 — comentário: a rota exige o token, por isso não é link simples
- backend/src/modules/desktop/controllers/desktop.controller.ts:16-22 — StreamableFile com Content-Length e Content-Disposition

Como observar: Perfil > 'Baixar Project Desktop': GET /desktop/download fica pendente na aba de rede até o último byte, a memória da aba cresce do tamanho do arquivo e só então o navegador mostra o download.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Decisão do autor pendente

A rota exige o token no cabeçalho, por isso o front baixa como `blob`. Trocar pede outra forma de autorizar o download: rota e contrato.

**Antes:** `HttpClient` com `responseType: "blob"`.

**Opções:**

1. Link direto com autorização de curta duração (bilhete de uso único na URL).
2. Manter como está.

## Entregáveis

1. Na opção 1: a rota do bilhete, o link direto e os testes.

## Critérios de Aceite

- O download aparece na barra de downloads do navegador com progresso.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

