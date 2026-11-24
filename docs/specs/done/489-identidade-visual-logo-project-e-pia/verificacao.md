# Verificação — task 489 (identidade visual: logo do Project e da Piá)

Data: 2026-11-24. Branch `claude/stoic-shannon-c8w7xi`, app real rodando a partir do checkout da branch.

## Gates

| Gate | Comando | Resultado |
|---|---|---|
| Testes do frontend | `npm run test --workspace=frontend` | 240 arquivos, 2972 testes, 0 falha |
| Build do frontend | `npm run build --workspace=frontend` | sem erro; avisos de orçamento (bundle inicial, `chat.page.scss`, `checkin.page.scss`, `editor-mensagem`, `demanda-arvore-item`, `supervisao-chat`) e o NG8102 do `MarkdownVisualizadorComponent` **já existiam** (nenhum desses arquivos ganhou estilo; os dois primeiros encolheram) |
| Lint completo | `npm run lint:tudo` | 0 erro (ESLint, Stylelint, Prettier em HTML/SCSS, SQL) |
| Testes do Desktop | `npm run test --workspace=desktop` | 49 testes, 0 falha (só o `icone.png` mudou) |
| Organização | `npm run repo:verificar` | aprovada |

A primeira rodada do lint achou 1 erro (o `app-logo-pia` com template em linha; a regra do projeto exige HTML e SCSS em
arquivo) e 5 arquivos fora do Prettier; os dois foram corrigidos antes da rodada acima.

## Verificação ao vivo

Cenário montado por API e SQL num banco local: projeto, demanda, duas atividades, quatro execuções (uma ativa), uma
conversa do dia com resposta da IA, um grupo com uma menção `@IA` e a resposta da IA. A IA aparece "no ar" por uma
chave fictícia (só a disponibilidade foi consultada; nenhuma chamada de IA foi feita) e as mensagens dela foram
inseridas no banco.

8 telas × 5 formatos (`1920×1080`, `1366×768`, `1080×1920`, `720×1280`, `960×1080`) × 2 temas = 80 capturas, sem erro
de página; o tema escuro foi conferido pela classe `app-escuro`. Telas: login, Ponto com a barra aberta e recolhida,
chat com resposta da IA, check-in, grupo com a IA (janela de chat do Desktop), Relatório de execuções com projeto
escolhido e Configuração da IA na aba Autonomia. Conferido em recortes de 1920 nos dois temas e em mosaicos dos formatos
estreitos:

- Marca do Project: barra lateral aberta (ao lado do nome) e recolhida (só o símbolo), login acima do nome, ladrilho no
  cabeçalho do check-in. Mantém tamanho e alinhamento do elemento que substituiu.
- Brilho da Piá em Araucária: item "IA Config.", menção `@IA` (selo verde com o brilho), aba "Autonomia", aviso
  "/resumir" do grupo; quando "IA Config." é a tela aberta, o brilho segue a cor de item ativo, como os vizinhos.
- Logo "piá" (acento âmbar) nos avatares do chat, do check-in e da resposta no grupo, legível nos dois temas.
- Botão "Revisar com Piá" contornado no verde da Piá, sem o roxo.
- Textos: "Piá · para Ana Souza", "Revisar com Piá", "Este chat pode ser resumido por Piá".
- Favicon e ícone do Desktop conferidos em 16, 24, 32, 48 e 256 px a partir dos PNGs gerados: em 16 px a órbita e a
  bolinha ficam pequenas, como o autor aceitou ao escolher o P reduzido.

Capturas em `.artifacts/489-identidade-visual-logo-project-e-pia/verificacao/` (fora do Git).

## Limites

- A aba do navegador e a bandeja real do Windows não aparecem em captura do Playwright; o favicon e o ícone foram
  conferidos pelos arquivos gerados.
- As telas não exercitadas ao vivo que também trocaram o ícone (plano do chat, documentação, assistente de descrição,
  resumo do grupo, aviso de retorno da IA, cartão de proposta) estão cobertas pelos testes de componente; a troca é a
  mesma classe nos 17 pontos.
