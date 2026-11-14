# 376-atividade-criar-valida-o-dono-e-recusa-o-que-nao-pode.spec.md

> Task 48/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-063 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: backend/atividade.

## Objetivo

Criar atividade para outra pessoa sem poder passa a ser recusado (em vez de trocar o dono em silêncio), e o dono escolhido pelo gestor é validado na service.

## Contexto

**A-063 · Média · POST /atividade troca o dono em silêncio e não valida o dono pedido; a ferramenta de IA recusa e valida**

Confirmado: para quem não tem permissão de gestor (auxiliar e desenvolvedor) a service ignora `usuarioId` e responde 201 com a atividade no nome de quem pediu; o efeito respeita a regra, mas o cliente não é avisado. Para gestor e administrador o `usuarioId` vai direto ao INSERT, sem conferir se o usuário está ativo ou excluído. Pela IA o mesmo pedido é recusado e o dono precisa existir e estar ativo.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/atividade/services/atividade.service.ts:53-56 — executorId = dto.usuarioId só com temPermissaoDeGestor; senão usuarioAtivo.sub, sem erro
- backend/src/modules/atividade/services/atividade.service.ts:75-81 — insere com executorId sem validar o usuário
- backend/src/modules/atividade/repositories/atividade.repository.ts:59-76 — INSERT usa `:usuarioId` direto
- backend/src/modules/atividade/executores/criar-atividade.executor.ts:37-40 — 'recusar é melhor que criar para a pessoa errada'
- backend/src/modules/atividade/ferramentas/propor-criar-atividade.ferramenta.ts:46-50 — recusa não gestor; exige dono existente e ativo
- backend/src/modules/atividade/services/atividade.service.regras.test.ts:74 e :88 — testes fixam 'o dono pedido é ignorado'

Como observar: Auxiliar: POST /api/v1/atividade {"demandaId":1,"usuarioId":<outro>,"nome":"abc","status":"PLANEJADA"}. Esperado: 403. O código responde 201 com usuarioId do auxiliar. Gestor: o mesmo corpo com usuarioId de usuário inativo responde 201 (pela IA: 'está inativo e não recebe atividades').

Verificação na auditoria: reproduzido na aplicação rodando: auxiliar e desenvolvedor mandando `usuarioId` de outra pessoa recebem 201 e a atividade nasce no nome de quem pediu, sem aviso.

## Entregáveis

1. Na `AtividadeService.criar`: `usuarioId` diferente do usuário do token, vindo de quem não pode escolher o dono, responde `UnauthorizedAccessException`.
2. O dono informado por gestor ou administrador é conferido (existe, ativo, não excluído) antes do INSERT; a validação duplicada sai da ferramenta de IA.
3. Testes por tipo de usuário e para dono inativo.
4. Conferir se o formulário do front manda `usuarioId` quando o usuário é auxiliar ou desenvolvedor; se manda, deixa de mandar.

## Critérios de Aceite

- `POST /atividade` com `usuarioId` alheio responde 403 para auxiliar e desenvolvedor; para o gestor, dono inativo responde 400.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

