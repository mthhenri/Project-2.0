# Verificação — 288 Atividades com a demanda ao lado

Feita em 2026-10-31 no stack de desenvolvimento (backend `:3000`, front `:4200`, base de desenvolvimento), com o gestor.

## Gates automáticos

- Frontend (Vitest): **2370 testes em 190 arquivos** (antes: 2353 em 187). Entraram: a página (nova seção "demanda ao lado da lista", no lugar dos testes do dialog de descrição), o painel da demanda, o ícone de status e o mapa de status do modelo.
- `npm run build --workspace=frontend` ok. O `atividade-listagem.page.scss` chegou a 7,95 kB, **perto do teto de erro de 8 kB** (o aviso de 4 kB já existia): o posicionamento do painel foi para o SCSS do próprio painel e a bolinha de prioridade virou o componente `app-atividade-prioridade-bolinha` para caber.
- `npm run repo:verificar` ok. Backend, shared e desktop não mudaram. Sem lint (`PROBLEMS.md` P-001).

## O que foi entregue

- Clicar num dos três ícones da linha divide a tela (lista encolhida, 31rem, com a largura animada; demanda ao lado). Clicar no ícone já aberto fecha; outra aba troca o texto; outra linha troca a demanda; clicar no nome de outra linha também. Esc e Fechar fecham.
- Lista encolhida: somem Usuário, Prioridade (coluna), Tempo e Tags; bolinha de prioridade antes do nome, ícone de status em quadradinho, Ações no fim; paginação compacta.
- Bolinha e ícone de status abrem os popovers de sempre, com as mesmas permissões; sem permissão viram só desenho com tooltip.
- Painel: trilha, nome, status da demanda (bolinha), horas, abas Cliente/Técnica/Documentação, texto; "Editar" abre o editor da 278 no próprio painel; trocar de aba, de linha ou fechar com texto novo pergunta Salvar/Descartar.
- Cores das descrições: técnica = tema; cliente e documentação = matiz do tema ±30° (`--app-giro-descricoes: 30`).
- O dialog "descrição da demanda" saiu de `atividade-listagem.page`.

## Ao vivo

Navegador embutido, gestor. Tamanhos reais conseguidos: **1024×768** (tema claro e escuro) e **1080×1920** (claro). Visto: abrir e fechar pelo ícone; aba Cliente e Técnica; trocar a prioridade pela bolinha (Alta → Baixa → Alta; a bolinha mudou de cor e o `PUT` voltou 200); abrir o seletor de status pelo ícone (as quatro opções com o selo de sempre); "Editar" abrindo o editor da 278 dentro do painel; tema escuro com as três cores separadas.

Cores em outros temas: não há como trocar o tema pela interface sem o recurso de cor personalizada, então troquei `--p-primary-400/600` pelo console (verde, laranja e cinza) e li a cor calculada dos três ícones: verde dá teal / verde / lima; laranja dá amarelo / laranja / vermelho; cinza dá dourado / cinza / rosa (o `max(s, 55)` funciona). Só números, sem captura.

## Achado só na verificação

- Na primeira troca de prioridade de volta para Alta, o `PUT` devolveu **500** e, no mesmo instante, `GET /checkin/situacao` também (outro endpoint, não tocado). A bolinha voltou ao valor anterior (o rollback otimista funcionou) e a segunda tentativa deu 200. Foi uma falha transitória do backend de desenvolvimento, não reproduzida; não investigada.
- A tabela do PrimeNG não é um grid: as colunas somem de uma vez (`@if (!dividido())`), só a largura da lista anima. O prometido na spec como risco.
- As abas do painel com o nome completo não cabiam em 1024 px: ficaram com nome curto (Cliente, Técnica, Documentação), com o nome completo no `aria-label`.

## Limites (não verificado)

- **1366×768 e 1920×1080** não foram visitados (a pane não alcança); o tema escuro só em 1024×768.
- Não visto na tela: desenvolvedor (permissões de bolinha/ícone só por teste), lista vazia e erro com a demanda aberta, salvar o texto pelo editor no painel (só por teste), o aviso de texto não salvo (só por teste), a pilha em largura curta (<980 px).
- Conferência dos outros consumidores das cores (`demanda-aberta`, `demanda-arvore-item`, `demanda-pasta-linha`, menu de contexto): o token é o mesmo e a leitura é por `var()`, mas só a listagem de Atividades foi vista. Com o tema azul, o cliente passa de azul para índigo e a documentação de ciano-azulado para ciano em todas essas telas.
- O `demanda-arvore-painel` escondido segue com o próprio modal de descrição (fora de escopo, ver `reduzir-dialogs/verificacao.md`).
- O Project Desktop usa Electron 39 (Chromium recente), que suporta a cor relativa `hsl(from …)` (Chrome 119 em diante); não abri o desktop para ver.
