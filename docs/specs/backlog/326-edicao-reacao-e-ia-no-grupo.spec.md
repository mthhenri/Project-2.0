# 326-edicao-reacao-e-ia-no-grupo.spec.md

> Task 326, vinda da ideia I-053 (`docs/context/IDEAS.md`; a outra metade dela, a notificação do Windows para grupo, já saiu no Desktop 1.1.3).
> Spec escrita em 2026-11-12 a partir das decisões do autor na conversa do mesmo dia (seção "Decisões do autor"). **Nenhum código antes de o autor
> aprovar esta spec**: o entregável 1 é modelagem (migration em `mensagem_direta_reacao`) e o 4 amplia o que a IA lê.

## Objetivo

No grupo livre e nos canais de projeto e de demanda do chat entre colaboradores, a pessoa passa a **editar a própria mensagem**, **reagir** a mensagens e
**chamar a `@IA`**, com as mesmas regras da conversa um a um (tasks 313, 314 e 315), trocando "a outra pessoa" por "os membros do grupo".

## Decisões do autor

Respondidas em 2026-11-12:

1. **Reação:** `mensagem_direta_reacao` ganha `grupo_id`; a linha tem **ou** `grupo_id` **ou** `conversa_id` (nunca os dois, nunca nenhum).
2. **IA no grupo:**
   1. Lê como contexto as **últimas N mensagens do grupo**; **todos os membros veem a resposta**, com o mesmo esquema da conversa um a um: a proposta
      aparece como cartão só para quem tem acesso ao alvo e como "Ação oculta por falta de acesso" para os demais.
   2. Nos **canais**, a IA **pode ler** a demanda ou o projeto do canal (sempre com as permissões de quem chamou).
   3. **Custo em nome de quem chamou** (resposta do autor: "acho que sim"; **a confirmar na aprovação**).
3. **Edição:** igual à conversa um a um (só o autor, até 1 hora, "editada"; o original não é guardado, I-052).

## Entregáveis

1. **Modelagem da reação** (migration **`0090`**, sem `DEFAULT`, sem trigger):
   - `mensagem_direta_reacao.grupo_id INTEGER` anulável, FK para `grupo`; `conversa_id` passa a anulável.
   - `CHECK`: exatamente um entre `conversa_id` e `grupo_id` preenchido; o formato `<menorId>-<maiorId>` de `conversa_id` continua conferido quando ele existe.
   - Índice em `grupo_id` (parcial, `is_deleted = false`). O único parcial (`mensagem_id`, `usuario_id`) não muda: a `mensagem_id` já identifica a mensagem.
   - Reverte sem perda das linhas um a um; `SCHEMA.md` (tabela e ordem de criação) atualizado na mesma tarefa.
   - `MensagemDiretaReacaoRepository.definir` aceita `conversaId` **ou** `grupoId`; `listarPorMensagens` não muda.
2. **Edição no grupo** (`GrupoService`):
   - `PATCH /mensagem-direta/grupo/:grupoId/mensagem` com `GrupoMensagemEditarDto` (`mensagemId`, `texto`, `mencoes?`, `mencionaTodos?`, `referencias?`; sem
     `respondeAMensagemId`). A regra de autoria e prazo é a pura `avaliarEdicaoDeMensagemDireta`, a mesma.
   - Só **membro de agora** edita (gestor que lê o canal por tipo sem ser membro não edita). Menções e referências seguem o envio do grupo
     (`normalizarMencoesDoGrupo`, `validarReferenciaDireta`). Texto igual não grava. Evento `EDICAO` a todos os membros.
