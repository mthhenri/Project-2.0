# 204-configuracao-ia-redesenho-da-tela.spec.md

> Origem: pedido do autor em 2026-10-20, depois da 203 (provedores e fallback). A tela de Configurações da IA ficou longa e misturada: a aba "Provedor e modelos" também carrega check-in,
> chat e o liga/desliga da IA, o histórico divide a largura, e a cor das prioridades de atividade mora numa aba da IA. Quase só frontend: a única mudança de contrato é informar quais provedores têm chave de API configurada (decisão 6); nenhuma regra de negócio nem migration muda.
> Decisões combinadas com o autor em conversa, com mockups descartáveis.

## Objetivo

Reorganizar a tela para que cada coisa fique onde o autor a procuraria, e deixar a escolha de provedor e modelos visual e curta (sem rolar a página).

## Decisões (confirmadas pelo autor)

1. **Fora das abas, sempre visíveis**
   - O título e o **liga/desliga da IA** (hoje a faixa "Ligar a IA" no fim da aba Provedor), com o estado ("IA ligada" / "IA desligada") ao lado.
   - O **histórico de versões** numa coluna fixa à direita (opção A do mockup), independente da aba ativa.
   - A barra de salvar ("Descartar alterações", "Salvar nova versão") embaixo, também independente da aba.
2. **Abas**: `Provedor e modelos`, `Comportamento`, `Prompts`, `Custos`. A aba `Prioridades` sai da tela.
3. **Aba "Provedor e modelos"** guarda só provedor e modelos:
   - Uma fileira de três cartões: **padrão**, **1º fallback** e **2º fallback**. Cada cartão mostra o provedor e se a chave de API dele está configurada; o cartão vazio oferece "+ adicionar".
   - Clicar num cartão mostra abaixo os **três modelos desse provedor** (rápido, padrão, analítico). Só um provedor por vez (opção 2 do mockup). O cartão selecionado fica destacado.
   - O **esforço do nível analítico** fica nesta aba, como botões de escolha (baixo/médio/alto), não select.
   - As regras da 203 continuam: o modelo pertence ao provedor, a cadeia não repete provedor e cada provedor da cadeia tem o trio completo (`validarProvedoresDaConfiguracaoIa`, no `shared`). O erro de validação aparece no cartão do provedor com problema.
4. **Aba "Comportamento"** (o nome é uma sugestão minha; o autor concordou com separar, não opinou sobre o nome) recebe, sem mudar regra nem campo: o que hoje é "Check-in e rigor" (check-in mínimo e máximo, duração recomendada, interruptores de rigor) e "Chat" (interruptor das dúvidas de código, contexto do chat).
5. **Cor das prioridades** sai da IA e vai para a **tela de Atividades**: um botão (por exemplo "Alterar prioridades") que abre um **dialog** com as cores, o selo ao vivo e o salvar por prioridade, como na aba de hoje. O botão só aparece para administrador (o backend já recusa os outros: `atividade-prioridade.service.ts`). O componente de hoje (`PrioridadesAbaComponent`) é movido e adaptado a dialog, não reescrito.

6. **Chave configurada no cartão (decidido pelo autor):** cada cartão de provedor mostra "chave configurada" ou "sem chave". Para isso o **estado da IA do administrador** (`GET /ia/estado`, que a tela já lê; a `disponibilidade` aberta a todos continua só com o estado)
   passa a informar **quais provedores têm chave de API no ambiente**, a partir de `estaDisponivel()` dos provedores. Devolve só a lista de provedores, nunca a chave nem parte dela. DTO novo `IaEstadoCompletoRecuperadoDto` em `shared`, preenchido pela `IaService`; teste unitário da service e do DTO. Nenhuma migration.

7. **Regra do sistema inteiro: nunca `title` do HTML, sempre o tooltip do PrimeNG (`pTooltip`).** Pedido do autor junto desta tela, por feição: o `title` nativo é feio e sem seta.
   - Registrar a regra em `docs/CONVENTIONS.md` (e conferir o espelho em `AGENTS.md`/`CLAUDE.md` se a regra for citada lá), com a alternativa: `pTooltip` com `tooltipPosition`.
   - Corrigir as ocorrências atuais, que a busca no frontend mostrou serem duas: o `[title]` do nome da atividade em `ponto-usuario-card.component.html` e os `<title>` SVG do `grafico-barras`
     (por categoria e por barra).
   - **Gráfico de barras** (componente compartilhado, usado em Custos e duas vezes em `projeto-volume`): o `<title>` nativo dá lugar a um tooltip PrimeNG com seta que aponta para a barra e
     traz o que a barra já descreve (por exemplo data, modelo e gasto). Aplicar a skill `gerenciamento-de-impacto`: os três consumidores são verificados, não só Custos. O `aria-label`/descrição
     para leitor de tela continua existindo (o tooltip não o substitui).
   - Se algum teste existente conferir o `title`/`<title>`, é atualizado junto.

## Fora de escopo

- Qualquer mudança em backend, `shared`, DTO, endpoint ou schema além da decisão 6. O contrato de `ConfiguracaoIaCriarDto` e a versão da configuração continuam os mesmos; só a apresentação muda.
- Mudar o conteúdo das abas Prompts e Custos.
- Reordenar a cadeia por arrastar e soltar (a ordem é padrão → 1º → 2º, pelos cartões).
- Nenhuma biblioteca interna de componentes (`IDEAS.md` I-001): usar PrimeNG + Tailwind como a tela de hoje.

