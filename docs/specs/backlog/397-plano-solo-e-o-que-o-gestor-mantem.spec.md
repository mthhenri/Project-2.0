# 397-plano-solo-e-o-que-o-gestor-mantem.spec.md

> Task 69/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-084 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: backend/plano. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Definir o que gestor e administrador mantêm sobre um plano de projeto que o criador marca como solo. Hoje perdem tudo, inclusive arquivar e excluir, e o criador pode marcar solo um plano que já tem texto, conversa e fontes de outras pessoas.

## Contexto

**A-084 · Média · Criador marca como solo um plano já compartilhado e tira gestor e administrador de tudo**

`marcarSolo` só confere se quem chama é o criador, sem olhar se o plano já tem texto, conversa ou fontes de outras pessoas. Depois de marcado, gestor e administrador recebem 404 em tudo, inclusive em arquivar e excluir, porque a checagem de acesso vem antes da de arquivar/excluir. O SPEC permite o solo, mas não diz quem pode marcar nem o que acontece com o conteúdo dos colegas.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/plano/services/plano.service.ts:128-131 — única trava de `marcarSolo` é `plano.criadorId !== usuarioAtivo.sub`
- backend/src/modules/plano/services/plano.service.ts:139-140 e 148-149 — `recuperarPlanoAcessivel` (404) roda antes de `validarPodeArquivarOuExcluir`
- shared/src/utils/plano.ts:41 — comentário de arquivar/excluir: "o criador, o gestor e o administrador (quem já acessa o plano)"
- backend/src/modules/plano/services/plano-publicacao.service.ts:95 — `recuperarOrigem` pula o plano que a pessoa não acessa

Como observar: DESENVOLVEDOR criador de plano de projeto em que colegas escreveram e trouxeram fontes: PATCH /plano/:id/solo {"solo":true} → 200. Em seguida GESTOR ou ADMINISTRADOR: GET /plano/:id, PATCH /plano/:id/arquivo {"arquivado":true}, DELETE /plano/:id, GET /chat/plano/:id → 404 em todos. Se o criador for inativado, ninguém mais arquiva nem exclui o plano.

Verificação na auditoria: reproduzido na aplicação rodando em 2026-11-14: o desenvolvedor criador marcou solo um plano de projeto; o administrador passou a receber 404 em `GET /plano/:id`, `PATCH /plano/:id/arquivo` e `DELETE /plano/:id`, e o plano sumiu da lista dele.

## Decisão do autor pendente

**Antes:** `marcarSolo` só confere se quem chama é o criador; a checagem de acesso vem antes da de arquivar e excluir.

**Opções:**

1. Gestor e administrador mantêm arquivar e excluir de plano solo de projeto, sem ler o conteúdo.
2. Marcar solo só é aceito enquanto ninguém além do criador contribuiu.
3. As duas.

## Entregáveis

1. A regra escolhida na `PlanoService`, escrita no `SYSTEM.SPEC.md` §12 (linha `plano`), com testes por tipo.

## Critérios de Aceite

- Repetir o roteiro: o resultado para o administrador é o da regra escolhida.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

