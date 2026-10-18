# Task 166 — IA: propor registrar e corrigir execuções passadas

> Origem: mapa de lacunas entre o que as telas fazem e o que a IA faz (2026-10-18), no espírito do princípio da guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md): a IA faz o que o usuário faz, sempre com confirmação.

## Objetivo

Esquecer de iniciar ou de pausar é comum, e o ponto depende dessas horas. A IA passa a **propor** o registro retroativo ("ontem trabalhei 2h na X") e a correção de uma execução existente ("esqueci de pausar ontem, foi até as 18h"), pelos endpoints `POST execucao/registro` e `PUT execucao/:id` de hoje.

## Entregáveis

1. Padrão de toda proposta nova: migration inserindo o código em `tipo_proposta_ia` (modelo da `0037`), enum em `shared/`, DTO de dados, executor em `ExecutorPropostaIaRegistro` (`validar`, `executar` pela service com o `JwtPayload` do usuário, `desfazer`, `estaObsoleta`), ferramenta `FerramentaPropostaIa` que só cria a proposta, cartão no `app-chat-proposta-cartao` e instrução no prompt `CONVERSA`.
2. Tipos `REGISTRAR_EXECUCAO` (atividade, início, fim, descrição) e `CORRIGIR_EXECUCAO` (execução, novo início, fim e descrição).
3. Executores via `ExecucaoService` com o usuário do token: valem sobreposição de períodos, uma execução ativa e as regras do ponto. `desfazer` exclui o registro criado ou devolve os valores anteriores.
4. `propor_registrar_execucao` e `propor_corrigir_execucao`; a IA apoia-se em `listar_minhas_execucoes_do_dia` e `consultar_data_e_hora` para resolver "ontem" e "até as 18h" em datas exatas no fuso `APP_TIMEZONE`, e **mostra a data resolvida no cartão** antes de confirmar.
5. Testes: executores (sobreposição recusada, desfazer, fuso) e ferramenta só cria proposta.

## Critérios de Aceite

- "Ontem das 14h às 16h na atividade X" gera cartão com data e hora explícitas; confirmar cria o registro e o ponto do dia reflete.
- Período sobreposto é recusado com a mensagem da service, sem cartão confirmável inválido.
- O desenvolvedor só mexe nas próprias execuções.
- Testes de `backend` (node:test) e builds de `backend` e `frontend` passam; frontend sem lint (P-001), declarado no fecho.
- Cartão novo verificado ao vivo em `1920×1080`, `1366×768` e `1080×1920`, temas claro e escuro, tendo como análogo o cartão de `INICIAR_EXECUCAO` (estados vazio, carregando, cheio e erro).

## Fora de Escopo

- Excluir execução.
- Justificativa de ponto (fora das prioridades).

## Dependências

`145`, `150` (descrição da execução) e `164` (leitura do ponto, para conferir o efeito).

## Riscos e Mitigação

- Fuso e "ontem": o cartão exibe a data resolvida; o executor nunca interpreta linguagem natural.
- Edição de execução é sensível para o ponto: sempre com confirmação e desfazer.
