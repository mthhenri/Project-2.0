# 375-execucao-permissao-antes-da-regra-de-negocio.spec.md

> Task 47/67 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-059 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-16.
> Severidade: Média. Área: backend/execucao.

## Objetivo

Em `iniciar` e `encerrar`, quem não pode agir sobre a atividade ou a execução recebe a recusa de permissão antes de qualquer resposta que revele status, tipo do dono ou situação da execução (é o R-16 da auditoria anterior, mais dois casos).

## Contexto

**A-059 · Média · Execução: regra de negócio respondida antes da permissão em iniciar (2 regras) e encerrar (1 regra)**

Em `iniciar`, o status da atividade e a descrição obrigatória são validados antes de conferir o dono; em `encerrar`, 'já foi encerrada' vem antes do dono. O desenvolvedor descobre, de atividade ou execução alheia, se o status é executável, se o dono é gestor (descrição dispensada) e se a execução está encerrada. `alterar` confere a permissão antes das datas; `registrar` e `excluir` são barrados no guard da rota.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/execucao/services/execucao.service.ts:92-94 — iniciar: BusinessException de status antes da permissão
- backend/src/modules/execucao/services/execucao.service.ts:96-99 — iniciar: 'A descrição é obrigatória' (depende do tipo do dono, :430-433) antes da permissão
- backend/src/modules/execucao/services/execucao.service.ts:104-109 — iniciar: só aqui o 403 de atividade alheia
- backend/src/modules/execucao/services/execucao.service.ts:201-203 e 205-210 — encerrar: 'Esta execução já foi encerrada' antes do 403
- backend/src/modules/execucao/services/execucao.service.ts:364-369 e 380-391 — alterar: permissão antes das datas (ordem correta)
- backend/src/modules/execucao/controllers/execucao.controller.ts:56 e 132 — registrar e excluir: @ExigePermissao antes de qualquer regra

Como observar: Desenvolvedor: POST /api/v1/execucao {"atividadeId":<alheia PENDENTE>,"descricao":"x"} dá 400 da regra de status (esperado 403). POST sem descricao em atividade alheia executável: 400 'A descrição é obrigatória' se o dono é desenvolvedor/auxiliar, 403 se é gestor. PATCH /api/v1/execucao/<alheia encerrada>/encerrar {} dá 400 'já foi encerrada' (esperado 403).

Verificação na auditoria: reproduzido na aplicação rodando: desenvolvedor sem acesso recebe 400 "Só é possível iniciar execução em atividades planejadas ou em desenvolvimento" (atividade pendente), 400 "A descrição é obrigatória" (atividade planejada) e 400 "Esta execução já foi encerrada" em `PATCH /execucao/:id/encerrar`; era para ser 403 nos três.

## Entregáveis

1. Em `ExecucaoService.iniciar` e `encerrar`, o bloco de permissão sobe para logo depois do "não encontrado".
2. Testes que fixam a ordem: desenvolvedor sobre atividade alheia em status não executável, sem descrição, e sobre execução alheia encerrada recebe a exceção de acesso.

## Critérios de Aceite

- Repetir os três pedidos do roteiro: nenhum responde 400.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Trocar 403 por 404 (spec `390-recurso-sem-acesso-resposta-unica`).

## Dependências

Nenhuma.

