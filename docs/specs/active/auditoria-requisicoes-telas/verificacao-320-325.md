# Verificação ao vivo das tasks 320 a 325

Data: 2026-11-11. Tasks: 320 (Usuários), 321 (IA e check-in compartilhados), 322 (check-in agendado), 323 (seletores com lista inteira), 324 (colar Markdown), 325 (detalhe da demanda e catálogos). Origem: P-078 a P-083 (dossiê `DOSSIE.md`, R-01 a R-05, R-11 e R-12, e o relato do autor sobre o P-078).

## Ambiente

Postgres 16 local (`/usr/lib/postgresql/16`, porta 5433, sem Docker), 86 migrations, backend (`npm run backend:dev`, `CHAT_ARMAZENAMENTO=postgres`) e frontend (`npm run frontend:dev`) no checkout, Chromium + Playwright global (`require('playwright')`). Sessão plantada em `localStorage` (`access_token` e `usuario_sessao`). Cenário montado por API (`.artifacts/320-325/cenario.sh`): 108 usuários (`gestor.inicial` + 107 desenvolvedores), dois projetos, uma estrutura com uma demanda filha (membro 1), uma demanda raiz (membros 1 e 2), uma atividade e uma execução ativa com início atrasado em 5 min. Roteiros e capturas em `.artifacts/320-325/` (ignorada pelo Git). O dossiê mede "antes"; "depois" é de hoje, com a mesma contagem por ação.

## Resultado por task

| Task | Antes (dossiê) | Depois (medido) |
|---|---|---|
| 320 Usuários | 2 × `GET /usuario?pagina=1&itensPorPagina=10` ao abrir | **1** |
| 321 IA/check-in | `/ia/disponibilidade` 2 a 3 × e `/checkin/situacao` 2 × por carga | **1 e 1** por carga (`/ia/disponibilidade` volta 1 vez por minuto, o intervalo da barra, mantido de propósito) |
| 322 check-in | `/checkin/situacao` a cada 20 s, com ou sem execução (cerca de 180 por hora por aba) | sem execução: **1** em 30 s no Ponto; com execução ativa e horário em ~27 min: **1** em 70 s, sem sondagem |
| 323 seletores | seletor do Ponto cortava em 100 (108 usuários, 8 invisíveis) | `GET /usuario?ativo=true&allRows=true` traz os **108**; demandas, atividades e projetos também em `allRows` |
| 324 colar Markdown | texto literal, sem negrito nem tabela | `**Olá!** Seja bem vindo` vira **negrito**; tabela vira tabela (cabeçalho, 2 linhas, alinhamento à direita) e lista vira lista; nenhum `**` literal sobra |
| 325 detalhe agregado | abrir `/demanda` 13 requisições e cada seleção 8 | seleção de demanda **4** (`/demanda/:id/detalhe`, árvore, plano de origem, atividades); ao abrir, sem as cinco rotas avulsas |
| 325 catálogos | voltar à Árvore refazia 7 leituras e abrir a edição 6 (ambas com `/tag` e `/usuario?allRows`) | voltar à Árvore **5** e abrir a edição **4**, sem `/tag` nem `/usuario` |

## Permissão do `GET /demanda/:id/detalhe`

Mesma regra de `GET /demanda/:id`, conferida ao vivo: membro (dev.teste1) 200 nas demandas 1 e 3; desenvolvedor fora (dev.teste4) 404 nas duas, igual à rota avulsa; sem token 401; demanda inexistente 404. A service confere o acesso uma vez e só depois lê ancestrais, tags, membros e conexões (testes unitários: nada de apoio é lido sem acesso).

## Colar Markdown: formatos e temas

Colagem simulada por `ClipboardEvent` com `text/plain` no `.ProseMirror` da descrição técnica da demanda. Verificados pessoalmente (capturas): `1920×1080` claro e escuro e `720×1280` claro. Mesmo roteiro (asserções de DOM: `<strong>`, `table`, `th`, `li`) executado e igual em `1366×768` claro, `1080×1920` escuro e `960×1080` escuro. Tabela, cabeçalho e lista seguem o estilo do editor existente (a tabela do botão da barra), nos dois temas.

## Achado que só apareceu na verificação

O `checkin-proximo` (menu do perfil) vive montado desde o carregamento e reconsultava `/checkin/situacao` sempre que `/execucao/ativa` respondia, mesmo com a situação já em mãos: com execução ativa a carga ainda fazia 2 consultas. Passou a usar a mesma regra da janelinha (`situacaoDivergeDaExecucao`); teste novo falha sem a correção e passa com ela; depois da correção a carga faz 1.

## Gates

- Frontend: 222 arquivos e **2700** testes passando (Vitest); backend: 1733 unitários passando; shared: 342; integração (`npm run test:integracao`, Postgres local): 425 passando; `npm run build --workspace=backend` ok (rodada anterior, sem mudança de backend desde então).
- `npm run lint:tudo`: saída 0, sem erro.
- Testes novos: `parece-markdown`, colar no `markdown-formatado`, detalhe do backend (service e controller), `DemandaService` e `demanda-aberta` no frontend, janelinha e `checkin.util`, `checkin.page`, `checkin-proximo`, `ia-disponibilidade`, `catalogo-em-memoria` (7), `TagService` e `UsuarioService` (cache e invalidação), `allRows` nos três services e Ponto com 108 usuários.

## Limites

- Cada chamada de cada tela foi medida em `1920×1080`; os demais formatos só entram onde a tarefa muda o desenho (o editor, acima). Esta rodada não muda layout.
- O cache dos catálogos não foi exercitado ao vivo entre duas sessões diferentes (a invalidação por gravação e a validade de 60 s estão cobertas por teste); a mudança feita por outra pessoa só chega ao fim do prazo, por decisão.
- A edição da demanda continua lendo a demanda, as tags e os membros (3 requisições) e a lista de estruturais: foi mantido para conferir o registro que será gravado. Trocar essas três pelo detalhe agregado traria ancestrais e conexões sem uso; ficou fora.
- Colagem real do teclado e do menu do navegador não foi dirigida; o evento `paste` foi despachado no editor, o mesmo caminho do `handlePaste` do ProseMirror.
- Project Desktop (`desktop/`) tem a sua própria conferência da situação (15 s, ou 3 s com a janelinha aberta) e não foi tocado.
