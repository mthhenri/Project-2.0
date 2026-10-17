# Task 111 — verificação

Data: 2026-10-17. Frontend apenas (contratos mantidos: `projetoId` obrigatório, períodos ANUAL/MENSAL/CUSTOM, CSV).

**Análogo escolhido:** o popover/seleção de período do Ponto (100) e a barra de recarga da 98 (`app-barra-recarga` +
conteúdo esmaecido) para o refetch; `p-selectbutton` para os atalhos de período.

## O que foi feito

- **Projeto primeiro:** select com busca (`nome`/`codigo`). Aberto de Execuções vem com o último projeto escolhido
  (`localStorage` `relatorio.projeto`) ou vazio ("Escolha um projeto para ver o relatório"); aberto do detalhe do projeto
  (`abrir(id)`) vem fixo e desabilitado.
- **Atalhos de período** em `p-selectbutton`: Este mês (padrão) · Mês passado · Este ano · Personalizado…; Mês/Ano ficam
  ao lado como ajuste fino (a seleção sai de "atalho" quando é, p.ex., março de 2024). Personalizado troca os selects pelo
  range e mostra a dica enquanto o intervalo está incompleto. Regras puras em `utils/relatorio.util.ts`.
- **Auto-preview:** abre já carregando; cada mudança de filtro recarrega (debounce de 400 ms, `switchMap` descarta o
  pedido anterior). O resultado antigo fica a 50% de opacidade com a barra de progresso; o botão "Pré-visualizar" saiu.
  Totais em tiles (execuções, tempo total).
- **Nunca dados obsoletos como atuais:** `sincronizado` fica `false` entre a mudança e a chegada do resultado — CSV e IA
  desabilitam — e os dois usam os **parâmetros do relatório exibido**, não os do formulário. Sem execuções no período,
  CSV/IA ficam desabilitados.
- **Revisar com IA** habilitado: resumo + contadores `N ALTA · N MÉDIA · N BAIXA` + cards ordenados ALTA→MÉDIA→BAIXA;
  some ao mudar qualquer filtro. "Fechar" do rodapé removido (X/Esc). Rodapé: Revisar com IA (secundário) e **Baixar CSV**
  (primário).
- `abrir()` do dialog passou a aceitar `projetoId` opcional; o botão do detalhe do projeto segue como estava.

## Verificação ao vivo (Chromium, API real, gestor)

- Abrir sem projeto lembrado: estado "Escolha um projeto", 0 requisições, CSV/IA desabilitados. Filtrar "106" no select
  deixa 1 opção; escolher dispara 1 `GET /relatorio/execucao?projetoId=8&periodoTipo=MENSAL&ano=2026&mes=10`.
- "Mês passado" = 1 clique → 1 GET com `mes=9`; logo após o clique o resultado já está esmaecido e o CSV desabilitado.
  "Este ano" = 1 GET `ANUAL`. "Personalizado…" sem intervalo: 0 requisições e dica visível.
- CSV baixa `relatorio-execucoes_P106_2026-10-01_2026-10-31.csv` (período exibido).
- IA: sem chave no ambiente, `POST …/revisar` devolve o aviso "Recurso de IA não está configurado" (toast do interceptor,
  sem erro não tratado). Com a resposta simulada (3 achados fora de ordem) a tela mostra `1 ALTA · 1 MÉDIA · 1 BAIXA` e
  os cards ALTA, MÉDIA, BAIXA; trocar o período remove a revisão.
- Aberto do detalhe do projeto: select desabilitado com o projeto fixo, preview automático e CSV habilitado.
- Período sem execuções: "Nenhuma execução encontrada no período." e CSV desabilitado. Reabrir lembra o projeto. Esc fecha.
- 1920×1080, 1366×768 e 1080×1920: sem overflow horizontal. Capturas em `.artifacts/111-relatorio-auto-preview-ia/`.

## Achados da verificação (corrigidos)

- Erro de rede/IA gerava `HttpErrorResponse` não tratado no console; os `subscribe` de CSV e IA ganharam handler (o
  interceptor já mostra o motivo).
- "1 execuções" no tile: singular quando há uma.

## Decisões e desvios

- A spec fala em "chips"; usei `p-selectbutton` (estado ativo acessível, sem repetir o problema do `aria-pressed` no
  host do `p-button`).
- A revisão por IA não foi exercitada contra o provedor real (sem chave); o contrato do DTO foi usado como está.

## Impacto

- `RelatorioExecucaoDialogComponent` é usado no detalhe do projeto (`abrir(id)`, agora com o projeto fixo e o mesmo auto-
  preview) e na tela de Execuções (`abrir()`); `RelatorioService` não mudou.

## Limites / pendente

- Revisão por IA contra o Anthropic real não verificada (sem credencial).
- Frontend sem testes automatizados (P-001); `relatorio.util.ts` sem teste por falta de runner.
