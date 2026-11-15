# 469-configuracao-da-ia-salvar-usa-a-resposta.spec.md

> Task 141/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-187 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: frontend/configuracao-ia.

## Objetivo

Depois de `POST /configuracao-ia`, a página usa a resposta como versão ativa e a insere no histórico local, mantendo só a releitura do estado dos provedores.

## Contexto

**A-187 · Média · Configurações da IA: salvar versão dispara três GETs, um deles devolve o mesmo objeto que o POST acabou de devolver**

Depois do POST /configuracao-ia a página chama carregar(), que repete GET /configuracao-ia, GET /configuracao-ia/versoes?itensPorPagina=50 e GET /ia/estado. O POST responde ConfiguracaoIaCriadaDto, que é o mesmo tipo de GET /configuracao-ia e de cada item do histórico. Só o estado da IA pode de fato ter mudado.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/configuracao-ia/pages/configuracao-ia/configuracao-ia.page.ts:176-180 — criar(...) e, no next, this.carregar()
- frontend/src/app/modules/configuracao-ia/pages/configuracao-ia/configuracao-ia.page.ts:137-140 — forkJoin de recuperarAtiva(), listarVersoes() e recuperarEstado()
- shared/src/dtos/configuracao-ia/ConfiguracaoIaCriadaDto.ts:3 e ConfiguracaoIaRecuperadaDto.ts:4 — os dois são alias de ConfiguracaoIaResumoDto
- frontend/src/app/modules/configuracao-ia/services/configuracao-ia.service.ts:27-29 — o histórico é PaginatedResult<ConfiguracaoIaResumoDto>

Como observar: Em /configuracao-ia, mudar um campo (ex.: minutos do check-in) e Salvar. Na rede: POST /configuracao-ia seguido de GET /configuracao-ia, GET /configuracao-ia/versoes?itensPorPagina=50 e GET /ia/estado.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Entregáveis

1. `carregar()` deixa de ser chamado depois de salvar; teste de componente: salvar gera o `POST` e `GET /ia/estado`.

## Critérios de Aceite

- Ao vivo: salvar uma versão faz 2 requisições (hoje 4).
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

