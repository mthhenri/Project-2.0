# Verificação — 293

## Recorte e resultado

Menu das mensagens do chat entre colaboradores e ordem do Copiar nas mensagens próprias do chat da IA. Análogos: os balões/rodapés existentes e o ContextMenu PrimeNG já usado em Minhas demandas e no pad. Nenhum estilo global, DTO, regra de domínio, API ou armazenamento alterado. A pesquisa está somente na spec 294 do backlog.

O menu tem Responder/Copiar texto e abre por botão direito ou pelos três pontos; novo clique nos mesmos pontos fecha, outro alvo troca o menu. Só mensagens efetivamente enviadas de usuário oferecem ações; sistema, envio pendente e falha preservam seus estados. A confirmação de cópia aparece temporariamente como check no mesmo botão, sem deslocar o horário. O Copiar do chat da IA mantém o hover/foco e mudou apenas de ordem na mensagem própria.

## Testes e compilação

- Contraprova inicial: 78 testes aprovados e 2 falhas esperadas (Copiar ainda depois da data; menu inexistente). A primeira tentativa não executou testes por `EPERM` no diretório temporário do ambiente; usar TEMP/TMP em `.artifacts/293-acoes-das-mensagens/temp` resolveu sem alterar configuração do projeto.
- Teste focado após a implementação inicial: **88 aprovados**, três arquivos (chat.page e os dois testes da conversa entre colaboradores).
- Contraprova do ajuste solicitado durante a implementação: **6 aprovados e 1 falha esperada**, porque o segundo clique mantinha o menu aberto. Acrescentada alternância por mensagem.
- `npm run test --workspace=frontend`: rodada final com **2.396 testes aprovados em 192 arquivos**, incluindo abrir/fechar, cópia do Markdown, resposta própria/recebida, troca de conversa, sistema/envio/falha, cancelamento, envio e citações. O checkout também recebe alterações de outra sessão; os números são da árvore local da rodada.
- `npm run build --workspace=frontend`: aprovado. Avisos de orçamento de tamanho (inclusive o SCSS da conversa, 5,96 kB diante do aviso em 4 kB e teto de erro em 8 kB), dependência CommonJS `extend` e NG8107 em `demanda-pasta-linha` continuam; não foram tratados neste recorte. Nenhum gate de erro foi afrouxado.
- Sem lint no projeto (P-001). Sem testes de backend, integração de banco ou pack Electron: não houve alteração nessas camadas.

## Aplicação real no navegador

Playwright global executou o **build real do frontend**, sem recriar seus componentes. O acesso HTTP direto ao servidor local foi bloqueado pelo ambiente (`ERR_NETWORK_ACCESS_DENIED`; em outra tentativa, timeout). Para observar o produto, o navegador recebeu os arquivos compilados de `frontend/dist/frontend/browser` pelo roteamento local do Playwright na origem localhost; as chamadas de API foram interceptadas com dados artificiais. Não houve envio de mensagens reais, consulta a provedor de IA ou escrita no banco.

Foram executadas **seis combinações**: 1920×1080, 1366×768 e 1080×1920, nos temas claro e escuro. Em cada uma:

1. Chat da IA: Copiar invisível sem hover/foco, visível no hover, horário com a mesma posição/largura antes e depois; cópia efetiva para a área de transferência.
2. Popup embutido: mensagem própria e mensagem longa recebida, horário estável, menu por botão direito e três pontos, menu dentro dos limites da janela; cópia efetiva, Responder e Cancelar, alternância abrir/fechar pelo mesmo botão.
3. Teclado: foco no botão, Enter abre, foco chega ao menu após a animação PrimeNG, Escape fecha sem fechar a conversa.
4. `/chat-popup`: mesma conversa no modo usado pela janela do Project Desktop; Responder à mensagem recebida mostra autora e trecho corretos.

O principal inspecionou pessoalmente as capturas e comparou com os balões e controles existentes. As capturas aguardam a animação do menu terminar, evitando avaliar um quadro parcialmente transparente. O executável Electron não foi aberto; a verificação do consumidor foi da rota real compartilhada, sem modificar a ponte do Desktop. Status online, plano e aviso de versão não são objeto deste cenário (API controlada); não se afirma teste de ponta a ponta do backend ou do SSE.

Artefatos **locais e ignorados pelo Git**: `.artifacts/293-acoes-das-mensagens/` (`resultado.json`, scripts, logs, `ia-*`, `popup-menu-*`, `janela-resposta-*`). Não vêm no clone; os resultados e limites estão registrados aqui.

## Impacto e revisão

`npm run impacto -- frontend/src/app/modules/mensagem-direta/components/mensagem-direta-conversa/mensagem-direta-conversa.component.ts`: o consumidor é `MensagemDiretaPopupComponent` (import e seletor), usado no layout e em `/chat-popup`; ambos são alvos explícitos do pedido e foram verificados. Os dois testes existentes foram adaptados ao acesso pelo menu. Reuso do ContextMenu no mesmo sentido genérico; não foi alterado o componente PrimeNG nem seus demais consumidores.

Leitura manual do diff contra a spec e `CONVENTIONS.md`: apresentação/orquestração de UI permaneceu no componente; copia e responde pelas operações existentes. O acréscimo no componente já extenso se limita às ações da própria mensagem (cerca de 40 linhas); extrair outro componente adicionaria comunicação e estado duplicado sem responsabilidade nova. Buscas no diff: sem estilo inline, seletor de ID, ngModel/Subject, cor fixa ou hardcode de negócio. Sem alterações nos espelhos de skills/AGENTS.

`git diff --check` no recorte e `npm run repo:verificar` aprovados. Sem commit solicitado; alterações de outras sessões preservadas.
