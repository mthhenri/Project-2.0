# 372-ia-consultar-demanda-e-grafo-para-o-desenvolvedor.spec.md

> Task 44/61 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-056 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: Caso inverso do foco: aqui a ferramenta é mais estreita que a rota..
> Severidade: Baixa. Área: backend/demanda. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Resolver a diferença entre a rota HTTP e a IA: o desenvolvedor vê a demanda e o grafo dos projetos dele pela tela, mas as duas ferramentas de leitura declaram permissão de auxiliar.

## Contexto

**A-056 · Baixa · consultar_demanda e consultar_grafo_do_projeto são vedadas ao desenvolvedor, que vê as duas coisas pela rota HTTP**

As duas ferramentas de leitura declaram `permissao = 'AUXILIAR'`, embora chamem `DemandaService.recuperar` e `recuperarGrafo` com o usuário do token, que já recortam por acesso. O desenvolvedor lista as demandas do projeto pela IA (`listar_demandas_do_projeto`, QUALQUER) mas não consulta nenhuma, nem a própria. O motivo não está nas regras de referência; pode ser intencional.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- /home/user/Project-2.0/backend/src/modules/atividade/ferramentas/consultar-demanda.ferramenta.ts:28 — `permissao = 'AUXILIAR'`; :39 — `demandaService.recuperar({ id }, usuarioAtivo)`
- /home/user/Project-2.0/backend/src/modules/demanda/ferramentas/consultar-grafo-do-projeto.ferramenta.ts:21 — `permissao = 'AUXILIAR'`; :29 — `demandaService.recuperarGrafo({ projetoId }, usuarioAtivo)`
- /home/user/Project-2.0/backend/src/modules/demanda/ferramentas/listar-demandas-do-projeto.ferramenta.ts:23 e :46-47 — QUALQUER, e o caminho do desenvolvedor usa o mesmo `recuperarGrafo`
- /home/user/Project-2.0/backend/src/modules/ferramenta-ia/services/ferramenta-ia.registro.ts:55 — a ferramenta nem é listada ao modelo para quem não passa em `usuarioPodeUsar`

Como observar: Como DESENVOLVEDOR membro da demanda D: a leitura HTTP de D responde 200; no chat, pedir os detalhes de D: `consultar_demanda` não existe para o modelo e ele responde sem os dados.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

**Antes:** o desenvolvedor lista as demandas do projeto pela IA e não consegue consultar nenhuma, nem a própria.

**Opções:**

1. Abrir as duas ferramentas a qualquer tipo (a service já recorta por acesso).
2. Manter e escrever o motivo no `SYSTEM.SPEC.md`.

Recomendação da auditoria: opção 1.

## Entregáveis

1. A opção escolhida, com o teste de permissão das ferramentas ajustado (`ferramenta-ia.permissao.test.ts`).

## Critérios de Aceite

- Teste da ferramenta como desenvolvedor: demanda de projeto acessível responde; de projeto sem acesso, "não encontrada".
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.
