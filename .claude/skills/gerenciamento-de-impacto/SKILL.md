---
name: gerenciamento-de-impacto
description: >
  Medir o impacto antes de alterar algo usado em vários lugares — ícone, primitivo/componente
  compartilhado, botão, token, cor, tema, classe CSS, regra pura do pacote compartilhado, DTO,
  enum, service, evento — e antes de reaproveitar um item existente num uso novo. Use ao trocar,
  redesenhar, renomear, remover ou mudar comportamento/assinatura de qualquer coisa compartilhada,
  quando o hook avisar "Gerenciamento de impacto", ou quando algo mudou "sozinho" numa tela que
  ninguém tocou ("o ícone virou outro", "o botão mudou na tela X").
---

# Gerenciamento de Impacto — quem mais muda quando isto muda?

> As regras de arquitetura vivem em `CLAUDE.md`/`AGENTS.md`, `docs/SYSTEM.SPEC.md` e
> `docs/CONVENTIONS.md`; o mapa de onde as coisas vivem, em `docs/context/MEMORY.md`. Em conflito,
> o documento vence e esta skill é corrigida. O que esta skill carrega de próprio é a **ordem de
> execução**, a **regra de decisão** e os **pontos cegos** da busca.

Origem (repositório-fonte): um botão "Trocar senha" exibia a medalha de "patente" desde que nasceu —
um ícone com sentido próprio, pego emprestado. Ninguém mediu o impacto nem na entrada nem depois.

## Regra: tudo tem impacto

Todo consumidor de um item compartilhado é avaliado, um por um — não só o que motivou a tarefa.
Consumidor que muda **além do que o pedido nomeou** para a tarefa: leve ao autor o mapa e uma
recomendação antes de aplicar. Seguir sem perguntar só quando o pedido cobre explicitamente
todos os consumidores ("todos os botões primários", "o token de destaque inteiro") — e mesmo
assim o mapa vai no fecho.

O impacto corre nos dois sentidos:

- **Para fora** — alterar o item muda todos os seus consumidores, inclusive os que só o pegaram
  emprestado.
- **Para dentro** — reaproveitar um item com sentido próprio prende o uso novo à evolução
  daquele sentido. Ícone/variante com nome de conceito não serve a outro conceito: crie um
  próprio. Item genérico (`editar`, `excluir`, o botão base) pode ser reaproveitado no mesmo
  sentido.

## Ordem de execução

1. **Nomear a mudança.** Qual item, e que tipo de mudança: aparência, comportamento,
   contrato/assinatura (campo, parâmetro, retorno, seletor, nome) ou sentido.
2. **Levantar consumidores** com o script — ponto de partida, não prova:
   ```bash
   npm run impacto -- <arquivo>          # importadores, seletor de componente, @use e var(--x)
   npm run impacto -- --icone <nome>     # uso no componente de ícone (CONFIG.icone) e literais
   npm run impacto -- --simbolo <Nome>   # identificador, classe CSS, valor de enum, evento
   ```
   Depois cubra os pontos cegos do tipo do item (tabela abaixo).
3. **Classificar cada consumidor** em uma das quatro classes:
   - **pedido** — é o alvo da tarefa;
   - **acompanha** — muda junto e o efeito é o mesmo desejado;
   - **destoa** — muda, mas o sentido ali é outro (empréstimo, contexto diferente);
   - **quebra** — deixa de compilar, de casar o contrato ou de funcionar.
4. **Decidir.** Só **pedido** e **acompanha** explicitamente coberto → aplique. Qualquer
   **acompanha** não nomeado, **destoa** ou **quebra** → mapa ao autor com as opções:
   alterar o compartilhado para todos · criar item/variante nova só para o pedido · separar
   antes o consumidor emprestado (dar a ele item próprio) · não alterar. Ampliar um componente
   compartilhado existente é decisão do autor.
5. **Aplicar e verificar consumidor por consumidor.** UI: `verify` também nas
   telas consumidoras afetadas, não só na do pedido. Contrato: build de todos os workspaces afetados.
6. **Registrar.** O mapa de impacto vai no relatório da spec (ou no fecho da tarefa).
   Empréstimo/divergência achado fora do escopo → `PROBLEMS.md`, nunca diff desta tarefa.

## Onde procurar — e o que o script não vê

| Item | Comando | Ponto cego a conferir à mão |
|---|---|---|
| Ícone (`CONFIG.icone` ainda é `null`: sem componente de ícone próprio) | `--simbolo <nome>` | nome vindo de dado (`icone: 'x'` em arrays de abas/menus, mapas de domínio → ícone), ternário no binding, aliases internos do componente, testes de assinatura do glifo |
| Componente/diretiva/pipe compartilhado | `frontend/src/app/shared/...` | input com default novo muda quem não passa o input; classes de receita no CSS do consumidor |
| Token / tema | `frontend/src/app/shared/styles/` e `tailwind.config.js` | cópias espelhadas do tema; config do Tailwind/equivalente; token derivado de outro (`color-mix`) |
| Classe CSS | `--simbolo <classe>` | classe montada por interpolação ou binding condicional |
| Validador/interface do pacote compartilhado | `shared/src/validators/...` | usos em DTO (`class-validator`) no backend e nos formulários do frontend |
| DTO / campo | `--simbolo <NomeDto>` e `--simbolo <campo>` | SQL dos repositories (alias de coluna), JSON persistido, documento de schema; rebuild do pacote compartilhado antes de testar contra o backend rodando; `docs/SCHEMA.md` |
| Enum | `--simbolo <VALOR>` | tabela `tipo_*` e migrations → skill `sql-migrations`; `switch` exaustivo; rótulos na UI |
| Service / método | `--simbolo <metodo>` | injeção por outro módulo; pontes indiretas (service de um módulo consumindo repositório exportado de outro, como `ponto` ← `ponto-justificativa`) |

## Formato do mapa de impacto

```markdown
### Impacto — <item> (<tipo de mudança>)
Busca: `npm run impacto -- …` → N consumidores; pontos cegos conferidos: …
| Consumidor | Classe | Decisão |
|---|---|---|
| `caminho/arquivo:linha` (tela/uso) | pedido · acompanha · destoa · quebra | aplicar · item próprio · autor decidiu … |
```

## Gatilho automático (Claude Code)

`scripts/agentes/hook-impacto.mjs` (`PostToolUse` em `Edit|Write|MultiEdit`, registrado em
`.claude/settings.json`) injeta o lembrete quando o arquivo editado fica numa das `CONFIG.zonas`
de `scripts/impacto.mjs` ou tem `CONFIG.minimoConsumidores`+ consumidores diretos — uma vez por
arquivo por sessão, sem bloquear. O lembrete chega **depois** da primeira edição: se ela já mudou
o sentido para algum consumidor, trate como mudança ainda não aprovada. O Codex não tem esse
hook: segue esta skill pela linha de `AGENTS.md`.

## Armadilhas

- **Contagem alta não é risco alto, nem o inverso.** O componente de ícone tem centenas de
  consumidores, mas o impacto real é só o dos glifos tocados; um service com 2 consumidores pode
  quebrar um fluxo inteiro.
- **"Literal (conferir se é ícone)"** inclui falsos positivos (variáveis de laço, rotas, chaves
  de estado). Leia a linha antes de classificar.
- **Teste verde não mede impacto visual.** Mudança de glifo, token ou default de primitivo passa
  em build/lint/teste e só aparece na tela do consumidor.
