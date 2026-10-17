# Task 137 — Ferramentas da IA sobre a API

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 5 (3 de 6), princípios 1 a 3 ("a IA é só mais um
> cliente da API", "nada é gravado sem confirmação", "a IA não exclui").

## Objetivo

Dar à IA o contrato de **ferramentas**: um registro de funções que ela pode pedir, cada uma executada **em nome do usuário** pelas
mesmas services de hoje (mesmas permissões), em dois tipos: de **leitura** (devolve dados) e de **proposta** (cria uma
`proposta_ia`, nunca executa). As ferramentas de negócio (listar atividades, iniciar etc.) chegam nos blocos 6 e 9.

## Entregáveis

### 1. Contrato e registro (módulo `ferramenta-ia`)

- Interface `FerramentaIa`: `nome`, `descricao` (o que o modelo lê), `tipo` (`LEITURA` ou `PROPOSTA`), quem pode usar
  (qualquer usuário, gestor ou administrador, reaproveitando `temPermissaoDeGestor`/`temPermissaoDeAdministrador`),
  classe de entrada validada com `class-validator` (o esquema JSON enviado ao modelo é gerado dela, sem duplicar) e
  `executar(entrada, usuario)`.
- `FerramentaIaRegistro`: ferramentas se registram por provider; `listarParaUsuario(usuario)` devolve só as que o tipo de usuário
  pode usar (já no formato `FerramentaIa` do contrato de provedor da task 130) e `executar(nome, entrada, usuario)` valida a entrada e
  chama a ferramenta com o `JwtPayload` do usuário. Nome desconhecido, usuário sem permissão ou entrada inválida viram **resultado de
  erro devolvido ao modelo**, não exceção que derruba o turno.
- **Ferramenta de proposta** (classe base): valida a entrada, chama `PropostaIaService.criar` e devolve ao modelo "proposta criada,
  aguardando a confirmação do usuário" mais o `propostaId`. Ela **nunca** chama a service do domínio.
- **Primeira ferramenta real, de leitura:** `consultar_data_e_hora` (data, hora e dia da semana no fuso `APP_TIMEZONE`), para exercitar
  o contrato de ponta a ponta e porque o "bom dia" do bloco 6 precisa dela.
- **Sem exclusão:** nenhuma ferramenta apaga dados. Um teste varre o registro e falha se algum nome ou tipo de proposta sugerir
  exclusão (`excluir`, `apagar`, `remover`, `deletar`).

### 2. Testes (node:test)

- registro filtra por tipo de usuário; entrada inválida, nome desconhecido e falta de permissão voltam como erro ao modelo;
  ferramenta de proposta cria a proposta e não chama a service de domínio (espiã); a ferramenta executa com o usuário do token, não com
  outro; o teste do "sem exclusão"; `consultar_data_e_hora` no fuso configurado (virada de dia).

### 3. Documentação

- `docs/SYSTEM.SPEC.md` (módulo, contrato e a regra "a IA age pela API") e `docs/context/`.

## Critérios de Aceite

- Uma ferramenta de teste de cada tipo, registrada, aparece na lista do usuário certo e não aparece para o outro tipo.
- A ferramenta de proposta deixa uma linha `PENDENTE` em `proposta_ia` e nenhuma mudança nas tabelas do domínio.
- O teste do "sem exclusão" falha de propósito quando se registra uma ferramenta chamada `excluir_atividade`.
- Testes de `shared` e `backend` e builds passam; frontend sem alteração.

## Fora de Escopo

- As ferramentas de negócio (blocos 6 e 9) e os executores de proposta.
- O laço de conversa que chama o modelo (task 138).
- Ferramentas que fazem busca no chat ou chamam serviços externos.

## Dependências

Depende da **136** (`PropostaIaService`) e do contrato de ferramentas já presente no provedor (task 130, em `done/`). Bloqueia a 138.

## Riscos e Mitigação

- **Duplicar o esquema da ferramenta** (classe de validação e JSON enviado ao modelo): gerar um do outro, para o modelo nunca ver um
  campo que a validação recusa.
- **Resultado de ferramenta grande** (listas longas) estoura o contexto: cada ferramenta limita o que devolve e informa quando cortou.
