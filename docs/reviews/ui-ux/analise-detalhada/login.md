# Login (/autenticacao)

## Fluxos atuais
- **Primeiro login na máquina (sem credencial salva)** (2 cliques): 1) Clicar no campo Login (sem autofocus); 2) Digitar login; 3) Tab; 4) Digitar senha; 5) Enter (ou clicar em Entrar); 6) Cai em /atividade mesmo que a rota padrão seja /ponto ou que tenha vindo de um deep link — precisa navegar manualmente ao destino.
- **Login recorrente (credenciais salvas — inclusive a senha, em texto puro)** (2 cliques): Campos já preenchidos; Enter não funciona porque o foco não está no form; 1) Clicar em Entrar; 2) Navegar de /atividade até a tela desejada (ex.: Ponto = +1 clique).
- **Trocar de usuário na mesma máquina** (2 cliques): 1) Clicar em 'Esquecer identificação' (label obscura, ícone de lixeira, posicionado abaixo do botão primário); 2) Clicar no campo Login (o reset não devolve o foco); 3) Digitar login; 4) Digitar senha; 5) Enter.
- **Recuperar-se de senha errada** (1 cliques): 1) Submit falha, banner aparece empurrando o botão; 2) Clicar no campo Senha (foco não é gerenciado após o erro); 3) Redigitar (o erro antigo continua visível enquanto digita); 4) Enter. Se o Caps Lock estava ligado, o usuário não teve nenhum aviso e repete o ciclo.
- **Conferir a senha digitada** (1 cliques): 1) Clicar no ícone de olho do p-password (toggleMask). Funciona bem.

## Problemas
- [ALTA] P1: Senha persistida em texto puro no localStorage (salvarUltimoLogin grava {login, senha} em JSON) e re-preenchida automaticamente, sem qualquer consentimento. Qualquer pessoa com acesso físico ao navegador entra com 1 clique E consegue ler a senha via DevTools. É uma 'conveniência' que cria um risco grave num sistema interno multiusuário.
- [ALTA] P2: Sem autofocus: nenhum campo recebe foco ao carregar. Todo login começa com um clique de mouse desnecessário, e Enter não submete enquanto o foco estiver fora do form — o caso 'credenciais lembradas' força uso do mouse.
- [ALTA] P3: Redirect pós-login hard-coded para '/atividade', divergente da rota padrão do app ('/ponto') e sem returnUrl: o autenticacaoGuard descarta a URL originalmente solicitada, então quem abre um deep link (ex.: /demanda) loga e cai em outra tela, tendo que navegar de novo (2+ cliques perdidos).
- [MEDIA] P4: Validação client da senha (minLength 8) é mais restritiva que o backend (AutenticacaoLoginDto exige apenas IsNotEmpty): senhas legadas/curtas válidas nunca chegam à API, e a mensagem 'Mínimo de 8 caracteres' vaza a política de senha na tela de login.
- [MEDIA] P5: 'Esquecer identificação' com ícone de lixeira é linguagem de sistema, não de usuário (a tarefa real é 'entrar com outro usuário'); fica abaixo do botão primário competindo com ele, e ao clicar reseta o form sem devolver o foco ao campo Login.
- [MEDIA] P6: O banner de erro geral é renderizado condicionalmente entre a senha e o botão: quando aparece causa layout shift (o botão 'pula'), e não é limpo quando o usuário volta a digitar — a mensagem de falha permanece visível durante a correção, gerando ruído.
- [MEDIA] P7: Nenhum aviso de Caps Lock ativo no campo de senha — causa clássica de ciclo inteiro de erro (submit → falha → redigitar) que um hint de 1 linha evitaria.
- [BAIXA] P8: Campos não são desabilitados durante o loading: o usuário pode editar login/senha enquanto o request está em voo, e o valor editado é ignorado pela tentativa em andamento.
- [BAIXA] P9: Fallback de erro único 'Credenciais inválidas' mesmo para falha de rede/servidor fora (erro.error?.mensagem inexistente em status 0) — o usuário redigita a senha achando que errou, quando o problema é o servidor.
- [BAIXA] P10: O client não normaliza o login (trim/lowercase) apesar de o backend fazer @Transform(lowercase+trim): espaços acidentais podem disparar o erro de minLength(4) no client para um login que a API aceitaria.
- [BAIXA] P11: Sem caminho de ajuda para senha esquecida: o backend não tem recuperação self-service, mas a tela também não orienta ('procure um gestor'), deixando o usuário travado sem próxima ação.
- [BAIXA] P12: Sem toggle de tema claro/escuro na página de login (o app suporta ambos, mas antes de logar o usuário não tem acesso ao controle) e sem indicação de versão/ambiente no rodapé.

