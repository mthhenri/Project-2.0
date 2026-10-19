# Task 195 — Gestor/administrador lê e edita o pad dos desenvolvedores (não o de outros gestores)

> Origem: ideia I-011 (anotações do autor, 2026-10-19).

## Regra (autor)

Gestor e administrador leem e editam o pad **dos desenvolvedores** e o **próprio**; **não** o de outro gestor nem o de administrador. O desenvolvedor segue só
no próprio. Hoje a `AnotacaoService.validarAcesso` deixa o gestor em qualquer pad (inclusive de outros gestores).

## Entregáveis

1. Backend: `validarAcesso` passa a conhecer o **tipo do dono do pad** (leitura do usuário-alvo pela repository; usuário inexistente: 404 sem
   vazar). Matriz: dono = o próprio → ok; ator gestor/administrador e dono desenvolvedor → ok; ator gestor/administrador e dono gestor/administrador
   (outro) → `UnauthorizedAccessException`; desenvolvedor e dono outro → recusa. Vale para todas as rotas do pad.
2. `SYSTEM.SPEC.md` §14: linha da matriz de permissões do pad.
3. Frontend: na listagem de usuários o botão de anotações **só aparece** na linha de desenvolvedores e na linha do próprio usuário logado; o deep link
   `/usuario/:id/anotacoes` de um pad proibido mostra o aviso da API (já tratado) em vez de abrir.

## Critérios de Aceite

- Testes de service para a matriz inteira; teste da listagem (botão presente/ausente por tipo da linha).
- Verificação ao vivo: gestor abre o pad de um desenvolvedor e edita; a linha de outro gestor não tem o botão; a API responde 403 para o pad dele.

## Fora de Escopo

- Ferramentas da IA (`consultar_pad`, `propor_anotar_pad`) continuam só no pad do próprio usuário.
