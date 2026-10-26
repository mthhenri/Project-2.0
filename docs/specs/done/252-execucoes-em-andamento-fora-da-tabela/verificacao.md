# Verificação — 252 Execuções em andamento fora da tabela

Verificada ao vivo em 2026-10-26 com o stack real (backend NestJS, SPA Angular e PostgreSQL 16 local, `CHAT_ARMAZENAMENTO=postgres`, IA ligada por
`update configuracao_ia`), Playwright com o Chromium pré-instalado. Capturas em `.artifacts/252-execucoes-em-andamento/` (ignorada pelo Git); este texto basta
para o veredito.

## Cenário

Gestor inicial e três desenvolvedores (Matheus, Ana, Carlos) criados pela API; uma demanda; execuções do dia registradas pelo gestor; execução ativa de
Matheus e de Ana (Carlos sem ativa).

## Resultado

| Item | Resultado |
|---|---|
| Gestor sem filtro, 1366×768, 1920×1080, 1080×1920 | Aprovado: grade de cartões compactos com avatar e nome, título "Em andamento agora · N", tabela só com encerradas, subtítulo "· N em andamento" |
| Gestor filtrado em um usuário | Cartão sem avatar (igual ao do desenvolvedor) |
| Gestor, dia passado sem execução ativa | Bloco "agora" não aparece; tabela com o vazio de sempre |
| Desenvolvedor com ativa, 1366×768 | Cartão grande com cronômetro, "desde HH:MM" e Pausar; total do dia soma a ativa; o chip da barra superior segue igual |
| Pausar pelo cartão | Popover com a descrição já preenchida, obrigatória; a execução entra na tabela, o cartão vira o estado vazio, toast de sucesso e o chip some |
| Estado vazio do desenvolvedor | "Nenhuma execução em andamento." com "Iniciar atividade" |
| "Iniciar atividade" com a IA desligada | Leva a `/atividade` |
| "Iniciar atividade" com a IA no ar | Leva a `/chat`, o campo traz "De onde paramos?" (já havia execução no dia), **sem enviar**, com o foco, e o parâmetro sai da URL |
| Tema escuro (gestor, 1366×768) | Aprovado |

## Limites e achados

- **Achado só na verificação:** o foco do campo do chat falhava porque o `textarea` existe **desabilitado** enquanto a conversa carrega; focar em 50 ms
  caía num campo desabilitado. A página passou a tentar o foco até o campo ficar habilitado (`focarCampoQuandoHabilitado`).
- **Preexistente:** em 1080×1920 a tabela do gestor passa da largura da área e corta Descrição e Ações (confirmado no código original, por stash); a task só
  travou a coluna Duração sem quebra, que o novo layout passou a quebrar.
- A nota "inclui execução em andamento" no rodapé da tabela foi testada e descartada (alargava a tabela); o subtítulo já diz "N em andamento".
- Desenvolvedor em tema escuro e a janela do Desktop (Electron) não foram abertos.
- A IA não responde neste ambiente (sem chave); a verificação do chat vai só até o texto pré-digitado, que é o escopo.
- Não há lint no projeto (P-001).
