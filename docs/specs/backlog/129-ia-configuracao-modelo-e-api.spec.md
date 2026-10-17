# Task 129 — Configuração da IA: modelo de dados, API e permissão de administrador

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 4 (1 de 5), e a seção
> "Configuração da IA" da [`modelagem.md`](rework-chat-ia/modelagem.md). **Só estrutura e backend**: ninguém
> chama a IA ainda (task 130) e a tela é da 132.

## Objetivo

Guardar no SQL, de forma **versionada**, tudo o que o administrador configura da IA (provedor, modelo de cada
nível, esforço do nível analítico, intervalos do check-in, duração recomendada e as flags), com uma API que
lê a configuração ativa, lista o histórico e grava uma versão nova. Entrega também a **permissão exclusiva
de administrador** em rota e em tela, que ainda não existe (hoje só há `@GestorOnly`).

## Entregáveis

### 1. Migration `0033` (schema)

Seguir a skill `sql-migrations` (`-- UP`/`-- DOWN`, sem `DEFAULT`, `INSERT ... SELECT`, índices parciais com
`is_deleted = false`, nomes `pk_`/`fk_`/`uix_`/`chk_`):

- `tipo_provedor_ia` (molde das tabelas `tipo_*`), seeds: `ANTHROPIC` ("Anthropic"), `GOOGLE` ("Google"),
  `OPENAI` ("OpenAI"). Só `ANTHROPIC` terá implementação na task 130; os outros existem para a configuração
  já nascer com o espaço de troca.
- `configuracao_ia`: BaseEntity, `versao`, `tipo_provedor_ia_id` (FK), `modelo_rapido`, `modelo_padrao`,
  `modelo_analitico` (`VARCHAR(100)`), `esforco_analitico` (`VARCHAR(20)`; esforço do nível analítico, validado
  pelo enum do shared na API, sem tabela nem `CHECK`),
  `checkin_minimo_minutos`, `checkin_maximo_minutos`, `duracao_recomendada_minutos`, `checkin_inteligente`,
  `rigor_proporcional`, `deteccao_automatica`, `ia_desligada` (`BOOLEAN`), `usuario_id` (FK; quem
  salvou), `uix_configuracao_ia_versao (versao) WHERE is_deleted = false` e
  `chk_configuracao_ia_intervalo_checkin (checkin_minimo_minutos < checkin_maximo_minutos)`. A chave da API
  **não** vai para o banco (`.env`, via `ConfigService`).
- **Versão 1 por seed**, atribuída ao administrador inicial (`gestor.inicial`): Anthropic, Haiku, Sonnet e
  Opus nos três níveis (nomes dos modelos conferidos na task, pois mudam), esforço `MEDIO`, check-in entre
  30 e 80 minutos, duração recomendada de 90 minutos, check-in inteligente e rigor proporcional ligados,
  detecção automática ligada, IA **desligada** (`ia_desligada = true`) até o administrador ligá-la na tela (decisão
  do autor: nenhuma migration passa a exigir chave de API).
- `DOWN` desfaz tudo (drop das tabelas, na ordem das FKs).

### 2. Shared

- Enums `TipoProvedorIaEnum` e `EsforcoIaEnum` (`BAIXO`, `MEDIO`, `ALTO`; string enums, valores iguais aos
  nomes) e um enum `NivelIaEnum` (`RAPIDO`, `PADRAO`, `ANALITICO`) que a 130 consome.
- DTOs conforme a skill `project20-dto-conventions` (nomes confirmados na task): saída de resumo (versão,
  campos, quem salvou e quando), entrada de criação de versão com validação (`checkin_minimo < maximo`,
  inteiros positivos, modelos não vazios, provedor e esforço do enum). O esforço é um **nome neutro do projeto**; cada provedor o traduz para o que
  entende (a Anthropic tem o seu parâmetro; Google e OpenAI têm outros), e essa tradução mora no provedor (task 130).

