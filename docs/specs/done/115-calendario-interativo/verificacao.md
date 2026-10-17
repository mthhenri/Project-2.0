# Task 115 — verificação

Data: 2026-10-17. Frontend apenas (DTOs mantidos; `diaData` continua imutável na edição).

**Análogo escolhido:** a toolbar/chips da listagem de Projetos (112) para a barra de navegação, o popover do
`projeto-status-chip` (112) para o popover do dia, e o dialog de criar/editar já existente da própria página (97/99).

## O que foi feito

- **Clique no dia (gestor):** dia vazio abre a criação com a **data preenchida** e foco na Descrição (hover mostra um
  `+` fantasma); dia marcado abre o **popover** (nome, `qui, 15/10`, badges, Editar/Excluir) e destaca/rola a linha da
  tabela. Quem não é gestor vê o popover sem ações. O duplo clique antigo saiu.
- **Navegação:** "Hoje", stepper `‹ 2026 ›` (mantém o mês) e uma faixa Jan…Dez; o título do datepicker (mês/ano) já abre
  o overlay do PrimeNG. Tudo navega o `p-datepicker` por `[defaultDate]`.
- **Legenda** sob o calendário (Feriado, Recesso, Ponto facultativo, anel = meio período), mesma codificação das células.
- **Tabela:** Data `qui, 24/12` (recorrentes usam o ano exibido), Duração e Recorrente viraram badges na célula Tipo
  ("Meio período", "↻ Todo ano", só quando aplicáveis), ações sempre visíveis, linha destacada ao clicar no dia.
- **Dialog:** datepicker abre no mês que está na tela; "Salvar e adicionar outro" mantém Tipo, Duração **e Recorrente** e
  limpa Data/Descrição; na edição o hint vira "A data não pode ser alterada. **Excluir e recriar**" (exclui, com o
  Desfazer de 6 s, e reabre a criação com Descrição/Tipo/Duração/Recorrente preenchidos, faltando só a data).
  Largura 34 rem para o rodapé não quebrar.
- **Mês vazio:** "Nenhum dia não útil em {mês}" + CTA "Cadastrar dia não útil" + "ou clique em um dia no calendário".

## Verificação ao vivo (Chromium, API real, gestor)

- Clique no dia 15 (vazio): dialog "Novo Dia Não Útil", data `15/10/2026`, foco em `descricao`; digitar + Enter =
  `POST /calendario {"diaData":"2026-10-15",…}` (clique no dia + descrição + Enter).
- Clique no 15 (marcado): popover "Feriado Teste 115 | qui, 15/10 | Feriado | Editar | Excluir" e 1 linha destacada.
- Editar → hint com o link; "Excluir e recriar" → `DELETE /calendario/16` e dialog com a descrição preservada e data
  vazia; digitar a nova data + Enter → `POST` com a nova data (corrigir a data sem redigitar).
- Navegação: "Próximo ano" + "Dez" (2 cliques) → "Dezembro de 2027" (título da tabela e do datepicker); "Hoje" volta a
  "Outubro de 2026"; título do datepicker → overlay de meses → "nov" → "Novembro de 2026".
- Mês vazio (Fevereiro de 2027): CTA e dica; o datepicker do dialog aberto por ele começa em Fevereiro 2027.
- "Salvar e adicionar outro": mantém Recorrente marcado e Duração "Meio período", Data e Descrição vazias; a segunda
  criação (`2026-10-22`) sai sem reabrir o dialog. 1 `POST` por registro.
- 1920×1080, 1366×768 e 1080×1920: sem overflow horizontal. Capturas em `.artifacts/115-calendario-interativo/`.

## Achados da verificação (corrigidos)

- A legenda reutilizava a bolinha do calendário (100% da célula) e saía gigante: tamanho fixo próprio.
- O rodapé do dialog quebrava "Salvar e adicionar outro" em três linhas: largura 34 rem + `whitespace-nowrap`.
- A data da tabela quebrava de linha a 1366 px: coluna sem quebra.

## Decisões e desvios

- O critério "Dezembro do ano seguinte: 2 cliques" exigiu algo além do stepper (ele só troca o ano): acrescentei a faixa
  Jan…Dez; sem ela seriam 3 cliques (ano, título, mês).
- A criação via "Excluir e recriar" é a única forma de corrigir a data (a spec proíbe mexer no `DiaNaoUtilAlterarDto`);
  se o usuário cancelar o dialog novo, o registro já foi excluído, e o Desfazer de 6 s é o caminho de volta.
- A página tem agora ~470 linhas; o acréscimo é local à mesma tela (popover, navegação e dialog compartilham o mesmo
  estado), então não extraí componente nesta task.

## Impacto

- Só a página do Calendário e `models/dia-nao-util.model.ts` (helper `dataComDiaDaSemana`, `MESES_CURTOS`). O verificador
  de dia útil e os datepickers de outras telas não mudaram.

## Limites / pendente

- Não verificado: visão do desenvolvedor (popover sem ações), com a tela real.
- O recesso/ponto facultativo foram vistos só na legenda, não numa célula real nesta rodada.
- Frontend sem testes automatizados (P-001): `dataComDiaDaSemana` ficou sem teste.
