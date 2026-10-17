# Task 100 — verificação

Data: 2026-10-16. Frontend apenas. Implementada junto com a 101 (mesmos arquivos da página do Ponto).

## O que foi feito

- **Justificar inline (gestor)**: botão fantasma "Justificar" na linha de dia útil com déficit, já encerrado ou em
  curso e sem justificativa (visível no hover/foco; sempre visível em dispositivos sem hover). `stopPropagation`
  (a linha não expande). O badge de uma justificativa existente fica clicável (gestor) e abre o dialog no dia;
  para o desenvolvedor segue só com tooltip. O dialog abre com `diaData` do dia e as horas = déficit do dia
  (arredondado a 2 casas e limitado à jornada depois que ela chega).
- **Dialog**: atalhos de horas [Dia inteiro · N h] [Meio período · N h] [Faltante · N,NN h] (o último só quando há
  déficit); autofocus no Título com o dia pré-preenchido (diretiva da task 97); "Salvar justificativa" no footer;
  remoção com `p-confirmpopup` ancorado na lixeira (saiu o `p-confirmDialog`).
- **Imprimir para o desenvolvedor**: habilitado quando `modo() === 'mensal'` e há mês carregado; `nomeGestor` só
  é passado se `sessao.eGestor()` (a linha de assinatura do gestor sai em branco para o dev).
- **Resumo**: 4º card "Saldo até hoje" (soma dos saldos dos dias ≤ hoje) só no mês corrente; tooltip no saldo do
  dia "Meta do dia: Xh Ymin" (a `metaMinutos` já vem descontada da justificativa). Grade de cards `auto-fit`.
- **Horários `HH:mm`** na linha do dia, timeline, intervalos, card da equipe e impressão; o título dos intervalos
  continua interpolando `ambiente.intervaloMinimoMinutos`.
- **Navegação**: botão "Hoje" e atalhos ← / → / T só no modo mensal, ignorados com foco em campo ou
  dialog/popover/datepicker aberto (`core/utils/atalhos.ts`, que a topbar também passou a usar).
- **Header estável**: setas, mês, "Hoje", "Imprimir" e "Justificar" ficam no DOM e só desabilitam na visão equipe.

## Verificado ao vivo (Chromium, API real)

- Equipe: setas, "Hoje", Imprimir e Justificar desabilitados; ao escolher o usuário, habilitam. `p-select` com busca.
- Gestor, mês de outubro/2026: 4 cards ("Saldo até hoje −86h 50min"), 11 linhas com "Justificar"; o clique abre o
  dialog em 01/10/2026 com 8 h, foco no Título, sem expandir a linha; atalhos "Dia inteiro · 8 h",
  "Meio período · 4 h" (aplica 4 h) e "Faltante · 8,00 h"; Título + Motivo + Ctrl+Enter → `POST` 201 e badge na linha.
- Badge clicável abre o dialog; remover mostra `p-confirmpopup` (nenhum `p-confirmdialog`).
- Tooltip do saldo: "Meta do dia: 8h 0min". ← vai a 09/2026 (3 cards), T volta a 10/2026 ("Hoje" desabilitado),
  → não avança do mês atual, atalho ignorado com o datepicker aberto.
- Desenvolvedor: Imprimir habilitado, sem Justificar e sem botão inline, assinatura do gestor em branco; 360×800
  sem overflow. Capturas em `.artifacts/100-ponto-mensal-acao-inline/`.

## Limites / pendente

- Frontend sem testes automatizados (P-001).

## Verificações complementares (2026-10-16, após o fecho)

- **"Hoje" a 360×800:** quebra limpo para a linha de baixo, sem overflow horizontal (0 px).
- **Dialog em dia sem déficit:** com justificativa de 8 h cobrindo o dia 01/10 (saldo +0h 0min), o clique no badge abre
  o dialog em 01/10/2026 com horas vazias e só os atalhos "Dia inteiro · 8 h" e "Meio período · 4 h" (sem "Faltante");
  a lista mostra as justificativas do mês.
- **Impressão:** `window.print()` é chamado uma vez ao clicar em Imprimir (stub em headless). Com `@media print` +
  `page.pdf` (A4) saem 1 página só com o espelho (cabeçalho, 3 totais, tabela dia a dia com a observação da
  justificativa). Limite: o diálogo nativo de impressão não é observável em headless.
