# Verificação — 242 A IA trata as atividades como o checklist da demanda

Verificada em 2026-10-26 com o stack real (backend NestJS, SPA Angular, PostgreSQL 16 local, OpenSearch) e IA da Anthropic (`ANTHROPIC_API_KEY` do `.env`),
como o desenvolvedor `dev.teste` do projeto Demo. Saídas brutas em `.artifacts/242-chat-checklist-da-demanda/` (ignorada pelo Git); este texto basta para o veredito.

## Gates automáticos

`shared` 275, backend 1513 (unitários), integração 350, frontend 2213, builds do backend e do frontend e `repo:verificar` aprovados. Sem lint (P-001).

## Teste de prompt (aba Prompts: `POST /prompt/CONVERSA/testar`, nível RAPIDO)

O teste é só texto, sem ferramentas: o checklist entrou na própria narrativa. O candidato foi o texto ativo (migration 0065).

| Caso | Resultado |
|---|---|
| Continuação (mesmo bloco, rodando) | Aprovado: não propõe atividade nova nem troca; fala de continuar e de propor `DESENVOLVIDA` ao terminar. Fez uma pergunta solta sobre o tempo da reunião |
| Bloco acabado | Aprovado: propõe `DESENVOLVIDA`, pausar e iniciar o próximo bloco. A **ordem** listada foi marcar antes de pausar (a regra de status exige pausar antes); no chat ao vivo a ordem saiu certa |
| Bloco novo (bug do suporte, caso 4821) | Aprovado: propõe criar a atividade, com o identificador do caso, fora do checklist atual, e pausar a que roda |

## Ao vivo no chat (1920×1080)

| Passo | Resultado |
|---|---|
| "Vou continuar na Tela de login, ajustando a validação" | Reaproveitou a atividade **Montar o formulário** (não criou) e iniciou a execução, com aviso e Desfazer |
| "Terminei o formulário… vou para o tratamento de erro" | Pausou a execução, marcou **Montar o formulário** `DESENVOLVIDA` e iniciou **Tratar erro de credencial** (PENDENTE → DESENVOLVENDO), um grupo "3 propostas feitas pela IA" com Desfazer todas. Banco conferido: status e execução ativa corretos |

## Limites e achados

- Modelo do teste de prompt: nível RAPIDO. O texto sem ferramentas não prova o uso da ferramenta `consultar_checklist_da_demanda`; ela aparece nos testes unitários e no comportamento ao vivo.
- A lateral "Minhas demandas" (task 245) continuou mostrando o estado anterior logo depois das ações da IA (a atividade antiga ainda "Rodando"); recarregando a página ela mostra o certo. Observado, não investigado: é da 245, não desta task.
- Dados de teste ficaram no banco de desenvolvimento (execuções e atividades do `dev.teste`).