## Sugestões (JÁ VERIFICADAS)
### S1 — Autofocus gerenciado + guarda de re-submit no Enter [impacto alto]
Confirmado: não há autofocus em nenhum campo (login.page.html) e Enter já submete via ngSubmit + botão type=submit — mas só quando o foco já está dentro do form, o que hoje exige um clique. Reformulação: (1) ao carregar, focar Login se não há usuário lembrado, ou Senha se há (Estado A da spec); (2) após erro de credencial, focar Senha com texto selecionado (a senha não é apagada hoje, então selecionar permite redigitar direto); (3) ao alternar para 'Entrar com outro usuário', focar Login; (4) adicionar guarda `if (this.carregando()) return;` no início de entrar() — hoje Enter durante o loading dispara ngSubmit de novo mesmo com o botão em spinner, podendo duplicar a request. Implementar foco via ViewChild + focus() (padrão já usado no projeto, ex.: atividade-visualizar-dialog.component.ts linha 134).
_Redução de esforço:_ elimina o clique inicial no campo em todo login (primeiro acesso, recorrente e retentativa); Enter passa a funcionar de ponta a ponta sem mouse

### S2 — Lembrar apenas login + nomeCompleto (nunca a senha) com estado 'Bem-vindo de volta' [impacto alto]
P1 confirmado no código: salvarUltimoLogin() grava JSON.stringify({ login, senha }) em localStorage (login.page.ts linhas 78-81) e o ngOnInit repõe ambos no form — senha em texto puro persistida na máquina. Reformulação: gravar { login, nomeCompleto } após sucesso (nomeCompleto está disponível em AutenticacaoTokenDto.usuario na resposta do login — dado real, não sensível), nunca a senha. No retorno, Estado A com chip de iniciais/nome + só o campo Senha focado. Checkbox 'Lembrar meu usuário' marcada por padrão no Estado B. Nota de ceticismo honesta: hoje o fluxo recorrente é 1 clique sem digitar nada (senha pré-preenchida); a proposta troca isso por digitar a senha + Enter. É um pequeno AUMENTO de digitação, plenamente justificado — eliminar senha em texto puro do localStorage não é opcional, e o novo fluxo mantém 0 cliques de mouse.
_Redução de esforço:_ mantém login recorrente em 0 cliques (senha + Enter) eliminando a persistência de senha em texto puro; o chip com nome real reduz erro de 'logar como usuário errado' em máquina compartilhada

### S3 — returnUrl no guard E no interceptor 401 + destino padrão /ponto [impacto alto]
Confirmado nos dois pontos: autenticacaoGuard retorna createUrlTree(['/autenticacao']) sem returnUrl (autenticacao.guard.ts linha 10) e o pós-login navega para '/atividade' (login.page.ts linha 66), enquanto a rota padrão real é redirectTo 'ponto' (app.routes.ts linha 27). Reformulação ampliada: (1) guard grava returnUrl via queryParams com state.url; (2) o MESMO tratamento no error-handler.interceptor.ts (linha 17), que hoje redireciona para /autenticacao em qualquer 401 descartando a URL — sessão expirada é o caso mais frequente de volta ao login e perderia todo o benefício se ficar de fora; (3) pós-login navega para returnUrl ?? '/ponto'; (4) sanitizar returnUrl como caminho interno (router.parseUrl, rejeitar URLs absolutas/externas) para evitar open redirect. Sem conflito de permissão: se um dev cair num returnUrl de rota de gestor, os guards de rota existentes já barram.
_Redução de esforço:_ de 3-5 passos (logar + renavegar) para 1 passo em deep links e em toda re-autenticação por sessão expirada

### S4 — Trocar 'Esquecer identificação' por 'Entrar com outro usuário' (sem apagar o lembrado no clique) [impacto medio]
Confirmado: hoje existe botão 'Esquecer identificação' com ícone pi-trash (login.page.html linhas 62-74) que chama esquecerLogin() — remove o localStorage e reseta o form, linguagem orientada ao sistema e destrutiva. Reformulação: no Estado A, link textual 'Entrar com outro usuário' que apenas troca para o Estado B com Login vazio e focado, SEM apagar o login lembrado imediatamente — o lembrado só é sobrescrito no próximo login bem-sucedido com a checkbox marcada (ou removido se desmarcada). Assim um clique acidental não destrói o atalho do usuário habitual. Depende de S2 (só faz sentido com o Estado A).
_Redução de esforço:_ de 2 cliques (esquecer + clicar no campo) para 1 clique com foco automático; clique acidental deixa de custar a reconfiguração do 'lembrar'

