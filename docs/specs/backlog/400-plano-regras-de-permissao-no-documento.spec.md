# 400-plano-regras-de-permissao-no-documento.spec.md

> Task 72/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-087, A-088 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: docs e backend/plano.

## Objetivo

O documento passa a dizer quem pode o quê no plano (arquivar e excluir, solo, atribuir projeto, fontes, pontos, e o que vale para o auxiliar) e deixa de se contradizer sobre a aba do cliente.

## Contexto

**A-087 · Baixa · SPEC se contradiz sobre quem lê a aba do cliente no plano**

A linha da tabela de módulos diz que a descrição do cliente do plano "só existe para gestor e administrador" e que "para o desenvolvedor nem vem na resposta". A tabela de permissões diz que todos leem (task 254), e é isso que o código faz. Sobrou código da regra antiga: `podeVerAbaDoPlano` devolve sempre true e a ferramenta ainda testa `'descricaoCliente' in plano`.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- docs/SYSTEM.SPEC.md:1256 — "A descrição do cliente só existe para gestor e administrador (`podeVerAbaDoPlano`...): para o desenvolvedor nem vem na resposta"
- docs/SYSTEM.SPEC.md:1414 — "todos leem (task 254), no chat e no plano também"
- shared/src/utils/plano.ts:10-12 — `podeVerAbaDoPlano` devolve `true`
- backend/src/modules/plano/services/plano.service.ts:94-98 — `recuperar` devolve os três textos a todos
- backend/src/modules/plano/ferramentas/consultar-plano.ferramenta.ts:38 — `'descricaoCliente' in plano`

Como observar: DESENVOLVEDOR: GET /plano/:id. Pela linha 1256 do SPEC, `descricaoCliente` não viria; o código (e a linha 1414) devolve o campo.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-088 · Baixa · Regras de arquivar, excluir, solo, atribuir projeto e fontes não estão escritas no SPEC**

O código decide que arquivar e excluir são do criador, do gestor e do administrador (auxiliar não criador recebe 403), que solo e atribuir projeto são só do criador, e que qualquer pessoa com acesso remove a fonte trazida por outra. O trecho do SPEC que lista as rotas não diz quem pode, e a busca pelos termos não achou a regra em outro lugar. Para o auxiliar não há regra escrita nenhuma sobre plano.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- shared/src/utils/plano.ts:42-44 — arquivar/excluir: `usuarioId === criadorId || temPermissaoDeGestor(tipoUsuario)`
- backend/src/modules/plano/services/plano.service.ts:129 e 179 — solo e atribuir projeto só para `plano.criadorId === usuarioAtivo.sub`
- backend/src/modules/plano/services/plano-fonte.service.ts:64-69 — `excluir` confere só o acesso ao plano, não quem trouxe a fonte
- docs/SYSTEM.SPEC.md:1256 — lista `/solo`, `/arquivo` e `/projeto` sem dizer quem pode
- grep em docs/SYSTEM.SPEC.md por "quem criou o plano|criador do plano|só o criador|/plano/:id/fonte|plano_fonte|podeArquivarOuExcluirPlano" não retorna nada

Como observar: AUXILIAR não criador: PATCH /plano/:id/arquivo {"arquivado":true} → 403 pelo código, sem regra escrita. DESENVOLVEDOR com acesso ao plano: DELETE /plano/:id/fonte/:fonteId de fonte de um colega → 200.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. No `SYSTEM.SPEC.md` §12, linha `plano`: a regra da task 254 (todos leem a descrição do cliente) no lugar de "só existe para gestor e administrador", e a linha de permissão por tipo conforme o código (criador, gestor e administrador arquivam e excluem; solo e atribuir projeto só o criador; quem acessa remove fonte).
2. Remover `podeVerAbaDoPlano` (devolve sempre `true`) e o que mais sobrou da regra antiga, depois de `npm run impacto`.

## Critérios de Aceite

- O texto do documento bate com os testes de `shared/src/utils/plano.test.ts`; build e testes sem erro.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Mudar regra (as decisões sobre solo, arquivado e troca de demanda têm specs próprias).

## Dependências

Nenhuma.

