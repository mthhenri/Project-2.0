# Task 116 — verificação

Data: 2026-10-17. Frontend apenas (sem contagem de uso, que o backend não fornece).

**Análogo escolhido:** a listagem de Projetos (112) para a toolbar/busca (`/`, Esc), o popover de status (112) para o
popover de paleta, o `app-seletor-cor [compacto]` (112) para paleta + "Outra cor…", e o "Desfazer" da 99.

## O que foi feito

- **Quick-add** sempre visível: swatch da próxima cor (gira pela paleta a cada criação; clique abre a paleta) + nome +
  Enter/"Adicionar". Criação **otimista com id temporário**, reconciliada com o `TagCriadaDto`; enquanto o id é
  temporário o card fica esmaecido e com selecionar/editar/excluir/trocar cor bloqueados. Em erro do servidor o card
  some, o texto volta ao campo e o motivo aparece como hint (sem toast genérico). Duplicado detectado no cliente
  (sem acento, sem caixa) com hint inline e botão desabilitado. O foco fica no campo.
- **Grade:** pill clicável abre o dialog de edição; o **dot** é um alvo separado que abre o **popover de paleta**
  compartilhado (15 cores + "Outra cor…" com roda e hex). Amostra da paleta = PUT imediato (`{cor}`) e fecha; cor
  personalizada só é gravada ao fechar o popover; rollback se o PUT falhar. Lápis/lixeira sempre visíveis a 0,45 de
  opacidade (1 no hover/foco).
- **Busca** no header (`/` foca, Esc limpa); sem resultado oferece `Criar tag "termo"`, que joga o termo no quick-add.
- **Dialog de edição** novo (`app-tag-edicao-dialog`, só edição): prévia permanente (placeholder quando o nome está
  vazio), nome já selecionado ao abrir, paleta compacta; salvar troca a tag no signal (sem refetch). Os dialogs de
  "Nova Tag" e o botão saíram (criar é só pelo quick-add).
- **Exclusão** imediata com "Desfazer" (99) e **seleção múltipla**: caixa de seleção por card (aparece no hover/foco e em
  todos quando há seleção) + barra "N selecionadas — Excluir | Limpar seleção"; um único "Desfazer" restaura o lote.
- Utilitários puros em `modules/tag/utils/tag.util.ts`; `TagService.criar/alterar` aceitam `erroNaTela`;
  `CORES_PREDEFINIDAS` passou a ser exportada do seletor de cor.

## Verificação ao vivo (Chromium, API real, gestor; 46 tags)

- Criar 5 tags: 5 nomes + 5 Enters = 5 `POST /tag` (cores girando `#f59e0b #eab308 #84cc16 #22c55e #10b981`), 0 dialogs,
  foco continua no campo.
- Duplicado ("qa116a" com "Qa116a" existente): hint "Já existe uma tag com esse nome." e botão desabilitado.
- Trocar só a cor: dot + amostra (2 cliques) = 1 `PUT /tag/51 {"cor":"#f97316"}` e o popover fecha.
- Cor personalizada: digitar `#123abc` não envia nada; ao fechar o popover sai 1 `PUT {"cor":"#123abc"}`.
- Pill abre "Editar Tag" com o nome selecionado; digitar + Enter = `PUT {"nome":"Qa116aa","cor":…}`.
- Busca: `/` + "qa116" → 5; Esc limpa; sem resultado → "Criar tag" leva o termo ao quick-add e limpa a busca.
- Seleção: 3 tags → barra "3 selecionadas"; Excluir = 3 `DELETE`; Desfazer = 3 `PATCH …/restaurar`, lista volta a 51.
- Erro de servidor simulado (POST com 400): o card temporário some (46 → 46), o texto "CorridaTag" volta ao campo e o hint
  mostra a mensagem; nenhum toast genérico.
- 1920×1080, 1366×768 e 1080×1920: sem overflow horizontal. Capturas em `.artifacts/116-tags-quick-add/`.

## Achados da verificação (corrigidos)

- A paleta do dialog de edição quebrava com o botão "Outra cor…" no meio da segunda linha: dialog a 40 rem.
- A caixa de seleção sempre visível poluía a grade: só aparece no hover/foco ou com seleção ativa (o espaço continua
  reservado para o alinhamento).

## Decisões e desvios

- O popover e o swatch usam o mesmo `app-seletor-cor [compacto]` (consistência com Projetos); a validação de hex é a do
  componente (só aceita `#RRGGBB` válido, sem mensagem de erro própria).
- O fechamento por clique fora grava a cor personalizada pendente; Esc também (o popover dispara `onHide`).

## Impacto

- `app-seletor-cor`: só ganhou o `export` da constante (nenhum comportamento mudou; Projetos/Tags já usavam).
- `TagService`: parâmetro opcional novo. Nenhum outro consumidor das tags (seletores em Demandas) foi alterado.

## Limites / pendente

- Inserção/edição concorrentes de outro usuário só aparecem ao recarregar a página.
- O erro de duplicidade por corrida foi simulado com um 400 interceptado, não reproduzido com dois usuários reais.
- Frontend sem testes automatizados (P-001); `tag.util.ts` ficou sem teste por falta de runner.
