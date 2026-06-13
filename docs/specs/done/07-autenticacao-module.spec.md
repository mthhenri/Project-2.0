# 07 — Módulo Autenticacao

**Depende de:** 05, 06
**Entrega:** login com JWT, guards globais e decorators de autorização

---

## Objetivo

Implementar autenticação JWT completa: login, geração de token, guards globais
e decorators. Após esta task, todos os endpoints do projeto ficam protegidos
por padrão — rotas públicas precisam do decorator `@Public()`.

---

## DTOs a Criar em `shared/src/dtos/autenticacao/`

Criar também a pasta `shared/src/dtos/autenticacao/` e adicionar ao index do shared.

```typescript
// AutenticacaoLoginDto.ts
export class AutenticacaoLoginDto {
  @Transform(({ value }) => value?.toLowerCase().trim())
  @IsString() @MinLength(4)
  login: string;

  @IsString() @IsNotEmpty()
  senha: string;
}

// AutenticacaoTokenDto.ts
export class AutenticacaoTokenDto {
  accessToken: string;
  tipo: string;          // sempre 'Bearer'
  usuario: {
    id: number;
    login: string;
    nomeCompleto: string;
    tipo: UsuarioTipoEnum;
  };
}
```

---

## Arquivos a Criar

```
backend/src/modules/autenticacao/
  autenticacao.module.ts
  controllers/
    autenticacao.controller.ts
  services/
    autenticacao.service.ts
  strategies/
    jwt.strategy.ts
  guards/
    jwt-auth.guard.ts
    gestor.guard.ts
  decorators/
    public.decorator.ts
    gestor-only.decorator.ts
    active-user.decorator.ts
  domain/
    interfaces/
      jwt-payload.interface.ts
```

---

## Implementação

### jwt-payload.interface.ts

```typescript
export interface JwtPayload {
  sub: number;           // id do usuário
  login: string;
  tipo: UsuarioTipoEnum;
}
```

### jwt.strategy.ts

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:    configService.obter().jwt.secreto,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    return payload;
  }
}
```

### Decorators

```typescript
// public.decorator.ts — marca rota como pública (sem JWT)
export const Public = () => SetMetadata('isPublic', true);

// gestor-only.decorator.ts — restringe rota a gestores
export const GestorOnly = () => SetMetadata('gestorOnly', true);

// active-user.decorator.ts — injeta payload do JWT no parâmetro
export const ActiveUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    return ctx.switchToHttp().getRequest().user;
  },
);
```

### jwt-auth.guard.ts

Guard global: bloqueia todas as rotas exceto as marcadas com `@Public()`.

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) { super(); }

  canActivate(contexto: ExecutionContext) {
    const isPublica = this.reflector.getAllAndOverride<boolean>('isPublic', [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (isPublica) return true;
    return super.canActivate(contexto);
  }
}
```

### gestor.guard.ts

Guard complementar: bloqueia rotas marcadas com `@GestorOnly()` para não-gestores.

```typescript
@Injectable()
export class GestorGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const gestorOnly = this.reflector.getAllAndOverride<boolean>('gestorOnly', [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (!gestorOnly) return true;

    const usuarioAtivo: JwtPayload = contexto.switchToHttp().getRequest().user;
    if (usuarioAtivo?.tipo !== UsuarioTipoEnum.GESTOR) {
      throw new UnauthorizedAccessException('Acesso restrito a gestores');
    }
    return true;
  }
}
```

### autenticacao.service.ts

```typescript
/** Valida login e senha. Retorna o usuário se válido, null se inválido. */
async validarCredenciais(login: string, senha: string): Promise<Usuario | null>

/** Gera token JWT para o usuário validado. */
async gerarToken(usuario: Usuario): Promise<AutenticacaoTokenDto>

/** Endpoint de login: valida credenciais e retorna token. */
async login(dto: AutenticacaoLoginDto): Promise<StandardResponse<AutenticacaoTokenDto>>
```

Regras:
- Se login não existe ou senha incorreta → `BusinessException('Credenciais inválidas')` (mesma mensagem para os dois casos — não revelar qual campo está errado)
- Se usuário está INATIVO → `BusinessException('Usuário inativo')`

### autenticacao.controller.ts

```
POST /api/v1/autenticacao/login  @Public()  → login
```

---

## Registro Global dos Guards no AppModule

Após criar os guards, registrá-los globalmente via `APP_GUARD` no `CoreModule`
ou `AppModule`, nessa ordem:

```typescript
{ provide: APP_GUARD, useClass: JwtAuthGuard },  // 1º: verifica JWT
{ provide: APP_GUARD, useClass: GestorGuard },    // 2º: verifica tipo
```

---

## Adicionar Guards ao UsuarioController

Após registrar os guards globalmente, adicionar as restrições ao `UsuarioController`:

```
POST   /usuario          @GestorOnly()
GET    /usuario          @GestorOnly()
GET    /usuario/:id      (qualquer autenticado — gestor vê todos, dev só o próprio)
PUT    /usuario/:id      @GestorOnly() para outros; dev pode atualizar o próprio
DELETE /usuario/:id      @GestorOnly()
PATCH  /usuario/:id/senha (qualquer autenticado — mas validar na service)
```

Na service de usuario, `recuperar` e `atualizar` devem receber o `usuarioAtivo`
como parâmetro para validar permissão de desenvolvedor acessar apenas o próprio perfil.

---

## NÃO implementar nesta task

- Refresh token
- Recuperação de senha
- Autenticação social (OAuth)
- Qualquer lógica de frontend
