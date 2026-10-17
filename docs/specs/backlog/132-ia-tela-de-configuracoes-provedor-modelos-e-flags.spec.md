# Task 132 — Tela de Configurações da IA: provedor, modelos e flags

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 4 (4 de 5). Protótipo
> interativo do autor (artifact privado citado na guarda-chuva) como referência de conteúdo.

## Objetivo

Dar ao **administrador** a tela onde ele vê e altera a configuração da IA (task 129): provedor, modelo de cada
nível, esforço, intervalos do check-in, duração recomendada e as flags, com o histórico de versões. Esta
task cria a página e o item "Configurações da IA" na navegação, exclusivos do administrador; a aba de prompts
é da 133.

## Entregáveis

### 1. Tela `/configuracao-ia` (frontend)

- Item "Configurações da IA" na sidebar (`somenteAdministrador`, tecla de atalho própria a definir sem
  colidir com as existentes) e rota `loadComponent` protegida pelo guard de administrador (task 129). O
  gestor e o desenvolvedor não veem o item e são redirecionados se digitarem a rota.
- **Estrutura em abas** (`p-tabs`): "Provedor e modelos" (esta task) e "Prompts" (desabilitada ou ausente até
  a 133, com a aba já prevista no layout).
- **Aba "Provedor e modelos":** formulário reativo com: provedor (`p-select`; Google e OpenAI listados mas
  marcados "ainda sem suporte" e não selecionáveis), modelo de cada nível (rápido, padrão, analítico, texto
  livre com sugestões), esforço do analítico (`p-select` com `EsforcoIaEnum`), intervalo do check-in (mínimo e máximo em
  minutos), duração recomendada (minutos) e quatro interruptores: check-in inteligente, rigor proporcional,
  detecção automática de queda e **IA desligada** (com texto explicando o efeito).
- **Salvar cria uma versão nova** (`POST /configuracao-ia`), mostra "Versão N salva" e recarrega. Validação no
  cliente: mínimo menor que o máximo, inteiros positivos, modelos preenchidos; mensagens como nos demais
  formulários.
- **Histórico:** lista das versões (número, quem salvou, quando) e, ao escolher uma, os valores dela em
  leitura, com "Usar como base" que preenche o formulário (não restaura por conta própria; salvar cria a
  versão seguinte).
- Mostra o **estado atual da IA** (no ar, fora do ar, desligada) só como leitura, vindo do estado em memória
  da task 130 por um endpoint de leitura de administrador.

### 2. Backend (só o que a tela precisa)

- `GET /ia/estado` (administrador): o estado em memória da task 130. Nada além disso é criado aqui.

### 3. Documentação

- `docs/SYSTEM.SPEC.md` (§ de telas e navegação), `docs/context/` e a tabela de atalhos do diálogo de dicas.

## Decisões tomadas pelo autor

1. **Estado da IA nesta tela:** mostrado já, com endpoint de administrador (`GET /ia/estado`). O estado para o
   usuário comum, sem expor modelos, é do bloco 10.
2. **Ligar a IA sem chave de API** no ambiente é permitido; o estado mostra "fora do ar". A chave é do `.env`
   (o autor tem uma chave de desenvolvimento e a usa localmente).
3. **Protótipo do autor:** é a referência de organização; onde divergir do padrão do projeto (tokens de cor,
   componentes PrimeNG), vale o padrão do projeto.
4. **Acesso:** só o administrador vê e edita.

## Critérios de Aceite

- Administrador abre a tela, altera um modelo e uma flag, salva, vê a versão 2 no histórico e a configuração
  ativa pela API refletindo; gestor e desenvolvedor não veem o item e a rota os recusa.
- "Usar como base" a partir de uma versão antiga preenche o formulário sem gravar nada.
- Com `1920×1080`, `1366×768` e `1080×1920`, nos temas claro e escuro e nos estados carregando, cheio e
  erro; sem `style=""` inline nem seletor de ID; análogo escolhido e registrado (candidata: tela de
  Calendário ou Tags, formulário com lista).
- Testes e builds passam; frontend sem testes e sem lint declarado.

## Fora de Escopo

- A aba de prompts (task 133) e a cor das prioridades (bloco 6).
- Teste de conexão com o provedor e painel de custo (ideias futuras).
- O endpoint de estado para usuário comum e a troca automática de telas (bloco 10).

## Dependências

Depende da **129** (API e permissão) e da **130** (estado da IA). Bloqueia a 133.
