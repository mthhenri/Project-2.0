# Task 162 — IA: ferramentas de leitura de ponto, calendário, tags, equipe e relatório

> Origem: mapa de lacunas entre o que as telas fazem e o que a IA faz (2026-10-18), no espírito do princípio da guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md): a IA faz o que o usuário faz, sempre com confirmação.

## Objetivo

Dar à IA as leituras que hoje só existem nas telas, para responder "quantas horas fiz hoje?", "quanto falta no mês?", "tem feriado na sexta?", "que tags existem?", "quem está na equipe?" e "o que o fulano fez no projeto X?". Só leitura: nada é gravado.

## Entregáveis

1. `consultar_ponto_do_dia` e `consultar_ponto_do_mes` (QUALQUER, sempre do usuário do token; o gestor pode informar o usuário), pelo `PontoService`: horas feitas, meta, saldo e justificativas.
2. `consultar_dias_nao_uteis` (QUALQUER), pelo `CalendarioService`, por intervalo de datas.
3. `listar_tags` (QUALQUER), pela `TagService`.
4. `listar_usuarios` (GESTOR), pela `UsuarioService`: nome, login, tipo e status, sem nenhum dado de senha; resolve nomes para as tasks 165 e 166.
5. `consultar_relatorio_de_execucoes` (GESTOR), pelo `RelatorioService`: totais por projeto, usuário e período, sem gerar arquivo.
6. Cada ferramenta com `classeDeEntrada`, limite de itens como `LIMITE_ATIVIDADES_DA_FERRAMENTA` (resposta enxuta, `haMais`) e permissão declarada; instruções de uso no prompt `CONVERSA`.
7. Testes: cada ferramenta chama a service com o usuário do token; desenvolvedor não lê o ponto de outro usuário e gestor lê; nenhuma devolve dado sensível.

## Critérios de Aceite

- Perguntas de ponto, feriado, tag, equipe e relatório são respondidas pela IA com dado real, conferido contra a tela correspondente.
- Desenvolvedor pedindo o ponto de outro usuário recebe o erro de permissão da service, não dado.
- Nenhuma ferramenta desta task grava nada (todas `tipo = 'LEITURA'`).
- Testes de `backend` (node:test) e builds de `backend` e `frontend` passam; frontend sem lint (P-001), declarado no fecho.

## Fora de Escopo

- Qualquer proposta ou escrita (tasks 163 a 166).
- Gerar ou baixar o PDF do relatório.

## Dependências

`144` (padrão das ferramentas de leitura) e `153` (leitura da equipe pelo gestor).

## Riscos e Mitigação

- Resposta grande estoura o contexto: sempre agregada e limitada, como as demais leituras.
- Reutilizar as services de hoje; nenhuma consulta nova no repository só para a IA.
