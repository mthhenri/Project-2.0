# 94 — Login: segurança da credencial lembrada + fluxo sem fricção

**Origem:** Revisão de UI/UX — `docs/reviews/ui-ux/` (print `prints/01-login.png`, análise `analise-detalhada/login.md`)

**Depende de:** —

**Entrega:** tela de login com estado "Bem-vindo de volta" que lembra **apenas o login** (nunca a senha), autofocus gerenciado, Enter funcional em todos os fluxos, aviso de Caps Lock, área de erro com altura reservada, validação alinhada ao backend e pós-login para `returnUrl` (ou `/ponto`).

> **Frontend apenas** (guard + interceptor + página). Sem backend, sem shared, sem migration.

---

## Escopo

1. **Eliminar a persistência da senha**: `ultimo_login` passa a guardar `{ login, nomeCompleto }` (nomeCompleto vem de `AutenticacaoTokenDto.usuario`); migração leve: apagar a chave antiga no primeiro load. Checkbox "Lembrar meu usuário neste computador" (marcada por padrão).
2. **Estado A (usuário lembrado)**: chip de identidade (avatar de iniciais do nomeCompleto + nome + @login), campo Senha com **autofocus**, link "Entrar com outro usuário" (troca para o form completo e foca Login **sem** apagar o lembrado — só sobrescreve no próximo sucesso).
3. **Estado B (form completo)**: autofocus no Login; normalização trim+minúsculas no blur (espelha o `@Transform` do backend).
4. **Foco pós-erro**: falha de credencial foca a Senha com texto selecionado; erro some ao digitar (`valueChanges`).
5. **Validação**: senha só `required` (o DTO exige apenas `IsNotEmpty`; manter `minLength(4)` no login, que bate com o backend).
6. **Erros**: status **400** → banner com `erro.error.mensagem` (preserva "Usuário inativo"); status 0/5xx → "Servidor indisponível…". Área de mensagem com `min-height` fixa (sem layout shift). Suprimir o toast global do `error-handler.interceptor` para a request de login (via `HttpContext`). Campos desabilitados durante o loading + guarda de re-submit no Enter.
7. **Aviso de Caps Lock** no campo de senha (`getModifierState('CapsLock')` em keydown/keyup).
8. **returnUrl**: `autenticacaoGuard` grava a URL solicitada em query param; o **mesmo** no redirect 401 do interceptor (sessão expirada). Pós-login navega para `returnUrl ?? '/ponto'` (sanitizar com `router.parseUrl`, rejeitar URL absoluta). Remover o hard-code `/atividade`.
9. Rodapé de ajuda estático "Esqueceu a senha? Solicite a redefinição a um gestor." + toggle de tema na página (reusa `TemaService`).

## Critérios de aceite

- Login recorrente = digitar senha + Enter (0 cliques de mouse); nenhuma senha em localStorage (verificar DevTools).
- Deep link `/demanda` deslogado → login → aterrissa em `/demanda`.
- Senha de 6 caracteres válida chega à API; Caps Lock ativo mostra o hint antes do submit.

## NÃO implementar nesta task

- Recuperação de senha self-service (não existe no backend).
- Mudanças no dialog de alterar senha de Usuários.
