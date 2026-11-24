# Proposta e decisões — identidade visual (task 489)

Exploração feita com o autor em 2026-11-24, por páginas de proposta e por capturas do app real rodando numa cópia
isolada (nada foi alterado no código até a decisão final). As páginas publicadas (artefatos do claude.ai, privados do
autor) ficam como referência; as capturas brutas ficaram em `.artifacts/489-identidade-visual-logo-project-e-pia/`.

| Etapa | O que foi mostrado | Decisão do autor |
|---|---|---|
| 1 | 10 logos soltas | "precisamos de uma identidade mais clara" |
| 2 | Identidade com 3 direções, ancorada no azul do tema e na bolinha verde de "em execução" | — |
| 3 | Revisão de uma proposta do Gemini ("too much"): o que fica, o que sai, 3 versões enxutas | R3, "só a órbita" |
| 4 | R3 em degradê × sólido; a IA ganha nome: **Piá** (P-IA; piá é o menino em Curitiba) | Project sólido; Piá em degradê |
| 5 | R3 aplicada no app real (8 telas, 5 formatos, 2 temas) | P menor no favicon |
| 6 | 8 formas e 5 cores para a Piá | cor **Araucária** |
| 7 | O nome "piá"/"PIA" escrito em cada forma | opções 1, 4, 6 e 7 |
| 8 | As 4 opções no app real | — |
| 9 | "piá" como ícone × brilho de IA com o nome Piá; `@PIA` em Araucária | mesclar |
| 10 | Mescla: brilho nos ícones pequenos, "piá" nos avatares | avatar = opção 7 (acento) |

Decisões finais (2026-11-24):

- **Project 2.0:** marca R3 sólida (P, órbita, bolinha verde), cores fixas (`blue-600`/`blue-400`, `green-500`/`green-400`),
  não segue a cor primária escolhida pelo usuário. Favicon e Desktop no ladrilho com o P reduzido (escala 0,66), mesmo com a
  órbita pequena em 16 px.
- **Piá:** cor Araucária. Ícone de ação ou de menu da IA = brilho do PrimeIcons em Araucária. Quem fala (avatar da mensagem da
  IA no chat, check-in e grupo) = o nome "piá" escrito, com o acento do á em âmbar (opção 7).
- **Menção:** `@PIA` em Araucária no lugar do `@IA` azul. A cor entra nesta task; a grafia `@PIA` é a task 490.
- **Nome:** "Piá" só onde ela fala ou age, sempre sem artigo ("o/a Piá" fica em aberto, neutro).
- **Botão "Revisar com Piá"** do relatório no verde da Piá, no lugar do roxo.

Como regenerar o favicon e o ícone do Desktop a partir de `logo-project-ladrilho.svg`: renderizar o SVG em 16, 24, 32, 48,
64, 128 e 256 px com fundo transparente (Playwright, `omitBackground`) e juntar os PNGs num `.ico` (Pillow:
`save('favicon.ico', sizes=[...], append_images=[...])`); o PNG de 256 px é o `desktop/assets/icone.png`.
