# Exploração com o autor — ChatIA "sem visão" (2026-11-25)

Rodadas de maquete no app real, com uma conversa de 10 mensagens plantada no banco: CSS e mudanças de lugar injetados pelo
Playwright, sem alterar código. As capturas ficaram em `.artifacts/chatia-visao/` (fora do Git).

## Diagnóstico medido (antes)

| Formato | Altura útil das mensagens | Observação |
|---|---|---|
| 1920×1080 | 712px | coluna da conversa limitada a 48rem (768px); ~280px vazios à esquerda e ~250px antes da lateral |
| 1366×768 | 400px (52% da tela) | 154px até a primeira mensagem; rodapé de 170px com as sugestões em duas linhas |
| 960×1080 e 720×1280 | — | **defeito**: com a lateral embaixo, a página inteira rolava e o campo de digitar ficava abaixo da dobra (falta de `min-height: 0` na coluna da conversa) |

## Decisões do autor

1. Coluna da conversa com **60rem**.
2. "Minhas demandas" **recolhível**, guardada no navegador, padrão **aberta**; o recolher vale também para a **demanda
   aberta** (inclusive a da execução); o trilho mostra o **número** de demandas em aberto.
3. Modo compacto das mensagens (data e nível só ao passar o mouse): **recusado**.
4. Sugestões em **uma linha só**; as fixas ao recarregar ficam como estão.
5. O seletor de conversas/planos e o "Novo plano" vão para a **barra superior do app** (a opção de levá-los ao rodapé
   apertou o rodapé e baixou a área para 375px); "Minhas demandas" **não** vai para a barra.
6. Com execução rodando, a barra em 960/720 encavalava o chip com o relógio: abaixo de 60rem de barra, o seletor fica
   compacto (sem "conversa do dia", "Novo plano" só com o `+`, título com reticências).
7. Durante a implementação: a chave Perguntas/Planejamento vira um quadradinho de ícones no começo do campo, com a
   legenda centralizada embaixo; aviãozinho e fade nas bordas das sugestões.
