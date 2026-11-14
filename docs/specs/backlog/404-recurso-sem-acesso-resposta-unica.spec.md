# 404-recurso-sem-acesso-resposta-unica.spec.md

> Task 76/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-092, A-093, A-094, A-095, A-096 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-16.
> Severidade: Baixa. Área: backend (vários módulos). **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Quem não tem acesso a um registro recebe a mesma resposta de quem pede um id que não existe. Hoje projeto e demanda respondem 404, e atividade, execução, grafo, canal, grupo e proposta respondem 403, o que deixa os ids enumeráveis.

## Contexto

**A-092 · Baixa · Atividade e execução respondem 403 a quem não tem acesso; projeto e demanda respondem 404**

Confirmado no código: as services de atividade e execução buscam o registro sem recorte, respondem 404 se não existe e 403 se existe sem acesso, o que permite enumerar ids. Projeto devolve 404 de propósito e demanda aplica o recorte na consulta. O mesmo padrão vale para POST /atividade (demanda) e POST /execucao (atividade).

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/atividade/services/atividade.service.ts:166-178 — recuperar: 404 se não existe, 403 se sem vínculo
- backend/src/modules/atividade/services/atividade.service.ts:48-51 e 58-65 — criar: 404 da demanda antes do 403 de acesso
- backend/src/modules/execucao/services/execucao.service.ts:332-341 — recuperar: 404 e depois 403 'execução de outro usuário'
- backend/src/modules/execucao/services/execucao.service.ts:87-90 e 104-109 — iniciar: 404 da atividade, depois 403
- backend/src/modules/projeto/services/projeto.service.ts:125-143 — sem acesso lança ResourceNotFoundException 'para não revelar a existência'
- backend/src/modules/atividade/controllers/atividade.controller.ts:63 — Swagger documenta o 403 'Sem acesso à demanda desta atividade'

Como observar: Desenvolvedor sem vínculo: GET /api/v1/atividade/<id alheio existente> dá 403 e GET /api/v1/atividade/999999 dá 404; o mesmo em GET /api/v1/execucao/:id. Esperado, como em GET /demanda/:id e GET /projeto/:id: 404 nos dois casos.

Verificação na auditoria: medido na aplicação rodando em 2026-11-13 como desenvolvedor de outro projeto: `GET /demanda/:id` e `GET /projeto/:id` respondem 404; `GET /atividade/:id`, `GET /atividade/:id/tag`, `GET /execucao/:id`, `GET /demanda/grafo?projetoId=`, `GET /mensagem-direta/canal/demanda/:id` e `GET /mensagem-direta/grupo/:id` respondem 403 com mensagem que confirma a existência.

**A-093 · Baixa · Escritas de tag e de membro respondem 403 ao desenvolvedor em demanda de projeto sem acesso (as leituras respondem 404)**

alterarTagsDemanda, atribuirMembro e removerMembro leem a demanda sem o filtro de acesso ao projeto que as leituras avulsas usam. O desenvolvedor recebe 403 (ou 404 "Membro") quando a demanda existe em projeto que ele não vê e 404 "Demanda" quando não existe, o que confirma a existência do id. A mensagem de atribuirMembro ainda diz explicitamente que a demanda é de projeto sem acesso.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/demanda/services/demanda.service.ts:772 — alterarTagsDemanda chama `recuperar({ id: demandaId })` sem filtro; 777-781 lança 403 "Você só pode atribuir tags em demandas das quais é membro"
- backend/src/modules/demanda/services/demanda.service.ts:869 — atribuirMembro lê sem filtro; 881-888 lança 403 "Desenvolvedor não tem acesso ao projeto desta demanda"
- backend/src/modules/demanda/services/demanda.service.ts:935 — removerMembro lê sem filtro; 940-946 lança 403 e 949-951 lança 404 "Membro" (mensagem diferente de 404 "Demanda")
- backend/src/modules/demanda/services/demanda.service.ts:810-818 — listarTagsDemanda, com o filtro, devolve 404 para a mesma demanda

