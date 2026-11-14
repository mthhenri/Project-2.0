# 373-atividade-de-colega-so-o-dono-ou-quem-conduz-altera.spec.md

> Task 45/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-060 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Alta. Área: backend/atividade. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Alterar atividade e tags de outra pessoa passa a exigir ser o dono ou ter a permissão de quem conduz o trabalho. Hoje basta ser membro da mesma demanda.

## Contexto

**A-060 · Alta · Desenvolvedor membro da demanda altera atividade e tags de outro usuário**

Em PUT /atividade/:id e PUT /atividade/:id/tag o desenvolvedor só é recusado quando não é o dono E não é membro da demanda; basta ser membro para mudar nome, status e prioridade, ou trocar todas as tags, da atividade de um colega. A tela trava pelo dono e a função `podeEditarAtividadeDeOutro` reserva "editar as dos outros" a auxiliar, gestor e administrador. O teste unitário consagra o comportamento, então a decisão (documento x código) é do autor.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/atividade/services/atividade.service.ts:202-214 — alterar: `if (!eAutor && !temAcesso)` lança 403; membro não dono passa
- backend/src/modules/atividade/services/atividade.service.ts:329-341 — alterarTags: a mesma condição `!eAutor && !temAcesso`
- backend/src/modules/atividade/repositories/atividade.repository.ts:634-651 — validarAcessoDemanda: só confere linha em demanda_usuario da demanda
- backend/src/modules/atividade/services/atividade.service.regras.test.ts:215 — teste 'o dono altera mesmo sem vínculo com a demanda; o membro altera a atividade de outro'
- frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:552-560 — podeEditar = podeExecutar = podeConduzirExecucaoDeOutro() || atividade.usuarioId === sessao.id()
- shared/src/utils/permissao-usuario.ts:64-67 — podeEditarAtividadeDeOutro ('edita as dos outros') só para conduzOTrabalho

Como observar: Desenvolvedor B, membro da demanda D; atividade A de outro desenvolvedor em D. PUT /api/v1/atividade/A {"nome":"renomeada por B"} e PUT /api/v1/atividade/A/tag {"tagIds":[]}. Esperado: 403. O código responde 200 e grava (as tags do colega são removidas).

Verificação na auditoria: reproduzido na aplicação rodando em 2026-11-14: um desenvolvedor incluído como membro da demanda fez `PUT /atividade/1` (atividade de outro desenvolvedor) e `PUT /atividade/1/tag` e recebeu 200 nas duas; o nome da atividade mudou.

## Decisão do autor pendente

O `SYSTEM.SPEC.md` diz que o desenvolvedor mexe só nas próprias atividades, e a tela trava pelo dono; mas há testes da service (linhas 215 e 320 do teste de regras) que fixam o comportamento atual.

**Antes:** `AtividadeService.alterar` e `alterarTags` só recusam o desenvolvedor que não é dono E não é membro da demanda.

**Opções:**

1. Corrigir: dono ou `podeEditarAtividadeDeOutro(tipo)` em `alterar`; dono ou `podeAtribuirMembroOuTag(tipo)` em `alterarTags`.
2. O membro pode mesmo: escrever a regra no `SYSTEM.SPEC.md` §14 e liberar a tela.

Recomendação da auditoria: opção 1.

## Entregáveis

1. A regra escolhida na `AtividadeService`, com os dois testes existentes ajustados e casos novos por tipo de usuário.
2. O `SYSTEM.SPEC.md` §14 com a regra escrita, se for a opção 2.

## Critérios de Aceite

- Repetir o roteiro: desenvolvedor membro, não dono, recebe 403 em `PUT /atividade/:id` e `PUT /atividade/:id/tag` (opção 1); auxiliar e gestor continuam alterando.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

