# Task 197 — Volume de trabalho por projeto (horas gastas × esperado)

> Origem: ideia I-013 (anotações do autor, 2026-10-19).

## Decisões (minhas, a confirmar com o autor)

- O volume esperado é em **horas por mês**, por projeto, **opcional** (nulo = não definido), editado pelo **gestor** no formulário do projeto.
- "Horas gastas" = soma das execuções encerradas do mês (no fuso do sistema) das atividades do projeto (atividade → demanda → projeto); execução em
  andamento não entra. Mês = o do filtro (padrão: o atual).

## Entregáveis

1. Migration nova: `projeto.volume_esperado_horas_mes` (`INTEGER`, nulo permitido, `CHECK` ≥ 0), sem `DEFAULT`; `docs/SCHEMA.md`.
2. `shared`: campo `volumeEsperadoHorasMes` nos DTOs de criar/alterar/resumo do projeto; `ProjetoVolumeListarDto { ano, mes }` e
   `ProjetoVolumeResumoDto { projetoId, nome, codigo, cor, minutosGastos, volumeEsperadoHorasMes | null }`.
3. Backend: rota `GET /projeto/volume?ano&mes` (**só gestor**), SQL no repository (CTE/JOIN agregando por projeto, parâmetros nomeados,
   `is_deleted = false`), regra de mês e fuso na service; teste de service e de integração do repository.
4. Frontend: na listagem de projetos (gestor), uma visão "Volume do mês" com o seletor de mês e, por projeto, barra de horas gastas × esperadas
   (sem barra e com o texto "sem volume definido" quando nulo; estouro destacado); o campo no formulário do projeto. Escolher e registrar o análogo
   aprovado (a listagem de projetos atual).

## Critérios de Aceite

- Projeto com 12h gastas no mês e esperado 40 mostra 12h de 40h (30%); sem esperado mostra só as horas; estouro (>100%) aparece destacado.
- Mês sem execução mostra 0h. Execução que cruza a meia-noite conta no dia/mês do fuso do sistema pelo mesmo critério do relatório.
- Desenvolvedor não acessa a rota (403) nem vê a visão.
- Verificação ao vivo nos três viewports com execuções plantadas em dois projetos.

## Fora de Escopo

- Volume por demanda/pessoa; alertas automáticos de estouro; ferramenta da IA para ler o volume.
