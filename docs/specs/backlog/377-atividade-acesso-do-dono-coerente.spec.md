# 377-atividade-acesso-do-dono-coerente.spec.md

> Task 49/67 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-061 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: backend/atividade. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

As quatro funções de acesso à atividade (`recuperar`, `listarTags`, `alterar`, `alterarTags`) passam a usar a mesma condição. Hoje o dono sem vínculo com a demanda altera a atividade e recebe 403 ao abri-la.

## Contexto

**A-061 · Média · Dono que não é membro da demanda altera a atividade mas não consegue lê-la**

`alterar` e `alterarTags` aceitam o dono sem vínculo; `recuperar` e `listarTags` exigem vínculo e respondem 403 ao próprio dono, embora a listagem mostre a atividade. Os executores da IA começam por `recuperar`, então recusam o dono que POST /execucao aceita. O caso surge quando o gestor cria atividade para alguém em demanda de que a pessoa não é membro, ou quando ela sai da demanda.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/atividade/services/atividade.service.ts:171-178 — recuperar: só validarAcessoDemanda, sem exceção para o dono
- backend/src/modules/atividade/services/atividade.service.ts:203-213 — alterar: `eAutor` basta
- backend/src/modules/atividade/services/atividade.service.ts:373-380 e 330-340 — listarTags exige vínculo; alterarTags aceita o dono
- backend/src/modules/atividade/services/atividade.service.ts:122-124 — listar devolve as próprias atividades sem olhar vínculo
- backend/src/modules/execucao/executores/iniciar-execucao.executor.ts:99-102 — donoDaAtividade chama atividadeService.recuperar
- backend/src/modules/execucao/services/execucao.service.ts:104-109 — iniciar pela rota só confere o dono

Como observar: Gestor: POST /api/v1/atividade com usuarioId de desenvolvedor X que não é membro da demanda. X: GET /api/v1/atividade/:id dá 403; PUT /api/v1/atividade/:id {"nome":"novo nome"} dá 200; POST /api/v1/execucao dá 201; iniciar pela IA falha com 403.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

**Antes:** gestor cria atividade para alguém em demanda de que a pessoa não é membro: a pessoa vê na lista, altera e inicia execução, mas `GET /atividade/:id` responde 403 (e a IA, que começa por `recuperar`, recusa).

**Opções:**

1. O dono sempre acessa a própria atividade (ler e alterar).
2. Criar atividade para alguém exige que a pessoa seja membro da demanda (ou a inclui).

## Entregáveis

1. Um helper privado de acesso à atividade na service, usado pelas quatro funções, com a regra escolhida.
2. Testes do caso "dono não membro".

## Critérios de Aceite

- Ao vivo: gestor cria atividade para um desenvolvedor em demanda de que ele não é membro; o desenvolvedor abre o detalhe sem 403 (ou a criação é recusada, na opção 2).
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

