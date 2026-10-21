# 208-mensagem-direta-service-e-api.spec.md

> Task 4/11 da guarda-chuva [`chat-colaboradores.spec.md`](../backlog/chat-colaboradores.spec.md). Modelagem em
> [`chat-colaboradores/modelagem.md`](../backlog/chat-colaboradores/modelagem.md) (§4, §5, §6 e §8). Depende da [`205`](../done/205-mensagem-direta-fundacao.spec.md),
> da [`206`](../done/206-mensagem-direta-armazenamento-em-indice.spec.md) e da [`207`](../done/207-mensagem-direta-armazenamento-postgres-provisorio.spec.md).

## Objetivo

Dar ao chat entre colaboradores a **service e as rotas** que o front vai consumir: enviar, listar a conversa e a lista de conversas, marcar como lida, silenciar,
buscar e guardar as preferências, com as permissões decididas na service. O módulo entra no `AppModule`. Tempo real (stream) é a 209 e a supervisão é a 214.

## Entregáveis

1. **Dois repositories de estado, no PostgreSQL** (estendem `BaseRepository`, SQL puro, sem `DELETE`):
   - `MensagemDiretaLeituraRepository` (tabela `mensagem_direta_leitura`): `listarMarcadores` (todas as linhas de um usuário),
     `recuperarMarcador` (uma conversa de uma pessoa), `alterarLeitura` (cria ou avança `lida_ate_date`, **nunca recua**: `GREATEST` no `ON CONFLICT`) e
     `alterarSilencio` (cria ou altera `silenciada` sem tocar `lida_ate_date`). Gravam com `INSERT ... SELECT ... ON CONFLICT (conversa_id, usuario_id) WHERE is_deleted = false`.
   - `MensagemDiretaPreferenciaRepository` (tabela `mensagem_direta_preferencia`): `recuperar` (sem linha devolve `null`) e `alterar` (upsert da linha do usuário).
   - `UsuarioRepository.listarNomesPorIds` (o nome de cada pessoa da lista de conversas numa consulta só) e `validarExistenciaIncluindoExcluido`. Os DTOs internos dos repositories vivem em `shared/` (`MensagemDireta*Interno*Dto`, `UsuarioNome*Dto`).
2. **`MensagemDiretaService`** (toda regra e permissão; só objetos nas assinaturas):
   - `enviarMensagem`: o remetente é sempre o do token. Valida destinatário (existe sem exclusão, está **ativo** e é outra pessoa; ler, marcar como lida e silenciar aceitam pessoa excluída), texto (o `MaxLength` do DTO mais "não só espaços"),
     `mensagemId` em minúsculas, **menções** (ids únicos, só dos dois participantes, já que quem não participa não lê a conversa e o aviso vazaria) e **referências**
     (únicas; a demanda ou a atividade existe, e, se quem envia é desenvolvedor, ele tem acesso a ela, pelas mesmas regras de `DemandaService` e `AtividadeService`).
     `contemCodigo` vem de `contemBlocoDeCodigo` (do `shared`), nunca do cliente. Grava no armazenamento e devolve `MensagemDiretaEnviadaDto`. Reenviar o mesmo
     `mensagemId` devolve a mesma mensagem com `jaExistia`; o `mensagemId` de outra pessoa é recusado (o armazenamento já garante).
   - `listarConversa`: a outra pessoa precisa existir, **mesmo excluída** (o histórico continua dos dois, e a lista a mostra como "Usuário removido"); devolve a página (`limite` padrão e máximo do `shared`) e o `lidaAteDate` **da outra pessoa**, que é de onde sai o
     "Lida". Abrir a conversa **não** marca nada como lida (isso é o `PUT` da leitura).
   - `listarConversas`: as conversas do usuário com a última mensagem, o nome da outra pessoa, as não lidas (uma consulta) e `silenciada`. Pessoa excluída aparece como
     "Usuário removido". Só entram conversas que têm mensagem.
   - `alterarLeitura`: a data é a da última mensagem vista; vale no máximo o instante atual (data futura é limitada ao agora) e não recua. A conversa é sempre a do par
     (token + `usuarioId` da rota). Devolve `MensagemDiretaLeituraAlteradaDto` com o que ficou gravado.
   - `alterarSilencio`: silencia ou reativa a conversa do próprio usuário com uma pessoa existente.
   - `buscar`: sempre restrita às conversas do usuário do token; período e `somenteCodigo` repassados.
   - `recuperarPreferencia` / `alterarPreferencia`: da pessoa do token; sem linha vale `PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA`.
