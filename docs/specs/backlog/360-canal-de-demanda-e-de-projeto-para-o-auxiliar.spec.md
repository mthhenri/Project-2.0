# 360-canal-de-demanda-e-de-projeto-para-o-auxiliar.spec.md

> Task 32/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-041 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: backend/mensagem-direta e frontend/demanda. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

O auxiliar, que vê e edita qualquer demanda, deixa de receber 403 a cada demanda que abre: ou ele entra no canal, ou a tela não pede o canal para ele. A regra escolhida fica escrita no `SYSTEM.SPEC.md`.

## Contexto

**A-041 · Média · AUXILIAR recebe 403 no chat de demanda e de projeto apesar da visão total**

O acesso ao canal decide "por tipo" com `temPermissaoDeGestor`, que não inclui o auxiliar; ele só entra com linha em `demanda_usuario`, como o desenvolvedor. No mesmo módulo a referência a demanda e a gravação do resumo usam `temVisibilidadeTotal`/`podeEditarDemanda`, que incluem o auxiliar: ele cita e edita qualquer demanda, mas não abre nem cria o chat dela. A regra do auxiliar no canal não está escrita no resumo de referência.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/mensagem-direta/services/canal-acesso.service.ts:121 — `const porTipo = temPermissaoDeGestor(usuarioAtivo.tipo)`
- backend/src/modules/mensagem-direta/services/canal-acesso.service.ts:127-129 — sem `porTipo`, exige `validarMembro` e lança 403 "Você não é membro desta demanda"
- backend/src/modules/mensagem-direta/services/canal-acesso.service.ts:134-136 — projeto: exige `validarAcessoProjeto`, senão 403
- backend/src/modules/mensagem-direta/services/grupo.service.ts:543 e :660 — lista e leitura por tipo usam a mesma `temPermissaoDeGestor`
- shared/src/utils/permissao-usuario.ts:23-27 e :37-39 — `temVisibilidadeTotal` inclui AUXILIAR
- backend/src/modules/mensagem-direta/domain/mensagem-direta-referencia.ts:30 — referência a demanda usa `temVisibilidadeTotal`
- backend/src/modules/demanda/services/demanda.service.ts:315-317 — `podeEditar = temVisibilidadeTotal(tipo) || validarMembro(...)`

Como observar: AUXILIAR sem linha em `demanda_usuario`: `GET /mensagem-direta/canal/demanda/:demandaId` e `POST /mensagem-direta/canal/demanda/:demandaId` → 403 (medido no GET); a mesma demanda é devolvida pelo `DemandaService.recuperar` com `podeEditar: true`. Esperado pela visão total: 200.

Verificação na auditoria: medido na aplicação rodando em 2026-11-13: como auxiliar, toda demanda aberta gera `GET /mensagem-direta/canal/demanda/:id` com 403, e o detalhe do projeto gera `GET /mensagem-direta/canal/projeto/:id` com 403; gestor e membro recebem 200.

## Decisão do autor pendente

**Antes:** o canal decide "por tipo" com `temPermissaoDeGestor` (`canal-acesso.service.ts:121`), que não inclui o auxiliar; a tela pede o canal para todo mundo.

**Opções:**

1. O auxiliar entra no canal por tipo, como o gestor. Falta decidir se lê como membro ou pela leitura auditada da supervisão (hoje só de gestor).
2. Manter o código: o auxiliar só entra onde é membro da demanda. A tela deixa de pedir e de oferecer o botão do chat ao auxiliar fora das demandas dele, e a regra vai para o documento.

## Entregáveis

1. A regra escolhida implementada no backend (se for a opção 1) e escrita no `SYSTEM.SPEC.md` §12, linha `mensagem-direta`.
2. No front, `mensagem-direta-canal-botao` não faz a requisição quando a regra já diz que o usuário não entra no canal.
3. Testes por tipo de usuário no backend (auxiliar com e sem `demanda_usuario`) e teste de componente do botão.

## Critérios de Aceite

- Ao vivo como auxiliar: abrir 3 demandas e o detalhe de um projeto não gera nenhum 403.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

