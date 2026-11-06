# 316 — Cor da bolinha escolhida pela pessoa

> Pedido do autor em 2026-11-06 ("a cor da bolinha antes do `@IA`"). Task da guarda-chuva `chat-colaboradores-evolucao.spec.md`.
> Decisões do autor (2026-11-06): a cor é **do usuário** (a pessoa escolhe a própria; o **gestor pode alterar a de qualquer usuário**) e a escolha é **livre** (qualquer cor, não uma paleta).
> **Estado: só a spec.** A modelagem abaixo é proposta e aguarda a confirmação do autor antes de qualquer código.

## O que muda para o usuário

- Hoje toda bolinha (avatar com iniciais) tem a mesma cor de acento (`--app-avatar-fundo`/`--app-avatar-cor`). Depois: cada pessoa pode ter a **sua cor**, e todo mundo que a vê no chat a vê com ela.
- **Escolher a própria cor:** na tela de configurações do chat (a engrenagem, task 318 e a tela da sessão anterior) entra a seção **"Minha cor"**: um seletor de cor livre, a prévia da bolinha com as
  iniciais e o botão "Voltar à cor padrão".
- **Gestor altera a de outro usuário:** na edição do usuário (tela de Usuários) entra o mesmo campo de cor. Desenvolvedor não altera a cor de ninguém além da própria.
- **Sem cor escolhida:** continua a cor de acento de hoje (nada muda para quem não mexer).
- **Onde aparece (por ora, só o chat entre colaboradores):** lista de conversas, barra de bolinhas, cabeçalho e linhas da conversa, aviso (cartão), supervisão, seletor "Para" e cartão de referência. Os
  outros avatares do sistema (atividades, demandas, execução) ficam como estão; a task não os toca.
- **Contraste:** o texto das iniciais é calculado pela luminância da cor escolhida (claro sobre fundo escuro, escuro sobre fundo claro), nos temas claro e escuro. No tema escuro o fundo escolhido é usado como está, sem
  a transparência do padrão.

## Modelagem (proposta, aguarda o autor)

Antes: nenhuma coluna guarda cor; o avatar usa tokens fixos. Depois:

- Coluna **`cor_avatar`** (`VARCHAR(7)`, anulável) em **`usuario`**: o hexadecimal `#RRGGBB` em maiúsculas; `NULL` = cor padrão. Migration **0084** (sem DEFAULT, sem trigger; usuários existentes ficam sem valor).
  Fica em `usuario`, e não em `mensagem_direta_preferencia`, porque o autor disse que a cor é do usuário e o gestor a altera na edição do usuário. O nome `cor_avatar` não amarra a coluna ao chat, já que depois
  ela pode valer para os outros avatares.
- `shared`: regra pura `ehCorValida` (regex `^#[0-9A-F]{6}$` após normalizar) e `corDoTextoSobre(cor)` (luminância relativa → `#FFFFFF` ou `#111827`), com teste. `UsuarioAlterarDto`/`UsuarioInternoAlterarDto`
  ganham `corAvatar?: string | null`; `UsuarioRecuperadoDto` e `UsuarioAlteradoDto` devolvem o campo.
- Contratos do chat: `MensagemDiretaPessoaResumoDto`, `ConversaDiretaResumoDto`, `MensagemDiretaSupervisaoParticipanteDto` e o autor/destinatário das mensagens ganham `corAvatar: string | null`. O contrato
  de armazenamento das mensagens (PostgreSQL, OpenSearch, Elasticsearch) **não muda**: a cor é junta pela service a partir de `usuario`, no mesmo molde das reações (`juntarReacoes`), e nunca é gravada na mensagem.
- Rota para a própria pessoa: `PUT /mensagem-direta/cor` (`MensagemDiretaCorAlterarDto { corAvatar: string | null }`), porque `PUT /usuario/:id` é de gestor. Ela grava só a coluna do próprio usuário.
  Gestor usa o `PUT /usuario/:id` existente. Os dois passam por `ehCorValida`.
- Evento no stream: `{ tipo: 'COR'; usuarioId; corAvatar }` para as pessoas com quem o usuário tem conversa, para a bolinha mudar na hora sem recarregar. (Alternativa mais simples, a decidir: só valer na
  próxima carga da lista.)

## Pontos a decidir antes de codar

1. Coluna em `usuario` (proposta) ou em `mensagem_direta_preferencia`? A resposta "do meu usuário" aponta para `usuario`; confirme.
2. O evento `COR` em tempo real vale a pena, ou a cor nova só aparece na próxima carga?
3. O gestor altera a cor pela tela de Usuários, ou também de dentro do chat (menu da pessoa)?

## Implementação (depois da confirmação)

Backend (migration 0084, `UsuarioRepository`, `UsuarioService.alterar`, rota e service da cor no chat, junção da cor na lista/conversa/pessoas/supervisão, evento se aprovado), `shared` (regras e DTOs),
frontend (`app-mensagem-direta-avatar` recebe `cor` e aplica fundo e texto por variável CSS inline via `[style.--…]`, sem `style=""` literal; seção "Minha cor" na tela de configurações; campo na edição de usuário).
Análogo visual: a seção "Barra de conversas" da tela de configurações e o campo de cor das tags (`TagRapidoAdicionar`, task 116).

## Testes e verificação

`shared` (`ehCorValida`, `corDoTextoSobre`), `backend` (service: valida cor, só gestor altera a de outro, a própria sempre; junção nas listas), integração do repository, `frontend` (avatar com e sem cor, contraste,
seção grava e restaura o padrão). Ao vivo nos cinco formatos e dois temas, com duas pessoas de cores diferentes. `npm run lint:tudo`, `npm run repo:verificar`.

## Fora de escopo

Cor por contato (cada um pintando os colegas), paleta fixa, avatares fora do chat, foto de perfil.
