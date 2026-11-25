# Verificação — task 496 (2026-11-25)

Ambiente: container de nuvem, PostgreSQL 16 local (`CHAT_ARMAZENAMENTO=postgres`), sem chave da IA, backend e
frontend pelos scripts do projeto (`npm run backend:dev`, `npm run frontend:dev`, com o proxy). Cenário: `db:seed-dev`
(projeto DEMO, `dev.teste`), uma conversa de 10 mensagens (Markdown, tabela, código) plantada para `dev.teste` e
para `gestor.inicial`, e uma **execução rodando** de `dev.teste` (para a demanda abrir sozinha e o chip aparecer na
barra). Sessão plantada como o login grava: `access_token` **e** `usuario_sessao`. Capturas e scripts em
`.artifacts/496-chatia-mais-visao/` (fora do Git).

## Gates

| Comando | Resultado |
|---|---|
| `npm run test --workspace=frontend` | 244 arquivos, **3001 testes passando** |
| `npm run build --workspace=frontend` | ok (o `chat.page.scss` caiu de 9,15 kB, que reprovava no limite de 8 kB, para 7,57 kB depois da extração; os avisos de orçamento são os de sempre) |
| `npm run lint:tudo` | zero erros |
| `npm run repo:test` | 50 passando, 1 pulado, 0 falha |

Testes novos: na `chat.page.spec.ts`, recolher e reabrir com o número no trilho e a persistência; abrir já recolhida;
recolher a demanda aberta (a tela deixa de ser dividida); recolhida com execução rodando (a demanda abre recolhida e o
trilho mantém o número); sem trilho no Planejamento; registro e retirada do seletor na barra. Na
`topbar.component.spec.ts`, a barra desenha o conteúdo registrado e o tira. Os testes que procuravam a chave de modo
pelo texto passaram a procurá-la pelo `aria-label` (a chave agora é só ícone).

## Ao vivo

Matriz `dev.teste` × lateral aberta/recolhida × claro/escuro × `1920×1080`, `1366×768`, `1080×1920`, `720×1280` e
`960×1080` (20 capturas), medindo no navegador: o campo de digitar à vista, a página sem rolar, sem sobreposição entre
o seletor, o chip e o relógio, e o chat com colegas, o pad e o perfil presentes na barra. **Todas as 20 passaram.**

| Formato | Altura útil das mensagens antes | Depois (lateral aberta / recolhida) |
|---|---|---|
| 1920×1080 | 712px | 829px / 829px, com a coluna de 60rem |
| 1366×768 | 400px | 517px / 517px |
| 960×1080 | página rolando, campo fora da tela | 301px (demanda aberta embaixo) / 784px |
| 720×1280 | página rolando, campo fora da tela | 391px / 984px |
| 1080×1920 | conversa e lateral empilhadas, a página rolava | 679px / 1624px |

Estados (claro e escuro, 1366×768 e 720×1280): modo Planejamento sem plano (o seletor abre sozinho, ancorado na
barra); conversa vazia (sugestões centralizadas, com o aviãozinho); erro ao carregar a conversa; gestor com a lista
vazia; e `/ponto`, onde a barra fica como antes, sem o conteúdo da página. Fade das sugestões em 720×1280: no começo só
à direita, no meio dos dois lados, no fim só à esquerda; em 1920 a faixa não rola e as bordas do fade ficam em `0px`.

## Achados e limites

- Na primeira rodada as capturas mostravam a barra **sem** o chat com colegas, o pad e o perfil: o script plantava só
  `access_token`, e esses botões dependem de `usuario_sessao`. Não era regressão; o cenário foi corrigido e a matriz
  refeita.
- Com a conversa falhando ao carregar, o título do seletor fica "Carregando…": já era assim (o rótulo depende do dia da
  conversa carregada); registrado como P-106, fora do escopo.
- Sem chave da IA, as sugestões vistas são as fixas; as da IA usam o mesmo componente.
- A animação ligada à rolagem (`animation-timeline`) existe no Chromium (navegador e Project Desktop); onde não existir,
  a faixa fica sem fade, sem outro efeito.
