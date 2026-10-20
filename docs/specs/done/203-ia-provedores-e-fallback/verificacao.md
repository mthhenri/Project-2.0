# Verificação da task 203 — provedores de IA, fallback e modelos por provedor

Ambiente: sem Docker; Postgres 16 local (cluster temporário na porta 5433), backend (`npm run backend:dev`) e frontend (`npm run frontend:dev`) reais, Chromium via Playwright
(`/opt/pw-browsers`), login `gestor.inicial` (administrador). Capturas em `.artifacts/203-ia-provedores-e-fallback/` (ignorada pelo Git).

## O que foi verificado

- **Migration `0049`** sobre o banco migrado até a `0048`, com a versão 1 do seed: `up` copiou o trio para `modelos_provedor` (`{"ANTHROPIC": {...}}`) e criou `fallbacks = []`;
  `down` devolveu as três colunas `modelo_*` com os mesmos valores e `up` de novo reaplicou (conferido por `SELECT`).
- **Testes.** `shared` 180, `backend` unitários 1146, integração 250 (inclui o repositório novo: cadeia e mapa voltam como gravados, trocar o padrão e voltar, versão 1 do seed), `frontend` 131 arquivos / 1462 testes.
  Builds do backend e do frontend ok (avisos de orçamento de CSS já existentes). `npm run repo:verificar` ok. **Sem lint** (`PROBLEMS.md` P-001).
- **Tela de Configurações da IA** em 1920×1080, 1366×768 e 1080×1920, percorrendo: estado inicial (só o trio da Anthropic), escolher fallback 1 = Google e fallback 2 = OpenAI (aparecem os trios),
  salvar sem os modelos (seis erros em vermelho, nada enviado), modelo de outro provedor no Gemini (`O modelo rápido "gpt-5-mini" não é de Google`), salvar de verdade (versão nova, toast, histórico),
  trocar o padrão para o Google e voltar (o trio da Anthropic volta preenchido) e o detalhe de uma versão no histórico. Sem erro de console nos três tamanhos.
- **Achados da própria verificação (corrigidos).** (1) Os três seletores do topo ficavam estreitos na coluna do desktop ("Google ..." cortado e rótulo em duas linhas): passaram a quebrar em 2+1.
  (2) O detalhe da versão no histórico quebrava os nomes dos modelos em 2–3 linhas: o provedor passou a ocupar a linha inteira com um modelo por linha.

## O que NÃO foi verificado

- **Chamada real** ao Gemini e à OpenAI (sem chave nem rede aqui): os provedores só rodaram contra clientes falsos. Pontos a conferir com chave: o teto de tokens consumido pelo raciocínio dos modelos
  de raciocínio, a `thoughtSignature` do Gemini nas rodadas de ferramenta e o formato exato de `reasoning_effort`.
- **Comportamento do fallback ao vivo** (derrubar o provedor padrão de verdade): coberto só por teste unitário com provedores falsos.
- O custo por modelo de um fallback só aparece na aba Custos se o preço do modelo for cadastrado.
