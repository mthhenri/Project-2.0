# 228-propostas-autonomia-por-tipo.spec.md

> Task 5/8 (fase 5) da guarda-chuva [`chat-propostas.spec.md`](chat-propostas.spec.md): a régua de autonomia (Faz e avisa, Pergunta,
> Sempre pergunta) por tipo de proposta. Origem: `IDEAS.md` I-026 e I-028 (escolha por usuário fica fora).

## Objetivo

A IA executa sozinha as ações fáceis de desfazer e avisa na conversa, pergunta nas demais e **sempre** pergunta no que mexe em horas,
ponto, projeto ou outra pessoa. O administrador ajusta o que não é fixo na IA Config.

## Entregáveis

1. **Regra pura no `shared`** (com teste): enum de nível (`FAZ_E_AVISA`, `PERGUNTA`, `SEMPRE_PERGUNTA`, valores iguais aos nomes), o nível
   padrão por tipo e a função que decide o nível de uma proposta a partir dos dados dela. **Implementa a tabela "Nível por tipo" da
   guarda-chuva como está**, inclusive as linhas "Faz e avisa" marcadas com `chat-execucao-por-demanda.spec.md` (essa outra spec só
   confirma ou ajusta depois; esta task não as altera). Os casos "sempre pergunta" (em nome de outra pessoa, seção Pessoal do pad,
   horas, ponto, projeto) ignoram a configuração e não aparecem no painel.
2. **Campo novo na `configuracao_ia` versionada** (mapa tipo → nível; migration na próxima livre na hora, sem `DEFAULT`; valores do
   padrão fornecidos pela aplicação) em `backend/src/modules/configuracao-ia/` (model, repository, service, DTOs no `shared`); só o
   **administrador** altera (`temPermissaoDeAdministrador`); entra no histórico de versões como os demais campos.
3. **"Faz e avisa" nas ferramentas** (`backend/src/modules/ferramenta-ia/ferramentas/ferramenta-proposta-ia.ts` e a `PropostaIaService`):
   a ferramenta cria a proposta e a confirma na hora, pela mesma `PropostaIaService`, em nome do usuário do token (mesmo executor, mesmas
   permissões, mesmo desfazer); a ferramenta continua sem enxergar a service de domínio. O nível é decidido **no backend**, nunca pelo
   modelo. O modelo recebe "feito" em vez de "o usuário precisa confirmar".
4. **Linha de aviso no chat**: ícone da IA (`pi-sparkles`), texto da ação e **Desfazer** pelo prazo de hoje (30 min), reaproveitando a
   linha de "feito" da 226; no grupo misto, a linha azul em cima e "N esperando você" (encaixe deixado pela 227).
5. **Painel na IA Config.** (`frontend/src/app/modules/configuracao-ia/`, nova seção na aba de comportamento ou aba própria; análogo: a
   tela de Configurações da IA, task 204): lista dos tipos configuráveis com o nível, e os fixos com **escudo** (não cadeado) e dica
   por `pTooltip` explicando o motivo.
6. **Conexões**: antes de conectar virar "faz e avisa", a regra "só gestor" desce para `DemandaService.criarConexao` e `excluirConexao`
   (passam a receber o usuário), além do `@GestorOnly` do controller; testes de service.
7. Atualizar `docs/SYSTEM.SPEC.md` ("nada roda sem confirmação" nas linhas `proposta-ia` e `ferramenta-ia`) e `docs/SCHEMA.md`.

## Critérios de Aceite

- Testes: regra do `shared` (todo tipo tem nível; fixos ignoram a configuração; "em nome de outra pessoa" e Pessoal viram
  `SEMPRE_PERGUNTA`), `PropostaIaService` (confirma na hora; falha do executor volta ao modelo como erro; desfazer com "estado mudou
  depois" recusado, por tipo "Faz e avisa"), `ConfiguracaoIaService` (só administrador), repository (`npm run test:integracao`) e
  conexões (gestor sim, desenvolvedor não).
- Builds de `shared`, `backend` e `frontend` passam; a migration aplica e reverte (`db:migrate`, `db:rollback`).
- Verificação ao vivo com desenvolvedor, gestor e administrador: ação "faz e avisa" executada e desfeita; fixo sempre pergunta; painel
  salvo e relido; 1920×1080, 1366×768 e 1080×1920, tema claro e escuro.

## Fora de Escopo

- Escolha por usuário (`IDEAS.md` I-028); executar sem registro (toda ação continua sendo uma proposta).
- Mudar quem pode fazer o quê; propostas novas (229 a 231, que já nascem com o nível da tabela).

## Dependências

226 e 227 (linha de feito e encaixe do grupo misto). Aplicar `gerenciamento-de-impacto` à `configuracao_ia` e ao `ferramenta-proposta-ia`.

## Riscos e Mitigação

- "Faz e avisa" errado custa mais que uma pergunta a mais. Mitigação: só tipos com desfazer confiável começam nesse nível, e cada um tem
  teste de desfazer com estado mudado.
- Migration em tabela versionada: conferir como as versões antigas leem o campo novo (nulo = padrão do `shared`).
