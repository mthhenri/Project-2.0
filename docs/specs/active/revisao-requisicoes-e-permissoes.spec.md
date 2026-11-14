# revisao-requisicoes-e-permissoes.spec.md

> Task solta de auditoria, pedida pelo autor em 2026-11-13. Refaz, do zero e tela a tela, a auditoria de
> requisições de 2026-11-05/11 (`../backlog/auditoria-requisicoes-telas.spec.md`, usada só como referência) e
> acrescenta a conferência das permissões por tipo de usuário. Não altera código: entrega o dossiê e as specs
> de correção.

## Objetivo

Avaliar tudo que faz requisição no `frontend/` e no `desktop/`, tela a tela, para apontar o que é inútil e o que
pode ficar mais eficiente, e conferir rota a rota o que cada tipo de usuário (administrador, gestor, auxiliar e
desenvolvedor) consegue ler e alterar. Cada ponto confirmado vira uma spec de correção no backlog.

## Entregáveis

1. **Dossiê** em `revisao-requisicoes-e-permissoes/DOSSIE.md`: como foi medido, resumo, matriz de requisições por
   tela e por fluxo, matriz de permissões por rota e por tipo de usuário, achados numerados (`A-NNN`) com
   severidade, evidência no código (`arquivo:linha`), o que foi observado na aplicação rodando e o que é só
   leitura de código, e o destino de cada achado da auditoria anterior (`R-01` a `R-16`).
2. **Anexos** na mesma pasta: `MAPAS-DE-REQUISICOES.md` (os mapas por tela e as tabelas das varreduras
   transversais) e `MATRIZES-DE-PERMISSAO.md` (rota × tipo de usuário, por módulo do backend).
3. **Specs de correção** em `docs/specs/backlog/`: a guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md` e uma
   spec numerada por ponto, a partir da 329. Achados com a mesma causa no mesmo arquivo dividem uma spec. Correção
   que muda contrato (DTO, rota, enum, modelagem) traz o antes → depois e as opções, marcada como **decisão do
   autor pendente**.
4. **Contexto**: `PROBLEMS.md` com os defeitos confirmados que ainda não estavam lá, `CONTEXT.md` e `HISTORY.md`
   atualizados, e os ponteiros para a auditoria antiga corrigidos (ela foi para `backlog/` por decisão do autor).
5. **Evidências locais** em `.artifacts/revisao-requisicoes-e-permissoes/` (ignorada pelo Git): cenário, roteiros de
   medição, tráfego por perfil e varreduras de permissão. Sem token nem senha no que é versionado.

## Critérios de Aceite

- Toda rota do frontend (`app.routes.ts` e os `*.routes.ts`), a casca (layout, topbar, sidebar, check-in, popup do
  chat, stream de eventos) e o `desktop/src` aparecem na matriz de requisições, com o que pedem ao abrir e nas
  interações que disparam requisição.
- Toda rota mapeada pelo backend (202 em 2026-11-13, pelo log de subida) aparece na matriz de permissões.
- Cada achado tem evidência `arquivo:linha` conferida por uma segunda leitura independente; os de severidade alta
  e média foram conferidos pelo agente principal, na aplicação rodando quando o fluxo é reproduzível no ambiente.
- Cada achado confirmado aponta para a spec que o corrige, ou diz por que não virou spec.
- `npm run repo:verificar` sem erro.
- Cobertura incompleta (fluxo que o ambiente impediu) fica listada no dossiê e mantém a spec em `active/`.

## Fora de Escopo

Corrigir código, alterar modelagem, criar migration, mudar a ordem de `PRIORITIES.md` (é do autor) e gate visual
(a auditoria é de tráfego e permissão, medida em `1920×1080`). Desempenho de SQL e tempo de resposta sob carga
não são medidos; consulta cara achada de passagem é registrada.

## Dependências

`docs/SYSTEM.SPEC.md` §11, §12 e §14 (fonte das regras de permissão; em conflito, o documento vence o código),
`shared/src/utils/permissao-usuario.ts`, `docs/CONVENTIONS.md`, a decisão viva "menos requisições nas telas"
(`docs/context/CONTEXT.md`, tasks 320–325) e a skill `verify`. Aplicação e banco locais executáveis.

## Riscos e Mitigação

- **Achado plausível e errado virar spec.** Cada achado passa por um verificador independente instruído a refutar;
  o que ele não confirma não vira spec, e o que depende de medição é medido na aplicação rodando.
- **Specs demais para pontos pequenos.** O autor pediu uma spec por achado; só se juntam os de mesma causa no mesmo
  arquivo. Achado informativo sem correção clara fica no dossiê, com o motivo.
- **Decidir modelagem sem o autor.** Nenhuma spec escolhe DTO, rota ou coluna nova: apresenta as opções.