### S5 — Validação alinhada ao backend + normalização do login + limpeza do erro ao digitar [impacto medio]
Confirmado: o client exige Validators.minLength(8) na senha (login.page.ts linha 28) mas o DTO do backend só valida @IsNotEmpty (AutenticacaoLoginDto.ts) — senha legítima de 6 caracteres é bloqueada antes do submit, um falso negativo real. minLength(4) do login BATE com o @MinLength(4) do backend e deve ser mantido. O backend aplica @Transform lowercase+trim no login; espelhar no blur do campo evita 'Credenciais inválidas' por espaço/maiúscula acidental (o backend já normaliza, então o espelhamento é para o usuário VER o valor que será enviado, não para corrigir o request). erroLogin() hoje só é limpo no próximo submit (linha 55); limpar via valueChanges assim que o usuário digitar em qualquer campo.
_Redução de esforço:_ elimina bloqueio falso de submit para senhas curtas válidas e remove banner de erro obsoleto que induz a achar que a nova digitação também está errada

### S6 — Aviso de Caps Lock no campo de senha [impacto medio]
Confirmado que não existe no código e que nem PrimeNG nem o browser fornecem isso nativamente para p-password. Implementar com getModifierState('CapsLock') em keydown/keyup no wrapper do campo (os eventos do input interno do p-password borbulham). Hint âmbar de 0.75rem abaixo do campo, dentro da área já reservada de mensagens (integra com S7 para não criar novo layout shift). Sem dependência de backend, sem conflito de regra de negócio.
_Redução de esforço:_ evita 1 ciclo completo de erro (submit + banner 'Credenciais inválidas' + redigitar + resubmit) por ocorrência da causa mais comum de senha errada

### S7 — Área de mensagem com altura reservada + mapeamento de erro CORRIGIDO (400, não 401) + supressão do toast duplicado [impacto medio]
Layout shift confirmado: o banner é inserido condicionalmente entre a senha e o botão (login.page.html linhas 48-52) e empurra o botão. PORÉM a proposta original está factualmente errada no mapeamento: neste backend, credencial inválida retorna HTTP 400 (BusinessException → BAD_REQUEST, business.exception.ts) com mensagem 'Credenciais inválidas' ou 'Usuário inativo' — 401 NUNCA ocorre no fluxo de login; 401 é tratado pelo interceptor global como sessão expirada (limpa token e redireciona). Versão corrigida: (1) min-height fixa na área de mensagem; (2) status 400 → banner com erro.error.mensagem do backend (preserva a distinção 'Usuário inativo', que a mensagem hard-coded 'Login ou senha incorretos' esconderia); (3) status 0/5xx → 'Servidor indisponível. Tente novamente.'; (4) suprimir o toast global para a request de login (via HttpContext token checado no error-handler.interceptor.ts) — hoje todo 400 do login gera toast bottom-center DUPLICADO com o banner inline (interceptor linhas 22-27); (5) desabilitar os campos durante o loading (hoje só o botão tem [loading]).
_Redução de esforço:_ elimina clique errado por botão que pula, redigitação inútil quando o problema é o servidor e o duplo feedback (toast + banner) para o mesmo erro

### S8 — Rodapé de ajuda estático + toggle de tema na página de login [impacto baixo]
Verificado: o módulo de autenticação do backend expõe apenas POST /autenticacao/login — não existe endpoint de recuperação de senha, então o texto estático 'Esqueceu a senha? Solicite a redefinição a um gestor.' é honesto e correto (redefinição por gestor é coerente com o perfil GESTOR de acesso total). O TemaService existe, aplica a classe app-escuro no documentElement e persiste em localStorage independentemente de autenticação — funciona pré-login; hoje o toggle só existe na topbar autenticada (topbar.component.html linha 63), então quem usa tema escuro encara um flash claro no login. Implementação trivial: p-button text rounded chamando tema.alternarTema(), reutilizando o serviço existente.
_Redução de esforço:_ dá próxima ação a quem esqueceu a senha (antes: beco sem saída); tema acessível sem logar — ganho pequeno e majoritariamente de conforto, coerente com impacto baixo


