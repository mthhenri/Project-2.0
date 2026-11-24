# Prévia aprovada — task 491

Feita com o autor em 2026-11-24 numa página de prévia (artefato privado do autor; arquivos fora do Git, em `.artifacts/`).

- **Gatilho escolhido:** 5 toques no avatar da Piá do chat da IA em menos de 2 segundos. Atalho de teclado e sorte ao
  encerrar o dia ficaram de fora.
- **Som escolhido:** "Fiel à gravação". O contorno foi medido no espectrograma de uma gravação de referência de licença
  livre (Wikimedia Commons, CC BY-SA 4.0), usada só para medir; o app não leva o
  arquivo, e o som é sintetizado. O que o navegador gera foi comparado com a gravação, espectrograma contra
  espectrograma, antes da aprovação.

Parâmetros (tempo em segundos, frequência em Hz):

| Parte | Contorno | Extra |
|---|---|---|
| 1 | 0 → 3650, 0,04 → 3950, 0,06 → 3950, 0,10 → 2800 | ruído 4300–6000 Hz, 0–0,11 s, ganho 0,35 |
| 2 | 0,30 → 2500, 0,32 → 3650, 0,38 → 2200 (ganho 0,9) | ruído 4600–5800 Hz, 0,31–0,36 s, ganho 0,25 |
| 3 | 0,45 → 2400, 0,57 → 3000, 0,62 → 3050, 0,80 → 2650 | segunda voz × 1,5, ganho 0,3 |

Envelope de cada parte: entrada de 8 ms e saída de 30 ms. Ruído: três passa-altas e dois passa-baixas (Q 0,7).
