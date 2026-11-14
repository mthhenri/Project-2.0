# 359-supervisao-do-chat-auditoria-com-ou-sem-cursor.spec.md

> Task 31/61 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-039, A-040 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: Mesma raiz do achado de leitura por tipo sem auditoria (fixadas e última mensagem); o padrão pode se repetir na supervisão um a um, não lida..
> Severidade: Alta. Área: backend/mensagem-direta.

## Objetivo

Toda leitura da supervisão (grupo, canal e conversa um a um) fica registrada e avisada uma vez por dia por leitor e conversa, venha a requisição com cursor ou não. Hoje um gestor lê tudo sem rastro montando um cursor com data futura.

## Contexto

**A-039 · Alta · Supervisão de grupo e canal: qualquer cursor pula a auditoria e o aviso aos membros**

A auditoria e a mensagem "leu este grupo/canal" só acontecem quando a requisição vem sem `cursor`; com cursor as mensagens são entregues do mesmo jeito. O cursor é um base64url de `[instante, mensagemId]` sem assinatura nem vínculo com a conversa ou com uma abertura auditada, então o gestor monta um com data futura e recebe a página mais nova sem deixar rastro. O mesmo caminho serve ao canal lido por tipo em `GrupoService.listarMensagens`.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- /home/user/Project-2.0/backend/src/modules/mensagem-direta/services/grupo-supervisao.service.ts:128-131 — `if (!dto.cursor) { registrarLeituraDeGrupo(...); avisarMembros(...) }`: auditoria e aviso só sem cursor
- /home/user/Project-2.0/backend/src/modules/mensagem-direta/services/grupo-supervisao.service.ts:133 — `listarConversa({ conversaId, cursor: dto.cursor, ... })` devolve as mensagens com ou sem auditoria
- /home/user/Project-2.0/backend/src/modules/mensagem-direta/domain/mensagem-direta-consultas.ts:164-175 — `decodificarCursor` aceita qualquer base64url de `[número finito, string não vazia]`
- /home/user/Project-2.0/backend/src/modules/mensagem-direta/repositories/mensagem-direta-postgres.repository.ts:416-420 — `(created_date, mensagem_id) < (cursorData, cursorMensagemId)`: data futura no cursor traz a página mais nova
- /home/user/Project-2.0/backend/src/modules/mensagem-direta/repositories/mensagem-direta-postgres.repository.ts:673-679 — `lerCursor` só confere data válida e formato de UUID
- /home/user/Project-2.0/backend/src/modules/mensagem-direta/services/grupo.service.ts:371-372 — leitor por tipo do canal repassa `dto.cursor` a `lerGrupoSupervisionado`
- /home/user/Project-2.0/shared/src/dtos/grupo/GrupoSupervisaoLerDto.ts:10-13 — `cursor` validado só com `@IsString` e `@MaxLength`

Como observar: GESTOR, grupo livre só de desenvolvedores: `GET /mensagem-direta/supervisao/grupo/:grupoId?cursor=<base64url de [4102444800000,"00000000-0000-0000-0000-000000000000"]>` (ou `GET /mensagem-direta/grupo/:canalId/mensagens?cursor=...` num canal em que não é membro). Esperado: linha de auditoria e mensagem do sistema "..., gestor, leu este grupo". O código responde 200 com as mensagens mais novas, `membrosAvisados: false`, sem auditoria e sem aviso. Não executado: conclusão por leitura.

Verificação na auditoria: reproduzido na aplicação rodando em 2026-11-14 com um gestor recém-criado: `GET /mensagem-direta/supervisao/grupo/1?cursor=<forjado>` devolveu a conversa inteira, 0 linhas em `mensagem_direta_supervisao` e nenhuma mensagem de aviso no grupo; sem cursor, 1 auditoria e o aviso.

**A-040 · Alta · A supervisão das conversas um a um tem o mesmo desvio pelo cursor**

`MensagemDiretaSupervisaoService` só registra a leitura e avisa os dois participantes quando a requisição vem sem `cursor` (`mensagem-direta-supervisao.service.ts:106`). Com um cursor montado à mão a conversa inteira é entregue sem registro.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/mensagem-direta/services/mensagem-direta-supervisao.service.ts:106 — `if (!dto.cursor) {` envolve a auditoria e o aviso

Como observar: Como gestor sem leitura registrada: `GET /mensagem-direta/supervisao/conversa/5-6?cursor=<base64url de [instante futuro, uuid]>` responde 200 com as mensagens e a tabela `mensagem_direta_supervisao` continua sem linha do leitor.

Verificação na auditoria: reproduzido na aplicação rodando em 2026-11-14 com um gestor recém-criado: com o cursor forjado, 200 com o texto das mensagens e 0 auditorias; sem cursor, 1 auditoria.

## Entregáveis

1. Em `grupo-supervisao.service.ts` e `mensagem-direta-supervisao.service.ts`, antes de entregar qualquer página: se não há auditoria do dia para leitor + conversa, registrar e avisar; se há, seguir. A presença de `cursor` deixa de decidir.
2. O mesmo vale para o canal lido por tipo (gestor não membro).
3. Testes de integração: primeira chamada com cursor registra e avisa; chamadas seguintes do mesmo dia não duplicam; conversa um a um e grupo.

## Critérios de Aceite

- Repetir o roteiro da auditoria (`.artifacts/revisao-requisicoes-e-permissoes/`, descrito no dossiê): com cursor forjado a resposta continua 200 e a tabela ganha a linha do leitor, e o grupo recebe o aviso.
- `npm run test:integracao` com os casos novos.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Assinar ou amarrar o cursor à conversa; o que mais o gestor lê do canal sem abrir a conversa (spec `canal-leitura-por-tipo-sempre-auditada`).

## Dependências

Nenhuma.

## Riscos e Mitigação

A correção muda um comportamento que o comentário do código descreve como intencional ("as páginas com cursor continuam a mesma abertura"). A intenção continua atendida: quem já abriu hoje não gera auditoria nova.
