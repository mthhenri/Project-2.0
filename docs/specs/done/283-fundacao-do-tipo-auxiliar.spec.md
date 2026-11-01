# 283-fundacao-do-tipo-auxiliar.spec.md

> Task da guarda-chuva `tipo-auxiliar.spec.md` (283–287). Primeira da fila: as demais (284–287) consomem o que esta entrega. Redigida em 2026-11-01.

## Objetivo

Fazer o tipo **Auxiliar** existir no sistema (enum, tabela de referência, migration, JWT) e trocar a regra binária de `permissao-usuario.ts` por **permissões por ação**, de modo que nenhuma outra camada compare o tipo diretamente. Esta task **não muda o comportamento** de nenhuma tela ou endpoint: ninguém é Auxiliar ainda e gestor, administrador e desenvolvedor continuam exatamente como estão.

## Entregáveis

1. **Enum:** `AUXILIAR = 'AUXILIAR'` em `shared/src/enums/tipo-usuario.enum.ts`.
2. **Migration `0074 - Adição do tipo Auxiliar.sql`:** insere `AUXILIAR` / "Auxiliar" em `tipo_usuario`, no molde da `0029` (que acrescentou o Administrador), com `created_date`, `updated_date` e `is_deleted` fornecidos. Atualiza a tabela de `docs/SCHEMA.md` (linha 804). Rollback conforme o padrão das migrations vizinhas.
3. **Permissões por ação** em `shared/src/utils/permissao-usuario.ts`: uma função pura por ação (`podeEditarDemanda(tipo)`, `podeAtribuirMembro(tipo)`, …), cada uma respondendo "este tipo pode isto?". `temPermissaoDeGestor` e `temPermissaoDeAdministrador` **continuam existindo e com o mesmo resultado** (o Auxiliar dá `false` nas duas); os consumidores atuais migram nas tasks 284 e 286, não aqui. Proposta de ações, derivada de "Decisões do autor" (a 284 fecha a lista ao conferir o backend):

   | Ação | Dev | Auxiliar | Gestor | Admin |
   |---|---|---|---|---|
   | Ver todos os projetos, demandas e atividades (visibilidade por tipo) | não | sim | sim | sim |
   | Editar demanda (nome, horas, previsão, status), criar demanda e sub-demanda, conexões | não | sim | sim | sim |
   | Atribuir e remover membro e tag de qualquer pessoa | não | sim | sim | sim |
   | Concluir demanda, mover atividade, publicar plano | não | sim | sim | sim |
   | Editar atividade de outro; iniciar e pausar a de outro | não | sim | sim | sim |
   | Ver e editar/excluir execução e ver ponto de qualquer usuário | não | sim | sim | sim |
   | Criar, editar e excluir tag | não | sim | sim | sim |
   | Criar atividade para outra pessoa | não | **não** | sim | sim |
   | Editar projeto (criar, status, nome, cor, datas) | não | **não** | sim | sim |
   | Usuários, Calendário, Relatórios, justificar e imprimir ponto, prioridades, ação em massa | não | **não** | sim | sim |
   | Configurações da IA | não | não | não | sim |

   O padrão de escrita é por **lista positiva de tipos** (`[AUXILIAR, GESTOR, ADMINISTRADOR].includes(tipo)`), nunca `tipo !== DESENVOLVEDOR` (o risco registrado na guarda-chuva).
4. **Auxiliar é desenvolvedor para o que é do desenvolvedor:** uma função `ehExecutorDeAtividade(tipo)` (ou equivalente) deixa explícito que Desenvolvedor e Auxiliar executam atividades, têm ponto, horas diárias e a trava de uma execução ativa. A decisão de quem pode ser executor e de não entrar sozinho em `demanda_usuario` é da 285; aqui só a função existe.
5. **JWT e DTOs:** `JwtPayload.tipo` já usa o enum e passa a aceitar o valor novo sem mudança de forma. Conferir DTOs de usuário em `shared/src/dtos/usuario` (validação `@IsEnum`, mensagens de erro) e o repositório de usuário, que traduz `codigo ⇄ id` e deve resolver `AUXILIAR`.
6. **Rótulos do frontend** (`core/utils/tipo-usuario.ts`): `rotuloTipoUsuario` ("Auxiliar", curto "Aux") e `severidadeTipoUsuario` ganham o caso do Auxiliar (hoje o `default` o trataria como Desenvolvedor, o que esconderia o erro). Só os dois utilitários; o formulário de usuário é a 287.
7. **Testes:** unitário em `shared` para cada função nova × quatro tipos (a tabela acima vira o teste); `temPermissaoDeGestor` e `temPermissaoDeAdministrador` com o Auxiliar; integração do repositório de usuário criando e lendo um usuário `AUXILIAR` (`npm run test:integracao`); teste dos rótulos no frontend.
8. **Fecho:** `HISTORY.md`, `CONTEXT.md` (seção de permissões/tipos de usuário), `SYSTEM.SPEC.md` §14 só quanto ao que esta task entrega (o tipo e a regra por ação; a mudança de visibilidade fica para a 285), `PRIORITIES.md` e a guarda-chuva (marcar 283 como feita).