Como observar: Como DESENVOLVEDOR sem linha em demanda_usuario no projeto da demanda 99: PUT /api/demanda/99/tag {"tagIds":[]} ou POST /api/demanda/99/membro {"usuarioId": <o próprio id>}. Esperado: 404 "Demanda não encontrada" (igual a GET /api/demanda/99). O código responde 403; com id inexistente responde 404.

Verificação na auditoria: medido na aplicação rodando em 2026-11-13 como desenvolvedor de outro projeto: `GET /demanda/:id` e `GET /projeto/:id` respondem 404; `GET /atividade/:id`, `GET /atividade/:id/tag`, `GET /execucao/:id`, `GET /demanda/grafo?projetoId=`, `GET /mensagem-direta/canal/demanda/:id` e `GET /mensagem-direta/grupo/:id` respondem 403 com mensagem que confirma a existência.

**A-094 · Baixa · 403 no lugar de 404 revela a existência de demanda, projeto e grupo**

O canal busca a demanda sem filtro de acesso: id inexistente dá 404 e demanda de projeto que o desenvolvedor não vê dá 403, enquanto o `DemandaService` responde 404 nos dois casos. O grupo faz o mesmo (404 se não existe ou foi encerrado, 403 se existe), com texto que distingue canal de grupo livre. Na proposta do resumo, "A demanda escolhida não é deste projeto" sai antes da checagem de permissão.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/mensagem-direta/services/canal-acesso.service.ts:123-129 — `recuperar({ id })` sem filtro; 404 se não existe, 403 se existe
- backend/src/modules/demanda/services/demanda.service.ts:303-312 — desenvolvedor sem acesso recebe `ResourceNotFoundException('Demanda')`
- backend/src/modules/mensagem-direta/services/canal-acesso.service.ts:132-136 — projeto: 404 × 403
- backend/src/modules/mensagem-direta/services/grupo.service.ts:650-652 e :693-695 — grupo inexistente 404; existente 403 com mensagens diferentes para canal e grupo livre
- backend/src/modules/mensagem-direta/services/grupo-resumo-ia.service.ts:214-217 — 404 de demanda e erro de "não é deste projeto" antes da permissão

Como observar: DESENVOLVEDOR: `GET /mensagem-direta/canal/demanda/<id de demanda de projeto sem acesso>` → 403; `<id inexistente>` → 404 (esperado pelo padrão do módulo de demanda: 404 nos dois). Qualquer usuário: `GET /mensagem-direta/grupo/<id>` varrendo ids → 403 onde existe, 404 onde não.

Verificação na auditoria: medido na aplicação rodando em 2026-11-13 como desenvolvedor de outro projeto: `GET /demanda/:id` e `GET /projeto/:id` respondem 404; `GET /atividade/:id`, `GET /atividade/:id/tag`, `GET /execucao/:id`, `GET /demanda/grafo?projetoId=`, `GET /mensagem-direta/canal/demanda/:id` e `GET /mensagem-direta/grupo/:id` respondem 403 com mensagem que confirma a existência.

**A-095 · Baixa · Proposta de outro usuário responde 403 e a inexistente 404: os ids ficam enumeráveis**

`obterDoUsuario` distingue 'não existe' (404) de 'é de outro usuário' (403) em todas as rotas de /proposta-ia, enquanto `recuperarParaParticipante`, no mesmo arquivo, e a conversa do plano respondem 404 a quem não pode ver. Só a existência vaza. O 403 está escrito no SYSTEM.SPEC.md e coberto por teste, então mudar é decisão do autor.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/proposta-ia/services/proposta-ia.service.ts:323-327 — `ResourceNotFoundException` se não existe; `UnauthorizedAccessException('Esta proposta é de outro usuário')` se é de outro
- backend/src/modules/proposta-ia/services/proposta-ia.service.ts:312 — `recuperarParaParticipante` responde `ResourceNotFoundException` para proposta que não é de quem chamou a IA
- backend/src/modules/chat/controllers/chat.controller.ts:51 — conversa do plano: '404 para quem não o vê'
- docs/SYSTEM.SPEC.md:1254 — 'só as próprias (nem o administrador resolve a de outro: 403)'
- backend/src/modules/proposta-ia/services/proposta-ia.service.test.ts:206 — teste 'outro usuário e o administrador levam 403'

