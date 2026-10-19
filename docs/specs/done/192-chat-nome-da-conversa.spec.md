# Task 192 — Nome da conversa do chat: padrão, renomeação dinâmica, tooltip e edição

> Origem: pedido do autor em 2026-10-19, ao usar o histórico do chat. Hoje o nome é gerado **uma vez**, depois da primeira resposta da IA
> (`ChatService.nomearConversa`, nível rápido), nunca muda, aparece cortado no painel do histórico sem como ler inteiro e não pode ser
> editado; enquanto não existe, o painel mostra o trecho da primeira mensagem. Guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 5 (chat).

## Objetivo

O nome da conversa passa a (1) ter um **padrão** desde a primeira mensagem, (2) **acompanhar o assunto** conforme o usuário escreve, (3) poder
ser **lido inteiro** no painel e (4) poder ser **editado pelo usuário**, e a edição manual vale mais que o nome automático.

## Decisões (do autor, 2026-10-19)

- **Padrão:** `Chat do dia 19 de outubro de 2026` (dia sem zero à esquerda, mês por extenso em minúsculas, ano com quatro dígitos), tirado da data da
  conversa (`conversaId` = `<usuario>-AAAA-MM-DD`). Vale para toda conversa sem nome gravado, inclusive as antigas.
- **Dinâmico:** a cada **mensagem nova do usuário** o nome é reavaliado (chamada curta no nível rápido, sem bloquear a resposta nem o fluxo).
- **Editável** pelo usuário; **tooltip** com o nome completo.

## Entregáveis

1. **Padrão (backend).** Função pura `nomePadraoDaConversa(conversaId)` (no módulo `chat`, com teste: meses, dia de um dígito, virada de ano) usada por
   `listarConversas` e por `recuperarConversa` quando não há nome gravado. O trecho da primeira mensagem deixa de ser o nome (a tela só usa o que
   a API devolve em `titulo`, que passa a ser **sempre** texto). O padrão **não é gravado**: a primeira renomeação pela IA ou a edição do usuário grava.
2. **Renomeação a cada mensagem do usuário.** `nomearConversa` roda depois de cada turno do chat (contexto `CHAT`, nunca o check-in), não só o primeiro:
   - Entrada: o nome atual (o gravado ou o padrão) e as **últimas mensagens** da conversa (de 6 a 8, cada uma truncada em ~300 caracteres) —
     custo por chamada limitado e constante, não cresce com a conversa. Saída máxima de ~40 tokens.
   - Instrução (`INSTRUCOES_TITULO`): "Se o nome atual ainda descreve bem a conversa, devolva-o exatamente igual; só troque se o assunto mudou. Nome
     curto (3 a 6 palavras), em português, sem aspas nem ponto final. Responda só com o nome." Quando o nome atual é o padrão, a IA sempre propõe um.
   - Só grava se o resultado for diferente do atual (evita escrita inútil). Falha nunca atrapalha o chat (como hoje: log e segue).
   - **Nome editado à mão nunca é sobrescrito** (item 3): se a conversa está marcada como editada, não há chamada à IA.
3. **Edição manual.** Rota `PUT /chat/conversa/:data/titulo` (do próprio usuário do token; `data` como em `GET /chat/conversa/:data`), corpo
   `ChatConversaTituloAlterarDto { titulo: string }` no `shared`, `titulo` aparado, de 1 a 120 caracteres. Grava o nome e marca `tituloEditado = true`.
   Título vazio (após aparar) **restaura o padrão**: apaga o nome gravado e desmarca `tituloEditado`, e a renomeação automática volta a valer. Conversa de
   outra pessoa ou sem mensagens: 404 (`ResourceNotFoundException`), nunca vaza existência. Controller fino, regra na `ChatService`.
4. **Armazenamento (contrato comum dos três).** Postgres, OpenSearch e Elasticsearch gravam e leem `tituloEditado` junto do nome:
   - Postgres: migration nova com `titulo_editado boolean NOT NULL` em `chat_conversa` (sem `DEFAULT`; a migration preenche `false` nas linhas existentes
     e a aplicação passa o valor em todo INSERT).
   - Índices: campo `titulo_editado` (boolean) no mapeamento da conversa; para índice já existente, o repository acrescenta o campo ao mapeamento na
     subida (idempotente). Documentos antigos sem o campo contam como `false`.
   - `listarTitulos` passa a devolver `{ titulo, editado }` por conversa; `gravarTitulo` recebe `editado`. Teste do contrato comum e teste de
     integração do repository Postgres (`npm run test:integracao`): grava, troca, marca editado, restaura.