3. **Reação no grupo** (`GrupoService`):
   - `PUT /mensagem-direta/grupo/:grupoId/reacao` com `GrupoMensagemReagirDto` (`mensagemId`, `reacao: string | null`). Mesmas regras de emoji e de "uma por
     pessoa por mensagem". Só membro de agora reage; mensagem do sistema e mensagem da IA não recebem reação (a da IA já era recusada na um a um, confirmar).
   - O evento `REACAO` vai a todos os membros; o aviso ao autor segue a regra de hoje (só ele, nunca a si mesmo, nunca ao remover, respeitando silêncio).
   - A junção das reações na página (`juntarReacoes`) vale também para as mensagens do grupo; busca e supervisão continuam com `reacoes: []`.
4. **`@IA` no grupo** (extensão do `MensagemDiretaIaService`, sem copiar o laço):
   - A regra pura `chamadaDaIa` e `pedidoPendenteDaIa` servem como estão (o `@IA` sozinho vale a próxima mensagem **de quem chamou**, em até 10 minutos).
   - `GrupoService.enviarMensagem` aciona `atenderSeChamada` como a conversa um a um faz, fora da requisição. A trava é por `conversaId` (`G<id>`).
   - Quem pode chamar: membro de agora. Leitor por tipo que não é membro não chama.
   - Contexto: as **20** mensagens anteriores do grupo (a mesma `JANELA_DE_CONTEXTO_DA_IA_NO_CHAT_DIRETO`; **N fica em 20 salvo ordem em contrário**), rotuladas
     pelo nome de quem escreveu, sem as mensagens do sistema, mais o trecho citado se o pedido responde a algo fora da janela.
   - Instruções: o prompt `CONVERSA` mais a orientação fixa no código, agora dizendo que **vários membros leem a resposta** (quantidade e tipos presentes) e que o
     texto não pode expor o que algum deles não acessa. Nos canais, a orientação nomeia a demanda ou o projeto do canal, e a IA os lê pelas ferramentas de
     `listarParaUsuario(quemChamou)`. **Sem prompt novo.**
   - Resposta: mensagem `IA` do grupo (`chamada_por_usuario_id` = membro que chamou; `proposta_ids`), publicada a todos os membros de agora. Evento
     `IA_DIGITANDO` aos membros. Falha, IA desligada ou fora do ar: mensagem do sistema, como hoje.
   - Custo registrado no `IaUsoService` em nome de quem chamou (descrição "@IA no grupo").
   - `validarMensagemDiretaNova` aceita a mensagem `IA` com `chamadaPorUsuarioId` membro do grupo (hoje confere participante da conversa a dois).
5. **Ver a proposta como membro do grupo:** `GET /mensagem-direta/grupo/:grupoId/proposta/:propostaId?mensagemId=` devolve o mesmo
   `MensagemDiretaPropostaRecuperadaDto` (`acessivel`, `podeResolver`, `proposta`). 404 se a proposta não está numa mensagem `IA` **deste** grupo; 403 para quem
   não é membro nem leitor por tipo. `podeResolver` só para quem chamou; `acessivel` pelo `podeVer` dos executores, como na um a um.
6. **Frontend** (`modules/mensagem-direta`, popup, janela do Desktop e supervisão):
   - O menu da mensagem do grupo ganha "Editar" (mesma condição pura) e "Reagir" (faixa, "+" e pílulas; a pílula mostra a contagem de todos e a dica lista quem
     reagiu); "editada" ao lado do horário; tratamento de `EDICAO` e `REACAO` do grupo.
   - O `@` do compositor do grupo oferece **IA** como primeira opção (com a IA disponível); balão da IA, "IA digitando…", cartão, grupo de propostas e
     "Ação oculta por falta de acesso" reaproveitam os componentes da 315.
   - Supervisão do grupo: a mensagem da IA e a "editada" aparecem somente leitura; reação e `@IA` não se exercem por lá.
   - Análogo visual aprovado: a própria conversa um a um já com as três ações (tasks 313, 314 e 315).
7. **Documentação:** `SCHEMA.md` (a `0090`), `SYSTEM.SPEC.md` §12 (linha `mensagem-direta`: as três rotas e a regra de membro), `CONTEXT.md`, `HISTORY.md`.
   A I-053 sai de `IDEAS.md` (já saiu a metade do Desktop; esta task a encerra).

