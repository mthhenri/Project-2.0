# 386-conexao-entre-projetos-regra.spec.md

> Task 58/61 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-070 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: Responde ao foco "conexões entre projetos diferentes": sem brecha para o desenvolvedor, regra de negócio em aberto para condutores..
> Severidade: Baixa. Área: backend/demanda. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Decidir se `criarConexao` aceita origem e destino de projetos diferentes. Hoje aceita (para quem conduz o trabalho), embora o grafo seja lido por projeto.

## Contexto

**A-070 · Baixa · criarConexao não confere se origem e destino são do mesmo projeto**

A service só valida existência, auto-referência, duplicidade e ciclo; nada compara os projetos das duas demandas, embora o grafo seja lido por projeto. O desenvolvedor não chega aqui (é barrado na rota e na service), então não há ligação com projeto sem acesso; resta saber se conexão entre projetos é permitida para condutores, o que o resumo de regras não diz.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/demanda/services/demanda.service.ts:583-599 — origem e destino lidos e comparados só por id
- backend/src/modules/demanda/services/demanda.service.ts:578-580 e controllers/demanda.controller.ts:221 — podeEditarDemanda barra o desenvolvedor
- backend/src/modules/demanda/services/demanda.service.ts:752 — recuperarGrafo lê por `projetoId`

Como observar: Como AUXILIAR: POST /api/demanda/{id do projeto 1}/conexao {"demandaDestinoId": <id do projeto 2>, "bidirecional": false}. O código responde 201; conferir em GET /api/demanda/grafo?projetoId=1 como a aresta aparece.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

**Antes:** a service valida existência, auto-referência, duplicidade e ciclo; não compara os projetos.

**Opções:**

1. Conexão entre projetos é válida: registrar no documento.
2. Não é: recusar em `criarConexao` e em `propor_conectar_demanda`.

## Entregáveis

1. A opção escolhida, com teste e a regra no `SYSTEM.SPEC.md` §14 (Grafo de Demandas).

## Critérios de Aceite

- Teste da service com demandas de dois projetos.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.
