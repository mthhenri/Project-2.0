# 221-mensagem-direta-posicao-e-tamanho-do-popup.spec.md

> Pedido do autor em 2026-10-23: poder **redimensionar** o chat, **movê-lo** pela tela e ter no perfil uma "posição do chat" (canto esquerdo,
> canto direito, centro etc.). **Rascunho para aprovação; não foi implementada.**

## Objetivo

O popup do chat (hoje 392×640 fixo no canto inferior direito) passa a ter posição e tamanho escolhidos pelo usuário, e o Project se lembra deles.

## Desenho proposto

1. **Posição padrão no perfil:** `posicaoPopup` na preferência do chat (`mensagem_direta_preferencia`, migration `0052`/próxima livre, coluna
   anulável sem `DEFAULT`; o `shared` fornece o padrão `CANTO_INFERIOR_DIREITO`). Valores: `CANTO_INFERIOR_DIREITO`, `CANTO_INFERIOR_ESQUERDO`,
   `CANTO_SUPERIOR_DIREITO`, `CANTO_SUPERIOR_ESQUERDO`, `CENTRO`. Escolha no menu de notificações/preferências do chat (ao lado do silêncio).
2. **Mover:** arrastar pelo cabeçalho do popup (a faixa de arrasto que a janela do Desktop já usa); a posição solta vale para a sessão e é
   limitada à tela (nunca fica fora da janela). Um botão "Voltar à posição do perfil" desfaz.
3. **Redimensionar:** alça no canto oposto à âncora; mínimos 360×480 e máximo da viewport menos a margem. Tamanho e posição arrastada ficam
   em `localStorage` **por usuário** (conveniência do navegador, não dado de negócio), com a posição do perfil como padrão.
4. **Desktop:** a janela do chat (`/chat-popup`) tem tamanho próprio no Electron; fora do escopo desta task (só o popup dentro do Project).
5. Lógica de limite e âncora em funções puras testáveis (`utils/posicao-popup.util.ts`).

## Pontos a decidir com o autor

- Posição arrastada persiste entre sessões (proposto: sim, em `localStorage`) ou só até recarregar?
- Preferência de posição só no perfil/chat, ou também em "Meu perfil"?

## Critérios de Aceite (a detalhar na aprovação)

Testes da lógica pura (limites, âncoras), do componente (arrasto, alça, preferência), do repository (migration) e verificação ao vivo em
1920×1080, 1366×768 e 1080×1920.
