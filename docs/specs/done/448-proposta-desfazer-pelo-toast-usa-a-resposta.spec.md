# 448-proposta-desfazer-pelo-toast-usa-a-resposta.spec.md

> Task 120/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-161 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: frontend/chat.

## Objetivo

Desfazer pelo toast do cartão deixa de fazer um `GET /proposta-ia/:id` a mais e passa a avisar a página, para o documento do plano e as anotações não ficarem com o que foi desfeito.

## Contexto

**A-161 · Média · "Desfazer" do toast no cartão faz um GET a mais e não avisa a página: documento do plano e anotações ficam com o que foi desfeito**

O desfazer oferecido no toast do cartão usa `aposDesfazer: () => this.carregar(id)`: a resposta do `POST /proposta-ia/:id/desfazer`, que já traz a proposta, é ignorada e o cartão faz `GET /proposta-ia/:id`. Esse caminho não emite `resolvida`, então a página não relê o documento do plano (ALTERAR_TRECHO_PLANO) nem as anotações (ANOTAR_PAD), que continuam mostrando o que foi desfeito. O botão Desfazer do próprio cartão e o desfazer do grupo emitem corretamente.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/chat/components/proposta-cartao/proposta-cartao.component.ts:219-223 e :361-365 — `desfazer: () => this.propostaIaService.desfazer(id), aposDesfazer: () => this.carregar(id)`
- frontend/src/app/modules/chat/components/proposta-cartao/proposta-cartao.component.ts:208-214 — `carregar()` só faz `this.proposta.set(resposta.dados ?? null)`, sem `resolvida.emit`
- frontend/src/app/core/services/desfazer.service.ts:66-68 — `oferta.desfazer().subscribe({ next: () => { oferta.aposDesfazer?.();` (a resposta não é repassada)
- frontend/src/app/modules/chat/pages/chat/chat.page.ts:218-221 — documento e pad só se relêem dentro de `aoResolverProposta`, chamado pelo output `resolvida`
- frontend/src/app/modules/chat/components/proposta-grupo/proposta-grupo.component.ts:168 — o grupo aplica a resposta do desfazer com `tap((resposta) => this.aplicarSePossivel(resposta))`, que emite `resolvida`

Como observar: /chat → Planejamento: pedir a alteração de um trecho, Confirmar no cartão (o documento se relê com GET /plano/:id) e clicar em "Desfazer" no toast: POST /proposta-ia/:id/desfazer + GET /proposta-ia/:id, e nenhum GET /plano/:id; o documento continua com o trecho alterado.

Verificação na auditoria: código, por um auditor; os fluxos com resposta da IA não foram exercitados (sem provedor no ambiente da auditoria).

## Entregáveis

1. O cartão aplica a resposta do próprio `POST /proposta-ia/:id/desfazer` e emite `resolvida`, como o grupo já faz.
2. Teste de componente: desfazer não gera `GET` e a página relê o documento afetado.

## Critérios de Aceite

- Teste passa.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

