# 236-plano-material-de-fora.spec.md

> Task 6/7 da guarda-chuva [`chat-planejamento.spec.md`](../backlog/chat-planejamento.spec.md): texto colado e arquivo de texto como fonte do plano.

## Objetivo

A pessoa traz material de fora (o e-mail do cliente colado, um arquivo de texto) e a IA o usa como fonte ao planejar. Não há leitura
de caixa de e-mail.

## Entregáveis

1. **Migration** (próxima livre na hora) com `tipo_plano_fonte_origem` (`COLADO`, `ARQUIVO`; enum string em `shared`) e `plano_fonte`
   (`plano_id`, `titulo`, `conteudo`, `origem`, `usuario_id`). Só texto: o arquivo é lido como texto e **não** é guardado como
   binário. `docs/SCHEMA.md` atualizado.
2. **`shared`:** DTOs de fonte (criar, `ResumoDto`) e limites de tamanho do conteúdo e do título.
3. **Backend:** repository, service e rotas no módulo `plano` (mesmo acesso do plano). A fonte entra no contexto da IA (234). Tipos de
   arquivo aceitos e tamanho máximo validados na service; arquivo que não é texto é recusado com mensagem clara.
4. **Frontend:** na tela do plano (233), ação de colar texto e de anexar arquivo de texto, e lista de fontes com título, quem trouxe,
   ver e remover (soft delete).
5. Testes: service (limites, recusa), repository com integração, componente.

## Critérios de Aceite

- `npm test`, `npm run test:integracao` e builds aprovados.
- Verificação ao vivo: colar um e-mail, anexar `.txt` e `.md`, recusar binário e arquivo grande, e a IA citar a fonte numa resposta.
  Em 1920×1080, 1366×768 e 1080×1920, claro e escuro. Análogo: a tela do plano da 233.

## Fora de Escopo

Leitura direta de caixa de e-mail; imagens, prints, PDF e documentos de escritório; guardar arquivos como binário.

## Dependências

232, 233, 234.

## Pontos em aberto (confirmados ao abrir a task: valeram os padrões propostos)

- Extensões aceitas e tamanho máximo (padrão proposto: `.txt` e `.md`, até o limite de mensagem do chat).
- Remover uma fonte: padrão proposto, soft delete (some do contexto da IA).

## Resultado

- Extensões `.txt` e `.md`, até 4000 caracteres (o limite da mensagem do chat) e **10 fontes por plano** (acréscimo desta task, para limitar o contexto da IA). Remover é soft delete.
- A regra do conteúdo (`validarFonteDoPlano`, em `shared/src/utils/plano-fonte.ts`) vale na tela e na service. O arquivo é lido na tela e só o texto vai à API (`POST /plano/:id/fonte`, `origem` `ARQUIVO` e o nome do arquivo como título).
- O texto das fontes entra inteiro nas instruções da IA, marcado como dado e não como instrução.