## Pontos para o construtor

- **Análogo visual** (CLAUDE.md, "UI e estilo"): a própria tela de hoje (shell, densidade, cartões com borda, tokens `--app-surface-*`, tema claro e escuro) e a aba Custos para os estados vazio/carregando/erro. Registrar o análogo no fecho.
- A `configuracao-ia.page` é grande; extrair as partes novas em componentes (barra de topo com liga/desliga, aba de provedor, aba de comportamento, coluna de histórico) em vez de acrescentar responsabilidade à página.
- O liga/desliga e o salvar hoje fazem parte do mesmo formulário; mantenha um único estado de alterações pendentes para o botão "Salvar nova versão" valer para qualquer aba.
- Responsividade: verificar `1920×1080`, `1366×768` e `1080×1920`; mobile não é verificado. A coluna de histórico não pode espremer as abas em `1366×768`.
- Atualizar os testes de componente da página e mover/adaptar os da aba de prioridades; testes de lógica que não mudam continuam valendo.

## Chamadas minhas (a revisão da spec levantou; o autor pode trocar)

- **Atividades:** o botão fica no cabeçalho de `atividade-listagem.page` (ao lado do título e do botão de nova atividade); a checagem de administrador usa o `UsuarioSessaoService`, como as outras telas de `modules/atividade`; o dialog reaproveita o sinal de prioridades do `AtividadePrioridadeService`, que a listagem já usa para os selos.
- **Barra de salvar:** aparece nas abas Provedor e modelos e Comportamento (que são a mesma configuração versionada). Em Prompts e Custos ela some, **a menos que haja alteração pendente na configuração** (o liga/desliga do cabeçalho mexe nela de qualquer aba): Prompts tem versionamento e salvar próprios, e salvar um prompt nunca grava a configuração pendente.
- **Cadeia:** contígua. Remover o 1º fallback faz o 2º subir; o cartão padrão só pode ser trocado, não removido. Trocar o provedor de um cartão reaproveita o trio já guardado daquele provedor (regra da 203).
- **Modelos:** continuam texto livre com sugestões (`datalist`, até 100 caracteres); não vira select, para não perder ids de modelo personalizados.
- **Erro em outra aba:** a aba com campo inválido ganha um indicador; ao clicar em "Salvar nova versão" com erro, a tela vai para a primeira aba com erro.
- **Sem rolagem em 1366×768:** vale para a área de conteúdo da aba; a barra de salvar é fixa na base e o cabeçalho com o liga/desliga fica fora dessa conta.
- **Histórico:** o detalhe de uma versão continua expandindo na coluna, que rola por dentro quando passa da altura.

## Critérios de Aceite

- [x] O estado da IA do administrador informa os provedores com chave (nunca a chave); o cartão mostra "chave configurada" ou "sem chave" conforme isso.
- [x] Nenhum `title` HTML nem `<title>` SVG de tooltip resta no frontend (`grep`); o gráfico de barras mostra tooltip PrimeNG com seta em Custos e nos dois usos de `projeto-volume`; regra registrada em `docs/CONVENTIONS.md`.
- [x] Liga/desliga da IA e histórico visíveis em qualquer aba; salvar uma versão funciona a partir de qualquer aba.
- [x] A aba Provedor e modelos cabe sem rolagem em `1366×768` com cadeia de até 3 provedores.
- [x] Trocar o provedor de um cartão, adicionar/remover fallback e editar modelos preserva as regras da 203 (validação, trio por provedor, sem repetição).
- [x] Check-in e chat estão na aba Comportamento, com os mesmos campos e regras de antes.
- [x] A tela de Atividades abre o dialog de cores das prioridades para administrador, salva uma cor e o selo muda; para não administrador o botão não aparece.
- [x] A aba Prioridades não existe mais nas Configurações da IA.
- [x] Testes de componente e de lógica do frontend verdes; build do frontend; tela verificada ao vivo nos três viewports nos estados vazio, carregando, cheio e erro, em tema claro e escuro.
- [x] `npm run repo:verificar`; contexto (`docs/context/`) atualizado no fecho.

## Fecho (2026-10-21)

- Verificação ao vivo, achados e limites: `204-configuracao-ia-redesenho-da-tela/verificacao.md`.
- O DTO novo (`IaEstadoCompletoRecuperadoDto`) é só uma interface; a decisão 6 foi coberta pelo teste da `IaService` (e dos componentes), sem teste de DTO.
- O cabeçalho com o liga/desliga ficou na página (não virou componente): são ~30 linhas de template ligadas ao mesmo formulário e ao estado de salvando, sem lógica própria; a página perdeu o formulário
  das abas e o histórico, que viraram componentes.
- Mudança de comportamento aceita no gráfico de barras: o tooltip da categoria inteira (total do dia) agora aparece no rótulo do eixo, não na coluna toda; cada barra tem o seu.
- Revisão independente (subagente `revisor`): 7 achados, todos tratados — erro de modelo marca o cartão e abre o primeiro com erro, regra do `CONVENTIONS.md` corrigida (SVG não leva `pTooltip` direto),
  `ariaLabel` nos selects, cartão clicável por inteiro, área do tooltip sem mínimo no empilhado, liga/desliga bloqueado enquanto salva e código morto (`opcoesDeFallback`) removido.
