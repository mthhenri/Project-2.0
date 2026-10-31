# 290-ajustes-na-tela-de-projetos.spec.md

> Task solta. Origem: `IDEAS.md` I-042, detalhada pelo autor em 2026-10-31 (a ideia sai de `IDEAS.md` ao fechar esta task).

## Objetivo

Três ajustes no detalhe do projeto: um botão **Cancelar** visível na edição do cabeçalho, o **seletor de cor** deixando de quebrar o visual do cabeçalho, e o **volume** do projeto visível de dentro dele, já na visão anual.

## Entregáveis

1. **Cancelar visível** (`app-projeto-campo-editavel`, usado no nome, nas datas e na cor). Enquanto o campo está em edição, um botão "Cancelar" (texto, secundário) fica ao lado dele e descarta o rascunho, como o `Esc`. O botão não rouba o foco do campo (senão a saída do campo abriria a pergunta antes do clique). Some quando a pergunta "Salvar alteração? Sim / Não" já está na tela.
2. **Seletor de cor no padrão da tela.** Hoje a edição da cor mostra 15 amostras e "Outra cor…" em linha no cabeçalho, que quebra o layout. A cor passa a abrir um **popover ancorado no selo** (o mesmo arranjo da paleta de Tags): a paleta compacta dentro do popover e, no rodapé, "Cancelar" e "Salvar" (este só habilita depois de escolher outra cor). Fechar o popover (clicar fora, `Esc`) descarta. O texto e as datas seguem editando no lugar. `app-seletor-cor` não muda (também é usado em Tags e no formulário do projeto).
3. **Volume dentro do projeto.** O detalhe do projeto (só gestor, como o volume em Projetos) ganha uma seção "Volume" recolhível, aberta por padrão, com o gráfico do projeto. Reusa `app-projeto-volume`, que ganha a entrada opcional `projetoId`: filtra o resultado para esse projeto, **começa na visão anual** (Mensal continua disponível) e não mostra o link do nome para o próprio projeto. Na tela de Projetos nada muda (mensal por padrão, todos os projetos). A seção lembra se foi recolhida, por navegador.
4. **Testes** de componente: Cancelar na edição de texto e de data (não emite, fecha, não pergunta); a cor pelo popover (Salvar emite o hex, Cancelar e fechar não emitem); `ProjetoVolumeComponent` com `projetoId` (só o projeto, anual por padrão, sem link) e sem ele (igual a antes); o detalhe do projeto mostra o volume só ao gestor.
5. **Fecho:** `HISTORY.md`, `CONTEXT.md` (seção do detalhe do projeto), `IDEAS.md` (retirar I-042), `PRIORITIES.md` (sair do "Agora").

## Critérios de Aceite

- `npm run test --workspace=frontend`, `npm run build --workspace=frontend` e `npm run repo:verificar` ok (declarar a ausência de lint, P-001).
- **Verificação ao vivo** (skill `verify`) em `1920×1080`, `1366×768` e `1080×1920` quando a pane alcançar (senão, o limite entra no relatório), claro e escuro: editar nome, data e cor e cancelar pelo botão; o popover da cor sem empurrar o cabeçalho; o volume anual do projeto aberto por padrão, mudar para Mensal e navegar o ano; recolher e reabrir a seção; desenvolvedor não vê o volume. Análogos: a paleta de Tags (popover) e a tela de Projetos (volume).

## Fora de Escopo

- Mudar o `app-seletor-cor` em si, o dialog "Novo Projeto" ou o formulário de criação.
- Endpoint novo de volume por projeto: o front filtra o resultado dos endpoints existentes (que devolvem todos os projetos).
- Tornar o volume visível ao desenvolvedor (hoje só gestor).
- A barra de volume, a configuração de vigências (`Configurar volume`) e a visão de Projetos.

## Dependências

- Nenhuma spec pendente. Fontes: tasks 197, 199 e 251 (volume), 271 (edição no cabeçalho do projeto) e 112 (seletor de cor compacto).

## Riscos e Mitigação

- **Baixa performance do filtro no cliente:** o `GET /projeto/volume/anual` traz todos os projetos; é aceitável para o porte atual, e vira um filtro `projetoId` no backend se pesar.
- **Popover e foco:** o campo de data usa overlay no body e o de texto sai ao perder o foco; o botão Cancelar usa `mousedown` sem tirar o foco. Conferir ao vivo.
