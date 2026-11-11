# 315-chat-ia-no-chat-entre-colaboradores.spec.md

> Task 315 da guarda-chuva `chat-colaboradores-evolucao.spec.md` (decisão do autor de 2026-11-06: "`@IA` (315)"). Spec escrita em 2026-11-11, com as
> decisões de privacidade e de modelagem respondidas pelo autor no mesmo dia (seção "Decisões do autor"). **Nenhum código antes de o autor aprovar
> esta spec** (os contratos novos dos entregáveis 2, 3 e 7 são modelagem).

## Objetivo

Numa conversa do chat entre colaboradores, qualquer pessoa escreve `@IA` e a IA atende **só quem a chamou**, com as permissões dessa pessoa, fazendo
no máximo **uma** ação (uma proposta) por chamada. A resposta fica na conversa, visível às duas pessoas; a proposta segue o fluxo de hoje (cartão,
Aceitar/Descartar, autonomia por tipo), e quem não tem acesso ao alvo vê "Ação oculta por falta de acesso". O custo entra na aba Custos em nome de quem chamou.

## Decisões do autor

Respondidas em 2026-11-11 (as três primeiras repetem a guarda-chuva, de 2026-11-06):

1. **Quem a IA atende:** só quem a chamou, e só o pedido dessa pessoa. **Uma ação por chamada:** leituras livres, no máximo **uma proposta**. A
   segunda ferramenta `propor_*` do mesmo turno é recusada pelo servidor (resultado de ferramenta com erro, e a IA segue sem ela).
2. **Permissões:** as de quem chamou, iguais às do chat da IA (o mesmo registro de ferramentas, `listarParaUsuario`).
3. **Custo:** registrado pelo `IaUsoService` (contexto `USO_DE_IA`, task 260) em nome de quem chamou. Nenhuma tabela nova.
4. **O que a IA lê (privacidade):** o pedido, mais as **20** mensagens anteriores da conversa, **das duas pessoas**, cada uma rotulada com o nome de
   quem escreveu (as respostas anteriores da IA entram rotuladas como IA). O autor aceitou que o texto da outra pessoa vá ao provedor. Mensagens do
   sistema (aviso de supervisão) não entram. Se o pedido responde a uma mensagem fora dessa janela, entra também o trecho citado (`respondeA`).
5. **O que a outra pessoa vê:** o texto da resposta, para as duas pessoas. As instruções do turno dizem à IA **quem mais lê a resposta** e o tipo
   dessa pessoa, com a orientação de não expor no texto o que ela não acessa. O cartão da proposta aparece para a outra pessoa só se ela tiver acesso
   ao alvo; senão, "Ação oculta por falta de acesso". Só quem chamou resolve a proposta (Aceitar, Ajustar, Descartar, Desfazer).
6. **Onde a resposta vive:** é uma mensagem direta com autor novo `AutorMensagemDiretaEnum.IA` (`autorUsuarioId` `null`, como no `SISTEMA`). O
   documento ganha `chamada_por_usuario_id` e o vínculo com a proposta. *Ajuste a confirmar:* a pergunta dizia `proposta_ids`; como é uma ação por
   chamada, esta spec usa **`proposta_id`** (um só, anulável). Se o autor preferir a lista, troca-se antes do código.
7. **`@IA` sozinho:** o pedido é a **próxima mensagem de quem chamou, em até 10 minutos**. O que a outra pessoa escreve nesse meio não conta. A regra
   é derivada das mensagens, sem estado gravado.
8. **Enquanto a IA pensa:** as duas pessoas veem "IA digitando…" e a resposta chega **inteira** no fim. Sem streaming no chat entre colaboradores.

## Entregáveis

1. **Regra pura no `shared`** (`utils/mensagem-direta-ia.ts`, com teste):
   - `chamadaDaIa(texto)`: diz se o texto chama a IA. `@IA` é token próprio (sem diferenciar maiúsculas, nunca dentro de um bloco ou trecho de
     código, nem colado a outra palavra, como em `email@IA`) e devolve o pedido sem o `@IA`, já aparado (vazio quando veio sozinho).
   - `PRAZO_DO_PEDIDO_DA_IA_MINUTOS = 10`, `JANELA_DE_CONTEXTO_DA_IA_NO_CHAT_DIRETO = 20`.
   - `pedidoPendenteDaIa(mensagensRecentes, autorUsuarioId, agora)`: diz se a mensagem nova de `autorUsuarioId` é o pedido de um `@IA` sozinho
     anterior. Vale quando a última mensagem dele é um `@IA` vazio, enviado há no máximo 10 minutos e ainda sem resposta da IA (nenhuma
     mensagem `IA` com `chamada_por_usuario_id` igual depois dela).
