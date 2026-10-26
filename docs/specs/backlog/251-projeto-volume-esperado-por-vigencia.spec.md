# 251-projeto-volume-esperado-por-vigencia.spec.md

> Task solta, pedido do autor sobre a 197 e a 199 (2026-10-26): o volume esperado do projeto não é fixo; um corte ou aumento de horas de um mês para o outro
> não pode valer para todos os meses. A 197 e a 199 estão em `done/` e não são reescritas; esta task as corrige.

## Objetivo

O volume esperado de horas do projeto passa a ter **vigência**: cada valor vale **de um mês em diante**, até o próximo valor registrado. Mudar o volume
não reescreve os meses passados, e a visão de Volume (mensal e anual) compara cada mês com o esperado **daquele mês**.

## Decisões (confirmadas pelo autor em 2026-10-26)

- **Modelo B (vigência):** uma linha por mudança — "a partir de [mês], X horas por mês". O valor de um mês é o da linha com a maior `vigencia_inicio_data` menor ou igual ao
  primeiro dia daquele mês. Mês anterior à primeira vigência = sem volume definido.
- **A vigência sempre começa no primeiro dia do mês** (nunca há mês com dois valores). Uma data no meio do mês é normalizada para o dia 1.
- **Uma vigência por projeto e mês:** registrar de novo para o mesmo mês **substitui** o valor (soft delete da anterior, nunca DELETE físico).
- **`0` é um valor válido** (corte total, ex.: projeto pausado) e é diferente de "sem volume definido" (`null`/sem vigência).
- **Remover o volume** a partir de um mês também deve ser possível (vigência "sem volume"): `volume_esperado_horas` aceita `NULL`.
- Mês pontual ("só este mês, depois volta ao normal") = duas vigências; não há exceção avulsa.
- Quem pode alterar: o mesmo critério de alterar projeto hoje (gestor). A leitura segue a das visões de Volume (só gestor).

## Entregáveis

1. **Migration nova** (skill `sql-migrations`; a 0046 já foi aplicada e não é editada): tabela `projeto_volume_vigencia`
   (`projeto_id`, `vigencia_inicio_data DATE`, `volume_esperado_horas INTEGER NULL CHECK >= 0`, colunas de `BaseEntity`, sem `DEFAULT`,
   índice único parcial `(projeto_id, vigencia_inicio_data) WHERE is_deleted = false`). Migra o valor atual de `projeto.volume_esperado_horas_mes`
   para uma vigência inicial no primeiro dia do mês de `projeto.inicio_data` (projeto com valor `NULL` não gera linha), e **remove** a coluna antiga e a constraint.
   `rollback` recria a coluna com o valor da vigência mais recente. Atualizar `docs/SCHEMA.md`.
2. **`shared`:** `ProjetoVolumeVigenciaDto`/`ProjetoVolumeVigenciaResumoDto` (leitura), `ProjetoVolumeVigenciaCriarDto { projetoId, vigenciaInicioData, volumeEsperadoHoras | null }`
   (nomes conforme a skill `project20-dto-conventions`); `ProjetoVolumeResumoDto` e `ProjetoVolumeMesDto` passam a carregar o esperado **do mês consultado**;
   `ProjetoVolumeAnualResumoDto.volumeEsperadoHorasMes` vira `volumeEsperadoHorasPorMes: (number | null)[12]` (índice 0 = janeiro, como `minutosGastosPorMes`).
   `volumeEsperadoHorasMes` sai de `ProjetoCriarDto`, `ProjetoAlterarDto`, `ProjetoInternoAlterarDto` e dos DTOs de saída do projeto.