## Ajustes na spec (verificador)
1) ERRO DE FATO no estado 'Erro de credencial (401)': neste backend credencial inválida retorna HTTP 400 (BusinessException) com mensagem 'Credenciais inválidas' ou 'Usuário inativo'; 401 é sessão expirada e é interceptado globalmente (limpa token + redireciona). Corrigir a spec para: 400 → banner de erro com a mensagem do backend (erro.error.mensagem); 0/5xx → banner âmbar 'Servidor indisponível'; remover toda referência a 401 no fluxo de login. 2) A spec deve prever a supressão do toast global do error-handler.interceptor para a request de login (ex.: HttpContext token) — sem isso, todo erro de credencial exibe banner inline + toast bottom-center duplicados. 3) Chip de identidade: gravar { login, nomeCompleto } no localStorage (nomeCompleto vem de AutenticacaoTokenDto.usuario na resposta de sucesso) — as iniciais 'AS' devem derivar do nomeCompleto real ('Ana Souza'), não da string de login; nunca gravar a senha. 4) returnUrl: exigir sanitização como caminho interno (router.parseUrl, rejeitar URL absoluta) contra open redirect, e aplicar a gravação de returnUrl também no redirect 401 do error-handler.interceptor (sessão expirada), não só no guard. 5) 'Enter ignorado até a resposta' requer guarda explícita em entrar() (hoje não há checagem de carregando(); ngSubmit dispara mesmo com o botão em loading). 6) 'Entrar com outro usuário': especificar que o login lembrado NÃO é apagado no clique — é sobrescrito apenas no próximo login bem-sucedido com a checkbox marcada (clique acidental não destrói o atalho). 7) Rodapé 'Project 2.0 · v1.4.0': a versão real nos package.json é 1.0.0 — usar a versão real ou omitir o número. 8) Estado B: manter o erro inline 'Mínimo de 4 caracteres' do login (o backend valida @MinLength(4)); a remoção de mínimo vale SÓ para a senha, como a spec já indica — apenas garantir que o mockup não remova a validação do login por engano.

## REDESIGN SPEC
# Redesign — Tela de Login (`/autenticacao`)

Página pública, sem topbar. Objetivo: login recorrente em **0 cliques** (senha + Enter), primeiro login em **0 cliques de mouse** (autofocus + Tab + Enter), e aterrissagem direta no destino (returnUrl).

---

## 1. Página de fundo

- Fundo `var(--app-fundo)` (tema Aura claro/escuro), 100vh, conteúdo centrado vertical e horizontalmente.
- **Canto superior direito da página**: botão de ícone fantasma (p-button text, rounded) sol/lua — alterna tema claro/escuro antes do login. Tooltip: "Alternar tema".
- **Rodapé da página** (fixo, centrado, texto 0.75rem cinza): `Project 2.0 · v1.4.0`.

## 2. Card central (p-card, 420px, max 90vw)

### 2.1 Cabeçalho do card
- Logotipo/título **"Project 2.0"** (1.75rem, bold, azul primário `--p-primary-600`), centrado.
- Subtítulo muda por estado:
  - Form completo: `Entre para continuar`
  - Usuário lembrado: `Bem-vindo de volta`

### 2.2 Corpo — ESTADO A: "Bem-vindo de volta" (usuário lembrado — padrão para quem já logou nesta máquina)

> Somente o **login** é lembrado (localStorage `ultimo_login` guarda apenas a string do login — **nunca a senha**).

- **Chip de identidade** (centrado, acima do campo de senha): avatar circular 40px com iniciais **"AS"** (fundo azul claro, texto azul) + nome do login **`ana.souza`** em peso 600. Ao lado, nada de ícones — o chip é só identificação.
- Logo abaixo do chip, link textual pequeno (p-button text, secondary, sem ícone): **`Entrar com outro usuário`** → troca para o Estado B e foca o campo Login. ①③
- **Campo "Senha"** (única entrada visível):
  - Label `Senha`; p-password, toggleMask (olho), placeholder `••••••••`, autocomplete `current-password`.
  - **Autofocus ao carregar a página.** ①
  - Hint condicional âmbar abaixo do campo (0.75rem, ícone pi-exclamation-triangle): `Caps Lock ativado` — visível apenas quando `getModifierState('CapsLock')` é true. ④
