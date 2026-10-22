# 210-mensagem-direta-popup-no-project.spec.md

> Task 6/11 da guarda-chuva [`chat-colaboradores.spec.md`](../backlog/chat-colaboradores.spec.md). Modelagem em
> [`chat-colaboradores/modelagem.md`](../backlog/chat-colaboradores/modelagem.md) (§10). Depende da [`208`](../done/208-mensagem-direta-service-e-api.spec.md) e da
> [`209`](../done/209-mensagem-direta-tempo-real.spec.md). Desenho aprovado pelo autor: mockups da guarda-chuva (telas 1, 2, 7, 8, 9 e 10), reproduzidos nos tokens do sistema.

## Objetivo

O popup do chat entre colaboradores dentro do Project: lista de conversas, conversa, nova conversa e busca, em tempo real, com os estados vazio, carregando, erro e tema escuro, e **reconexão
com recuperação** do que se perdeu. O popup é um painel fixo no canto inferior direito (392×640), aberto por um botão com contador de não lidas na barra superior.

## Entregáveis

1. **Backend, uma rota que faltava:** `GET /mensagem-direta/pessoas` (qualquer usuário autenticado) devolve as pessoas **ativas**, menos quem pergunta, com nome, tipo e `online`. O seletor "Para" não podia
   reaproveitar `GET /usuario`, que é só de gestor (a modelagem previa "sem rota nova"; o desenvolvedor precisa listar os colegas). DTOs no `shared`; `UsuarioRepository.listarAtivos`; testes de service,
   controller e repository.
2. **Módulo `frontend/src/app/modules/mensagem-direta/`**, componentes standalone com Signals e Reactive Forms:
   - `MensagemDiretaService` (HTTP, como `ChatService`): conversas, conversa (com cursor), enviar, leitura, busca, pessoas.
   - `MensagemDiretaEventosService`: o stream (`fetch` com cabeçalho; `EventSource` não envia `Authorization`), com reconexão de espera crescente (1 s a 30 s, com sorteio para não sincronizar todos os clientes)
     e sinal de conexão. Ao (re)conectar depois de uma queda, o estado **relê** a lista e a conversa aberta (recuperação).
   - `MensagemDiretaEstadoService` (raiz): Signals de conversas, não lidas (total), quem está online, conversa aberta e conexão; aplica os eventos (`MENSAGEM`, `LEITURA`, `PRESENCA`, `ABERTURA`, `SINCRONIZAR`,
     `ENCERRANDO`); envia com mensagem otimista e **reenvio com o mesmo `mensagemId`** (idempotente); marca como lida a conversa aberta e visível.
   - Lógica pura em `utils/` com teste: leitura do `text/event-stream`, espera da reconexão, mesclagem sem duplicar, agrupar por dia, iniciais, rótulo de hora, prévia da última mensagem, trechos para realçar a busca
     (sem `innerHTML`), aplicação de cada evento.
3. **Popup** (`app-mensagem-direta-popup`, no layout): lista (avatar com iniciais e bolinha de presença, hora, prévia, contador, busca), conversa (cabeçalho com voltar e presença, balões, separador de dia,
   "Enviada"/"Lida", falha com "Tentar de novo"/"Excluir", faixa de conexão, campo com `Enter` envia e `Shift+Enter` quebra a linha), nova conversa (escolher a pessoa) e resultado da busca (mensagens com
   o termo realçado e pessoas). Texto da mensagem pelo `app-markdown-visualizador` (bloco de código copiável já vem dele). Aviso discreto e permanente: "Gestores e administradores podem ler as conversas entre
   desenvolvedores." Botão no topbar abre e fecha, com o total de não lidas; o popup sobrepõe o conteúdo sem cobrir o menu lateral nem os diálogos do PrimeNG (z-index abaixo deles).
4. **Estados:** carregando (esqueleto), vazio ("Nenhuma conversa ainda" com "Nova conversa"), erro de carga com "Tentar de novo", sem conexão (faixa laranja), busca sem resultado, falha de envio.
5. **Tema escuro** pelos aliases `--app-surface-*` e utilitários semânticos (nada de `--p-surface-N` direto); tooltip só do PrimeNG.
6. **Testes:** unitários da lógica pura; de componente (Vitest) para o estado, a lista, a conversa (enviar, falhar, tentar de novo, "Lida"), a busca e o botão do topbar; backend como no item 1.
7. **Documentação:** `docs/SYSTEM.SPEC.md` (rota e módulo do front), `CONTEXT.md`, `HISTORY.md`, `MEMORY.md`.

## Critérios de Aceite

- `npm run test --workspace=frontend`, `npm run build --workspace=frontend`, os testes e o build do backend e do `shared` passam; `npm run repo:verificar` passa.
- **Ao vivo, dois usuários em duas janelas** (API real, `1920×1080`, `1366×768` e `1080×1920`, claro e escuro): enviar e receber sem recarregar, contador no topbar, "Lida" aparecendo para quem enviou, busca com
  realce, nova conversa, estado vazio, derrubar a API e ver a faixa de conexão e a recuperação ao voltar, mensagem que falha e é reenviada sem duplicar. Comparado com os mockups e com o chat da IA (análogo
  visual: cartões com borda, balões, tokens `--app-surface-*`) antes de apresentar.
- Sem `ngModel`, `innerHTML`, `title` nem `style=""` inline; classes BEM em português.

## Fora de Escopo

- Compositor rico (Markdown assistido, bloco de código ao colar, `@menção`, `#demanda`): task 211. Notificações, som, silêncio e o menu de avisos: 212. Janela do Desktop e atalho global: 213. Supervisão: 214.
- "Está digitando", status "em reunião", anexos, editar e apagar mensagem enviada.
- O botão de silenciar a conversa no cabeçalho (entra com os avisos, na 212).

## Dependências

`208` e `209` (em `done/`). Fontes: mockups da guarda-chuva, `modelagem.md` §10, `ChatService` e a tela do chat da IA (análogo visual e de padrão de stream), `app-markdown-visualizador`.

## Riscos e Mitigação

- **Recuperação ao reconectar:** o stream só avisa. Todo `SINCRONIZAR` e toda reconexão releem a lista e a conversa aberta; a mensagem otimista some quando a do servidor chega (mesmo `mensagemId`).
- **Mensagem duplicada:** o evento da própria mensagem (outras abas) e a resposta do envio podem chegar em qualquer ordem; a mesclagem é por `mensagemId`.
- **Cursor de página:** o histórico mais antigo carrega ao rolar para cima com o `proximoCursor` do servidor; a página nova nunca reordena o que já está na tela.
- **Conexões por aba:** cada aba abre um stream; o servidor já trata várias abas por usuário.
- **Sobreposição com overlays do PrimeNG:** z-index do popup abaixo de 1000 (como a janelinha do check-in).
