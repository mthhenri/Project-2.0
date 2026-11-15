# 432-testes-de-permissao-dos-modulos-de-administrador.spec.md

> Task 104/135 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-130, A-131 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/ia-custo e autenticacao.

## Objetivo

Fixar em teste o que hoje só o decorador garante: toda rota de `ia-custo` é de administrador, e o auxiliar é recusado pelo `GestorGuard` e pelo `AdministradorGuard`.

## Contexto

**A-130 · Baixa · ia-custo: @AdministradorOnly por método e nenhum teste de rota fixando a trava**

O comentário do controller diz que a aba é só do administrador, mas a trava é por método, não de classe como em configuracao-ia e prompt. É o único dos seis controllers sem teste de metadados de rota, e a service só é testada com GESTOR. Uma rota nova no controller nasce aberta a qualquer usuário logado sem nenhum teste acusar.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/ia-custo/controllers/ia-custo.controller.ts:8-9 — comentário 'só o administrador' e `@Controller('ia-custo')` sem decorador de classe; linhas 13 e 19 — `@AdministradorOnly()` por método
- backend/src/modules/configuracao-ia/controllers/configuracao-ia.controller.ts:9 e backend/src/modules/prompt/controllers/prompt.controller.ts:10 — nos vizinhos a trava é de classe
- backend/src/modules/ia-custo — a listagem de testes traz só `domain/calculo-de-custo.test.ts` e `services/ia-custo.service.test.ts`; não existe `ia-custo.controller.test.ts`
- backend/src/modules/prompt/controllers/prompt.controller.test.ts:21 e backend/src/modules/modelagem/controllers/modelagem.controller.test.ts:15 — os outros controllers fixam `administradorOnly`/`gestorOnly` rota a rota
- backend/src/modules/ia-custo/services/ia-custo.service.test.ts:42-43 — `consultar` e `alterarPreco` recusados só para GESTOR

Como observar: GET /ia-custo?ano=2026 e PUT /ia-custo/preco como GESTOR, AUXILIAR ou DESENVOLVEDOR dão 403 hoje (esperado = obtido, já medido). O risco é de regressão: remover o decorador de um método não quebra teste de rota nenhum.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-131 · Baixa · AUXILIAR não aparece em nenhum teste de permissão destes módulos nem nos testes do GestorGuard e do AdministradorGuard**

Os testes de guard e de service usam ADMINISTRADOR, GESTOR e DESENVOLVEDOR; o auxiliar só é negado no teste da função pura do `shared`. Como as escritas da modelagem dependem exclusivamente do GestorGuard, 'auxiliar leva 403' não tem teste direto.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- grep de `AUXILIAR` nos *.test.ts de ia, configuracao-ia, prompt, ia-custo, modelagem, desktop e autenticacao/guards — só 1 ocorrência, em backend/src/modules/autenticacao/guards/permissao.guard.test.ts
- backend/src/modules/autenticacao/guards/gestor.guard.test.ts:26-28 — GESTOR, ADMINISTRADOR e DESENVOLVEDOR
- backend/src/modules/autenticacao/guards/administrador.guard.test.ts:28-30 — ADMINISTRADOR, GESTOR e DESENVOLVEDOR
- backend/src/modules/configuracao-ia/services/configuracao-ia.service.test.ts:179 e backend/src/modules/prompt/services/prompt.service.test.ts:137 — laço `[GESTOR, DESENVOLVEDOR]`
- backend/src/modules/prompt/services/prompt-teste.service.test.ts:99 — `testar` recusado só para GESTOR
- shared/src/utils/permissao-usuario.test.ts:38-39 — único lugar que nega AUXILIAR em `temPermissaoDeGestor` e `temPermissaoDeAdministrador`

Como observar: PUT /modelagem/grupo/1 {titulo, rotulo} e POST /configuracao-ia como AUXILIAR: pelo código dão 403 (as duas funções não incluem AUXILIAR), que é o esperado. Nenhum teste de guard ou de service destes módulos exercita esse tipo.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. `@AdministradorOnly()` sobe para a classe do controller de `ia-custo` (como em `configuracao-ia` e `prompt`) e nasce `ia-custo.controller.test.ts` no molde de `prompt.controller.test.ts`.
2. AUXILIAR entra nos casos de `gestor.guard.test.ts`, `administrador.guard.test.ts` e nos laços por tipo dos testes de service de `configuracao-ia`, `prompt` e `ia-custo`.

## Critérios de Aceite

- Uma rota nova sem trava em `ia-custo` quebra o teste do controller.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