- **Área de mensagem** (min-height fixa de 3rem — sempre reservada, sem layout shift ④):
  - Vazia por padrão.
  - Erro 401: p-message error `Login ou senha incorretos.` — some assim que o usuário digitar; foco volta à Senha com texto selecionado.
  - Erro rede/5xx: p-message warn `Servidor indisponível. Tente novamente em instantes.`
- **Botão primário full width**: `Entrar` (ícone pi-sign-in). Enter em qualquer campo submete. Durante o request: spinner no botão + campos desabilitados.

**Fluxo recorrente resultante: digitar a senha + Enter = 0 cliques.** ②

### 2.3 Corpo — ESTADO B: Form completo (primeiro acesso ou "outro usuário")

- **Campo "Login"**:
  - Label `Login`; pInputText, placeholder `ana.souza`, autocomplete `username`.
  - **Autofocus** (ao carregar sem login lembrado, ou após clicar em "Entrar com outro usuário"). ①
  - Normalização automática: trim + minúsculas no blur (espelha o backend). ⑥
  - Erro inline (após touched): `Login é obrigatório` / `Mínimo de 4 caracteres`.
- **Campo "Senha"**:
  - Label `Senha`; p-password toggleMask; validação **apenas `required`** (`Senha é obrigatória`) — sem mínimo de caracteres no login. ⑥
  - Mesmo hint de Caps Lock do Estado A. ④
- **Checkbox** (p-checkbox, marcada por padrão): `Lembrar meu usuário neste computador` — grava só o login após sucesso. ②
- **Área de mensagem** e **botão `Entrar`**: idênticos ao Estado A.

### 2.4 Rodapé do card
- Divisor sutil + texto centrado 0.8rem cinza: `Esqueceu a senha? Solicite a redefinição a um gestor.` (texto estático — o sistema não tem recuperação self-service).

## 3. Estados globais

| Estado | Comportamento |
|---|---|
| **Carregando (submit)** | Botão `Entrar` com spinner e label `Entrando…`; campos Login/Senha desabilitados; Enter ignorado até a resposta. |
| **Erro de credencial (401)** | Banner vermelho na área reservada; senha mantida no campo, com **foco + texto selecionado** para redigitar direto; banner some ao digitar. |
| **Erro de servidor (0/5xx)** | Banner âmbar `Servidor indisponível…`; campos preservados; nada é apagado. |
| **Sucesso** | Navega para `returnUrl` (query param gravado pelo guard) ou, na ausência, **`/ponto`** (rota padrão do app — corrige o atual `/atividade`). ⑤ Toast de boas-vindas não é necessário. |
| **Vazio/primeira visita** | Estado B com foco no Login. |

## 4. Interações de teclado

- `Enter` em qualquer campo → submit (ngSubmit).
- `Tab` percorre: Login → Senha → checkbox → Entrar (Estado B) / Senha → Entrar (Estado A).
- Autofocus gerenciado em toda transição: carregar página, alternar Estado A↔B, após erro 401.

## 5. Dados de exemplo para o mockup

- Estado A: avatar `AS`, login lembrado `ana.souza`, campo senha vazio com cursor piscando.
- Estado B: placeholder `ana.souza` no Login; checkbox marcada.
- Variante de erro: banner `Login ou senha incorretos.` sob a senha, botão estável (sem deslocamento).
- (Não há dialogs nesta tela.)

## 6. Callouts numerados (para o mockup destacar)

- **① Autofocus inteligente** — cursor já no campo certo (Senha se usuário lembrado, Login se não); Enter sempre submete. 0 cliques de mouse.
- **② "Bem-vindo de volta" lembra só o login** — chip com avatar `ana.souza` + campo de senha; a senha nunca vai ao localStorage (elimina o risco atual de senha em texto puro). Login recorrente = senha + Enter.
- **③ "Entrar com outro usuário"** — link claro no lugar de "Esquecer identificação" com lixeira; 1 clique já com foco no campo Login.
- **④ Área de erro com altura reservada + aviso de Caps Lock** — o botão nunca "pula"; a causa nº 1 de senha errada é avisada antes do submit.
- **⑤ Aterrissagem no destino** — pós-login vai para a URL originalmente pedida (returnUrl) ou /ponto; some o desvio atual por /atividade.
- **⑥ Validação alinhada ao backend** — senha sem mínimo de 8 no login, login normalizado (trim/minúsculas): nenhum bloqueio falso de submit.