2. **Modelagem do documento da mensagem direta**, nos três armazenamentos:
   - `AutorMensagemDiretaEnum.IA = 'IA'`. Hoje o autor é texto no documento, sem tabela de referência, e o valor novo segue o mesmo padrão.
   - Campos `chamada_por_usuario_id` (inteiro, anulável) e `proposta_id` (inteiro, anulável). Os dois só aparecem na mensagem `IA`.
   - Nos índices OpenSearch e Elasticsearch, os campos entram no mapeamento. No PostgreSQL provisório, a migration **`0086`** acrescenta as duas
     colunas anuláveis, sem `DEFAULT` e sem trigger.
   - `validarMensagemDiretaNova` passa a aceitar o autor `IA`: sem `autorUsuarioId`, com `chamadaPorUsuarioId` participante da conversa.
   - `MensagemDiretaResumoDto` ganha `chamadaPorUsuarioId` e `propostaId`. Mensagem `IA` não é editada nem recebe reação (as regras das tasks 313
     e 314 já recusam o que não é do próprio autor; confirmar o caso do autor nulo).
   - A suíte de contrato `armazenamento-de-mensagem-direta.contrato.ts` cobre gravar e ler a mensagem `IA` nas três implementações.
3. **Evento efêmero `IA_DIGITANDO`** (`{ conversaId }`) em `MensagemDiretaEventoDto`, publicado às duas pontas ao começar o turno. O fim é a própria
   `MENSAGEM` da resposta (ou a do sistema, em caso de falha). O cliente mostra "IA digitando…" até a mensagem chegar, com validade de 2 minutos.
4. **Service da chamada** (`MensagemDiretaIaService`, no módulo `mensagem-direta`):
   - Depois de gravar e publicar a mensagem do usuário, a `MensagemDiretaService.enviarMensagem` decide pela regra pura se há chamada, e o turno
     roda **fora da requisição**, sem segurar a resposta do `POST mensagem`.
   - Uma chamada de cada vez por conversa (trava em memória por instância). Um `@IA` que chega com outra chamada em andamento recebe a mensagem
     do sistema "A IA ainda está respondendo".
   - Contexto da chamada: as 20 mensagens anteriores, rotuladas como no plano (`[Nome] texto`); o pedido; e as instruções. As instruções são o prompt
     `CONVERSA` ativo, mais a orientação fixa no código (como `ORIENTACAO_DOS_PONTOS` do plano): quem chamou, quem mais lê (nome e tipo), que só
     quem chamou é atendido, que há no máximo uma ação, e que o texto não pode expor o que a outra pessoa não acessa. **Sem prompt novo** e sem
     versão nova do `CONVERSA`.
   - Nível `RAPIDO`, como o chat da IA, e as ferramentas de `listarParaUsuario(quemChamou)`.
   - O laço de ferramentas é o do `ChatService` (`responderNoTurno` e `executarFerramentas`), **extraído para ser reaproveitado**, nunca copiado.
     O laço passa a aceitar o limite de propostas por turno, e quem grava a resposta é quem chama o laço: o chat grava em `chat_mensagem` e esta
     service grava em `mensagem_direta`.
   - Fim do turno: grava a mensagem `IA` (texto, `chamadaPorUsuarioId`, `propostaId`), publica `MENSAGEM` às duas pontas e registra o uso no
     `IaUsoService` (descrição "@IA no chat entre colaboradores", tokens e modelo do turno, `usuarioId` de quem chamou).
   - Falha, IA desligada ou IA fora do ar: grava e publica uma mensagem do sistema ("A IA não pôde responder: <motivo curto>"), como o
     `registrarFalha` do chat. O uso só é registrado se houve chamada ao provedor.
5. **A autonomia por tipo vale** (task 228): no nível "Faz e avisa", a proposta já é aplicada e a linha mostra Desfazer por 30 minutos, só para quem
   chamou. Nos níveis "Pergunta" e "Sempre pergunta", vira cartão.
6. **Ver a proposta como participante:** `GET /mensagem-direta/conversa/:usuarioId/proposta/:propostaId` devolve
   `MensagemDiretaPropostaRecuperadaDto` = `{ acessivel, podeResolver, proposta | null }`.
   - A proposta só é encontrada se estiver numa mensagem `IA` **desta** conversa; fora disso, 404.
   - `podeResolver` só para quem chamou.
   - `acessivel` vem de um método opcional novo dos executores, `podeVer(dados, usuario)`, que confere o acesso ao alvo pelas regras de hoje
     (projeto, demanda, atividade e pessoa). O executor sem `podeVer` dá `acessivel: false` para a outra pessoa. Quem chamou e o gestor ou
     administrador sempre veem.
   - As ações seguem pelas rotas de hoje (`/proposta-ia/:id/...`), que já são só do dono.
