# 496-chatia-mais-visao.spec.md

> Task solta, pedida pelo autor em 2026-11-25 ("me sentindo meio sem visão no ChatIA, pouca coisa é mostrada").
> Decisões tomadas com o autor sobre maquetes no app real (CSS injetado, sem alterar código), registradas em
> `496-chatia-mais-visao/EXPLORACAO.md`; a verificação está em `496-chatia-mais-visao/VERIFICACAO.md`. Corrige junto o defeito do campo fora da tela nos formatos estreitos,
> achado na mesma exploração.

## Objetivo

Dar mais área útil à conversa do ChatIA (`/chat`): coluna mais larga, menos faixas fixas ocupando altura, a lateral
direita recolhível e o seletor de conversas/planos subindo para a barra de cima do app, sem quebrar a barra quando há
execução rodando.

## Entregáveis

1. **Coluna da conversa com 60rem.** O fluxo das mensagens (`.chat__fluxo`) e o rodapé (`.chat__rodape`) passam de
   `max-width: 48rem` para `60rem`.
2. **Sugestões em uma linha só.** A faixa de sugestões abaixo da conversa não quebra linha: rola na horizontal, sem
   barra de rolagem visível. As sugestões continuam vindo como hoje (as da IA depois de cada resposta; as fixas no
   começo e ao recarregar, decisão do autor).
3. **Menos respiro fixo.** O padding de cima do `.chat` e o fade/padding de cima e de baixo da área das mensagens
   diminuem (de 2rem para 1rem), já que o seletor sai do topo da página.
4. **Seletor na barra de cima.** O `app-chat-seletor` (título da conversa ou plano, etiqueta "conversa do dia", seta
   e "Novo plano") sai do topo da página do chat e passa a ser exibido à esquerda da barra superior do app
   (`app-topbar`), enquanto a página do chat estiver aberta. O mecanismo é genérico: um serviço do layout guarda um
   `TemplateRef` que a página registra ao abrir e retira ao sair; a barra o desenha com `ngTemplateOutlet`. Fora do
   chat a barra fica como hoje.
5. **Seletor compacto em janela estreita.** Com a barra superior abaixo de 1000px de largura: a etiqueta "conversa do
   dia" some, "Novo plano" vira só o ícone `+` (com tooltip do PrimeNG "Novo plano" e o mesmo `aria-label`), e o título
   da conversa/plano encolhe com reticências. O chip da execução ativa e o relógio continuam cabendo sem se sobrepor.
   Em janela larga, o título longo também ganha reticências em vez de empurrar o resto.
6. **Lateral recolhível.** No modo Perguntas, a lateral direita — a lista "Minhas demandas" **e** a demanda aberta
   (inclusive a da execução, que abre sozinha) — pode ser recolhida:
   - aberta: um botão `»` ("Recolher") no cabeçalho de "Minhas demandas" e no cabeçalho da demanda aberta;
   - recolhida: um trilho fino na borda direita (`«` e "Minhas demandas" na vertical, mais o número de demandas em
     aberto quando for maior que zero); clicar no trilho reabre o que estava (lista ou demanda);
   - nos formatos em que a lateral desce para baixo da conversa (container até 64rem), o trilho vira uma faixa
     horizontal fina abaixo da conversa;
   - a escolha fica no `localStorage` (`chat.lateral.recolhida`), como a largura do documento; padrão **aberta**;
   - o modo Planejamento (documento do plano) não recolhe.
7. **Defeito: campo de digitar fora da tela em 960×1080 e 720×1280.** Quando a lateral desce para baixo da conversa,
   a coluna da conversa precisa de `min-height: 0` para só as mensagens rolarem; hoje a página inteira rola e o campo
   de digitar fica abaixo da dobra.
8. **Chave de modo dentro do campo** (pedido do autor durante a implementação). Perguntas/Planejamento vira um
   quadradinho com os dois ícones no começo do campo de digitar, com o nome na tooltip e no `aria-label`; a legenda ("A IA
   pode cometer erros…", e no Planejamento "…Quem tem acesso ao plano vê esta conversa.") fica centralizada embaixo.
9. **Aviãozinho nas sugestões** (pedido do autor): cada sugestão leva o ícone de enviar, porque tocar nela já envia.
10. **Fade nas bordas das sugestões** (pedido do autor): quando a faixa rola, um fade só do lado que ainda tem o que rolar;
    sem rolagem, nenhum. Só CSS (animação ligada à rolagem da própria faixa).
11. **Extração** (o `chat.page.scss` passou do limite de erro de 8 kB do build): a faixa de sugestões vira
    `app-chat-sugestoes` e o trilho vira `app-chat-lateral-trilho`, cada um com o próprio estilo.
12. Testes de componente para o recolher (estado inicial aberto, recolher, reabrir, persistência, contador) e para o
   registro do seletor na barra (aparece com a página, some ao sair).

## Critérios de Aceite

- Verificação ao vivo (skill `verify`) em `1920×1080`, `1366×768`, `1080×1920`, `720×1280` e `960×1080`, temas claro
  e escuro, com: conversa cheia; lateral aberta e recolhida; demanda da execução aberta (com execução rodando, o chip
  e o relógio legíveis na barra, sem sobreposição); modo Planejamento; estado vazio da conversa. O campo de digitar
  fica à vista em todos os formatos sem rolar a página.
- A altura útil das mensagens em 1366×768 sobe de ~400px (antes) para ~500px com a lateral recolhida.
- Fora do chat, a barra superior fica igual à de hoje (comparar `/ponto`).
- `npm run test --workspace=frontend`, `npm run build --workspace=frontend`, `npm run lint:tudo` sem erros;
  `npm run repo:verificar`.

## Fora de Escopo

- Modo compacto das mensagens (data e nível só ao passar o mouse): o autor recusou.
- Mudar as sugestões ao recarregar a página: o autor decidiu deixar como está.
- Recolher o documento do plano no modo Planejamento.
- Qualquer mudança de backend, contrato ou modelagem.

## Dependências

Nenhuma. Análogo aprovado: a própria tela do chat (`chat.page`), cujo rodapé, lateral e seletor são reaproveitados; o
"Recolher" da barra lateral (`app-sidebar`) é a referência do recolher persistido.

## Riscos e Mitigação

- **Barra superior é compartilhada** (`app-topbar`, usada por todo o layout): o ponto de extensão fica vazio fora do
  chat; aplicar `gerenciamento-de-impacto` e comparar outra tela antes e depois.
- **O template continua pertencendo à página**: o `ngTemplateOutlet` mantém o contexto do chat, então os eventos do
  seletor (escolher dia, plano, Novo plano) seguem chegando à `ChatPage`. A página precisa retirar o template ao ser
  destruída, ou a barra desenharia um template morto.