5. **Tela (histórico).** No painel do histórico (`historico.component`):
   - O nome aparece em uma linha com reticências **e** `title`/tooltip com o **nome completo** (o componente de tooltip do PrimeNG já usado no
     projeto; escolher o análogo aprovado, não criar variação).
   - Ação **Renomear** por conversa (ícone de lápis, visível ao passar o mouse e ao focar por teclado, com `aria-label`): troca o texto por um campo; Enter
     salva, Esc cancela, perder o foco salva. Máximo de 120 caracteres; salvar vazio restaura o padrão (com a dica "Deixe em branco para voltar ao
     padrão"). Erro da API mostra o aviso padrão e mantém o campo aberto.
   - O nome atualizado aparece sem recarregar a página; depois de uma mensagem nova, o nome da conversa de hoje se atualiza sozinho quando a IA o troca
     (refazer a leitura do histórico ao fim do turno, como já se faz para as sugestões).
   - Disponível ao desenvolvedor e ao gestor, só nas **próprias** conversas.
6. **Documentação.** Seção do chat em `docs/SYSTEM.SPEC.md` (nome padrão, renomeação a cada mensagem, edição que vence a automática, rota nova), o
   contrato em `docs/SCHEMA.md` (`titulo_editado`), `CONTEXT.md` (seção do chat) e `HISTORY.md` no fecho.

## Critérios de Aceite

- Conversa nova mostra "Chat do dia 19 de outubro de 2026" desde a primeira mensagem (antes de a IA responder) e conversas antigas sem nome mostram o
  padrão da data delas.
- Com a IA no ar, falar de outro assunto no meio do dia troca o nome na lista; continuar no mesmo assunto não o troca nem grava de novo.
- Editar o nome muda a lista na hora, sobrevive a recarregar, e as mensagens seguintes **não** o trocam (nenhuma chamada de nomeação à IA).
- Salvar em branco volta ao padrão e a renomeação automática volta a valer.
- Passar o mouse (ou focar) sobre um nome cortado mostra o nome completo.
- Outro usuário não renomeia nem lê o nome de conversa alheia (404).
- Testes: `chat.service` (renomeia a cada turno com as últimas mensagens truncadas; mantém quando igual; não chama a IA se editado; falha não derruba o
  chat; não renomeia o check-in), `nomePadraoDaConversa`, controller (rota, verbo, só usuário do token), contrato dos armazenamentos e integração
  Postgres, componente do histórico (tooltip, editar, cancelar, salvar em branco, erro) e serviço HTTP do chat.
- Verificação ao vivo (skill `verify`) com IA no ar, nos três viewports, nos estados: nome padrão, nome longo cortado com tooltip, edição, erro de salvar,
  troca automática depois de mudar de assunto.

## Fora de Escopo

- Excluir conversa; fixar ou arquivar conversa; renomear conversa do check-in (ela não aparece no histórico).
- Mostrar o nome no cabeçalho da conversa aberta (só o painel do histórico muda; pode virar task própria).
- Reescrever mensagens: o nome é metadado da conversa, as mensagens continuam imutáveis.
- Configuração para desligar a renomeação automática (a edição manual já a desliga por conversa); se o custo incomodar, a limitação das últimas
  mensagens e a regra "só grava se mudou" são o primeiro ajuste.

## Dependências

- Armazenamento do chat trocável (task 162) e o histórico (task 141). Convive com a [191](191-chat-assunto-e-contexto.spec.md): a nomeação usa só as
  mensagens do contexto `CHAT`, qualquer que seja o assunto.

## Riscos e Mitigação

- **Custo de uma chamada por mensagem:** nível rápido, entrada truncada e saída de ~40 tokens; roda depois do fim do turno, sem bloquear a resposta.
- **O nome oscila a cada mensagem:** a instrução manda manter o nome atual se ainda serve; só grava quando muda.
- **Índice existente sem o campo novo:** documentos antigos contam como não editados; o mapeamento ganha o campo na subida, sem recriar o índice.
- **Editar enquanto a IA renomeia:** a renomeação relê o estado `editado` imediatamente antes de gravar e desiste se ele ficou verdadeiro.
