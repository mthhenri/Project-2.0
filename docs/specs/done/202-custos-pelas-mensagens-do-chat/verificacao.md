# Verificação — task 202 (custos pelas mensagens do chat)

## Ao vivo (2026-10-20)

Ambiente: Postgres 16 local (sem Docker), `CHAT_ARMAZENAMENTO=postgres`, banco migrado até a `0048`, backend e `ng serve` reais, Playwright (Chromium)
logado como o administrador do seed. Cenário montado direto no banco: três respostas da IA em `chat_mensagem` (hoje `claude-haiku-5-5-20261015` com 1 mi de
entrada e 100 mil de saída; ontem `claude-sonnet-5-5` com 500 mil e 50 mil; anteontem `claude-opus-5-5` com 20 mil e 3 mil, sem preço) e uma mensagem do
usuário sem tokens.

- **Aba Custos** nos três viewports (1920×1080, 1366×768, 1080×1920): "Mensagens da IA" 3 (a do usuário, sem tokens, fica de fora), entrada 1,52 mi,
  saída 153 mil, custo **US$ 3,75** com o aviso "1 modelo sem preço". Por modelo: sonnet US$ 2,25, haiku US$ 1,50 (o id datado conta no nome da
  configuração), opus "sem preço". As contas batem à mão (1×1 + 0,1×5 = 1,50; 0,5×3 + 0,05×15 = 2,25).
- **Preço:** `PUT /ia-custo/preco` do opus (5 / 25 / 0,5) mudou o total para **US$ 3,925** (+ 0,175), no banco o JSONB da versão ativa (2) ganhou a
  chave e a versão 1 ficou como estava; nenhuma versão nova foi criada.
- **Layout:** igual ao da task 201 (mesmo componente, só trocaram rótulos e o texto da explicação); sem quebra nos três tamanhos.
- **Migration 0048:** `migrate:up`, `migrate:down` e `up` de novo sobre um banco com duas versões de configuração e dois preços: os preços foram para as
  duas versões, as tabelas saíram, o `down` devolveu `ia_modelo_preco` com os valores da versão ativa.

## Testes

- `shared`: 171/171. `backend` unitários: 1111/1111. `npm run test:integracao`: 247/247 (inclui `somarTokens` e as alterações de preço no SQL real).
- `frontend`: 131 arquivos, 1449 testes, todos passando. Builds do backend e do frontend ok. `repo:test`: 13 de 14 (o 14º é um teste
  pulado, não uma falha).

## Limites (o que não rodou)

- **OpenSearch e Elasticsearch de verdade:** sem Docker nem serviço neste ambiente. A consulta de agregação (`montarConsultaTokens`), a leitura dos baldes e
  os dois clientes estão cobertos por teste unitário com cliente falso; o teste de contrato com `CHAT_INTEGRACAO=1` (que ganhou o cenário de `somarTokens`)
  **não rodou**. Falta rodá-lo contra um OpenSearch e um Elasticsearch reais.
- Sem lint no projeto (`PROBLEMS.md` P-001).
- Tema escuro da aba Custos não revisto (só mudaram textos).

## Revisão independente (agente `revisor`)

Achou: (1) `agruparPeloNomeConhecido` juntava qualquer prefixo (`claude-opus-5-5-…` caía em `claude-opus-5`) — corrigido para exigir `-` + data de 8 dígitos,
com teste; (2) alias cujo id datado não é prefixo vira "sem preço" — registrado em `PROBLEMS.md` P-029; (3) a soma do Postgres do chat não usa índice —
`PROBLEMS.md` P-030 (armazenamento provisório); (4) docs faltando (HISTORY, linha `configuracao-ia` do SYSTEM.SPEC, comentário da service) — feito. Sem
achado em migration, lock, fuso, limites do intervalo e injeção de dependência. Observação: com o OpenSearch/Elasticsearch fora do ar a consulta
inteira da aba Custos falha com "chat indisponível" (editar preço continua funcionando).
