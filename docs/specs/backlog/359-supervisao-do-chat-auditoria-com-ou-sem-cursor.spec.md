# 359-supervisao-do-chat-auditoria-com-ou-sem-cursor.spec.md

> Task 31/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-039, A-040 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Alta. Área: backend/mensagem-direta.

## Objetivo

Toda leitura da supervisão (grupo, canal e conversa um a um) fica registrada e avisada uma vez por dia por leitor e conversa, venha a requisição com cursor ou não. Hoje um gestor lê tudo sem rastro montando um cursor com data futura.

## Contexto

**A-039 · Alta · Supervisão de grupo e canal: qualquer cursor pula a auditoria e o aviso aos membros**

A auditoria e a mensagem "leu este grupo/canal" só acontecem quando a requisição vem sem `cursor`; com cursor as mensagens são entregues do mesmo jeito. O cursor é um base64url de `[instante, mensagemId]` sem assinatura nem vínculo com a conversa ou com uma abertura auditada, então o gestor monta um com data futura e recebe a página mais nova sem deixar rastro. O mesmo caminho serve ao canal lido por tipo em `GrupoService.listarMensagens`.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/mensagem-direta/services/grupo-supervisao.service.ts:128-131 — `if (!dto.cursor) { registrarLeituraDeGrupo(...); avisarMembros(...) }`: auditoria e aviso só sem cursor
- backend/src/modules/mensagem-direta/services/grupo-supervisao.service.ts:133 — `listarConversa({ conversaId, cursor: dto.cursor, ... })` devolve as mensagens com ou sem auditoria
- backend/src/modules/mensagem-direta/domain/mensagem-direta-consultas.ts:164-175 — `decodificarCursor` aceita qualquer base64url de `[número finito, string não vazia]`
- backend/src/modules/mensagem-direta/repositories/mensagem-direta-postgres.repository.ts:416-420 — `(created_date, mensagem_id) < (cursorData, cursorMensagemId)`: data futura no cursor traz a página mais nova
- backend/src/modules/mensagem-direta/repositories/mensagem-direta-postgres.repository.ts:673-679 — `lerCursor` só confere data válida e formato de UUID
- backend/src/modules/mensagem-direta/services/grupo.service.ts:371-372 — leitor por tipo do canal repassa `dto.cursor` a `lerGrupoSupervisionado`
- shared/src/dtos/grupo/GrupoSupervisaoLerDto.ts:10-13 — `cursor` validado só com `@IsString` e `@MaxLength`

Como observar: GESTOR, grupo livre só de desenvolvedores: `GET /mensagem-direta/supervisao/grupo/:grupoId?cursor=<base64url de [4102444800000,"00000000-0000-0000-0000-000000000000"]>` (ou `GET /mensagem-direta/grupo/:canalId/mensagens?cursor=...` num canal em que não é membro). Esperado: linha de auditoria e mensagem do sistema "..., gestor, leu este grupo". O código responde 200 com as mensagens mais novas, `membrosAvisados: false`, sem auditoria e sem aviso. Não executado: conclusão por leitura.

Verificação na auditoria: reproduzido na aplicação rodando em 2026-11-14 com um gestor recém-criado: `GET /mensagem-direta/supervisao/grupo/1?cursor=<forjado>` devolveu a conversa inteira, 0 linhas em `mensagem_direta_supervisao` e nenhuma mensagem de aviso no grupo; sem cursor, 1 auditoria e o aviso. O mesmo na conversa um a um (`/supervisao/conversa/5-6`): com cursor forjado, 200 com o texto e 0 auditorias.

**A-040 · Alta · Supervisão: cursor forjado lê a conversa inteira sem auditoria nem aviso**

A auditoria e o aviso aos participantes só acontecem quando a leitura vem sem `cursor`. O cursor é só base64url de `[milissegundos, mensagemId]`, que o cliente monta sozinho; com uma data futura a consulta devolve a página mais nova. O gestor lê tudo sem linha em `mensagem_direta_supervisao` e sem a mensagem do sistema.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/mensagem-direta/services/mensagem-direta-supervisao.service.ts:106 — `if (!dto.cursor)` envolve `registrarLeitura` (107) e `avisarParticipantes` (113); com cursor nada é gravado
- backend/src/modules/mensagem-direta/domain/mensagem-direta-consultas.ts:164-173 — `decodificarCursor` aceita qualquer JSON `[número finito, string]` em base64url
- backend/src/modules/mensagem-direta/repositories/mensagem-direta-postgres.repository.ts:673-679 — `lerCursor` só confere data válida e formato UUID
- backend/src/modules/mensagem-direta/repositories/mensagem-direta-postgres.repository.ts:415-421 — `(created_date, mensagem_id) < (cursor)` com ORDER BY DESC: cursor no futuro devolve as mensagens mais novas
- shared/src/dtos/mensagem-direta/MensagemDiretaSupervisaoLerDto.ts:11-14 — `cursor` é `@IsString` livre
- backend/src/modules/mensagem-direta/services/mensagem-direta-supervisao.service.test.ts:183-185 — o teste fixa o comportamento com `cursor: 'opaco'`

Como observar: Como GESTOR: GET /api/v1/mensagem-direta/supervisao/conversa/4-9?cursor=<base64url de [4102444800000,"ffffffff-ffff-ffff-ffff-ffffffffffff"]> (4 e 9 desenvolvedores). Esperado: auditoria gravada e aviso do dia (ou recusa do cursor sem abertura prévia). O código responde 200 com as mensagens mais novas, `participantesAvisados: false`, e não grava nada.

Verificação na auditoria: reproduzido na aplicação rodando em 2026-11-14 com um gestor recém-criado: `GET /mensagem-direta/supervisao/grupo/1?cursor=<forjado>` devolveu a conversa inteira, 0 linhas em `mensagem_direta_supervisao` e nenhuma mensagem de aviso no grupo; sem cursor, 1 auditoria e o aviso. O mesmo na conversa um a um (`/supervisao/conversa/5-6`): com cursor forjado, 200 com o texto e 0 auditorias.

## Entregáveis

1. Em `grupo-supervisao.service.ts` e `mensagem-direta-supervisao.service.ts`, antes de entregar qualquer página: se não há auditoria do dia para leitor + conversa, registrar e avisar; se há, seguir. A presença de `cursor` deixa de decidir.
2. O mesmo vale para o canal lido por tipo (gestor não membro).
3. Testes de integração: primeira chamada com cursor registra e avisa; chamadas seguintes do mesmo dia não duplicam; conversa um a um e grupo.

## Critérios de Aceite

- Repetir o roteiro da auditoria (`.artifacts/revisao-requisicoes-e-permissoes/`, descrito no dossiê): com cursor forjado a resposta continua 200 e a tabela ganha a linha do leitor, e o grupo recebe o aviso.
- `npm run test:integracao` com os casos novos.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Assinar ou amarrar o cursor à conversa; o que mais o gestor lê do canal sem abrir a conversa (spec `361-canal-leitura-por-tipo-sempre-auditada`).

## Dependências

Nenhuma.

## Riscos e Mitigação

A correção muda um comportamento que o comentário do código descreve como intencional ("as páginas com cursor continuam a mesma abertura"). A intenção continua atendida: quem já abriu hoje não gera auditoria nova.

