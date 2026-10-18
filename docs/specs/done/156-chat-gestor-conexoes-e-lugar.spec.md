# Task 156 — Chat do gestor: conexões e lugar na árvore

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 9. Fluxo do gestor, item "Conexões e lugar".

## Objetivo

Fazer a IA sugerir, com o contexto do projeto, conexões com outras demandas ou um lugar melhor na árvore, **sempre perguntando**, e propor a conexão.

## Entregáveis

1. Executor `CONECTAR_DEMANDA`: cria a conexão pelo serviço de conexões (validação de ciclo por CTE recursiva antes do INSERT continua valendo; ciclo vira `BusinessException` clara no cartão); desfazer remove a conexão criada por ela (soft delete).
2. Ferramenta de proposta `propor_conectar_demanda` e, para a análise, a ferramenta `sugerir_conexoes_e_lugar` (nível **analítico**, prompt `CONEXAO_DEMANDA`, nova versão de seed) que lê demandas, descrições e o grafo e devolve sugestões fundamentadas; a IA apresenta as sugestões e só propõe a que o gestor aceitar.
3. Cartão com origem, destino e o motivo; erro de ciclo explicado.
4. Testes: ciclo recusado pelo executor, desfazer, sugestão não vira proposta sozinha.

## Critérios de Aceite

- Na aplicação real, a IA sugere conexões para uma demanda, o gestor aceita uma, o cartão aparece e confirmar cria a conexão no grafo; uma conexão que fecharia ciclo é recusada com mensagem clara.
- `1920×1080`, `1366×768` e `1080×1920`, temas claro e escuro, estados vazio, carregando, cheio e erro (análogo registrado na task).
- Testes de `backend` (node:test) e builds de `backend` e `frontend` passam; frontend sem lint (P-001), declarado no fecho.

## Fora de Escopo

- Mover demandas na árvore automaticamente: a IA só sugere e propõe conexão, não reposiciona (decisão desta task, reavaliável).

## Dependências

`153`, `154`, `155` e `131`.
