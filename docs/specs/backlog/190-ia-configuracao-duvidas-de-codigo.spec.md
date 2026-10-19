# Task 190 — Configuração das dúvidas de código

> Task 3/4 da guarda-chuva [`chat-duvidas-de-codigo.spec.md`](chat-duvidas-de-codigo.spec.md).

## Objetivo

O administrador liga e desliga as dúvidas de código e escolhe o modo de contexto do chat na configuração da IA, e edita e testa
o prompt das dúvidas de código como os demais. Esta task só cria a configuração e o prompt; quem os usa é a task 191.

## Entregáveis

1. **Duas flags novas na configuração versionada da IA** (`configuracao_ia`, mesmo padrão de `checkin_inteligente` e
   `esforco_analitico`):
   - `duvidas_codigo` (`BOOLEAN NOT NULL`): "só Project" (`false`) ou "Project e código" (`true`).
   - `modo_contexto_chat` (`VARCHAR(20) NOT NULL`): `MISTURADO` ou `SEPARADO`, de um enum novo do `shared`
     (ex.: `ModoContextoChatEnum`), sem tabela nem `CHECK`, como `esforco_analitico`.
   Migration numerada a partir de `0043` (skill `sql-migrations`): sem `DEFAULT`; as versões existentes recebem `false` e
   `MISTURADO` antes do `NOT NULL`. DTOs de leitura e de criação de versão, validadores e service passam a levar os dois campos
   (skill `project20-dto-conventions` para qualquer DTO novo).
2. **Tela de configuração da IA** (`configuracao-ia.page`): um interruptor "Dúvidas de programação no chat" e uma escolha
   "Contexto do chat: misturado / separado", com texto curto explicando cada opção, no mesmo grupo e com os mesmos controles das
   flags existentes. Análogo: a própria tela, nas flags do check-in.
3. **Tipo de prompt novo** `DUVIDA_CODIGO` (enum `TipoPromptEnum` e tabela `tipo_prompt`) com a **versão 1** semeada pela
   migration, para "restaurar padrão" funcionar. O texto da versão 1 orienta a IA a: responder dúvidas de programação de forma
   direta, com o código sempre em bloco cercado **com a linguagem informada** (` ```php `), explicação curta antes ou depois;
   não inventar dados do sistema numa resposta de código; voltar às ferramentas do sistema quando a pergunta for do Project.
   Aparece na aba de prompts como os outros.
4. **Teste do prompt** (`prompt-teste.service`): `DUVIDA_CODIGO` roda no nível `RAPIDO`.
5. **Documentação:** `docs/SCHEMA.md` (colunas e o tipo de prompt) e a seção de configuração da IA em `docs/SYSTEM.SPEC.md`.

## Critérios de Aceite

- Testes de `configuracao-ia.service` (criar versão com os campos novos; versão anterior intacta) e de `prompt-teste.service`
  (nível do tipo novo); teste de integração do repository de configuração com as colunas novas (`npm run test:integracao`).
- Teste de componente da tela: os dois controles aparecem, carregam a versão ativa e entram na versão salva.
- Migration aplica e reverte (`db:migrate` e `db:rollback`) num banco com versões existentes.
- `npm test` e builds de backend e frontend verdes.
- Ao vivo (skill `verify`): administrador liga a flag, troca o modo, salva e vê os valores na versão nova; edita, testa e
  restaura o prompt `DUVIDA_CODIGO`. Telas em 1920×1080, 1366×768 e 1080×1920.

## Fora de Escopo

- Qualquer mudança no comportamento do chat (task 191): com esta task sozinha, ligar a flag ainda não muda a conversa.
- Mudar o prompt `CONVERSA`.

## Dependências

Nenhuma. Fontes: `docs/SCHEMA.md` (`configuracao_ia`, `tipo_prompt`, `prompt`) e `rework-chat-ia.spec.md` ("Configurações e
flags versionadas no SQL").
