# 421-login-com-limite-de-tentativas.spec.md

> Task 93/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-128 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: backend/autenticacao. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

A rota pública de login deixa de aceitar tentativas ilimitadas contra o mesmo login.

## Contexto

**A-128 · Média · Login sem limite de tentativas nem bloqueio**

A rota pública de login não tem throttle, contador de falhas nem bloqueio: aceita tentativas ilimitadas contra o mesmo login. A política de senha é só tamanho mínimo 8, e os logins de todos os usuários são entregues ao auxiliar (outro achado).

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/autenticacao/controllers/autenticacao.controller.ts:46-51 — @Public() + @Post('login') sem nenhum guard/decorador de limite
- backend/src/modules/autenticacao/autenticacao.module.ts:31-34 — APP_GUARDs registrados: JwtAuthGuard, GestorGuard, PermissaoGuard, AdministradorGuard (nenhum throttler)
- backend/src/modules/autenticacao/services/autenticacao.service.ts:19-37 — validarCredenciais não grava nem consulta tentativas
- grep por throttl|rate.?limit|helmet|tentativas em backend/src/app.module.ts, backend/src/main.ts, backend/package.json e backend/src/modules/autenticacao — nenhuma ocorrência
- shared/src/dtos/usuario/UsuarioCriarDto.ts:15-16 e UsuarioSenhaAlterarDto.ts:7-8 — senha validada só com @MinLength(8)

Como observar: Sem token: POST /autenticacao/login {login:'<login real>', senha:'errada'} repetido centenas de vezes. Esperado: 429 ou bloqueio temporário após N falhas. O código dá sempre 400 'Usuário ou senha incorretos. Confira e tente de novo.' e segue aceitando.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Decisão do autor

**Antes:** sem limite por login nem por IP, sem atraso e sem registro de falhas; a política de senha é só o tamanho mínimo.

**Opções:**

1. Limite na aplicação, só na rota de login (por login e por IP, com atraso progressivo). Pede dependência nova (`@nestjs/throttler`) ou um contador próprio.
2. Limite no proxy da hospedagem: registrar no `SYSTEM.SPEC.md` §11 e no README de deploy onde ele está configurado.

**Decisão (2026-11-16):** Em 2026-11-16 o autor seguiu a recomendação da auditoria, **opção 1**: limite na aplicação, só na rota de login, por login e por IP, com atraso progressivo. Contador próprio em memória (`LimiteDeTentativasDeLogin`), sem dependência nova; os números e o comportamento estão no `SYSTEM.SPEC.md` §11.

## Entregáveis

1. A opção escolhida, com teste (a enésima tentativa errada em sequência é recusada com 429 ou atraso) ou o registro no documento.

## Critérios de Aceite

- Dez tentativas erradas seguidas contra o mesmo login não são todas processadas na hora.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

