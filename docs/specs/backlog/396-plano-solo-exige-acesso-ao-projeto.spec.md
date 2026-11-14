# 396-plano-solo-exige-acesso-ao-projeto.spec.md

> Task 68/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-083 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: backend/plano. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

O criador de um plano solo ligado a projeto deixa de ler e editar o plano (com o nome atual do projeto e da demanda, os textos, a conversa e as fontes) depois de ser retirado de todas as demandas do projeto.

## Contexto

**A-083 · Média · Plano solo de projeto continua com o criador depois que ele perde o acesso ao projeto**

No plano solo a regra olha só o criador e ignora o acesso ao projeto, tanto na leitura por id quanto na listagem. Um desenvolvedor retirado de todas as demandas do projeto segue lendo e editando o plano, com nome atual do projeto e da demanda, textos, conversa de todos e fontes. O SPEC diz apenas "solo só pelo criador" e não trata a perda de acesso, que conflita com "desenvolvedor só vê projeto com linha em demanda_usuario".

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- shared/src/utils/plano.ts:37 — `if (entrada.projetoId === null || entrada.solo) return entrada.usuarioId === entrada.criadorId;` decide antes de olhar `temAcessoAoProjeto`
- backend/src/modules/plano/services/plano.service.ts:236-250 — `podeAcessar` calcula `temAcessoAoProjeto`, mas o valor não é usado quando `solo` é true
- backend/src/modules/plano/repositories/plano.repository.ts:180 — `OR (plano.projeto_id IS NOT NULL AND plano.solo = true AND plano.usuario_id = :usuarioId)` sem o EXISTS de demanda_usuario
- backend/src/modules/chat/services/chat-plano.service.ts:152-153 — o plano devolvido carrega `projetoNome` e `demandaNome` lidos na hora

Como observar: DESENVOLVEDOR membro de uma demanda do projeto P: POST /plano {"projetoId":P}; PATCH /plano/:id/solo {"solo":true}. Gestor remove o desenvolvedor de todas as demandas de P. O mesmo desenvolvedor: GET /plano/:id, GET /chat/plano/:id, GET /plano/:id/fonte. Esperado: 404. O código responde 200 com projetoNome, demandaNome, textos, conversa e fontes.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

**Antes:** no ramo solo, `podeAcessarPlano` e a listagem olham só o criador.

**Opções:**

1. Solo de projeto exige criador E acesso ao projeto.
2. O solo sobrevive à perda do projeto: registrar no `SYSTEM.SPEC.md`.

Recomendação da auditoria: opção 1.

## Entregáveis

1. A regra em `podeAcessarPlano` (`shared/src/utils/plano.ts`) e no `listar` do repository.
2. Testes do `shared` e de integração para o criador sem acesso ao projeto.

## Critérios de Aceite

- Desenvolvedor cria plano solo num projeto, é removido de todas as demandas: `GET /plano/:id` responde 404 e o plano sai da lista.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

