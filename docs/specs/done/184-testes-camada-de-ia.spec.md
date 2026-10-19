# Task 184 — Testes: camada de IA (ia, configuração, prompts, ferramentas, propostas, assistente)

> Task 14/17 da guarda-chuva [`testes-automatizados.spec.md`](testes-automatizados.spec.md) — método comum lá.
> Inventário de partida: [análise](testes-automatizados/ANALISE.md). Os services desta área já são bem testados; faltam
> SQL, rotas, regras puras e as telas de configuração.

## Objetivo

Completar a camada de IA nas partes sem teste: o SQL das versões e da confirmação atômica de proposta, a geração do
esquema das ferramentas, as rotas exclusivas de administrador, o assistente de descrição e as telas de configuração.

## Entregáveis

### Backend

1. **`ia`:** `ia.exception` e `traduzirFalhaDeIa` (cada `IaException` vira a `BusinessException` certa); conferir que
   `ia_desligada` recusa antes de chamar o provedor e que `FORA_DO_AR` por falha só vale com detecção automática ligada.
2. **`configuracao-ia`:** repository (integração: versão seguinte serializada por lock consultivo — duas gravações
   concorrentes geram versões consecutivas, sem repetição; ativa é a última); controller só administrador.
3. **`prompt`:** repository (integração: uma ativa por tipo; um rascunho por tipo; ativar troca a ativa; restaurar
   padrão reativa a versão 1 e mantém o histórico; descartar rascunho; as transações das linhas ~96–173 travam a linha do
   tipo); controller só administrador; `prompt-teste` (já testado) só lacuna.
4. **`ferramenta-ia`:** `esquema-da-classe` (`gerarEsquemaDeClasse` com obrigatórios, opcionais, enums, arrays e
   `@DescricaoCampoIa`); `sem-exclusao` (nomes recusados: excluir, apagar, remover, deletar, eliminar, descartar);
   `ferramenta-proposta-ia` (só cria proposta, nunca chama service de domínio).
5. **`proposta-ia`:** repository (integração: confirmação por `UPDATE ... WHERE status = PENDENTE RETURNING` — duas
   confirmações concorrentes, só uma vence; volta a `PENDENTE` na compensação; pendente de dia anterior expira na leitura
   no fuso); `proposta-referenciada`, `validar-dados-da-proposta`; controller (só as próprias, administrador também 403).
6. **`assistente`** (nada testado): service (nível padrão, prompt certo, falha de IA traduzida, texto vazio recusado) e
   controller.

### Frontend

7. **Lógica:** `configuracao-ia.util`, `configuracao-ia/services/configuracao-ia.service` e `prompt.service`,
   `core/services/ia-disponibilidade.service`.
8. **Componentes:** página `configuracao-ia` (só administrador), `prompts-aba` (ativa, rascunho, histórico, ativar,
   restaurar), `prompt-teste-dialog` (1 a 5 narrativas, erro por saída), `prioridades-aba` (cor `#rrggbb`),
   `shared/components/assistente-descricao` (sugestão aplicada, IA fora do ar), `ia-retorno-aviso`.

## Critérios de Aceite

- A corrida de confirmação de proposta e a do lock consultivo provadas com duas operações concorrentes reais no banco.
- `npm test`, `test:integracao` e builds verdes; divergências como `todo` + `PROBLEMS.md`.

## Fora de Escopo

- Chamadas reais à Anthropic (o provedor fica no dublê do SDK, como hoje). Chat (185) e check-in (186).

## Dependências

171, 172, 173. Fontes: `SYSTEM.SPEC.md` §12 (`ia`, `ferramenta-ia`, `proposta-ia`, `prompt`, `configuracao-ia`,
`assistente`), §15.
