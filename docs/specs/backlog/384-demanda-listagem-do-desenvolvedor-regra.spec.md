# 384-demanda-listagem-do-desenvolvedor-regra.spec.md

> Task 56/61 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-068 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: Código mais restritivo que a regra "vê qualquer demanda de projeto acessível"..
> Severidade: Baixa. Área: backend/demanda. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Alinhar a listagem com a regra escrita ("vê qualquer demanda de projeto acessível") ou escrever a exceção: hoje a lista devolve só as demandas em que o desenvolvedor é membro, enquanto grafo, detalhe e documentação usam o projeto acessível.

## Contexto

**A-068 · Baixa · GET /demanda entrega ao desenvolvedor só as demandas em que é membro, não as do projeto acessível**

A listagem restringe por linha própria em demanda_usuario, enquanto a regra e as demais leituras (grafo, :id, documentacao) usam "projeto acessível". A ferramenta de IA contorna juntando os nós do grafo com a listagem, sinal de que a diferença é conhecida.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/demanda/services/demanda.service.ts:196-199 — listar passa `{ usuarioId }` como restrição para quem não tem visão total
- backend/src/modules/demanda/repositories/demanda.repository.ts:333-339 — INNER JOIN demanda_usuario com `usuario_id = :usuarioId` na própria demanda
- backend/src/modules/demanda/ferramentas/listar-demandas-do-projeto.ferramenta.ts:32-47 — para o desenvolvedor usa recuperarGrafo e marca as "minhas" pela listagem
- backend/src/modules/demanda/services/demanda.service.regras.test.ts:255 — "listar: desenvolvedor lista só as demandas dele"

Como observar: Como DESENVOLVEDOR membro de 1 demanda num projeto com 10: GET /api/demanda?projetoId=<id>&allRows=true devolve 1 item; GET /api/demanda/grafo?projetoId=<id> devolve os 10 nós.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

**Antes:** a ferramenta de IA já contorna a diferença juntando os nós do grafo com a listagem.

**Opções:**

1. A listagem passa a seguir o projeto acessível.
2. A restrição é intencional: registrar no `SYSTEM.SPEC.md` §14.

## Entregáveis

1. A opção escolhida, com teste de integração do repository (opção 1) ou a linha no documento (opção 2).

## Critérios de Aceite

- Desenvolvedor com uma demanda num projeto de sete: `GET /demanda?projetoId=` devolve o que a regra escolhida manda.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima. Rodar `npm run impacto` na listagem: vários seletores dependem dela.