7. **Frontend** (`modules/mensagem-direta`):
   - O `@` do compositor oferece **IA** como primeira opção. Ela só aparece com a IA disponível (`IaDisponibilidadeService`) e só é inserida como
     texto `@IA`, nunca em `mencoes`.
   - O balão da IA usa o avatar próprio da IA do chat e o rótulo "IA · para <Nome>", com o texto em Markdown (o visualizador de hoje).
   - Abaixo do texto vai o cartão da proposta, `app-chat-proposta-cartao` (por `[propostaCarregada]`): com as ações para quem chamou, só leitura
     para a outra pessoa com acesso, e a linha "Ação oculta por falta de acesso" sem acesso.
   - "IA digitando…" no lugar do "digitando…" de hoje.
   - Também no popup, na janela de chat do Project Desktop e na tela de supervisão (só leitura).
   - Análogo visual aprovado: a própria conversa do chat entre colaboradores (balões e "digitando…", tasks 210, 219 e 293) e os cartões de proposta
     do chat da IA (226).
8. **Documentação:** `SCHEMA.md` (os campos novos e a `0086`), `SYSTEM.SPEC.md` §12 (linha do `mensagem-direta`) e `CONTEXT.md`. A guarda-chuva
   marca a 315 como feita.

## Critérios de Aceite

1. `shared`: testes da regra pura cobrem `@IA` no meio, no começo e sozinho; em maiúsculas e minúsculas; dentro de bloco e de trecho de código
   (não chama); colado a outra palavra (não chama); e o pedido pendente dentro e fora dos 10 minutos, com mensagem da outra pessoa no meio e já
   respondido.
2. `backend` unitários: a service da chamada atende só quem chamou e usa as ferramentas dele; a segunda `propor_*` é recusada; a trava por conversa
   funciona; falha e IA desligada gravam a mensagem do sistema; o uso é registrado em nome de quem chamou; as 20 mensagens vão rotuladas e sem as do
   sistema; o `GET .../proposta/:id` dá 404 fora da conversa, `acessivel` correto para cada lado e `podeResolver` só para quem chamou.
3. `npm run test:integracao`: a suíte de contrato grava e lê a mensagem `IA` nas três implementações, e a `0086` aplica e reverte.
4. `frontend`: testes de componente do balão da IA (com cartão, só leitura e oculto) e da opção IA no `@`.
5. `npm run lint:tudo` com zero erros; builds de `backend` e `frontend`; `npm test` na raiz.
6. Ao vivo (skill `verify`), com o stack real, nos cinco formatos (`1920×1080`, `1366×768`, `1080×1920`, `720×1280` e `960×1080`) e nos dois temas,
   com dois usuários em duas sessões:
   - Um desenvolvedor chama `@IA` com pedido e as duas pontas veem "IA digitando…" e a resposta.
   - O gestor chama `@IA` sozinho e manda o pedido na mensagem seguinte.
   - Uma proposta de criar atividade em demanda que o desenvolvedor não vê aparece oculta para ele.
   - Aceitar só existe para quem chamou.
   - A aba Custos mostra o uso em nome de quem chamou.
   - A IA desligada gera a mensagem do sistema.
   As evidências ficam em `.artifacts/315-chat-ia-no-chat-entre-colaboradores/` e o relatório textual vai junto da spec.

## Fora de Escopo

- Grupos (`chat-grupos.spec.md`) e a IA em grupos.
- Streaming da resposta no chat entre colaboradores.
- Prompt novo ou versão nova do `CONVERSA` (a orientação fica no código).
- A IA do gestor ler conversas diretas por ferramenta (a task 201 só lê o chat da IA; isto continua assim).
- Guardar o texto original de mensagem editada (I-052).
- Trava da chamada entre instâncias da API (a trava é por instância; se a produção tiver mais de uma, vira `PROBLEMS.md`).

## Dependências

- Em `done/`: 205–221 (chat entre colaboradores), 136 e 145+ (propostas), 228 (autonomia por tipo), 226 (cartão compacto), 260 (`IaUsoService`), 313 e
  314 (edição e reação, que recusam a mensagem `IA`).
- Fontes da verdade: `docs/SYSTEM.SPEC.md` §12 e §14, `docs/SCHEMA.md` (`mensagem_direta`, `proposta_ia`), `docs/specs/backlog/chat-colaboradores-evolucao.spec.md`.

## Riscos e Mitigação

- **Vazamento pelo texto:** a IA usa as permissões de quem chamou e o texto vai às duas pessoas. A mitigação é a orientação nas instruções; ela
  **não é garantia**, e o autor aceitou esse risco na decisão 5. O cartão, ao contrário, é conferido no servidor.
- **Copiar o laço do chat:** o caminho rápido é duplicar o `responderNoTurno`. Isso é proibido aqui: o laço é extraído e o `ChatService`
  continua passando nos testes de hoje sem mudança de comportamento.
- **Turno fora da requisição:** um erro não tratado derrubaria o processo em silêncio. Todo o turno fica num `try/catch` que termina na mensagem do
  sistema, com o teste da falha.
