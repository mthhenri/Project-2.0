# Task 108 — verificação

Data: 2026-10-16. Frontend apenas (endpoints existentes; só um parâmetro novo em `DemandaService.criarConexao`).

**Análogo escolhido:** o próprio dialog de detalhe anterior (shell, abas, ícones de descrição), o chip de status/popover da 106
e o `app-demanda-membro-lista`/`app-demanda-conexao-lista` que ele substitui.

## O que foi feito

- **Cabeçalho:** título no header do dialog com lápis (gestor; Enter salva, Esc cancela, valida vazio e caracteres
  proibidos); "← Voltar" restaurando a demanda anterior de um cache em memória; breadcrumb clicável; chip de
  status editável (`app-demanda-status-chip`, otimista com rollback); ícones de descrição só com ícone, ponto de
  "preenchida" e tooltip completo; "Editar tudo" (fallback para o formulário completo) e lixeira.
- **Tags** (`app-demanda-tags-cabecalho`): chips + "+ Tag" abre popover com todas as tags em toggle, gravando na
  hora (PUT `/tag`, otimista). A aba e o dialog "Editar Tags" do detalhe saíram.
- **Membros** (`app-demanda-membros-cabecalho`): pilha de avatares; `+` abre autocomplete (Enter/clique adiciona, POST
  individual, otimista); no hover, o `x` remove com toast "Desfazer"; o desenvolvedor vê "Participar"/"Sair" (sem
  confirmação). A aba "Membros" saiu e a tag "Dev" repetida também.
- **Métricas** (`app-demanda-metricas`): Estimado e Previsão com click-to-edit (Enter grava, Esc cancela; datepicker com
  "+1 sem", "+2 sem" e "Fim do mês"; "— definir" quando nula). Status e "Estrutural" saíram do grid.
- **Conexões** (`app-demanda-conexao-lista` reescrito): linha de criação inline (select com busca + "→ Depende de |
  ↔ Bidirecional" + Adicionar desabilitado sem destino); após escolher o destino o foco vai ao "Adicionar" (Enter
  confirma); o erro de ciclo do backend aparece na própria linha (sem toast); tooltip da direção; o nome navega
  dentro do dialog; lixeira com "Desfazer"; empty state com instrução.
- **Atividades:** "Nova Atividade" leva a `/atividade/nova?demandaId=` (já pré-preenchido) e "Ver todas" abre
  `/atividade?demandaId=` em outra aba, sem fechar o detalhe; empty state com CTA.
- **Exclusão:** o confirm ganhou título "Excluir demanda" e botão "Excluir"; o texto já dizia que dá para desfazer.
- O dialog guarda tags, membros, conexões e atividades no cache de navegação (estado carregado numa única
  `forkJoin`); o estado das três listas vive no dialog via `model()`.

## Verificação ao vivo (Chromium, API real; gestor e desenvolvedor)

- Título: lápis → "Fase 1 — Gemini (editada)" gravado com Enter. Status "Planejada → Concluída": 2 cliques, 1 PUT.
- Tags: "Adicionar tag" → "Backend": 2 cliques, 1 PUT `/tag`; desligar remove o chip.
- Membros: `+` → "dev289" → ↓ Enter adiciona (1 POST); `x` remove e o toast "Desfazer" devolve o membro. Remover o
  último membro é recusado pela regra do backend e o rollback devolve o avatar (visto num caso real).
- Métricas: Estimado "12h" com Enter; Previsão "+1 sem" (23/10) e "Fim do mês" (31/10); Esc cancela sem gravar e
  não fecha o dialog.
- Conexões: clique no select, digitar "Cache", Enter (escolhe) e Enter (confirma) criam a conexão. Em "Cache de
  tokens", conectar a "Fase 1" mostra "Essa conexão criaria um ciclo no grafo de demandas" na linha (0 toasts).
  Navegar pelo nome abre a demanda no mesmo dialog; "Voltar" restaura a anterior com **0 requisições**.
- "Ver todas" abriu `/atividade?demandaId=12` em nova aba com o dialog aberto; "Nova Atividade" foi a
  `/atividade/nova?demandaId=12`. Confirm de exclusão com o texto novo.
- Desenvolvedor: sem lápis, chip, `+ tag`, `+ membro`, métricas editáveis nem "Editar tudo"; abas Atividades e Conexões;
  "Sair" → "Participar" funcionam.
- 1920×1080, 1366×768 e 1080×1920: sem overflow; conteúdo do dialog sem corte. Capturas em
  `.artifacts/108-demanda-detalhe-edicao-inline/`.

## Achados na verificação (corrigidos)

- O campo de título não recebia foco (um `autofocus` num elemento criado dentro de `@if` não age): passou a ser focado
  por um setter `@ViewChild`.
- Depois de escolher o destino, o Enter caía no próprio select e não confirmava: o foco agora vai ao "Adicionar".
- Previsão vinda do backend como data/hora ISO gerava `NaN/NaN/NaN` no datepicker: a edição usa só os 10 primeiros
  caracteres (`YYYY-MM-DD`).
- O autocomplete mostrava "No results found" em inglês: mensagem em português.

## Contagem dos critérios de aceite

- Marcar Concluída: 2 cliques (era 5, com GET e spinner). Alternar uma tag: 2 cliques. Adicionar membro: clique em `+`,
  digitar e Enter (3 gestos). Conexão digitando o nome: clique, digitar, Enter (escolhe) e Enter (confirma) — 4
  teclas/cliques, uma a mais que o critério (≤3), porque o Enter do select só escolhe a opção. Voltar: 1 clique, instantâneo.

## Limites / pendente

- A listagem de conexões do backend só devolve a conexão unidirecional na demanda de **origem**: a demanda de destino
  nunca mostra "entrada" (o tooltip "X depende desta demanda" existe, mas o backend não gera esse caso). Comportamento
  anterior, não alterado.
- O cache de "← Voltar" não é invalidado por mudanças feitas por outra pessoa; `eMembro` não reavalia após
  "Participar"/"Sair" (a aba Atividades só aparece/some na próxima abertura).
- Datepicker sem opção de limpar a previsão (o DTO de alteração não aceita `null`).
- Teclado/leitor de tela no popover de tags e no avatar-remover só foram verificados com mouse e Tab básico.
- Frontend sem testes automatizados (P-001).
