# 417-chat-lista-atualizada-pela-resposta.spec.md

> Task 89/98 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-110, A-111 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-13.
> Severidade: Baixa. Área: frontend/mensagem-direta.

## Objetivo

Enviar a primeira mensagem de uma conversa nova deixa de pedir `GET /mensagem-direta/conversas` duas vezes, e criar o chat de uma demanda ou projeto deixa de reler a lista inteira quando o `POST` já devolveu o grupo.

## Contexto

**A-110 · Baixa · Primeira mensagem de conversa nova: a resposta do POST e o evento do stream pedem a lista cada um**

`receberMensagem` chama `carregarConversas()` sempre que a conversa não está na lista, e roda duas vezes no envio: para a resposta de `POST /mensagem-direta/mensagem` e para o evento `MENSAGEM` do próprio envio. `carregarConversas` não reaproveita a requisição em voo; o contador de geração só descarta a resposta antiga. Grupo desconhecido segue o mesmo padrão.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:655 — `transmitir` chama `receberMensagem(resposta, false)`
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:735-737 — evento `MENSAGEM` chama `receberMensagem(..., true)`
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:800-801 — `if (resultado.conversaDesconhecida) recarga = this.carregarConversas()`
- frontend/src/app/modules/mensagem-direta/utils/mensagem-direta.util.ts:283-284 — conversa fora da lista devolve `conversaDesconhecida: true`
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:306-312 — `carregarConversas` incrementa a geração e sempre chama `listarConversas()`
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:926 — mesmo caminho para grupo desconhecido

Como observar: Popup → Nova conversa → escolher alguém com quem nunca falou → enviar. Rede: POST /mensagem-direta/mensagem e até 2× GET /mensagem-direta/conversas.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-111 · Baixa · "Criar chat" da demanda/projeto relê a lista inteira embora o POST devolva o grupo**

Depois de `POST /mensagem-direta/canal/...`, `abrirCanal` espera um `carregarConversas()` quando o canal não está na lista, em vez de inserir o grupo que a resposta trouxe, como `criarGrupo` faz. O backend ainda manda `SINCRONIZAR` aos membros e ao autor, que pede a lista outra vez. O resultado é uma cascata POST → GET /conversas (até duas vezes) → GET mensagens → GET fixadas; vale para quem é membro, porque gestor e administrador leem por tipo e pulam a recarga.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/mensagem-direta/components/mensagem-direta-canal-botao/mensagem-direta-canal-botao.component.ts:79 e :85 — `criarCanal(...).dados.grupo` e depois `estado.abrirCanal(canal)`
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:859-861 — `if (!canal.leituraPorSupervisao && !grupoDaLista(canal.grupoId)) await this.carregarConversas()` e só então `abrirGrupo`
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-grupo-estado.service.ts:521 — `criarGrupo` insere o criado na lista sem reler
- backend/src/modules/mensagem-direta/services/grupo.service.ts:222 — `sincronizar(criado.grupoId, [...membrosIds, usuarioAtivo.sub])` ao criar o canal

Como observar: Como desenvolvedor membro de uma demanda sem chat, abrir a demanda e clicar "Criar chat". Rede: POST /mensagem-direta/canal/demanda/ID, GET /mensagem-direta/conversas (uma ou duas vezes), GET /mensagem-direta/grupo/N/mensagens, GET .../fixadas.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. `carregarConversas` reaproveita a recarga em curso; a linha da conversa nova é montada com a resposta do `POST`.
2. `abrirCanal` insere na lista o canal devolvido pelo `POST` (o mesmo caminho de `criarGrupo`).
3. Testes do service de estado para os dois casos.

## Critérios de Aceite

- Ao vivo: primeira mensagem para alguém novo = `POST` e nenhuma recarga da lista; "Criar chat" = `POST` e nenhuma recarga.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

