# 220-mensagem-direta-responder.spec.md

> Task solta, ajuste do chat entre colaboradores (tasks 205 a 219), pedida pelo autor em 2026-10-23: responder a uma mensagem específica (o "responder" do zap).
> Especificada e implementada em 2026-10-26 a partir do rascunho (o autor aprovou o desenho e o mockup); **mexe em documento, nos três armazenamentos e em migration**. Não depende da 214; a guarda-chuva de grupos
> (`246`) herda o campo (ver "Dependências").

## Objetivo

Escolher uma mensagem da conversa, escrever a resposta e enviá-la com a citação da original no balão (autor e trecho). Clicar na citação leva à original.

## Decisões

1. **Trecho copiado, não buscado.** O `trecho` é gravado no envio, para a citação continuar legível quando a original está numa página antiga ainda não carregada
   (padrão proposto no rascunho; o autor pode inverter antes da implementação). O documento é imutável: o campo entra só na gravação.
2. **O servidor monta tudo.** O cliente envia apenas `respondeAMensagemId`; autor e trecho saem da mensagem lida no armazenamento. O cliente nunca envia o trecho.
3. **Só se responde a mensagem de pessoa, desta conversa.** Mensagem do sistema (`SISTEMA`, ex.: aviso de supervisão) não tem "Responder". Responder a uma resposta cita só
   a mensagem imediata (sem cadeia).
4. **Supervisão (214) mostra a citação** sem trabalho extra: a tela lê o mesmo `MensagemDiretaResumoDto` e o mesmo balão; basta o balão compartilhado renderizar a citação.
   A 214 não precisa ser alterada (ainda é backlog; se o balão da 214 for outro componente, ela ganha a citação ao ser implementada, ver Dependências).
5. **Sem aviso extra.** A resposta é uma mensagem normal para avisos, não lidas, som e prévia da lista. Não gera menção automática.
6. **O trecho** (função pura no `shared`, com teste): primeira linha com texto do Markdown, sem marcação; bloco de código cercado vira `[código]` (mesma regra de
   `previaDaMensagem`, em `frontend/.../utils/mensagem-direta.util.ts`; **a parte de tirar marcação e trocar código por `[código]` sobe para o `shared`** e `previaDaMensagem`
   passa a usá-la, mantendo só o prefixo `Você:` no front, sem duas cópias); até **200 caracteres**, cortado com `…`.

## Entregáveis

1. **Contrato (`shared`)**: `MensagemDiretaEnviarDto.respondeAMensagemId?` (`@IsOptional @IsUUID('4')`); `MensagemDiretaResumoDto.respondeA: MensagemDiretaCitacaoDto | null`
   com `MensagemDiretaCitacaoDto { mensagemId, autorUsuarioId, trecho }` (nome final pela skill `project20-dto-conventions`). Função pura `trechoDaMensagemDireta` e a constante
   `LIMITE_TRECHO_MENSAGEM_DIRETA = 200` em `utils/mensagem-direta.ts`. Aplicar `gerenciamento-de-impacto` (`npm run impacto`) em `MensagemDiretaResumoDto`,
   `MensagemDiretaEnviarDto` e `previaDaMensagem`.
2. **Documento** (`mensagem-direta.documento.ts`): `MensagemDiretaNova.respondeA` e, em `MensagemDiretaFonte`, `responde_a_mensagem_id`, `responde_a_autor_usuario_id`, `responde_a_trecho`
   (todos ausentes ou nulos quando não é resposta). `validarMensagemDiretaNova` exige os três juntos ou nenhum e recusa trecho vazio ou acima do limite. `paraFonteDireta` e
   `deFonteDireta` mapeiam; documento antigo sem os campos vira `respondeA: null`.
3. **Armazenamento, três implementações** (`ArmazenamentoDeMensagemDireta`):
   - **Método novo `recuperarMensagem({ conversaId, mensagemId })`**: devolve a mensagem **só se for desta conversa**, senão `null`. É o que a service usa para validar; não há outro
     jeito de achar uma mensagem por id sem varrer a conversa.
   - **OpenSearch e Elasticsearch**: campos novos no mapeamento (`keyword`/`keyword`/`text` sem análise, `index: false` no trecho; ele não entra na busca, que segue só no `texto`).
     Documento antigo continua válido; **confirmar se acrescentar campo a um índice existente exige reindexar** (a 246 faz a mesma pergunta; registrar a resposta no fecho).
   - **Postgres provisório**: **migration nova `0063`** (confirmar o próximo número livre na hora; a `0051` nunca é editada) com `resposta_a_mensagem_id UUID`,
     `resposta_a_autor_usuario_id INTEGER` e `resposta_a_trecho TEXT`, todos anuláveis e sem `DEFAULT`, mais um `CHECK` que exige os três juntos ou nenhum, e o `-- DOWN`. Sem FK
     (como o resto da tabela). Atualizar `docs/SCHEMA.md` (tabela provisória).
