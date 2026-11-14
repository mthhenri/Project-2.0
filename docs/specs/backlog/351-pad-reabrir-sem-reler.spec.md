# 351-pad-reabrir-sem-reler.spec.md

> Task 23/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-030 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-08.
> Severidade: Baixa. Área: frontend/pad.

## Objetivo

Abrir de novo a gaveta do pad do mesmo usuário usa o que já está em memória; a releitura, quando cabe, roda em segundo plano.

## Contexto

**A-030 · Baixa · Pad: toda abertura da gaveta refaz `GET /anotacao?usuarioId`, inclusive com o mesmo pad já na tela**

`PadService.abrir()` relê o pad sempre que não há texto local sem gravar. Em Documentações e na aba Anotações do chat o pad do usuário já está carregado e visível; teclar `n` relê as cinco seções e troca os dois painéis pelo esqueleto.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/usuario/services/pad.service.ts:91-101 — `abrir()` chama `carregar()` salvo quando há mudança sem gravar
- frontend/src/app/modules/usuario/services/pad.service.ts:443-450 — `carregar()` faz `GET /anotacao` (e `GET /usuario/:id` se faltar o nome)
- frontend/src/app/shared/layout/topbar/topbar.component.ts:113-115 — botão e tecla `n` chamam `abrir`
- frontend/src/app/modules/documentacao/pages/documentacao/documentacao.page.html:92 — pad já visível em Documentações

Como observar: Em Documentações, com o pad ao lado, teclar `n`: sai `GET /anotacao?usuarioId=…` e os dois painéis mostram o esqueleto. Fechar e abrir de novo: outra GET.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. Em `PadService.abrir()`, com o pad do mesmo usuário carregado: sem esqueleto; se a última leitura tem poucos segundos, nenhuma requisição; fora disso, `recarregarSecoesSemMudancaLocal()` em segundo plano.
2. Teste do serviço para as três situações.

## Critérios de Aceite

- Ao vivo: abrir, fechar e abrir a gaveta em seguida faz 1 `GET /anotacao` (hoje 2).
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

A proteção contra versão velha continua sendo o 409 da gravação.

## Dependências

Nenhuma.

