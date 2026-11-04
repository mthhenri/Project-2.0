# 275 — Excluir usuário só se ele não tiver execução

> Decisão do autor (2026-11-04), a partir de um relato: usuário excluído com horas executadas tinha as
> horas na demanda e no volume do projeto, mas não na lista de atividades da demanda.

## Objetivo

Fechar a contradição entre as telas: `is_deleted = true` é morto, toda query filtra, sempre. Quem tem
execução registrada não pode ser excluído; só inativado. Quem não tem execução pode ser excluído.

## Entregáveis

1. `UsuarioRepository.validarExecucoes({ id })` (existência): há execução não excluída em atividade não
   excluída cujo dono (`atividade.usuario_id`) é o usuário? Conta a execução ativa (sem `fim_data`).
2. `UsuarioService.excluir` recusa com `BusinessException` quando houver execução, com a orientação de
   inativar o usuário. A checagem vem depois de `validarPermissaoSobreAdministrador` e de
   `validarPermanenciaDeAdministradorAtivo`, antes do `excluir` do repository. Nada é gravado na recusa.
3. `docs/SYSTEM.SPEC.md` §14 registra a regra; os `JOIN`s com `usuario.is_deleted = false` nas leituras
   de atividade e execução **não mudam**.

## Critérios de Aceite

- Teste unitário da service: com execução recusa (`BusinessException`, sem chamar `excluir`); sem execução
  exclui; a ordem das guardas de administrador é preservada.
- Teste de integração do repository: sem atividade, atividade sem execução, com execução, execução ativa,
  execução excluída, atividade excluída e execução de outro usuário.
- `npm run test --workspace=backend`, `npm run test:integracao`, `npm run build --workspace=backend`,
  `npm run lint:tudo` e `npm run repo:verificar`.
- Ao vivo: `DELETE /usuario/:id` recusado para quem tem execução, aceito para quem não tem.

## Fora de Escopo

- Bloquear a exclusão por atividade sem execução (decisão do autor: sem execução, está tudo certo).
- Mudar a tela de Usuários (a recusa já volta como toast e a linha é restaurada pelo `error` do `excluir`).
- Corrigir usuários que já estão excluídos com execução (o autor ajusta à mão).
- Qualquer mudança nas somas de demanda e volume.

## Dependências

`docs/SYSTEM.SPEC.md` §14 e `docs/SCHEMA.md` (`execucao`, `atividade`, `usuario`).