Como observar: Como DESENVOLVEDOR: GET /proposta-ia/1, /2, /3… 403 = existe e é de outro; 404 = não existe.

Verificação na auditoria: medido na aplicação rodando em 2026-11-13 como desenvolvedor de outro projeto: `GET /demanda/:id` e `GET /projeto/:id` respondem 404; `GET /atividade/:id`, `GET /atividade/:id/tag`, `GET /execucao/:id`, `GET /demanda/grafo?projetoId=`, `GET /mensagem-direta/canal/demanda/:id` e `GET /mensagem-direta/grupo/:id` respondem 403 com mensagem que confirma a existência.

**A-096 · Baixa · 403 no plano onde a demanda responde 404: revela existência de demanda e projeto sem acesso**

`recuperarDemandaEditavel` lê a demanda sem o recorte de acesso e responde 403 quando ela existe e 404 quando não existe. A `DemandaService` lê com o recorte do desenvolvedor e responde 404 para demanda de projeto sem acesso. É a mesma regra ("poder editar a demanda") escrita em dois lugares com diferença; o projeto tem o mesmo par 404/403 em `validarAcessoAoProjeto`.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/plano/services/plano.service.ts:254-259 — `demandaRepositorio.recuperar({ id: demandaId })` sem filtro; depois 403 'Você só pode ligar o plano a demandas das quais é membro'
- backend/src/modules/demanda/services/demanda.service.ts:451-457 — `recuperar({ id }, { usuarioId })` e `ResourceNotFoundException('Demanda')`
- backend/src/modules/demanda/repositories/demanda.repository.ts:264-283 — o filtro opcional é o EXISTS de demanda_usuario no projeto
- backend/src/modules/plano/services/plano.service.ts:266-271 — projeto: 404 se não existe, 403 'Você não tem acesso a este projeto' se existe

Como observar: DESENVOLVEDOR: POST /plano {"demandaId":<demanda de projeto sem acesso>} ou PUT /plano/:id/demanda {"demandaId":<idem>}. Esperado 404, como GET /demanda/:id. O código dá 403; com id inexistente dá 404. Mesmo par em POST /plano {"projetoId":...} e PATCH /plano/:id/projeto.

Verificação na auditoria: medido na aplicação rodando em 2026-11-13 como desenvolvedor de outro projeto: `GET /demanda/:id` e `GET /projeto/:id` respondem 404; `GET /atividade/:id`, `GET /atividade/:id/tag`, `GET /execucao/:id`, `GET /demanda/grafo?projetoId=`, `GET /mensagem-direta/canal/demanda/:id` e `GET /mensagem-direta/grupo/:id` respondem 403 com mensagem que confirma a existência.

## Decisão do autor pendente

O 403 de proposta alheia está escrito no `SYSTEM.SPEC.md` e coberto por teste; mudar é decisão do autor.

**Antes:** cada módulo escolheu a sua resposta.

**Opções:**

1. 404 em tudo que quem pede não enxerga (regra do projeto e da demanda); 403 só quando enxerga e não pode agir.
2. Manter como está e registrar no `SYSTEM.SPEC.md` §7.7 que 403 pode confirmar a existência.

Recomendação da auditoria: opção 1.

## Entregáveis

1. A regra escrita no `SYSTEM.SPEC.md` (§7.7 Exceções ou §11).
2. Na opção 1: atividade (`recuperar`, `listarTags`, criar em demanda sem acesso), execução (`recuperar`, iniciar em atividade sem acesso), grafo, escritas de tag e membro da demanda, canal, grupo e proposta passam a responder `ResourceNotFoundException` a quem não enxerga o registro.
3. Os testes que hoje esperam 403 nesses casos são ajustados; o front não depende do 403 (conferir os tratamentos de erro por status).

## Critérios de Aceite

- Repetir a varredura de leitura por perfil do dossiê: nas colunas dos desenvolvedores sem acesso, as rotas por id do projeto secreto respondem todas o mesmo status.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