4. **Service** (`enviarMensagem`): se vier `respondeAMensagemId`, chama `recuperarMensagem` na conversa do par; mensagem inexistente, de outra conversa ou `SISTEMA` →
   `BusinessException` ("A mensagem respondida não existe nesta conversa") e **nada é gravado**. Monta `respondeA` com o `autorUsuarioId` e `trechoDaMensagemDireta(texto)` da original.
   O reenvio idempotente (`jaExistia`) devolve o que estava gravado, com a citação original.
5. **Front, estado** (`mensagem-direta-estado.service.ts`): `enviar` recebe a mensagem respondida opcional; a `MensagemNaConversa` otimista já nasce com `respondeA` (o balão mostra a
   citação enquanto "Enviando…"); `tentarDeNovo` e o reenvio do POST preservam `respondeAMensagemId`. O rascunho da resposta fica por conversa e some ao enviar, cancelar ou trocar de conversa.
6. **Front, conversa**: ação **Responder** em cada mensagem enviada (`pi pi-reply`, ao lado de "Copiar", no mesmo rodapé que aparece com o mouse; `pTooltip`); não aparece em
   `ENVIANDO`/`FALHOU` nem em mensagem do sistema. O balão mostra a **citação** (faixa lateral colorida, nome de quem escreveu — "Você" para o usuário logado — e o trecho em até duas
   linhas). Clique na citação rola até a original e a destaca por ~1,5 s; se a original não está carregada, carrega páginas anteriores até achá-la (no máximo 5 páginas); se não achar,
   um aviso discreto na própria conversa ("Mensagem antiga demais para localizar"). Citação de mensagem de pessoa removida usa `NOME_DE_USUARIO_REMOVIDO`.
7. **Front, compositor**: barra acima do campo "Respondendo a <nome>" + trecho em uma linha + X (`aria-label` "Cancelar a resposta"); `Esc` com o foco no campo cancela a resposta
   (sem apagar o texto); o foco volta ao campo ao clicar em Responder. Reaproveitar o estilo da faixa/cartão que o compositor já tem para código/referência (conferir antes de criar variação).
8. **Compositor em barra única** (pedido do autor na aprovação, 2026-10-26): o campo, o botão de código (`</>`) e o de enviar passam a viver **dentro de uma barra só**, com a aparência
   de campo de texto (borda, raio e realce de foco na barra, não no editor). `app-mensagem-direta-editor-mensagem` ganha a entrada `embutido` (sem borda, fundo nem raio próprios) para isso;
   nada muda no comportamento do compositor (Enter, Ctrl+Enter, painel de código, sugestões).
9. **Prévia da lista e aviso do Project**: sem mudança (usam o texto da própria resposta).
10. **Testes**: `shared` (trecho: Markdown, código, corte, vazio; DTO), domínio (`validarMensagemDiretaNova`: três campos juntos, trecho acima do limite; `paraFonte`/`deFonte` com e sem
   resposta), service (resposta válida monta citação do servidor; id de outra conversa, inexistente e de `SISTEMA` recusados sem gravar; o cliente não consegue impor trecho; reenvio idempotente),
   **suíte de contrato** (`armazenamento-de-mensagem-direta.contrato.ts`) com cenários de resposta e de `recuperarMensagem` (de outra conversa → `null`) **nas três implementações**,
   integração do repository Postgres (`CHECK`), componente da conversa e do compositor (responder, cancelar, citação, `Esc`, clique na citação) e estado (reenvio preserva a citação).
11. **Documentação**: `docs/SYSTEM.SPEC.md` (campo da mensagem e do envio), `docs/SCHEMA.md`, `CONTEXT.md`, `HISTORY.md`, `MEMORY.md` se a regra do trecho ganhar casa nova.

## Critérios de Aceite

- `npm run test --workspace=shared`, `--workspace=backend`, `--workspace=frontend`, `npm run test:integracao` e os builds do backend e do front passam; a suíte de contrato passa nas
  três implementações (`CHAT_INTEGRACAO=1` para OpenSearch/Elasticsearch, Postgres sempre); `npm run db:migrate` e `db:rollback` da `0063` funcionam; `npm run repo:verificar` passa.