## Critérios de Aceite

- `npm test`, `npm run test:integracao`, `npm run test --workspace=frontend`, `npm run build --workspace=backend`, `npm run build --workspace=frontend` e `npm run lint:tudo` sem erro; `npm run repo:verificar` ok.
- Nenhum teste existente muda de resultado (prova de que gestor, administrador e desenvolvedor seguem iguais).
- A migration aplica e reverte em banco limpo e em banco com dados.
- Não há `tipo === ` ou `tipo !== ` com `TipoUsuarioEnum` novo em código de produção fora de `permissao-usuario.ts` **introduzido por esta task** (os antigos saem na 284 e na 286).
- Sem alteração visual: não há verificação ao vivo nos formatos de desktop além de confirmar que o login e as telas principais de gestor e desenvolvedor abrem como antes.

## Fora de Escopo

- Trocar os consumidores atuais de `temPermissaoDeGestor` (284 backend, 286 frontend).
- Visibilidade, `demanda_usuario` e regra de executor (285).
- Formulário e listagem de Usuários com o tipo novo (287).
- Criar um usuário Auxiliar de verdade em ambiente algum.

## Dependências

- Nenhuma spec pendente. Fontes: `tipo-auxiliar.spec.md`, a migration `0029` (molde) e o impacto medido na guarda-chuva (`TipoUsuarioEnum`: 45 consumidores).
- Rodar `npm run impacto -- shared/src/enums/tipo-usuario.enum.ts` e `npm run impacto -- shared/src/utils/permissao-usuario.ts` antes de alterar (skill `gerenciamento-de-impacto`), pois há `switch` e `default` espalhados que podem tratar o valor novo como desenvolvedor.

## Riscos e Mitigação

- **`default` que engole o tipo novo:** `rotuloTipoUsuario` e outros `switch` caem no `default` como Desenvolvedor. Mitigação: o impacto lista os `switch` sobre o enum e cada um ganha o caso explícito ou um teste que o cobre.
- **Constraint no banco:** se alguma tabela restringe o tipo por `CHECK` ou por lista fixa, a migration precisa cobrir. Conferir `docs/SCHEMA.md` e as migrations `0025` e `0029` antes de escrever.
- **Lista de ações incompleta:** a tabela é proposta a partir das decisões do autor, não da matriz original (um artifact fora do repositório). A 284 confere o backend linha a linha e acrescenta ou corrige ações; esta task deve deixar a estrutura fácil de estender (uma função por ação, um teste por função).

## Resultado (2026-11-01)

Entregue com dois desvios da proposta, ambos para encurtar o diff sem perder a regra: (1) as ações em que o Auxiliar **não** ganha nada continuam sob `temPermissaoDeGestor` (ele dá `false`), então não ganharam função própria; (2) em vez de `ehExecutorDeAtividade`, a função é `podeSerMembroDeDemanda` (Desenvolvedor e Auxiliar), que é o que a 285 precisa. Funções criadas: `temVisibilidadeTotal`, `podeSerMembroDeDemanda`, `podeEditarDemanda`, `podeAtribuirMembroOuTag`, `podePublicarPlano`, `podeEditarAtividadeDeOutro`, `podeConduzirExecucaoDeOutro`, `podeVerExecucaoEPontoDeOutro`, `podeEditarExecucaoDeOutro`, `podeGerenciarTag`. Selo do Auxiliar: `success`.
