# Task 114 — verificação

Data: 2026-10-16. Frontend apenas.

**Análogo escolhido:** o dialog de anotações anterior (mesmo conteúdo/Quill, mesma API pública `abrir`/`aoAlterar`), o
toast "Desfazer" da 99 e o rodapé de formulário da 97. O `p-drawer` (PrimeNG 21) ainda não era usado no projeto.

## O que foi feito

- `app-usuario-anotacoes-dialog` virou um **drawer à direita (520 px)** com scrim: header "Minhas anotações" (id da
  sessão) ou "Anotações de {nome}", "Editado há X" com tooltip da data completa, toolbar Quill enxuta (H2 · B I U S ·
  listas · link · limpar), skeleton no carregamento, placeholder "Escreva aqui — salva sozinho…" e foco no editor.
- **Auto-save por mudança:** cada digitação agenda o PUT 2 s depois; sem mudança real **não sai requisição** (o timer
  incondicional de 30 s acabou). Fechar (Esc, clique fora, X) descarrega na hora e **não há confirm**. Se o PUT do
  flush falha com o drawer fechado, o toast de erro oferece **"Reabrir"** com o conteúdo preservado.
- **Rodapé:** Limpar (danger) · indicador "Editando… → Salvando… → ✓ Salvo às HH:mm" (ou "Não salvou — tente de
  novo") · Salvar manual (Ctrl+S), habilitado só quando há o que salvar.
- **Limpar com Desfazer de 7 s:** o editor esvazia na hora e o vazio só é gravado quando a janela termina (expirou,
  toast fechado, outra oferta ou saída da página); fechar o drawer na janela não grava o vazio; Desfazer devolve o
  conteúdo sem nenhuma requisição; digitar na janela aceita a limpeza e segue escrevendo.
- `aoAlterar` agora carrega `{ usuarioId, temAnotacoes }` (regra de "vazio efetivo" igual à do backend, em
  `utils/anotacoes.util.ts`): a listagem atualiza o ícone da linha **sem recarregar**.
- **Deep-link** `/usuario/:id/anotacoes`: gestor → `/usuario` com o drawer aberto; o próprio usuário → `/ponto` com o
  drawer (a topbar trata `?anotacoes=`); id alheio de quem não é gestor → `/ponto` sem drawer.
- `DesfazerService` ganhou `rotulo`, `duracaoMs`, `mensagemAposDesfazer` e `aoEncerrar` (opcionais; os consumidores
  antigos não mudam) e `dispensarSemEncerrar()`; `UsuarioService.alterar` aceita `erroNaTela` (sem toast genérico).

## Verificação ao vivo (Chromium, API real, gestor; e um desenvolvedor para o deep-link)

- Abrir: título "Anotações de Usuario U54032", foco no `.ql-editor`; **0 PUT em 4 s sem digitar**.
- Digitar → "Editando…"; ~2 s depois um único `PUT /usuario/5` → "Salvo às 20:42"; o ícone da linha fica destacado sem
  recarregar a listagem.
- Digitar + Esc imediato: 1 PUT, drawer fecha, sem confirm; reabrir mostra o conteúdo salvo. Ctrl+S: 1 PUT.
- Limpar: editor vazio com placeholder e toast "Anotações limpas · Desfazer", 0 PUT; Esc dentro da janela: 0 PUT;
  Desfazer: 0 PUT e o conteúdo volta; Limpar de novo e esperar: o PUT do vazio sai aos 7 s e o ícone da linha apaga.
- Topbar: tecla `n` abre "Minhas anotações"; digitar + Esc grava (`PUT /usuario/1`).
- Deep-links: gestor `/usuario/1/anotacoes` e `/usuario/5/anotacoes` abrem o drawer em `/usuario` (URL limpa);
  desenvolvedor: id próprio → `/ponto` com "Minhas anotações"; ids alheios → `/ponto` sem drawer.
- Falha no salvamento (PUT abortado): aberto → "Não salvou — tente de novo" e nenhum toast genérico; fechado → toast
  "Não foi possível salvar as anotações · Reabrir"; Reabrir devolve o conteúdo e o auto-save grava ("Salvo às …").
- 1920×1080, 1366×768 e 1080×1920: drawer e toast sem sobreposição relevante e sem overflow horizontal.
  Capturas em `.artifacts/114-anotacoes-drawer-autosave/`.

## Achados da verificação (corrigidos)

- O toast "Desfazer" (canto inferior direito) cobria o rodapé do drawer: com o drawer aberto ele sobe para a esquerda
  do painel (regra em `styles.scss`, só enquanto `.anotacoes-drawer` existe).
- O toast de erro genérico se empilhava sobre o "Reabrir": os salvamentos de anotações passam o erro à própria tela.

## Impacto

- Consumidores do `app-usuario-anotacoes-dialog`: topbar, listagem e perfil (mesma API `abrir`; `aoAlterar` mudou de
  `void` para o evento com `usuarioId`/`temAnotacoes`, e o perfil repassa). O ícone da listagem não recarrega mais.
- `DesfazerService`/`app-toast-desfazer`: campos novos opcionais; sem mudança para quem já usava.
- A spec 84 recebeu uma nota de superação (guarda de "Salvar/Descartar" não vale mais para as anotações do usuário).

## Limites / pendente

- Auto-save e "Reabrir" só foram exercitados com o usuário gestor; o desenvolvedor foi verificado só no deep-link.
- Um 409/edição concorrente de outra aba não é tratado (o backend não versiona as anotações).
- Frontend sem testes automatizados (P-001); a regra pura (`anotacaoTemTexto`, `tempoDecorrido`) está sem teste porque
  o frontend não tem runner.
