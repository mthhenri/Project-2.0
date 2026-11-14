# 367-ferramentas-de-atividade-conferem-o-acesso-a-demanda.spec.md

> Task 39/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-051, A-052, A-053 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Alta. Área: backend/atividade.

## Objetivo

As ferramentas `propor_criar_atividade` e `propor_mover_atividade` e a `AtividadeService` deixam de revelar a um desenvolvedor o nome, o caminho e a situação de demanda de projeto que ele não vê.

## Contexto

**A-051 · Alta · propor_criar_atividade revela o caminho de demanda de projeto sem acesso ao desenvolvedor**

A ferramenta (permissão QUALQUER) lê a demanda e os ancestrais direto no repositório, sem conferir acesso, e grava `demandaNome` (raiz › … › demanda) na proposta. O desenvolvedor lê esse dado no cartão e em GET /proposta-ia/:id, mesmo que a criação seja barrada depois pela `AtividadeService.criar`. A leitura HTTP da mesma demanda não vaza (já medido).

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/atividade/ferramentas/propor-criar-atividade.ferramenta.ts:40 — `this.demandaRepositorio.recuperar({ id: entrada.demandaId })`, sem usuário nem recorte de acesso
- backend/src/modules/atividade/ferramentas/propor-criar-atividade.ferramenta.ts:54-57 — `listarAncestral` e `demandaNome: [...ancestrais.map(nome), demanda.nome].join(' › ')` gravado nos dados da proposta
- backend/src/modules/atividade/services/atividade.service.ts:58-64 — o acesso (`validarAcessoDemanda`) só é conferido na criação, depois de a proposta existir
- backend/src/modules/proposta-ia/services/proposta-ia.service.ts:102-105 — `recuperarPorId` devolve a proposta inteira (com `dados`) ao dono
- backend/src/modules/ferramenta-ia/ferramentas/ferramenta-proposta-ia.ts:10 — o comentário diz que nenhuma ferramenta de proposta acessa service de domínio; esta injeta `DemandaRepository` e `UsuarioService`

Como observar: Como DESENVOLVEDOR: POST /chat/mensagem {"texto":"crie a atividade Teste na demanda de id N"}, com N de projeto sem acesso; pegar o propostaId do evento `proposta` e chamar GET /proposta-ia/<id>. Esperado: a ferramenta recusa como demanda não encontrada e nenhuma proposta nasce. O código: 200 com `dados.demandaNome` = caminho completo da demanda (com a proposta em 'Faz e avisa' a criação falha, mas a proposta EXPIRADA guarda o mesmo dado).

Verificação na auditoria: código lido pelo agente principal: `propor-criar-atividade.ferramenta.ts:40` e `:54` leem a demanda e os ancestrais no repository sem usuário e gravam o caminho em `demandaNome`; `atividade.service.ts:253` confere existência e status do destino antes do acesso. A IA não foi exercitada (sem provedor no ambiente).

**A-052 · Alta · Mover atividade responde nome e status da demanda de destino antes de conferir o acesso**

`propor_mover_atividade` lê a demanda de destino no repositório, sem acesso, e devolve o nome dela na mensagem de erro (concluída/cancelada) ou em `demandaDestinoNome` da proposta. A `AtividadeService` repete a ordem: o 404 e o status do destino saem antes do 403 de acesso. O desenvolvedor dono de uma atividade descobre existência, nome e situação de demanda de projeto que não vê.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/atividade/ferramentas/propor-mover-atividade.ferramenta.ts:45-48 — `demandaRepositorio.recuperar({ id: entrada.demandaDestinoId })` e a mensagem `A demanda "${destino.nome}" está concluída/cancelada`
- backend/src/modules/atividade/ferramentas/propor-mover-atividade.ferramenta.ts:56 — `demandaDestinoNome: destino.nome` gravado na proposta
- backend/src/modules/atividade/services/atividade.service.ts:253-259 — 404 'Demanda de destino' e 'está concluída/cancelada' antes do acesso
- backend/src/modules/atividade/services/atividade.service.ts:260-264 — `validarAcessoDemanda` do destino só depois
- backend/src/modules/demanda/ferramentas/propor-criar-demanda.ferramenta.ts:61-64 — mesma leitura direta da demanda pai (distingue 'não encontrada' de 'deve pertencer ao mesmo projeto')

