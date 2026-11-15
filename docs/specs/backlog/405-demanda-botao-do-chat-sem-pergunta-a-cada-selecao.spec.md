# 405-demanda-botao-do-chat-sem-pergunta-a-cada-selecao.spec.md

> Task 77/135 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-098, A-099 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-02.
> Severidade: Média. Área: frontend/demanda e mensagem-direta. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

A seleção de uma demanda volta a fazer no máximo 4 requisições (decisão da task 325): o botão "Abrir chat / Criar chat" deixa de pedir `GET /mensagem-direta/canal/demanda/:id` (ou `/canal/projeto/:id`) a cada troca de alvo.

## Contexto

**A-098 · Média · Botão de chat pergunta ao servidor em toda seleção e recebe 403 para auxiliar e desenvolvedor que não são membros**

A quinta requisição da seleção vem do botão de chat: um effect sobre alvoId chama GET /mensagem-direta/canal/demanda/:id a cada demanda, sem guarda de permissão e sem guardar a resposta (voltar a uma demanda já vista pergunta de novo). O backend só aceita gestor/administrador ou membro da demanda, então auxiliar (vê todas, raramente é membro) e desenvolvedor não-membro recebem 403 no uso normal; é silencioso (o botão some), mas a ida ao servidor acontece. O que decide o acesso já está na tela: tipo do usuário na sessão e membros vindos do /detalhe.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/mensagem-direta/components/mensagem-direta-canal-botao/mensagem-direta-canal-botao.component.ts:47-53 — effect lê tipo() e alvoId() e chama carregar()
- frontend/src/app/modules/mensagem-direta/components/mensagem-direta-canal-botao/mensagem-direta-canal-botao.component.ts:60 e 66 — recuperarCanal(...); status 403 vira SEM_ACESSO
- frontend/src/app/modules/demanda/components/demanda-aberta/demanda-aberta.component.html:154 — <app-mensagem-direta-canal-botao [tipo] [alvoId]> sem @if de permissão
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-grupo.service.ts:154-155 — GET com comFeedbackProprioEErroTratado() (sem toast)
- backend/src/modules/mensagem-direta/services/canal-acesso.service.ts:120-129 — temPermissaoDeGestor ou validarMembro; senão UnauthorizedAccessException('Você não é membro desta demanda')
- shared/src/utils/permissao-usuario.ts:9-11 — temPermissaoDeGestor = GESTOR ou ADMINISTRADOR (auxiliar fora)
- frontend/src/app/modules/demanda/components/demanda-detalhe-base/demanda-detalhe.base.ts:400-404 — o /detalhe já entrega membros à tela

Como observar: Entrar como auxiliar (ou desenvolvedor) e clicar em demandas de que não é membro: a cada clique GET /mensagem-direta/canal/demanda/:id 403 na aba de rede, sem toast, e o botão de chat não aparece. Como gestor a mesma chamada responde 200 a cada clique, inclusive ao voltar a uma demanda já vista.

Verificação na auditoria: medido na aplicação rodando em 2026-11-13/14 (administrador): abrir `/demanda` com projeto = 10 requisições; selecionar uma demanda = 5 (`/plano/demanda/:id`, `/demanda/:id/detalhe`, `/demanda/:id/arvore`, `/atividade?demandaId`, `/mensagem-direta/canal/demanda/:id`); voltar a uma demanda já vista = as mesmas 5. Como auxiliar, a quinta responde 403 em toda seleção.

**A-099 · Média · Botão do chat da demanda/projeto pede o canal a cada demanda selecionada, sem guardar**

`MensagemDiretaCanalBotaoComponent` faz `GET /mensagem-direta/canal/{demanda|projeto}/:id` num `effect` a cada troca de alvo, só para escolher o rótulo "Abrir chat" ou "Criar chat". Não há memória por alvo: voltar a uma demanda já vista pede de novo. É a quinta requisição de cada seleção de demanda na medição, e o detalhe do projeto faz duas (projeto e demanda aberta).

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/mensagem-direta/components/mensagem-direta-canal-botao/mensagem-direta-canal-botao.component.ts:48-52 — effect lê `tipo()` e `alvoId()` e chama `carregar()`
- frontend/src/app/modules/mensagem-direta/components/mensagem-direta-canal-botao/mensagem-direta-canal-botao.component.ts:57-60 — `carregar()` zera `canal` e chama `this.api.recuperarCanal(...)` sem consultar nada guardado
- frontend/src/app/modules/mensagem-direta/components/mensagem-direta-canal-botao/mensagem-direta-canal-botao.component.ts:78-79 — comentário "Criar é idempotente: se alguém criou no meio-tempo, volta o chat que já existe" (o POST do clique atende os dois casos)
- frontend/src/app/modules/demanda/components/demanda-aberta/demanda-aberta.component.html:154 — botão montado em toda demanda aberta
- frontend/src/app/modules/projeto/pages/projeto-detalhe/projeto-detalhe.page.html:109 e :137 — botão do projeto (um dos dois `@if`)
- .artifacts/revisao-requisicoes-e-permissoes/trafego/ADMINISTRADOR.txt:87 — `GET /mensagem-direta/canal/demanda/2` ao selecionar a demanda; :119 e :125 — `canal/projeto/1` e `canal/demanda/7` no detalhe do projeto

Como observar: Tela /demanda?projetoId=DEMO: clicar numa demanda, em outra e voltar à primeira. Em cada clique a aba de rede mostra GET /mensagem-direta/canal/demanda/ID, inclusive na volta.

Verificação na auditoria: medido na aplicação rodando em 2026-11-13/14 (administrador): abrir `/demanda` com projeto = 10 requisições; selecionar uma demanda = 5 (`/plano/demanda/:id`, `/demanda/:id/detalhe`, `/demanda/:id/arvore`, `/atividade?demandaId`, `/mensagem-direta/canal/demanda/:id`); voltar a uma demanda já vista = as mesmas 5. Como auxiliar, a quinta responde 403 em toda seleção.

## Decisão do autor pendente

**Antes:** um `effect` do botão pede o canal a cada alvo só para escolher o rótulo, sem guardar a resposta e sem olhar se o usuário pode entrar no canal.

**Opções:**

1. Só front: o botão não pergunta na seleção; o rótulo fica genérico ("Chat") e a consulta sai no clique.
2. Só front: guardar a resposta por alvo e só renderizar o botão para quem pode entrar no canal.
3. Contrato: `GET /demanda/:id/detalhe` e `GET /projeto/:id` passam a dizer se o canal existe (campo novo no DTO).

Recomendação da auditoria: opção 1 ou 2; a 3 só se o rótulo exato na seleção for importante.

## Entregáveis

1. A opção escolhida em `mensagem-direta-canal-botao`, com teste de componente contando as requisições por seleção.

## Critérios de Aceite

- Ao vivo: selecionar três demandas seguidas não gera nenhuma chamada a `/mensagem-direta/canal/`; nenhum 403 para auxiliar ou desenvolvedor não membro.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima. A regra de quem entra no canal é da spec `360-canal-de-demanda-e-de-projeto-para-o-auxiliar`.

