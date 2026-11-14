# 371-desfazer-criacao-de-demanda-e-a-regra-de-exclusao.spec.md

> Task 43/61 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-054, A-055 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: Único executor lido cujo desfazer chama exclusão sem usuário e sem checagem de tipo própria.; Mesma regra em dois lugares com diferença (rota × executor de IA)..
> Severidade: Baixa. Área: backend/demanda. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

O desfazer de `CRIAR_DEMANDA` (que exclui a demanda criada) passa a ter regra explícita: hoje auxiliar e desenvolvedor, que não excluem demanda, excluem por `POST /proposta-ia/:id/desfazer`.

## Contexto

**A-054 · Baixa · Desfazer a criação de demanda exclui a demanda sem conferir quem pode excluir**

O desfazer de `CRIAR_DEMANDA` confere só a leitura (`demandaService.recuperar`) e chama `demandaService.excluir({ id })`, que não recebe usuário. Auxiliar e desenvolvedor, que pela regra não excluem demanda, excluem por POST /proposta-ia/:id/desfazer a demanda que a proposta criou (até 30 minutos, sem filhas nem atividades). A exceção não está na lista fechada de `sem-exclusao.ts` nem nas regras de referência.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- /home/user/Project-2.0/backend/src/modules/demanda/executores/criar-demanda.executor.ts:73-78 — `recuperar` (leitura), `possuiFilhasOuAtividades` e `this.demandaService.excluir({ id: demandaId })`
- /home/user/Project-2.0/backend/src/modules/demanda/services/demanda.service.ts:692 — `async excluir(dto: DemandaRecuperarDto)`, sem usuário ativo
- /home/user/Project-2.0/backend/src/modules/ferramenta-ia/domain/sem-exclusao.ts:9-14 — a lista fechada só tem desconectar demanda e excluir atividade
- /home/user/Project-2.0/backend/src/modules/projeto/executores/criar-projeto.executor.ts:45 — o desfazer equivalente do projeto chama `exigirGestor` antes de excluir

Como observar: Como AUXILIAR: confirmar uma proposta CRIAR_DEMANDA e em seguida POST /proposta-ia/<id>/desfazer. Regra de referência: auxiliar não exclui demanda. O código: 200 e a demanda fica excluída; membros, tags ou textos que outra pessoa pôs nela nesse intervalo saem junto.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-055 · Baixa · DemandaService.excluir não recebe usuário: o desfazer de CRIAR_DEMANDA exclui demanda para desenvolvedor e auxiliar**

A regra "só gestor exclui/restaura" mora apenas no @GestorOnly da rota; excluir e restaurar da service não têm parâmetro de usuário, ao contrário de criarConexao/excluirConexao, que repetem a regra na service por causa da IA. CriarDemandaExecutor.desfazer chama excluir para qualquer tipo: o dono da proposta exclui a demanda recém-criada se ela não tiver sub-demanda nem atividade e estiver no prazo. É uma exceção limitada, mas não está na lista de regras de referência (auxiliar e desenvolvedor não excluem demanda).

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/demanda/services/demanda.service.ts:692-706 — `excluir(dto)` sem usuarioAtivo e sem checagem de tipo; 709 — `restaurar(dto)` idem
- backend/src/modules/demanda/controllers/demanda.controller.ts:197-201 e 209-213 — @GestorOnly() é a única trava
- backend/src/modules/demanda/executores/criar-demanda.executor.ts:74-78 — desfazer: recuperar (só acesso), possuiFilhasOuAtividades e `this.demandaService.excluir({ id: demandaId })`
- backend/src/modules/proposta-ia/services/proposta-ia.service.ts:152-160 e 322-328 — desfazer exige proposta do usuário, confirmada e dentro do prazo
- backend/src/modules/demanda/services/demanda.service.ts:572 — comentário de criarConexao: "a regra mora aqui, além do @ExigePermissao da rota, porque a IA conecta demandas pelo executor"

Como observar: Como DESENVOLVEDOR: pedir à IA a criação de uma sub-demanda, confirmar o cartão e acionar o desfazer da proposta dentro do prazo. Esperado pela regra geral: desenvolvedor/auxiliar não exclui demanda. O código faz soft delete da demanda (DELETE /api/demanda/:id direto continua 403).

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

**Antes:** o executor confere só a leitura e chama `demandaService.excluir`, que não recebe usuário; a exceção não está em `sem-exclusao.ts` nem no documento.

**Opções:**

1. É exceção nomeada: quem criou pela proposta desfaz em até 30 minutos; escrever no `SYSTEM.SPEC.md` §14 e na lista de `sem-exclusao.ts`.
2. O executor confere a mesma permissão da rota de exclusão (só gestor).

## Entregáveis

1. A opção escolhida, e em qualquer caso recusar o desfazer quando a demanda já foi alterada por outra pessoa.
2. Teste do executor por tipo de usuário.

## Critérios de Aceite

- Teste: auxiliar desfaz (ou é recusado) conforme a opção; demanda alterada por outro não é excluída pelo desfazer.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.