### 3. Backend (módulo `configuracao-ia`)

Controller fino, service com regra e permissão, repository só SQL.

- `GET /configuracao-ia` (a versão ativa, a de maior `versao`), `GET /configuracao-ia/versoes` (histórico,
  mais nova primeiro, paginado como as demais listagens) e `POST /configuracao-ia` (grava uma **versão nova**
  com `versao = maior + 1`, numa transação que trava a leitura da maior versão; versão antiga nunca é
  alterada). Sem exclusão.
- **Permissão de administrador:** novo `@AdministradorOnly()` + `AdministradorGuard` (molde do `GestorGuard`,
  usando `temPermissaoDeAdministrador` do shared), aplicado ao módulo inteiro. Gestor e desenvolvedor levam
  403, inclusive para **ler**.
- A service expõe `obterAtiva()` para outros módulos (a 130 e os blocos seguintes), sem passar pelo
  controller. A configuração ativa fica em **cache em memória** no backend, para a IA não ler o banco a cada
  mensagem; o cache é renovado quando uma versão nova é gravada (e na subida). Com uma única instância do
  backend isso basta; se um dia houver várias, a task de escala define a invalidação entre elas.
- Testes (node:test, repositório em memória): versionamento, validação do intervalo, 403 por tipo.

### 4. Frontend (somente a base de permissão de tela)

- `ItemNavegacao` ganha `somenteAdministrador` e a sidebar o respeita; um guard de rota equivalente ao
  `gestor.guard.ts` para administrador. **Nenhum item novo na navegação ainda**: o item "Configurações da
  IA" nasce na 132. O que a task entrega e testa é o guard e o filtro da sidebar, com o item existindo só em
  teste manual.

### 5. Documentação

- `docs/SCHEMA.md` (tabelas e seeds), `docs/SYSTEM.SPEC.md` (módulo, permissão de administrador) e
  `docs/context/`.

## Decisões tomadas pelo autor

1. **Esforço sem tabela.** É um parâmetro que cada provedor entende do seu jeito; uma tabela `tipo_*` só
   guardaria três nomes e criaria uma abstração que o provedor teria de desfazer. Fica como coluna de texto
   validada pelo enum do shared.
2. **A IA nasce desligada** no seed; o administrador a liga na tela.
3. **Só o administrador lê e edita** a configuração. As flags de que o chat e o check-in precisam chegam por
   `obterAtiva()` dentro do backend; o estado da IA para o usuário comum (sem expor modelos) é do bloco 10.
   A IA agindo com o token do administrador poderia, no futuro, ler e propor mudanças aqui, mas isso é ideia
   futura e não tem ferramenta nesta etapa.

## Critérios de Aceite

- `db:migrate`, `db:rollback` e novo `db:migrate` rodam sem erro; a versão 1 existe depois do migrate e
  `chk_configuracao_ia_intervalo_checkin` recusa um intervalo invertido.
- Depois de gravar uma versão nova, a leitura seguinte já vem com ela (cache renovado).
- `POST /configuracao-ia` cria a versão 2 sem alterar a 1; duas gravações simultâneas nunca geram a mesma
  versão (a segunda recebe a seguinte ou um erro claro).
- Gestor e desenvolvedor levam 403 em todas as rotas do módulo; administrador lê e grava. O item de
  navegação marcado `somenteAdministrador` só aparece para administrador, e a rota recusa o gestor.
- Testes de `shared` e `backend` e builds passam; frontend sem testes e sem lint declarado.

## Fora de Escopo

- Chamar a IA, escolher modelo por nível e streaming (task 130).
- Prompts (task 131) e a tela (tasks 132 e 133).
- Detecção automática de queda e o endpoint de estado da IA para usuário comum (bloco 10).

## Dependências

Depende dos blocos 1 e 2 (administrador e layout), já concluídos. Bloqueia 130, 131 e 132.
