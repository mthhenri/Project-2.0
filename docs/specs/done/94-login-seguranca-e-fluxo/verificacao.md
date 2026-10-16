# Task 94 — verificação

Data: 2026-10-16. Frontend apenas (login, guard, interceptors, serviço de autenticação).

## O que foi feito

- `ultimo_login` guarda só `{ login, nomeCompleto }` (nome vindo da sessão após o login). O formato antigo,
  com `senha`, é apagado no primeiro carregamento. Checkbox "Lembrar meu usuário neste computador" (marcado).
- Estado A (usuário lembrado): chip com iniciais, nome e @login, campo Senha com autofocus e "Entrar com outro
  usuário" (abre o formulário completo e foca o Login sem apagar o lembrado). Estado B: autofocus no Login e
  normalização trim + minúsculas no blur.
- Erro de credencial foca a Senha com o texto selecionado; o erro some ao digitar; 400 mostra a mensagem do
  backend; status 0/5xx mostra "Servidor indisponível…"; área da mensagem com `min-height`; campos desabilitados
  durante o envio e guarda de re-submit. Senha só `required`; login mantém `minLength(4)`.
- Aviso de Caps Lock (`getModifierState`). Rodapé "Esqueceu a senha?…" e botão de tema na página.
- `ERRO_TRATADO_PELA_TELA` (`HttpContext`) tira o toast/redirect global da requisição de login.
- `returnUrl`: `autenticacaoGuard` e o redirect de 401 gravam a URL pedida; `urlRetornoSegura()` aceita só caminho
  interno (rejeita `//host`, esquema, barra invertida e a própria tela de login) e cai em `/ponto`. O `/atividade`
  fixo saiu.

## Verificado ao vivo (Chromium, API real)

- Legado `{login, senha}` no localStorage → removido, sem senha em nenhuma chave.
- Estado B com foco no Login; `"  Gestor.Inicial "` virou `gestor.inicial` no blur.
- Senha errada + Enter: banner "Credenciais inválidas", nenhum toast, foco na Senha com texto selecionado,
  botão sem deslocamento vertical; digitar apaga o erro; senha de 6 caracteres chega à API; rede abortada →
  "Servidor indisponível…".
- Sucesso → `/ponto`, storage só com login e nome. Deslogado em `/demanda` → `/autenticacao?returnUrl=%2Fdemanda`
  → Estado A (foco na Senha, sem campo Login) → só senha + Enter → aterrissa em `/demanda`.
  `returnUrl=//evil.com` → `/ponto`. "Entrar com outro usuário" foca o Login e mantém o lembrado.
- 360×800 sem overflow horizontal. Capturas em `.artifacts/94-login-seguranca-e-fluxo/`.

## Limites / pendente

- Caps Lock verificado com evento sintético (`getModifierState` real depende do teclado).
- Sem como voltar ao usuário lembrado depois de "Entrar com outro usuário" sem recarregar (a spec não pede).
- Redirect 401 com `returnUrl` não foi provocado ao vivo (mesma função do guard, coberta só por leitura).
- Frontend sem testes automatizados (P-001).