3. **Backend:** repository com a resolução do valor vigente por mês (`LEFT JOIN LATERAL` ordenando por `vigencia_inicio_data DESC LIMIT 1`, sempre `is_deleted = false`) em
   `listarVolume` e `listarVolumePorMes`; CRUD das vigências (listar por projeto, registrar/substituir, excluir por soft delete). A normalização para o dia 1, a validação
   (`>= 0`, projeto existente, data válida) e a regra "substitui" ficam na **service** (regra pura testada). Controller fino, rotas só de gestor
   (ex.: `GET/POST /projeto/:id/volume-vigencia`, `DELETE /projeto/:id/volume-vigencia/:vigenciaId`, declaradas conforme a ordem das rotas existentes).
   Criar projeto com volume inicial registra a primeira vigência no mês do `inicio_data`.
4. **Frontend:**
   - `volume-projeto.util.ts` e `volume-grafico.util.ts` deixam de assumir um esperado único: no **Anual**, a linha tracejada vira **degraus** (um valor por mês) e o
     estouro é avaliado **mês a mês**; no **Mensal**, usa o esperado do mês do filtro.
   - O formulário do projeto troca o campo único por um bloco **"Volume esperado"**: valor vigente hoje, lista de vigências ("a partir de jan/2026 — 160 h") e ação
     **"Alterar a partir de [mês]"** (seletor de mês + horas, com opção "sem volume"), com exclusão de vigência. Reaproveitar os controles de uma tela já aprovada
     como análogo (registrar na entrega).
   - Rótulos continuam respeitando "Tempos em dias" (`formatarTempoExibicao`); o eixo, sempre em horas.
5. **IA e demais consumidores:** rodar `npm run impacto -- shared/src/dtos/projeto/ProjetoVolumeResumoDto.ts` (e os demais DTOs alterados) e avaliar cada consumidor
   (skill `gerenciamento-de-impacto`), inclusive ferramentas da IA e qualquer tela que leia `volumeEsperadoHorasMes`.
6. Documentação: `SYSTEM.SPEC.md` (rotas e regra de vigência), `SCHEMA.md`, `CONTEXT.md`, `HISTORY.md` e o número livre em `CLAUDE.md`/`AGENTS.md`.

## Critérios de Aceite

- Projeto com "a partir de jan/2026: 160 h" e "a partir de abr/2026: 120 h": jan–mar mostram esperado 160 h, abr em diante 120 h; a visão anual de 2026 mostra os
  degraus e o estouro de março é avaliado contra 160 h, não contra 120 h.
- Alterar o volume em outubro **não** muda nenhum percentual, barra ou cor de setembro para trás.
- Vigência registrada com data no meio do mês (ex.: 2026-04-17) grava `2026-04-01`; registrar de novo para abril substitui o valor, sem duas linhas ativas.
- Volume `0` a partir de um mês: esperado 0 h (não "sem volume"); gasto acima de 0 conta como estouro conforme a regra atual da 197 para esperado 0.
- Mês anterior à primeira vigência e projeto sem nenhuma vigência: "sem volume", sem linha tracejada e sem erro.
- Projeto existente antes da migration mantém os mesmos números de hoje (vigência inicial copiada do valor antigo); rollback restaura a coluna.
- Desenvolvedor recebe 403 nas rotas de vigência e continua sem ver a visão.
- Testes: regra de normalização/substituição (service), SQL de vigência (integração: valor do mês com duas vigências, mês antes da primeira, vigência excluída ignorada,
  unicidade por projeto e mês), controller (`@GestorOnly`, rotas listadas), utilitários de gráfico (degraus, estouro por mês), formulário (adicionar/alterar/excluir vigência).
- Verificação ao vivo nos três viewports: projeto com corte e com aumento, mensal e anual, e os estados vazio, carregando, cheio e erro do bloco no formulário.

## Fora de Escopo

- Exceção avulsa de um único mês (use duas vigências), histórico de quem alterou além das colunas de `BaseEntity`, vigência por dia/semana, volume por pessoa,
  alerta de estouro, ferramenta nova da IA para alterar o volume.

## Dependências

`197-projeto-volume-de-trabalho` e `199-projeto-volume-grafico-e-visao-anual` (ambas em `done/`).
