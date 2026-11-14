# 395-proposta-na-mensagem-da-ia-respeita-o-pode-ver.spec.md

> Task 67/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-082 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/mensagem-direta.

## Objetivo

A rota que devolve a proposta dentro de uma mensagem da IA deixa de usar o atalho de visão total para tipos de proposta que não têm `podeVer` (justificar ponto, anotação no pad, trecho de plano).

## Contexto

**A-082 · Baixa · Proposta do @IA: quem tem visão total vê a proposta sem passar pelo `podeVer` do executor**

A rota confere que a proposta está na mensagem da IA daquela conversa e que é de quem chamou, e só o dono resolve. Mas para administrador, gestor e auxiliar o atalho `temVisibilidadeTotal` devolve a proposta inteira sem consultar o executor, inclusive de tipos sem `podeVer` (justificar ponto, anotação no pad, trecho de plano, check-in, criar projeto).

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/mensagem-direta/services/mensagem-direta.service.ts:241 — 404 se a mensagem não é da IA, não é desta conversa ou não contém `propostaId`
- backend/src/modules/proposta-ia/services/proposta-ia.service.ts:312 — 404 se a proposta não é de `chamadaPorUsuarioId`
- backend/src/modules/proposta-ia/services/proposta-ia.service.ts:314 — `!ehDono && !temVisibilidadeTotal(usuarioAtivo.tipo) && !(await this.outraPessoaPodeVer(...))`
- grep `podeVer` em backend/src/modules — não aparece em ponto/executores/justificar-ponto.executor.ts, anotacao/executores/anotar-pad.executor.ts, plano/executores/alterar-trecho-do-plano.executor.ts, checkin/executores/suspender-checkin.executor.ts, projeto/executores/criar-projeto.executor.ts

Como observar: GESTOR chama `@IA` em conversa com um AUXILIAR pedindo uma anotação no próprio pad; o AUXILIAR faz GET /api/v1/mensagem-direta/conversa/<gestorId>/mensagem/<uuid>/proposta/<id>. O código devolve `acessivel: true` com os dados da proposta, `podeResolver: false`; não há regra escrita por tipo de proposta para comparar.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. O atalho `temVisibilidadeTotal` vale só para propostas cujo alvo é demanda, atividade ou execução; nas demais vale o `podeVer` do executor (ausente = não vê).
2. Teste por tipo de proposta e de usuário.

## Critérios de Aceite

- Gestor participante de uma conversa não lê, por essa rota, a proposta de anotação no pad que a IA fez para o outro participante.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

