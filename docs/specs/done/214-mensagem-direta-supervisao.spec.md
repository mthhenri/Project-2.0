# 214-mensagem-direta-supervisao.spec.md

> Task 10/11 da guarda-chuva [`chat-colaboradores.spec.md`](chat-colaboradores.spec.md). Modelagem em
> [`chat-colaboradores/modelagem.md`](chat-colaboradores/modelagem.md) (§4 "`mensagem_direta_supervisao`", §5, §6 "Supervisão" e §8). Depende da
> [`208`](../done/208-mensagem-direta-service-e-api.spec.md), da [`210`](../done/210-mensagem-direta-popup-no-project.spec.md) e da
> [`223`](../done/223-barra-lateral-em-grupos.spec.md). A guarda-chuva [`chat-grupos.spec.md`](chat-grupos.spec.md) depende desta task (a 246).

## Objetivo

Gestor e administrador leem, numa **área separada**, as conversas **entre desenvolvedores**, somente leitura, com **aviso aos envolvidos** (mensagem do sistema na própria conversa)
e **auditoria** de cada abertura. A regra de elegibilidade nasce para **N participantes**, para a guarda-chuva de grupos não exigir retrabalho.

## Regras (decisões do autor, 2026-10-21)

- **Quem lê:** gestor e administrador (`temPermissaoDeGestor`), por tipo de usuário, nunca por `demanda_usuario`.
- **Elegibilidade:** uma conversa só é supervisionável se **nenhum** participante é gestor ou administrador. Conversa que envolve gestor ou administrador, **inclusive com um
  desenvolvedor**, é privada (a mesma regra das ferramentas da task 201). A decisão é tomada **na hora da leitura**, pelo **tipo atual** dos participantes, e nunca gravada na mensagem.
- **Ler a própria conversa** (o gestor é um dos participantes) segue o caminho normal da 208: não é supervisão, não gera auditoria nem aviso.
- **Aviso:** a abertura grava uma mensagem `SISTEMA` na conversa ("Fulano, gestor, leu esta conversa"), no máximo **uma por leitor, conversa e dia** no fuso `APP_TIMEZONE`, e a publica
  aos participantes pelo stream. A auditoria grava **uma linha por abertura**, com `participantes_avisados` dizendo se aquela abertura gerou aviso.
- **Somente leitura:** a tela não tem campo de resposta, e ler **não** marca nada como lido para os participantes.

## Entregáveis

1. **Elegibilidade para N participantes (domínio, com teste):** função pura em `backend/src/modules/mensagem-direta/domain/mensagem-direta-regras.ts` que recebe os tipos de **uma lista** de
   participantes e diz se a conversa é supervisionável. A 214 a usa com dois; o grupo (246) a reaproveita sem mudar a assinatura. `ConsultaSupervisao.usuarioIdsExcluidos` já existe no contrato
   `ArmazenamentoDeMensagemDireta` (`listarTodasConversas`, tasks 206/207): a service calcula os ids de gestores e administradores pelo tipo atual e os repassa.
2. **`MensagemDiretaSupervisaoRepository`** (estende `BaseRepository`, SQL puro) sobre `mensagem_direta_supervisao` (tabela e migration da 205, **sem migration nova**): `registrarLeitura`
   (INSERT ... SELECT ... RETURNING) e `existeAvisoDoDia` (já houve aviso daquele leitor naquela conversa no dia). A tabela guarda `usuario_menor_id` e `usuario_maior_id`, próprios do
   um a um: o grupo (246) decide se estende a tabela.
3. **Service** (`MensagemDiretaService` ou serviço irmão se o arquivo ficar extenso; avaliar e registrar no fecho):
   - `listarConversasSupervisionadas`: exige gestor; chama `listarTodasConversas` com os ids excluídos; paginação, texto, período e `somenteCodigo`; devolve nomes das pessoas.
   - `lerConversaSupervisionada`: exige gestor; **403** (`UnauthorizedAccessException`) se algum participante é gestor ou administrador ou se o leitor é um dos participantes (para esse caso
     a rota normal); registra a auditoria; decide o aviso do dia; se couber, grava a mensagem `SISTEMA` (id gerado no servidor, `autor = SISTEMA`) e a publica ao stream dos participantes.
     A falha do publicador não falha a leitura (mesmo padrão da 209).
4. **Rotas** (controller fino, `@GestorOnly()`): `GET /mensagem-direta/supervisao/conversas` e `GET /mensagem-direta/supervisao/conversa/:conversaId`, com os DTOs no `shared`
   (`MensagemDiretaSupervisaoListarDto`, `MensagemDiretaSupervisaoLerDto`, saídas `ConversaDiretaSupervisaoResumoDto`/`ConversaDiretaSupervisaoListadasDto` e
   `MensagemDiretaSupervisaoListadasDto`; nomes finais pela skill `project20-dto-conventions`). O `conversaId` da rota entra no DTO dentro da controller.
