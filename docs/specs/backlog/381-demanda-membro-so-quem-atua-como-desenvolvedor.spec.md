# 381-demanda-membro-so-quem-atua-como-desenvolvedor.spec.md

> Task 53/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-068 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: backend/demanda.

## Objetivo

A regra "gestor e administrador nunca entram em `demanda_usuario`" passa a valer na `DemandaService`. Hoje ela só existe no filtro do seletor da tela e no caminho da IA.

## Contexto

**A-068 · Média · POST /demanda/:id/membro e usuarioIds do POST /demanda aceitam gestor, administrador e usuário inativo como membro**

A service só confere que o usuário alvo existe; não aplica podeSerMembroDeDemanda nem olha `ativo`. A regra "gestor nunca entra em demanda_usuario" está só na tela (filtro do seletor) e no caminho da IA (ferramenta e executor), cujo comentário reconhece a lacuna da service. Qualquer condutor (auxiliar, gestor, administrador) grava a linha proibida chamando a rota direto.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/demanda/services/demanda.service.ts:892-895 — atribuirMembro só testa `if (!usuarioEncontrado)`; 905-908 grava em demanda_usuario sem olhar tipo nem ativo
- backend/src/modules/demanda/services/demanda.service.ts:134-139 — criar: o laço de membroIds só confere existência; 149-154 e 156-170 gravam os usuarioIds
- backend/src/modules/demanda/executores/atribuir-membro.executor.ts:40-45 — comentário "A DemandaService.atribuirMembro não confere o tipo do alvo" e as travas `!podeSerMembroDeDemanda(dono.tipo)` (44) e `!dono.ativo` (45) só aqui
- backend/src/modules/demanda/ferramentas/propor-atribuir-membro.ferramenta.ts:49-52 — a ferramenta recusa gestor e inativo
- frontend/src/app/modules/demanda/components/demanda-detalhe-base/demanda-detalhe.base.ts:414 — a tela filtra a lista por podeSerMembroDeDemanda (trava só de interface)
- backend/src/modules/demanda/services/demanda.service.regras.test.ts:523 — teste "gestor atribui qualquer usuário" sem caso de alvo gestor; ferramentas/atribuir-membro.test.ts:141 — título diz "a service não confere o tipo"

Como observar: Como AUXILIAR (ou GESTOR): POST /api/demanda/{id}/membro com corpo {"usuarioId": <id de um GESTOR ou de usuário inativo>}. Esperado pela regra: 400/403 recusando. O código responde 201 "Membro atribuído à demanda com sucesso". Mesmo efeito com POST /api/demanda e "usuarioIds": [<id do gestor>].

Verificação na auditoria: reproduzido na aplicação rodando em 2026-11-14: `POST /demanda/:id/membro` com o id de um gestor respondeu 201 para auxiliar e para administrador; `POST /demanda` com `usuarioIds: [gestor, administrador]` criou a demanda com os dois em `demanda_usuario`.

## Entregáveis

1. `DemandaService.atribuirMembro` e `criar` (campo `usuarioIds`) recusam alvo que não passa em `podeSerMembroDeDemanda` e alvo inativo.
2. A conferência duplicada sai do executor e da ferramenta de IA de atribuir membro.
3. Testes por tipo de alvo (desenvolvedor, auxiliar, gestor, administrador, inativo).
4. Consulta de conferência no relatório da task: quantas linhas de `demanda_usuario` hoje apontam para gestor ou administrador (corrigir dados é decisão do autor).

## Critérios de Aceite

- Repetir o roteiro: as duas chamadas respondem 400 com mensagem clara e nenhuma linha é gravada.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Limpar linhas já gravadas no banco de produção.

## Dependências

Nenhuma.