## Critérios de Aceite

1. `backend` unitários: editar (autor membro, prazo no limite, não membro, leitor por tipo, mensagem de outro grupo, texto igual); reagir (membro, trocar, remover,
   sistema, IA, não membro, evento só aos membros); `@IA` (só membro chama, trava por grupo, contexto de 20 rotulado e sem sistema, o canal lê a demanda com as permissões
   de quem chamou, custo em nome de quem chamou, falha gera mensagem do sistema); `GET .../proposta/:id` (404 de outro grupo, `acessivel` por membro, `podeResolver` só de quem chamou).
2. `npm run test:integracao`: a `0090` aplica e reverte; o repository grava e lê reação de conversa e de grupo; o `CHECK` recusa as duas preenchidas e as duas vazias; o
   único parcial vale nos dois casos; a suíte de contrato grava e lê a mensagem `IA` de grupo nas implementações de armazenamento.
3. `shared`: testes dos DTOs novos; a regra pura da orientação do grupo, se for extraída.
4. `frontend`: testes de componente do menu do grupo (Editar só na própria e no prazo, Reagir, pílulas), da opção IA no `@` do grupo e do balão da IA com cartão, grupo e oculto.
5. `npm run lint:tudo` com zero erros; builds de `backend` e `frontend`; `npm test` na raiz; `npm run repo:verificar`.
6. Ao vivo (skill `verify`), com três usuários em três sessões (gestor, desenvolvedor com acesso à demanda e desenvolvedor sem acesso), nos cinco formatos de
   desktop e nos dois temas, num grupo livre e num canal de demanda: editar e ver "editada" nos outros; reagir, trocar e remover com o aviso ao autor; `@IA` com
   pedido e com `@IA` sozinho; proposta de criar atividade na demanda aparece como cartão para quem tem acesso e oculta para quem não tem; Aceitar só para quem chamou;
   Custos em nome de quem chamou; IA desligada gera a mensagem do sistema. Evidências em `.artifacts/326-edicao-reacao-e-ia-no-grupo/`.

## Fora de Escopo

- Guardar o texto original da mensagem editada (I-052), excluir mensagem e histórico de edições.
- Streaming da resposta da IA; prompt novo ou versão nova do `CONVERSA`.
- Reação, edição e `@IA` na busca e na supervisão (leitura apenas).
- Trava da chamada entre instâncias da API (continua por instância, como na 315).
- O `/resumir` (task 249) não muda; a mensagem `IA` não entra no resumo, que só conta mensagens de pessoa.

## Dependências

- Em `done/`: 246–250 (grupos), 313, 314 e 315 (edição, reação e `@IA` um a um), 228 (autonomia por tipo), 260 (`IaUsoService`).
- Fontes da verdade: `docs/SYSTEM.SPEC.md` §12 e §14, `docs/SCHEMA.md` (`mensagem_direta_reacao`, `grupo`, `grupo_membro`).

## Riscos e Mitigação

- **Vazamento pelo texto:** em grupo, mais gente lê a resposta, e a orientação não é garantia (mesmo risco aceito na 315). Mitigação: o cartão é conferido no
  servidor por membro; o texto leva a orientação com a quantidade e os tipos dos leitores. Em canal, a leitura da demanda é o ponto mais sensível: confirmar na
  verificação ao vivo com o desenvolvedor sem acesso.
- **Membro que sai no meio do turno:** a resposta vai aos membros do fim do turno, e a leitura da proposta confere o acesso de agora.
- **Migration em tabela em uso:** `conversa_id` deixa de ser `NOT NULL`; o `CHECK` novo é o que impede linha sem dono. Aplicar e reverter com dados nos dois formatos.
- **Copiar a 315:** o caminho rápido é duplicar o serviço da IA para o grupo. Proibido: o serviço passa a receber a lista de participantes, e a conversa a dois é o caso de dois.
