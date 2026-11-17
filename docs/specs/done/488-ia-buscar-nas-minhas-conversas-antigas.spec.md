# 488-ia-buscar-nas-minhas-conversas-antigas.spec.md

> Task solta, pedida pelo autor em 2026-11-17: o ChatIA ganha, como ferramenta, a pesquisa nas conversas antigas **da própria pessoa**. Parente das três ferramentas do gestor sobre conversas de desenvolvedores (task 153), que não servem aqui (outro dono, só gestor).

## Objetivo

Quando a pessoa diz "o que combinamos sobre o deploy semana passada?", a IA procura sozinha nas conversas antigas dela com a IA, sem a pessoa colar nada e sem a IA depender do dia aberto.

## Entregáveis

1. Duas ferramentas de LEITURA, permissão `QUALQUER`, sempre sobre as conversas do **usuário do token** (nenhum `usuarioId` na entrada):
   - `buscar_nas_minhas_conversas`: `texto` (2–200) e `inicio`/`fim` opcionais (`yyyy-mm-dd`); devolve trechos mais relevantes primeiro, cada um com o dia, o autor e o texto cortado.
   - `consultar_minha_conversa`: `data` (`yyyy-mm-dd`); devolve o título e as mensagens mais recentes do dia, com o texto cortado.
2. DTOs de entrada e saída no `shared` (`MinhasConversasBuscarDto`, `MinhasConversasBuscadasDto`, `MinhaConversaConsultarDto`, `MinhaConversaConsultadaDto`).
3. `ChatMinhasConversasService` com a regra (só contexto `CHAT`, sem a mensagem do sistema, mesmos limites e orçamento de texto das ferramentas do gestor).
4. **Privacidade:** as ferramentas ficam só no ChatIA privado. Nunca aparecem (nem executam) no `@IA` do chat entre colaboradores (um a um, grupo, canal) nem na conversa do plano. Marca `somenteChatPrivado` na `FerramentaIa` e escopo `COLABORADORES` no registro.
5. Frase em `FRASE_DA_FERRAMENTA` para as sugestões de próximas mensagens.

## Critérios de Aceite

- Testes unitários: service (dono sempre o token, período, filtro de contexto e sistema, corte), ferramentas (repasse e permissão `QUALQUER`) e registro (some em `PLANEJAMENTO` e `COLABORADORES`, e a execução com origem de colaboradores ou plano é recusada).
- `npm run test --workspace=shared`, `--workspace=backend`, build do backend e `npm run lint:tudo` sem erro.
- Verificação ao vivo da IA não é possível sem provedor; o limite fica registrado no fecho.

## Fora de Escopo

- Listar conversas por dia (a busca devolve o dia; a terceira ferramenta do gestor não foi pedida).
- Busca semântica ou resumo das conversas; mudança no armazenamento (OpenSearch/Postgres/Elasticsearch).
- P-025 (janela de 50 achados do armazenamento): a busca herda o limite; o período é enviado ao armazenamento com folga de dias para não agravá-lo.

## Dependências

`SYSTEM.SPEC.md` §12 (chat e `@IA` entre colaboradores), spec 363 (dado restrito em espaço compartilhado: esta ferramenta nasce já fora dele).
