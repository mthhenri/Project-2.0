# Task 110 — verificação

Data: 2026-10-17. Frontend apenas (contratos mantidos: listagem por dia único, edição só para gestor).

**Análogo escolhido:** o Ponto mensal (100) para a navegação por dia (◀ data ▶, "Hoje", atalhos ←/→) e o guarda de
atalhos (`focoEmCampo`/`haSobreposicaoAberta`); a listagem de Usuários (113) para busca no select, chip de filtro e
estado vazio; o padrão de dialogs da 97 (`dialogFormulario`).

## O que foi feito

- **Contexto no header:** subtítulo `Sexta-feira, 16 de outubro · 7 execuções · 10h43` (singular/plural, "Nenhuma
  execução" no dia vazio, ano só quando não é o corrente) e botão **Relatório** (gestor), que abre o dialog da 111.
- **Linha ativa:** execução sem `fimData` fica fixada no topo da página, com fundo primário sutil, "● Em andamento" e a
  duração ao vivo (`app-execucao-timer` compacto). Colunas Início/Fim só com `HH:mm`; a data pequena aparece só quando o
  horário cai fora do dia listado (virada da meia-noite).
- **Descrição:** `line-clamp` de 2 linhas + tooltip; para o gestor a célula é um botão que abre a edição (o lápis
  continua). A edição passou para `dialogFormulario` (Enter/Ctrl+Enter salvam, dica de atalhos) e a regra "fim > início"
  virou mensagem **inline** sob o campo com Salvar desabilitado — o toast pós-submit saiu.
- **Toolbar e URL:** o estado vive em `?data=&usuario=` (a URL é a fonte; cada mudança recarrega, `replaceUrl`). Select de
  usuário com busca + chip **Minhas**; ◀ data ▶ agrupados, **Hoje** só aparece fora de hoje; o refresh virou botão de
  texto discreto. Atalhos ←/→/Home com os guardas de foco e de sobreposição; → bloqueado em hoje.
- **Vazio:** "Nenhuma execução em 09/10/2026" + "Ver dia anterior", "Voltar para hoje" (fora de hoje) e "Limpar filtro
  de usuário" (quando há usuário filtrado); o rodapé "Total do dia" some quando não há registros. Paginador só com mais de
  uma página (>50).
- `utils/execucao.util.ts` (datas/resumo puros).

## Verificação ao vivo (Chromium, API real, gestor, TZ America/Sao_Paulo)

- Hoje: subtítulo correto; 1ª linha com a classe de ativa; cronômetro 07:03:41 → 07:03:42; "Hoje" ausente; sem paginador.
- ← vai a `?data=2026-10-15` (2 execuções · 5h30, "Hoje" aparece); 7×← chega a `?data=2026-10-09`; F5 mantém dia e
  subtítulo; Home volta a hoje (URL limpa); → em hoje não faz nada.
- Plantão 15/10 23:00 → 16/10 01:00: Fim mostra `16/10` pequeno acima de `01:00`.
- Select: campo de busca presente; filtrar "gestor" → `?usuario=1`; Minhas liga e desliga o mesmo parâmetro.
- Edição: clicar na descrição abre o dialog com o foco na descrição; fim 08:00 < início 12:00 → "O fim precisa ser depois do
  início." e Salvar desabilitado; texto novo + Ctrl+Enter = 1 `PUT /execucao/9` e a linha atualiza sem refetch.
- 1920×1080, 1366×768 e 1080×1920: sem overflow horizontal (hoje, dia com dados, dia vazio). Capturas em
  `.artifacts/110-execucoes-contexto-navegacao/`.

## Achados da verificação (corrigidos)

- O chip "Minhas" `small` ficava desalinhado do select; passou ao tamanho normal.
- O rodapé "Total do dia 0h 0min" aparecia no estado vazio; agora só com registros.
- `aria-pressed` num `p-button` ficava no host e não no `<button>`: o estado do chip vai no `ariaLabel`.

## Decisões e desvios

- O carregamento inicial vem da URL; o `onLazyLoad` da tabela só age em mudança real de página/tamanho (evita requisição
  dupla na abertura).
- A fixação da linha ativa vale dentro da página corrente (a ordem global é a do servidor).
- "Total do dia" e o subtítulo usam o `totalMinutosDia` do servidor (inclui a execução em andamento como ele já fazia).

## Impacto

- `ExecucaoTimerComponent`, `atalhos.ts`, `dialogFormulario`: só consumidos. Nenhum serviço/DTO mudou.

## Limites / pendente

- Visão do desenvolvedor (sem filtro de usuário, sem "Minhas", descrição sem botão) não foi percorrida ao vivo — não há
  credencial de desenvolvedor no ambiente local; o código é o mesmo ramo `@if (sessao.eGestor())` já usado nas outras telas.
- Frontend sem testes automatizados (P-001); `execucao.util.ts` ficou sem teste por falta de runner.
