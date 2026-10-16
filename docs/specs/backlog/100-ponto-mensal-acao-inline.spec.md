# 100 — Ponto mensal: justificar inline, imprimir para dev, saldo até hoje

**Origem:** Revisão de UI/UX — prints `prints/03-ponto-mensal.png` e `prints/05-ponto-justificar-dialog.png`, análise `analise-detalhada/ponto.md`

**Depende de:** 97 (padrão de dialog), 98 (skeleton/carga não destrutiva)

**Entrega:** visão mensal do Ponto com ação no ponto de decisão (justificar direto da linha do dia), impressão liberada para o desenvolvedor, 4º card "Saldo até hoje", horários compactos e navegação de mês com "Hoje" e atalhos.

> **Frontend apenas.**

---

## Escopo

1. **Justificar inline (gestor)**: botão fantasma no hover da linha de dia útil com déficit e sem justificativa; abre o dialog com `diaData` = dia da linha e sugestão de horas = `max(0, -saldoMinutos)` convertida para horas decimais (2 casas, cap em `maximoHoras` após a resposta da jornada). `stopPropagation` (a linha expande no clique). Badge de justificativa existente vira clicável (gestor) abrindo o dialog naquele dia; para dev permanece só tooltip.
2. **Dialog de justificativa**: chips de horas [Dia inteiro · Nh] [Meio período] [Faltante · N,NN h] (rótulos no mesmo formato decimal do campo); autofocus no Título quando o dia veio pré-preenchido; Enter salva; "Salvar justificativa" no footer; remoção com `p-confirmpopup` ancorado na lixeira.
3. **Imprimir para dev**: condição = `modo() === 'mensal' && pontoMensal()` (o signal não é limpo ao voltar à equipe — não usar só "mensal carregado"); passar `nomeGestor` **apenas quando** `sessao.eGestor()` (dev não assina como gestor).
4. **Resumo**: 4º card "Saldo até hoje" (soma client-side de `saldoMinutos` dos dias ≤ hoje), exibido **só no mês corrente**; tooltip no saldo do dia: "Meta do dia: {metaMinutos}" (o campo **já vem** com justificativa descontada — se exibir a original, calcular `metaMinutos + justificativaMinutosCobertos`).
5. **Horários `HH:mm`** (sem dd/MM) na linha do dia, timeline expandida, card do usuário, intervalos e impressão; textos de intervalo interpolam `ambiente.intervaloMinimoMinutos` (15) — nunca hardcode.
6. **Navegação**: botão-texto "Hoje" (desabilitado via `visualizandoMesAtual()`); atalhos ←/→/T **só no modo mensal**, ignorados com foco em input/datepicker/select ou dialog aberto.
7. **Header estável**: controles não aplicáveis ficam desabilitados em vez de removidos do DOM.

## Critérios de aceite

- Justificar um dia visto na lista: ≤4 interações (clique inline → título → motivo → Enter).
- Dev imprime o próprio espelho em 1 clique; linha de assinatura do gestor em branco.
- "Saldo até hoje" não aparece em meses passados.

## NÃO implementar nesta task

- Visão equipe (task 101).
