# 454-execucao-propria-editar-regra-unica.spec.md

> Task 126/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-169 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: backend/execucao e frontend/execucao. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Resolver a diferença: pela API o desenvolvedor altera descrição, início e fim das próprias execuções (`PUT /execucao/:id` não tem trava de tipo); na tela, toda edição de execução está atrás da permissão de quem conduz o trabalho.

## Contexto

**A-169 · Média · Editar a própria execução: o backend permite ao desenvolvedor (inclusive início e fim), o front esconde**

PUT /execucao/:id não tem decorator de permissão e a service só recusa quando a execução é de outro usuário; o desenvolvedor altera descricao, inicioData e fimData das próprias execuções pela API. No front toda edição de execução (descrição, início, fim) está atrás de podeEditarExecucaoDeOutro, então o desenvolvedor não tem a ação na tela. A tabela da SPEC só nega 'Editar execuções de outros'; uma das duas pontas está fora da regra pretendida, e a da API mexe no próprio ponto.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/execucao/controllers/execucao.controller.ts:118 — @Put(':id') sem @ExigePermissao (o DELETE da linha 132-133 tem)
- backend/src/modules/execucao/services/execucao.service.ts:364-369 — só lança 403 se a execução for de outro usuário
- backend/src/modules/execucao/services/execucao.service.ts:371-372 — a alteração aceita dto.inicioData
- frontend/src/app/modules/execucao/pages/execucao-historico/execucao-historico.page.ts:351 — iniciarEdicao retorna se !sessao.podeEditarExecucaoDeOutro()
- frontend/src/app/modules/execucao/pages/execucao-historico/execucao-historico.page.html:227 e 342 — botões de edição só com podeEditarExecucaoDeOutro()
- docs/SYSTEM.SPEC.md:1419 — 'Editar execuções de outros | Gestor sim | Desenvolvedor não'; linha 1369 — o PUT altera descricao, inicio_data e fim_data

Como observar: Como desenvolvedor, PUT /api/execucao/<id de execução própria encerrada> com inicioData/fimData novos: a service não tem recusa para esse caso; na tela /execucao as células não são clicáveis para ele.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Decisão do autor pendente

**Antes:** a regra escrita diz "Editar execuções de outros: gestor"; não diz o que o desenvolvedor pode nas próprias.

**Opções:**

1. A tela libera ao desenvolvedor a edição da própria execução (ao menos a descrição).
2. O backend restringe: o dono altera a descrição; início e fim só quem tem `podeEditarExecucaoDeOutro`.

## Entregáveis

1. A regra escolhida na `ExecucaoService` e na tela, escrita no `SYSTEM.SPEC.md` §14, com testes por tipo.

## Critérios de Aceite

- O mesmo pedido (desenvolvedor muda o fim de uma execução própria) dá o mesmo resultado pela tela e pela API.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima. Junto com `374-execucao-alterar-confere-ativa-e-sobreposicao`, que trata do que o `PUT` deixa passar.

