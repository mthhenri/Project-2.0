# Task 136 — Proposta da IA: modelo de dados, confirmação atômica e API

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 5 (2 de 6), princípio 2 ("nada é gravado sem
> confirmação") e a seção "Proposta da IA" da [`modelagem.md`](rework-chat-ia/modelagem.md).

## Objetivo

Guardar as ações que a IA **propõe** (iniciar execução, criar atividade, anotar no pad etc.) e só executá-las quando o usuário
confirma, uma única vez, pela service do domínio, com opção de ajustar, recusar e desfazer. Esta task entrega o **mecanismo**; os
executores concretos de cada tipo chegam nos blocos 6, 8 e 9.

## Entregáveis

### 1. Migration `0035` (schema)

- `tipo_proposta_ia` (seeds: `INICIAR_EXECUCAO`, `PAUSAR_EXECUCAO`, `CRIAR_ATIVIDADE`, `DESCREVER_EXECUCAO`, `SUSPENDER_CHECKIN`,
  `ANOTAR_PAD`, `CRIAR_DEMANDA`, `DESCREVER_DEMANDA`, `CONECTAR_DEMANDA`) e `tipo_proposta_ia_status` (`PENDENTE`, `CONFIRMADA`,
  `AJUSTADA`, `EXPIRADA`, `DESFEITA`), ambas no molde das tabelas de referência. **Não existe tipo de exclusão** (princípio 3).
- `proposta_ia`: BaseEntity, `usuario_id`, `tipo_proposta_ia_id`, `tipo_proposta_ia_status_id`, `dados JSONB NOT NULL`,
  `resolucao_data TIMESTAMPTZ`, `resultado JSONB`. Sem `DEFAULT`. `DOWN` desfaz tudo.

### 2. Shared

- Enums `TipoPropostaIaEnum` e `StatusPropostaIaEnum`; DTOs conforme `project20-dto-conventions` (resumo da proposta, entrada de
  ajuste com os dados novos, saída de confirmada, ajustada, recusada e desfeita).

### 3. Backend (módulo `proposta-ia`)

- **Regra de dono:** só quem recebeu a proposta a resolve; o resto leva 403. Administrador não resolve proposta alheia.
- `PropostaIaService.criar(usuario, tipo, dados)` é **interno** (chamado pelas ferramentas da task 137); não há rota para criar.
- **Executores por tipo:** interface `ExecutorPropostaIa` (`validar(dados)`, `executar(dados, usuario)` devolve o resultado,
  `desfazer(resultado, usuario)`), registrada por tipo. O executor chama a **service do domínio** com o usuário do token (mesmas
  validações e permissões da tela). Tipo sem executor registrado devolve erro claro, nunca executa.
- Rotas (todas do usuário autenticado): `GET /proposta-ia/:id`, `POST /proposta-ia/:id/confirmar`, `POST /proposta-ia/:id/ajustar`
  (o usuário envia os dados corrigidos; a ação roda com eles; status `AJUSTADA`), `POST /proposta-ia/:id/recusar` (status
  `EXPIRADA`, sem executar) e `POST /proposta-ia/:id/desfazer` (só `CONFIRMADA` ou `AJUSTADA`; aplica a ação inversa do executor;
  status `DESFEITA`).
- **Confirmação atômica:** `UPDATE ... SET status = CONFIRMADA WHERE id = :id AND status = PENDENTE RETURNING ...`; quem não
  recebe linha de volta devolve 409. Duas confirmações simultâneas executam a ação **uma vez**. Se o executor falhar, a proposta
  volta a `PENDENTE` (transação), o usuário vê o motivo e pode ajustar.
- **Expiração:** proposta `PENDENTE` de um dia anterior vira `EXPIRADA` ao ser lida ou resolvida (sem job).
- Testes (node:test, repositório em memória e executor falso): confirmar executa uma vez, confirmação concorrente, executor que
  falha devolve a `PENDENTE`, ajustar usa os dados novos, recusar não executa, desfazer só depois de confirmar, 403 de dono,
  expiração, tipo sem executor.

### 4. Documentação

- `docs/SCHEMA.md`, `docs/SYSTEM.SPEC.md` (módulo, regra de dono e de confirmação) e `docs/context/`.

## Critérios de Aceite

- `db:migrate`, `db:rollback` e novo `db:migrate` rodam sem erro; as 9 e as 5 linhas de seed existem.
- Duas chamadas simultâneas de confirmar a mesma proposta: uma responde 200 e a outra 409; o executor falso conta **uma** execução.
- Outro usuário (inclusive administrador) não confirma, ajusta, recusa nem desfaz a proposta.
- Testes de `shared` e `backend` e builds passam; frontend sem alteração.

## Fora de Escopo

- Os executores reais (cada bloco registra os seus) e a criação de propostas pela IA (task 137).
- Cartões de proposta na tela (task 139).
- Qualquer ação de exclusão pela IA (ideia futura da guarda-chuva).

## Dependências

Nenhuma (independente de 135). Bloqueia a 137.

## Riscos e Mitigação

- **Executor que grava e depois falha**: cada executor roda dentro da mesma transação da troca de status, para a proposta nunca ficar
  `CONFIRMADA` sem efeito, nem com efeito pela metade.
- **Desfazer** de ação que já mudou de novo (ex.: execução já pausada pelo usuário): o executor decide se ainda é seguro e, se não,
  responde 400 com o motivo; a proposta continua `CONFIRMADA`.
