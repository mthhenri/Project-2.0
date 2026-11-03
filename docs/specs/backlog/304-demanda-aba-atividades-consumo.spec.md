# 304-demanda-aba-atividades-consumo.spec.md

> Task 1/2 da guarda-chuva [`demanda-atividades-e-conexoes.spec.md`](demanda-atividades-e-conexoes.spec.md). Visual das atividades na demanda
> aberta. Referência de layout: `demanda-atividades-e-conexoes/mockup.html`.

## Objetivo

A aba Atividades da demanda aberta (`demanda-atividades-painel`) troca a lista de cartões simples por cartões que mostram **quanto cada
atividade consumiu das horas da demanda** e **o que está em execução agora**, com a ação rápida de iniciar ou pausar.

## Decisões

1. **Resumo no topo:** o total consumido pela demanda ("38h consumidas pela demanda") e uma **barra dividida por atividade**, cada trecho do
   tamanho do que a atividade consumiu. Os contadores por situação (em execução, planejada, pendente, desenvolvida) ficam ao lado.
2. **Cartão da atividade:** ícone do status da atividade, nome, executor (avatar e nome), selo de prioridade e, embaixo, uma barra fina com a
   **fatia da atividade sobre o total da demanda** e o texto "14h · 37% da demanda". Atividade sem execução: barra vazia e "sem execução ainda".
3. **Sem horas esperadas por atividade** e, por isso, sem "estourou": a atividade não tem esse dado. O total esperado é da demanda e já aparece
   no cabeçalho dela (barra de horas).
4. **Em execução agora** (`execucaoAtivaId` não nulo): cartão destacado, ponto pulsante (respeita `prefers-reduced-motion`) e botão redondo de
   pausar. As demais mostram o botão de iniciar.
5. **Iniciar e pausar** seguem a regra de `SYSTEM.SPEC.md` §14: gestor, administrador e auxiliar iniciam e pausam qualquer atividade; o
   desenvolvedor só as próprias. O botão aparece desativado ou oculto para quem não pode (definir ao implementar, igual à lista de Atividades).
   Reaproveitar a ação que a lista de atividades já usa, sem reescrever regra no componente.
6. **Filtros** "Todas / Minhas / Em aberto" (em aberto = não desenvolvida) e "Nova atividade" no topo da lista; "Ver todas" continua.
7. A fatia e o total são **regra pura testável** (função em util do `demanda`), sem lógica no template.

## Fatos do código (2026-11-03)

- `AtividadeResumoDto` já traz `totalMinutosExecutados`, `execucaoAtivaId`, `usuarioId`, `status` e `prioridade`: **sem DTO novo**.
- O painel hoje só apresenta (`atividades`, `carregando`, `nova`, `verTodas`); quem hospeda é `demanda-aberta`, que carrega a lista.
- O tempo se exibe pelo `TempoExibicaoPipe` com a preferência de unidade (`VisualizacaoTempoService`, minutos ou dias).

## Pontos em aberto

- **Cronômetro ao vivo** ("00:47:12" no mockup): o DTO não traz o início da execução ativa. Padrão proposto: sem cronômetro nesta task (só o ponto
  pulsante e "em execução"); se o autor quiser, vira campo novo `execucaoAtivaInicioData` em `AtividadeResumoDto`.
- O **total da barra** soma só as atividades listadas. Execuções de atividades excluídas ficam de fora; conferir se isso diverge do total do
  cabeçalho da demanda e, se divergir, usar o do cabeçalho.

## Verificação

Teste de unidade da regra da fatia (zero, uma atividade, totais iguais, arredondamento que soma 100%); teste de componente do painel (estados
vazio, carregando, cheio, em execução, sem permissão para iniciar); `lint:tudo`; skill `verify` nos cinco formatos e dois temas.
