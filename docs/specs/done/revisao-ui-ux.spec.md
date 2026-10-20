# revisao-ui-ux.spec.md

> **Concluída em 2026-10-20.** As 24 tasks (94–117) estão em `docs/specs/done/`: as seis que o autor descartou em 2026-10-16 (102–105, 110 e 111) foram
> reativadas e implementadas (110 e 111 em 2026-10-17, 102–105 em 2026-10-18), então os "19 das 23" e as "descartadas" abaixo são o plano de
> 2026-10-16, mantido como registro. Esta spec, o `INDEX-revisao-ux.md` e a pasta `revisao-ui-ux/` foram movidos juntos para `done/`.

> Guarda-chuva da revisão de UI/UX das telas do Project 2.0. Origem: branch
> `claude/ui-ux-review-optimization-4da6md`, mergeada na adoção do kit de processo (2026-10-16).
> Não é uma task implementável: é a spec proprietária do material em
> `docs/specs/backlog/revisao-ui-ux/` e do índice `INDEX-revisao-ux.md`. O trabalho está nas
> tasks 94–116, cada uma com spec própria.

## Objetivo

Reduzir o esforço do usuário nas telas e dialogs do sistema (menos cliques, digitação, navegação
e espera) implementando, na ordem do índice, as tasks derivadas da revisão que o autor manteve (19 das 23;
as 4 que mexem diretamente na tela de Atividades (102–105) foram descartadas em 2026-10-16 e
estão em `docs/specs/discarded/`; as 2 da tela de Execuções (110 e 111) foram descartadas e reativadas em 2026-10-17, e concluídas).

## Entregáveis

1. As tasks **94–101, 106–109 e 112–116** implementadas e movidas para `done/`, na ordem de fases de
   [`INDEX-revisao-ux.md`](INDEX-revisao-ux.md): fundações transversais (94–99), telas de maior
   uso (100–101), demandas (106–109) e telas administrativas (112–116). **Descartadas:** 102, 103, 104,
   105, 110 e 111.
2. Cada task consulta, para a sua tela, o mockup em `revisao-ui-ux/mockups/`, o print em
   `docs/assets/revisao-ui-ux/prints/` e a análise em `revisao-ui-ux/analise-detalhada/`; onde o
   mockup divergir da spec da task, **a spec da task vence**.
3. Os mockups e análises das telas descartadas (Atividades e Execuções) permanecem como registro.
4. Esta spec vai para `done/` junto com a pasta `revisao-ui-ux/` quando a última task terminar.

## Critérios de Aceite

- As 17 specs mantidas estão em `docs/specs/done/` e `INDEX-revisao-ux.md` não lista pendência.
- `npm run repo:verificar` passa com a pasta `revisao-ui-ux/` no estado em que a spec estiver.
- Cada task cumpriu o processo visual do `CLAUDE.md` ("UI e estilo") e registrou o análogo usado.

## Material anexo (`revisao-ui-ux/`)

| Item | Conteúdo |
|---|---|
| `README.md` | relatório consolidado, critérios e achados globais (G1…) |
| `analise-detalhada/` | 16 análises por tela, com fluxos, contagem de cliques e redesign |
| `mockups/` | 25 mockups HTML navegáveis do estado otimizado e o CSS compartilhado |
| `docs/assets/revisao-ui-ux/prints/` | 25 capturas dos mockups com callouts numerados |

Os prints ficam em `docs/assets/revisao-ui-ux/prints/`, **fora** de `docs/specs/`: o `repo:verificar`
proíbe PNG dentro das specs (`SYSTEM.SPEC.md` §3.1 manda captura para `.artifacts/`), mas aceita
mídia versionada em `docs/assets/` quando é referência canônica da documentação, que é o caso
aqui. Os links relativos do `README.md` já apontam para lá. Ao mover esta spec para `done/`,
os prints permanecem em `docs/assets/`.

## Fora de Escopo

- Implementar a revisão como uma única task, ou antecipar telas fora da ordem do índice.
- Alterar os mockups ou os prints: são o registro da revisão; correção vira nova task.
- A task **117** (remover a descrição da atividade) não faz parte da revisão. Ela foi renumerada
  de 94 para 117 em 2026-10-16 para não colidir com a 94 da revisão.
- Trocar o PrimeNG por biblioteca própria (`docs/context/IDEAS.md` I-001): as tasks usam os
  componentes PrimeNG e o tema atuais.

## Dependências

Nenhuma outra spec em `done/`. Consulta `docs/SYSTEM.SPEC.md` §8 (frontend) e §14 (regras de
negócio) como fontes da verdade. A task 99 é a única com backend estrutural (endpoints
`restaurar`), e a 104 pede 2 campos a mais num DTO de leitura.

## Riscos e Mitigação

- Os mockups mostram o estado ideal, não necessariamente viável com PrimeNG 21: confirme no
  componente real antes de prometer o comportamento e registre o desvio na spec da task.
- Tasks 97/98/99 são pré-requisito da maioria das demais; pular a ordem reabre divergência de
  padrão entre dialogs.
