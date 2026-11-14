# 362-grupo-privado-e-a-volta-da-supervisao.spec.md

> Task 34/61 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-043 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: Regra de supervisão do código; não conferi se está escrita no documento..
> Severidade: Média. Área: backend/mensagem-direta. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

O que o sistema promete aos membros ("a conversa agora é privada e a supervisão não a lê") passa a bater com o que acontece quando o gestor sai do grupo.

## Contexto

**A-043 · Média · Grupo "privado" volta à supervisão quando o gestor sai, com todo o histórico e sem aviso**

A mensagem do sistema promete que "a conversa agora é privada e a supervisão não a lê", mas a elegibilidade é só dos membros de agora. Quando o último gestor sai, outro gestor lê tudo, inclusive o que foi escrito no período privado, e os membros recebem apenas "X saiu do grupo". O comportamento é intencional (há teste), mas contradiz o texto mostrado aos membros.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- /home/user/Project-2.0/backend/src/modules/mensagem-direta/domain/grupo-regras.ts:84 — texto "a conversa agora é privada e a supervisão não a lê"
- /home/user/Project-2.0/backend/src/modules/mensagem-direta/services/grupo-supervisao.service.ts:118-123 — elegibilidade pelos tipos dos membros atuais
- /home/user/Project-2.0/backend/src/modules/mensagem-direta/repositories/grupo.repository.ts:339-375 — `listarIdsSupervisionaveis` olha só `saida_data IS NULL`
- /home/user/Project-2.0/backend/src/modules/mensagem-direta/services/grupo-supervisao.service.ts:133 — `listarConversa` sem recorte de data: o período privado vem junto
- /home/user/Project-2.0/backend/src/modules/mensagem-direta/services/grupo.service.ts:306-310 — na saída só `textoDeSaidaDoGrupo`; nenhum aviso de que a supervisão volta a ler
- /home/user/Project-2.0/backend/src/modules/mensagem-direta/services/grupo.service.integracao.test.ts:424 — teste "o gestor sair do grupo o torna legível de novo"

Como observar: Grupo livre com GESTOR A e dois desenvolvedores, com mensagens; A chama `DELETE /mensagem-direta/grupo/:grupoId/membro`; GESTOR B chama `GET /mensagem-direta/supervisao/grupo/:grupoId` → 200 com todas as mensagens, inclusive as de A. Esperado pelo texto mostrado: o período privado não é lido.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

**Antes:** a elegibilidade para supervisão olha só os membros de agora: quando o último gestor sai, outro gestor lê todo o histórico, inclusive o período privado, e os membros veem apenas "X saiu do grupo". Há teste que fixa esse comportamento.

**Opções:**

1. A supervisão lê só o que foi escrito depois da saída do último gestor.
2. O texto deixa de prometer privacidade e a saída do gestor avisa os membros de que a supervisão volta a ler.

## Entregáveis

1. A opção escolhida em `grupo-supervisao.service.ts` e `domain/grupo-regras.ts`, com o teste existente ajustado e a regra no `SYSTEM.SPEC.md` §12.

## Critérios de Aceite

- Teste de integração do cenário: gestor entra, mensagens são trocadas, gestor sai, outro gestor abre a supervisão.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.