3. **`MensagemDiretaController`** fino em `mensagem-direta`, com os `DTO`s das rotas da modelagem §8 que esta task cobre (o `usuarioId` da rota entra no DTO dentro da controller):
   `GET /conversas`, `GET /conversa/:usuarioId`, `POST /mensagem`, `PUT /conversa/:usuarioId/leitura`, `PUT /conversa/:usuarioId/silencio`, `GET /busca`,
   `GET /preferencia` e `PUT /preferencia`. Todas para qualquer usuário autenticado; as respostas no `StandardResponse` do projeto.
4. **Módulo** `MensagemDiretaModule` com controller, service, repositories e as dependências (usuário, demanda, atividade), **registrado no `AppModule`**. Com
   `CHAT_ARMAZENAMENTO=postgres` o backend sobe e o chat funciona sem serviço de busca.
5. **Testes**: unitários da service com dublês (cada regra e cada recusa acima), da controller (o `usuarioId` da rota nunca vem do corpo) e de integração dos dois
   repositories contra o PostgreSQL de teste (unicidade por pessoa e conversa, `lida_ate_date` que não recua, silêncio que não apaga a leitura, upsert da preferência,
   ausência de `DEFAULT`). Um teste de integração da service ponta a ponta, com o armazenamento Postgres e usuários reais: enviar, listar, contar não lidas, marcar como
   lida, "Lida" na outra ponta, buscar.
6. **Documentação**: `docs/SYSTEM.SPEC.md` (módulo e rotas), `docs/context/` (`CONTEXT.md`, `HISTORY.md`, `MEMORY.md`).

## Critérios de Aceite

- `npm run test --workspace=backend`, `npm run test:integracao` e `npm run build --workspace=backend` passam.
- **Ao vivo** (backend real, dois usuários, `curl` ou cliente HTTP): A envia a B; B vê a mensagem e 1 não lida; B marca como lida e A vê `lidaAteDate` de B; reenviar o mesmo
  `mensagemId` devolve `jaExistia: true` sem duplicar; destinatário inexistente ou inativo e envio a si mesmo recusados; a busca acha a mensagem sem acento e só nas conversas
  de quem busca; uma terceira pessoa não consegue ler a conversa pelas rotas. Rodado com `CHAT_ARMAZENAMENTO=opensearch` **e** `postgres`.
- `npm run repo:verificar` passa. `CLAUDE.md` e `AGENTS.md` continuam idênticos.

## Fora de Escopo

- Stream de eventos, publicador compartilhado e presença (209); as rotas de supervisão, a auditoria e o aviso aos envolvidos (214); telas e Desktop.
- Aviso (notificação) de menção: a 208 só valida e guarda as menções; quem avisa é o stream (209) e o front (212).
- Editar ou apagar mensagem; anexos.
- Mudar o chat da IA ou o armazenamento das mensagens (206 e 207).

## Dependências

`205`, `206` e `207` (em `done/`). Fontes: `modelagem.md`, `docs/SYSTEM.SPEC.md`, o módulo `chat` (controller e service) como análogo de estrutura.

## Riscos e Mitigação

- **Leitura que recua ou salta:** uma marcação atrasada (rede lenta) não pode reabrir as não lidas, e uma data futura não pode escondê-las para sempre. `GREATEST` no banco e
  limite ao agora na service; ambos testados.
- **Vazamento por menção ou referência:** menção a quem não participa e referência a uma demanda que o remetente não vê são recusadas na service.
- **Sem `DEFAULT` no banco:** o padrão das preferências vem do `shared`; a service nunca depende de valor padrão de coluna.
- **Relógio:** a data de leitura vem da mensagem (gravada pelo servidor), não do relógio do cliente.

## Pontos decididos nesta task (autor pode reverter)

- Menção só aos dois participantes da conversa.
- Referência exige acesso do **remetente** (desenvolvedor); o destinatário pode não ver o cartão, e a tela (211) mostra o cartão bloqueado nesse caso.
- A lista de conversas traz só conversas com mensagem.
