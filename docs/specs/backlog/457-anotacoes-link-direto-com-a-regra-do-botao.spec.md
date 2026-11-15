# 457-anotacoes-link-direto-com-a-regra-do-botao.spec.md

> Task 129/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-172 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/usuario e casca.

## Objetivo

Abrir `/usuario/:id/anotacoes` ou qualquer rota com `?anotacoes=<id>` deixa de pedir o pad de quem o usuário não pode abrir: os dois pontos de entrada aplicam `podeAbrirAnotacoes`, que hoje só protege o botão da listagem.

## Contexto

**A-172 · Baixa · Deep link de anotações abre o pad sem aplicar a regra que o botão da listagem aplica**

/usuario/:id/anotacoes não tem guard: para o gestor redireciona a /usuario?anotacoes=<id> e a listagem abre o drawer sem chamar podeAbrirAnotacoes, que só protege o botão da linha. Fora de /usuario, a topbar abre o pad para qualquer ?anotacoes=<id> em qualquer rota. O backend recusa o pad de outro gestor/administrador e, para quem não é gestor, o pad alheio.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/usuario/usuario.routes.ts:13-19 — rota ':id/anotacoes' sem canActivate
- frontend/src/app/modules/usuario/pages/usuario-anotacoes/usuario-anotacoes.page.ts:22-23 — gestor é mandado para /usuario?anotacoes=<id> sem olhar o tipo do dono
- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.ts:138-142 — abrirAnotacoesDoLink chama anotacoesDialog().abrir(usuarioId) direto
- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.ts:246-249 — o botão da linha usa podeAbrirAnotacoes
- frontend/src/app/shared/layout/topbar/topbar.component.ts:134-136 — qualquer rota com ?anotacoes=<id> abre o diálogo para esse id
- backend/src/modules/anotacao/services/anotacao.service.ts:167-173 — 403 para não gestor em pad alheio e para pad de outro gestor/administrador

Como observar: Gestor abre /usuario/<id de outro gestor>/anotacoes; desenvolvedor abre /ponto?anotacoes=<id alheio>: o drawer tenta carregar e GET /anotacao é recusado.

Verificação na auditoria: medido na aplicação rodando em 2026-11-13: `/usuario/<id de outro>/anotacoes` digitado por desenvolvedor faz `GET /anotacao?usuarioId=<outro>` (403).

## Entregáveis

1. A regra aplicada na página de redirecionamento e na topbar; teste de componente para desenvolvedor com id de outro.

## Critérios de Aceite

- Como desenvolvedor, digitar o link de outro usuário não gera requisição e leva ao próprio pad ou à raiz.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