5. **Frontend, tela do gestor** em `frontend/src/app/modules/mensagem-direta/` (ou módulo `supervisao-chat/`, decidir ao abrir pela vizinhança): rota `supervisao-chat` com `gestorGuard`
   (como `usuario.routes.ts`), `loadComponent`. Lista de conversas com busca por texto e filtro "Com código"; ao abrir, a conversa em modo leitura (balões, bloco de código copiável e
   cartões pelo que o popup já tem), faixa fixa "Você está lendo uma conversa entre X e Y; eles são avisados" e sem campo de resposta. Estados: carregando, vazio, erro e sem resultado.
6. **Barra lateral:** item **Supervisão do chat** no grupo **IA**, em `ITENS_NAVEGACAO` (`frontend/src/app/shared/layout/navegacao.ts`), `somenteGestor: true`, sem `somenteAdministrador`,
   com ícone e tecla `g` + letra livre (conferir as teclas em uso). O grupo IA passa a aparecer também para o gestor. Aplicar `gerenciamento-de-impacto` (`npm run impacto`) em `navegacao.ts`:
   a lista alimenta os atalhos e o teste de agrupamento da 223.
7. **Aviso no popup:** a mensagem `SISTEMA` aparece na conversa como linha central (não balão); verificar como o popup já trata `autor = SISTEMA` (a 205 criou o enum) e ajustar se faltar.
8. **Testes:** domínio (elegibilidade com 2 e com 3 participantes, mudança de tipo, leitor participante), service com dublês (403 em cada caso, auditoria em toda abertura, aviso
   uma vez por dia e outra no dia seguinte, falha do publicador), controller, repository (integração: auditoria e `existeAvisoDoDia` por fuso) e o teste de agrupamento da barra para os três
   perfis. Componente da tela (lista, leitura sem campo de resposta, 403).
9. **Documentação:** `docs/SYSTEM.SPEC.md` (rotas e tela), `docs/SCHEMA.md` se algo da tabela mudar, `CONTEXT.md`, `HISTORY.md`, `MEMORY.md`.

## Critérios de Aceite

- `npm run test --workspace=shared`, `--workspace=backend`, `--workspace=frontend`, `npm run test:integracao` e os builds do backend e do frontend passam; `npm run repo:verificar` passa.
- **Ao vivo** (API real, três perfis): o gestor lista só conversas entre desenvolvedores; abrir uma grava a auditoria e os dois desenvolvedores recebem a mensagem do sistema; abrir de novo no
  mesmo dia grava a auditoria, mas **não** avisa de novo; uma conversa com gestor ou administrador não aparece na lista e responde **403** pela rota; o desenvolvedor recebe **403** nas duas
  rotas; promover um desenvolvedor a gestor torna as conversas dele privadas na próxima leitura.
- **Visual** (`1920×1080`, `1366×768`, `1080×1920`, claro e escuro): a tela do gestor comparada com o popup do chat (210) e com a lista de Usuários, que são os análogos aprovados; barra lateral
  com gestor (grupo IA com um item) e administrador (dois itens), expandida e recolhida.
- Sem `ngModel`, `innerHTML`, `title` nem `style=""` inline; tooltip só `pTooltip`.

## Fora de Escopo

- Supervisão de grupos livres e de canais (guarda-chuva `chat-grupos`, task 246 e seguintes); aqui a regra só fica pronta para N participantes.
- Responder, apagar ou marcar como lida na supervisão; exportar a conversa; alertas por palavra.
- Uma tela de consulta da própria auditoria (a tabela é gravada e consultável por SQL; relatório é ideia futura).
- Mudar o armazenamento, o stream ou o popup além do item 7.

## Dependências

`208`, `210` e `223` (em `done/`); a 209 fornece o publicador. Fontes: `modelagem.md`, `docs/SYSTEM.SPEC.md`, task 201 (a regra das ferramentas da IA), `UsuarioController` e `usuario.routes.ts` como análogo
de rota de gestor.

## Riscos e Mitigação

- **Vazamento de conversa privada:** a elegibilidade é conferida na leitura da conversa, nunca só na lista; a lista e a rota usam a mesma função pura.
- **Aviso em excesso:** o limite de um por leitor, conversa e dia é testado nos dois lados da virada do dia no fuso `APP_TIMEZONE`.
- **Aviso que falha após a auditoria:** a auditoria é gravada antes; se a mensagem do sistema não sair, a próxima abertura do dia tenta de novo (o aviso só conta se foi gravado).

## Pontos em aberto (padrão proposto; confirmar ao abrir a task)

- Ícone e tecla do item na barra (proposta: `pi pi-eye`, tecla livre).
- Nome da rota do front (proposta: `/supervisao-chat`).
- Texto do aviso (proposta: "<Nome>, <gestor|administrador>, leu esta conversa").