Como observar: Como DESENVOLVEDOR dono da atividade A: editar A pela rota de alteração da atividade com `demandaId` = N de projeto sem acesso. Esperado: a mesma resposta para todo N que ele não vê. O código: 404 se N não existe, erro de negócio 'está concluída/cancelada' se fechada, 403 se aberta. Pelo chat: pedir para mover A para a demanda N e ler `dados.demandaDestinoNome` em GET /proposta-ia/<id>.

Verificação na auditoria: código lido pelo agente principal: `propor-criar-atividade.ferramenta.ts:40` e `:54` leem a demanda e os ancestrais no repository sem usuário e gravam o caminho em `demandaNome`; `atividade.service.ts:253` confere existência e status do destino antes do acesso. A IA não foi exercitada (sem provedor no ambiente).

**A-053 · Alta · Ferramentas propor_criar_atividade e propor_mover_atividade revelam nome, caminho e status de demanda sem acesso**

As duas ferramentas (permissão QUALQUER) leem a demanda pelo repository sem o recorte de acesso e põem o nome na proposta: caminho completo dos ancestrais ao criar; nome e status (concluída/cancelada) ao mover. O acesso do desenvolvedor só é conferido ao confirmar, na service, que ainda responde 404 e status do destino antes do acesso. Não li a classe base da proposta nem a exibição do cartão.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/atividade/ferramentas/propor-criar-atividade.ferramenta.ts:39-41 — `demandaRepositorio.recuperar({ id })` sem usuarioId, sem conferir vínculo
- backend/src/modules/atividade/ferramentas/propor-criar-atividade.ferramenta.ts:54-57 — `demandaNome` = ancestrais › demanda gravado na proposta
- backend/src/modules/atividade/ferramentas/propor-mover-atividade.ferramenta.ts:45-49 — destino sem recorte; mensagem 'A demanda "nome" está concluída/cancelada'
- backend/src/modules/atividade/ferramentas/propor-mover-atividade.ferramenta.ts:56 — `demandaDestinoNome: destino.nome` na proposta
- backend/src/modules/demanda/services/demanda.service.ts:303-313 — a leitura normal aplica `{ usuarioId }` e responde 404 sem acesso
- backend/src/modules/atividade/services/atividade.service.ts:253-265 — validarMudancaDeDemanda: 404 e status do destino antes do acesso ao destino

Como observar: Desenvolvedor, no chat (POST /api/v1/chat/mensagem): 'crie a atividade teste na demanda <id de projeto sem acesso>'. Esperado: 'Demanda não encontrada'. O código cria a proposta com o caminho completo da demanda; só o confirmar responde 403. O mesmo com 'mova minha atividade X para a demanda <id>'.

Verificação na auditoria: código lido pelo agente principal: `propor-criar-atividade.ferramenta.ts:40` e `:54` leem a demanda e os ancestrais no repository sem usuário e gravam o caminho em `demandaNome`; `atividade.service.ts:253` confere existência e status do destino antes do acesso. A IA não foi exercitada (sem provedor no ambiente).

## Entregáveis

1. `propor-criar-atividade.ferramenta.ts`: a demanda é lida pela `DemandaService.recuperar(..., usuarioAtivo)` (ou a validação de acesso equivalente) antes de montar `demandaNome`.
2. `propor-mover-atividade.ferramenta.ts` e `AtividadeService.validarMudancaDeDemanda`: o acesso ao destino é conferido antes de responder existência, nome ou status; quem não vê recebe "não encontrada".
3. Testes das duas ferramentas e da service com desenvolvedor sem acesso ao projeto da demanda.

## Critérios de Aceite

- Teste: desenvolvedor sem acesso pede as duas propostas e a resposta não contém nome, caminho nem status da demanda; com acesso, o comportamento não muda.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

As demais ferramentas (as que repassam `usuarioAtivo` à service já recortam).

## Dependências

Nenhuma.

