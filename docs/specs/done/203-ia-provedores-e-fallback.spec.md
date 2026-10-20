# 203-ia-provedores-e-fallback.spec.md

> Origem: pedido do autor em 2026-10-20. Conexões com os outros provedores de IA, fallback entre eles escolhido na configuração versionada e regra de que o modelo
> pertence ao provedor. As decisões de modelagem foram combinadas com o autor (opção C abaixo).

## Objetivo

1. `GoogleProvedor` (Gemini) e `OpenAiProvedor` implementam `IaProvedor` ao lado do `AnthropicProvedor`.
2. A configuração da IA (versionada, só administrador) define o **provedor padrão**, até **2 fallbacks em ordem** e os **três modelos de cada provedor**. Se o provedor falha, a mesma chamada segue
   para o próximo da cadeia com os modelos dele.
3. Um provedor nunca usa modelo de outro: `claude-*` é Anthropic, `gemini-*`/`gemma-*` é Google, `gpt-*`/`chatgpt-*`/`o<n>` é OpenAI.

## Decisões (confirmadas pelo autor)

- **Modelagem (C):** na `configuracao_ia`, `modelos_provedor` (JSONB: provedor → trio) e `fallbacks` (JSONB: array de provedores, em ordem); as colunas `modelo_rapido/padrao/analitico` saem (migration `0049`).
  O mapa guarda também provedores fora da cadeia: trocar o padrão e voltar reaproveita os modelos digitados. Sem tabela de fallback.
- **Quando cai para o próximo:** qualquer `IaException` do provedor (`INDISPONIVEL`, `LIMITE`, `CONFIGURACAO`). Provedor sem chave é pulado. Se toda a cadeia falha, vale a falha do primeiro provedor chamado (o padrão, quando tem chave).
- **Streaming:** se um trecho já foi entregue, não há fallback (repetiria o começo da resposta).
- **Chaves:** `GOOGLE_API_KEY` e `OPENAI_API_KEY` no `.env` (opcionais), como a `ANTHROPIC_API_KEY`.

## Fora de escopo / limites conhecidos

- Chamada real aos provedores novos: só contra clientes falsos. Dois pontos pedem conferência com chave de verdade: modelos de raciocínio gastam o teto de tokens pensando (OpenAI recebe `reasoning_effort: low` fora do analítico) e a
  `thoughtSignature` do Gemini 3 nas rodadas de ferramenta (guardada em `assinatura` no bloco).
- **Fallback para o Gemini 3 no meio de uma volta de ferramenta** (a Anthropic pediu a ferramenta e caiu na volta seguinte): o `functionCall` não tem `thoughtSignature` e o Gemini 3 pode recusar; a documentação do Gemini indica uma assinatura fictícia para histórico vindo de outro modelo, mas o valor exato depende de conferência com chave real e não foi aplicado.
- O esforço do nível analítico vale na Anthropic e nos modelos de raciocínio da OpenAI; o Gemini o ignora.
- O custo (aba Custos) atribui níveis aos modelos do provedor padrão; o que um fallback respondeu entra pelo nome do modelo gravado na mensagem, e só tem preço se for cadastrado.

## Critérios de Aceite

- [x] Migration `0049` aplica, reverte e reaplica sobre dados reais (Postgres 16 local).
- [x] Teste de integração do repositório (`npm run test:integracao`, 250).
- [x] `shared`, `backend` (unitários) e `frontend` (Vitest) verdes.
- [x] Builds do backend e do frontend.
- [x] Tela de Configurações da IA verificada nos três viewports (1920×1080, 1366×768, 1080×1920) com cadeia vazia, com 1 e 2 fallbacks e com erro de validação.
- [ ] Chamada real a Gemini e OpenAI.
