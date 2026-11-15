# 416-chat-abrir-conversa-lida-sem-put-de-leitura.spec.md

> Task 88/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-122 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/mensagem-direta.

## Objetivo

A primeira abertura de cada conversa ou grupo na sessão deixa de mandar `PUT .../leitura` quando a lista já diz que não há mensagem não lida.

## Contexto

**A-122 · Baixa · Abrir conversa ou grupo já lido envia PUT de leitura mesmo sem não lidas**

`marcarComoLida` decide só pela data da última mensagem do outro e por um mapa em memória que nasce vazio a cada carga da página; não olha `naoLidas` da lista. Na primeira abertura de cada conversa ou grupo por sessão sai um `PUT .../leitura` mesmo com zero não lidas. No backend, a leitura da conversa direta grava e publica `LEITURA` para as duas pessoas sem conferir se algo mudou.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:159 — `ultimaLeituraMarcada = new Map<number, number>()` (limpo em :240)
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:410-421 — as únicas condições são `ate` e `ultimaLeituraMarcada`; depois `this.api.alterarLeitura(...)`
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-grupo-estado.service.ts:273-280 — mesma lógica no grupo
- backend/src/modules/mensagem-direta/services/mensagem-direta.service.ts:368-378 — `alterarLeitura` grava e publica `LEITURA` para `[usuarioAtivo.sub, dto.usuarioId]` sem condição

Como observar: Recarregar a página, abrir o popup e clicar numa conversa sem contador de não lidas. Rede: GET /mensagem-direta/conversa/ID e, em seguida, PUT /mensagem-direta/conversa/ID/leitura. Vale igual para grupo (PUT /mensagem-direta/grupo/N/leitura).

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Entregáveis

1. `marcarComoLida` consulta `naoLidas` da linha da lista: com zero, só registra a data em memória; o `PUT` continua quando a lista ainda não carregou.
2. Teste do service de estado.

## Critérios de Aceite

- Ao vivo: abrir uma conversa sem não lidas faz só o `GET` da conversa.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

