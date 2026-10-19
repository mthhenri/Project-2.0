# Task 174 — Testes: autenticação e usuários

> Task 4/17 da guarda-chuva [`testes-automatizados.spec.md`](testes-automatizados.spec.md) — método comum, regras da
> cobertura e política para divergência entre código e documento estão lá. Inventário de partida:
> [análise](testes-automatizados/ANALISE.md).

## Objetivo

Provar login, token, guards e toda a gestão de usuários, incluindo as regras de administrador de `SYSTEM.SPEC.md` §14
(sempre há ao menos um administrador ativo; só administrador mexe em administrador) e o que a tela mostra para cada tipo.

## Entregáveis

### Backend

1. **`autenticacao.service`** (sem teste hoje): credencial válida gera token com o `JwtPayload` esperado; senha errada e
   login inexistente dão a **mesma** mensagem ("Credenciais inválidas"); usuário inativo e usuário excluído não entram.
2. **Guards e decorators:** `jwt-auth.guard` libera rota `@Public` e barra as demais sem token; `gestor.guard` aceita
   gestor e administrador e recusa desenvolvedor; `administrador.guard` (já tem 2 testes — completar recusa ao gestor);
   `jwt.strategy` monta o usuário a partir do payload; `active-user.decorator` entrega o usuário do token.
3. **`usuario.service`** (19 testes, foco em administrador): completar criar (login duplicado entre ativos recusado,
   senha gravada com hash, nunca devolvida), troca de senha (própria e de outro, por tipo), listagem e recuperação, e
   inativo/excluído fora das leituras.
4. **`usuario.repository` (integração):** login único só entre não excluídos; `validarPermanenciaDeAdministradorAtivo`
   no SQL conta só ativos e não excluídos; a transação da linha ~167 é atômica; restauração; senha não sai nas
   consultas de listagem.
5. **Controllers:** metadados de `autenticacao.controller` (`@Public` só no login) e `usuario.controller` (permissão
   esperada de cada rota; `PUT /usuario/:id` só gestor e administrador, conforme §12).
6. **Ferramentas da IA:** `listar-usuarios.ferramenta` (permissão por tipo, campos devolvidos sem dado sensível).

### Frontend

7. **Lógica:** `core/guards/autenticacao.guard`, `gestor.guard`, `administrador.guard` (redirecionamentos);
   `auth-token.interceptor` (cabeçalho só para a API); `core/services/autenticacao.service` e `usuario-sessao.service`;
   `usuario-autenticado.signal`; utils `tipo-usuario`, `url-retorno`, `usuario-credenciais.util`;
   `modules/usuario/services/usuario.service` (URL e corpo).
8. **Componentes:** `login` (validação, erro de credencial, destino pós-login para `/atividade` ou chat conforme a IA —
   ver `destino-pos-login`), `usuario-listagem` (vazio, cheio, erro; ações visíveis por tipo), `usuario-formulario-dialog`
   (validação; gestor não vê a opção de administrador), `usuario-senha-dialog`, `usuario-perfil-dialog`, `usuario-cartao`.

## Critérios de Aceite

- Cada linha de §14 sobre "Gerenciar usuários" e as regras de administrador tem teste nomeado; o fecho lista o teste de
  cada uma.
- `npm test` e `npm run test:integracao` verdes; `npm run build` de backend e frontend verdes.
- Divergências viram `todo` + `PROBLEMS.md`, não correção.

## Fora de Escopo

- Pad (`usuario-anotacoes*`) — task 182. Leitura da equipe pelo gestor (`ferramentas-de-leitura-da-equipe`, já testada).
- Mudar regra de senha ou de token.

## Dependências

171, 172, 173. Fontes: `SYSTEM.SPEC.md` §11, §12 (`usuario`), §14.