- **Ao vivo** (API real, duas sessões, `CHAT_ARMAZENAMENTO=opensearch` e `postgres`): responder a uma mensagem do outro e a uma minha; a citação aparece nas duas pontas, com o nome
  certo; cancelar pelo X e por `Esc`; clicar na citação de mensagem carregada e de mensagem antiga (paginada); resposta com a conexão derrubada, "Tentar de novo" mantém a citação; id
  de outra conversa pela API responde erro de negócio e não grava; mensagem antiga sem os campos continua renderizando.
- **Visual** (`1920×1080`, `1366×768`, `1080×1920`, claro e escuro): balão com citação, barra do compositor e destaque ao rolar, comparados com o popup do chat (210) e o compositor
  (211/218), que são os análogos aprovados. Estados: citação longa, de código, de usuário removido, balão meu e do outro.
- Sem `ngModel`, `innerHTML`, `title` nem `style=""` inline; tooltip só `pTooltip`.

## Resultado (2026-10-26)

- **Testes:** `shared` 273; `backend` unitário 1502 (inclui os cenários de resposta na service e no documento); `npm run test:integracao` 347 (Postgres, inclui a suíte de contrato com os dois cenários novos e o `CHECK`);
  a suíte de contrato também rodou contra o **OpenSearch real** (`CHAT_INTEGRACAO=1`, 22/22); `frontend` 173 arquivos / 2130 testes (8 novos em `mensagem-direta-conversa-responder.component.spec.ts`).
  Builds do backend e do front passam. `db:rollback` e `db:migrate` da `0063` conferidos. **Não rodou:** a suíte de contrato contra o Elasticsearch real (não há serviço no ambiente; o código é o mesmo do OpenSearch,
  coberto pelos testes com cliente em dublê). **Não há lint** (`PROBLEMS.md` P-001).
- **Ao vivo** (API real com OpenSearch, `gestor.inicial` e `dev.teste`): a resposta devolve a citação montada pelo servidor; id inexistente é recusado com "A mensagem respondida não existe nesta conversa"; no navegador, Responder abre a barra,
  enviar mostra a citação e limpa a barra, o clique na citação rola até a original e a realça por ~1,5 s e o `Esc` cancela só a resposta (popup segue aberto). Conferido em 1366×768, 1920×1080 e 1080×1920 no tema escuro e em 1366×768 no claro.
- **Limites:** não foi exercitado o reenvio com a conexão derrubada (só em teste de componente), nem a leitura da citação de uma mensagem em página antiga pela tela real (só em teste de componente); o orçamento de 4 kB do
  `.scss` da conversa já estourava antes e segue estourado (aviso de build, sem falha).

## Fora de Escopo

- Responder com cadeia ou mostrar a conversa encadeada; "reagir" com emoji; editar ou apagar mensagem (o documento é imutável).
- Aviso especial para quem teve a mensagem respondida; menção automática do autor.
- Responder em grupos (246 a 250) e na supervisão (somente leitura, 214): aqui só o um a um.
- Buscar dentro do trecho citado; citar um trecho selecionado da mensagem (a citação é sempre o começo da mensagem inteira).

## Dependências

`205` a `219` (em `done/`). Fontes: `docs/SCHEMA.md` (tabelas provisórias), `chat-colaboradores/modelagem.md` (documento, §3 e §4), skill `sql-migrations`.
**Coordenação com o backlog**: a `246` (grupo livre) acrescenta `conversa_tipo`/`grupo_id` ao mesmo documento e mexe na mesma suíte de contrato; a 220 vai antes e o campo `respondeA`
vale para grupo sem mudança de formato (a validação "mesma conversa" da 246 passa a usar o `recuperarMensagem` generalizado por ela). A `214` (supervisão) herda a citação pelo balão.

## Riscos e Mitigação

- **Mudança de mapeamento do índice:** campo novo em índice existente pode exigir reindexação; a task não fecha sem a resposta registrada e o teste de contrato rodado nos dois serviços reais.
- **Citação que vaza conteúdo:** o trecho vem da mensagem **desta** conversa (validado em `recuperarMensagem`), nunca de um id de outra; teste com id alheio.
- **Rolar até a original sem fim:** o limite de 5 páginas e o aviso evitam varrer uma conversa inteira por um clique.
- **Duplicar a regra de prévia:** extrair a limpeza de `previaDaMensagem` para o `shared` em vez de copiar; impacto no front conferido por `npm run impacto`.
