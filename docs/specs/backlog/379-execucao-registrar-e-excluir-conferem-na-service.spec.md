# 379-execucao-registrar-e-excluir-conferem-na-service.spec.md

> Task 51/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-066 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/execucao.

## Objetivo

`ExecucaoService.registrar` e `excluir` passam a decidir quem pode, como manda a regra "permissão na service". Hoje recebem o usuário e não o usam; quem barra é o `@ExigePermissao` da rota, e a IA chama as mesmas funções por outro caminho.

## Contexto

**A-066 · Baixa · ExecucaoService.registrar e excluir não conferem tipo nem dono: a trava é só o decorador da rota**

As duas funções recebem o usuário e não o usam; quem barra o desenvolvedor é o `@ExigePermissao` do controller. Os executores da IA chamam as mesmas funções: o de registro repete a verificação por conta própria e os de iniciar/descrever chamam `excluir` com o token do desenvolvedor apoiados no `recuperar` anterior. Um chamador novo que esqueça a verificação abre a ação; em atividade a regra mora também na service.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/execucao/services/execucao.service.ts:142-145 — registrar(dto, _usuarioAtivo): parâmetro não usado
- backend/src/modules/execucao/services/execucao.service.ts:408-417 — excluir(dto, _usuarioAtivo): só 404 e soft delete
- backend/src/modules/execucao/executores/registrar-execucao.executor.ts:11-13 e 44-46 — 'a service não confere o tipo... então o executor confere'
- backend/src/modules/execucao/executores/iniciar-execucao.executor.ts:80-83 — desfazer: recuperar e depois execucaoService.excluir
- backend/src/modules/execucao/executores/descrever-execucao.executor.ts:73-76 — desfazer: o mesmo padrão
- backend/src/modules/atividade/services/atividade.service.ts:269-279 — contraste: a regra de excluir mora na service

Como observar: Pela API não há falha hoje: desenvolvedor em POST /api/v1/execucao/registro e DELETE /api/v1/execucao/:id recebe 403 do guard. O risco aparece na leitura: chamar `execucaoService.excluir({ id }, usuarioDesenvolvedor)` direto exclui execução de qualquer pessoa.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. `registrar` exige `podeEditarExecucaoDeOutro`; `excluir` exige `podeEditarExecucaoDeOutro` ou ser o dono (para o desfazer da IA).
2. A verificação duplicada sai do executor de registro.
3. Testes por tipo de usuário nas duas funções, mais os casos do auxiliar que hoje não têm teste (recuperar e listar execução, `alterarTags` e restaurar atividade).

## Critérios de Aceite

- Testes da service cobrindo os quatro tipos em registrar e excluir.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

