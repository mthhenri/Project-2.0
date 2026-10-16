# 110 — Execuções: contexto no header, linha ativa viva e navegação por teclado

**Origem:** Revisão de UI/UX — print `prints/14-execucao-historico.png`, análise `analise-detalhada/execucao-historico.md`

**Depende de:** 97

**Entrega:** histórico de execuções com subtítulo de contexto ("Quinta-feira, 10 de julho · 5 execuções · 12h24"), botão **Relatório** no header (gestor), execução em andamento fixada no topo com cronômetro ao vivo, colunas só com `HH:mm`, filtros na URL, select de usuário com busca + chip "Minhas", edição pela célula de descrição e empty state acionável.

> **Frontend apenas.** Contratos mantidos: listagem por dia único (`ExecucaoListarDto`), edição gestor-only.

---

## Escopo

1. Header: subtítulo com `totalRegistros` + `totalMinutosDia`; botão "Relatório" (gestor) abre o dialog da task 111 com select de projeto.
2. Linha ativa (`fimData === null`): fixada no topo, fundo primário sutil, tag "● Em andamento" e duração ao vivo (helpers `segundosDecorridos`/`formatarRelogio` já existem no módulo).
3. Colunas Início/Fim: só `HH:mm`; exceção com data pequena quando cruza a meia-noite. Descrição com line-clamp 2 + tooltip; célula clicável (gestor) abre a edição focada; validação "fim > início" inline no dialog (mensagem sob o campo, Salvar desabilitado — sem toast pós-submit).
4. Toolbar: `[filter]` no select de usuário + chip "Minhas"; navegação de dia agrupada (◀ data ▶) com "Hoje" visível **só fora de hoje**; estado em `?data=&usuario=`; atalhos ←/→/Home (guardas de foco/dialog).
5. Empty: "Nenhuma execução em {data}" + "◀ Ver dia anterior" + "Voltar para hoje" (+ "Limpar filtro" quando houver usuário filtrado). Paginador só com >50 registros.

## Critérios de aceite

- Revisar a semana: 7 teclas ←. F5 preserva dia e usuário.
- Quem está trabalhando agora é visível no topo com cronômetro.

## NÃO implementar nesta task

- Filtro por intervalo de datas (o DTO é por dia único).
