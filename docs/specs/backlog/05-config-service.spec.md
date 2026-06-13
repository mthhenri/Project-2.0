# 05 — Config Service

**Depende de:** 02, 04
**Entrega:** ConfigService tipado que centraliza todas as variáveis de ambiente

---

## Objetivo

Criar um serviço de configuração tipado que toda a aplicação usa para acessar
variáveis de ambiente. Nenhum módulo pode usar `process.env` diretamente — tudo
passa pelo ConfigService.

---

## Arquivos a Implementar

```
backend/src/config/
  config.interface.ts
  config.service.ts
  config.module.ts
```

---

## Implementação

### config.interface.ts

```typescript
export interface ConfiguracaoBancoDados {
  host: string;
  porta: number;
  nome: string;
  usuario: string;
  senha: string;
}

export interface ConfiguracaoJwt {
  secreto: string;
  expiracao: string;
}

export interface ConfiguracaoAnthropic {
  apiKey: string;
  modelo: string;
  maximoTokens: number;
}

export interface ConfiguracaoAplicacao {
  porta: number;
  ambiente: string;
}

export interface ConfiguracaoNegocio {
  intervaloMinimoMinutos: number;
}

export interface Configuracao {
  bancoDados:  ConfiguracaoBancoDados;
  jwt:         ConfiguracaoJwt;
  anthropic:   ConfiguracaoAnthropic;
  aplicacao:   ConfiguracaoAplicacao;
  negocio:     ConfiguracaoNegocio;
}
```

### config.service.ts

```typescript
import { Injectable } from '@nestjs/common';
import { Configuracao } from './config.interface';

@Injectable()
export class ConfigService {
  private readonly configuracao: Configuracao;

  constructor() {
    this.configuracao = {
      bancoDados: {
        host:    this.obrigatoria('DB_HOST'),
        porta:   Number(this.obrigatoria('DB_PORT')),
        nome:    this.obrigatoria('DB_NOME'),
        usuario: this.obrigatoria('DB_USUARIO'),
        senha:   this.obrigatoria('DB_SENHA'),
      },
      jwt: {
        secreto:   this.obrigatoria('JWT_SECRETO'),
        expiracao: this.obrigatoria('JWT_EXPIRACAO'),
      },
      anthropic: {
        apiKey:       this.obrigatoria('ANTHROPIC_API_KEY'),
        modelo:       this.obrigatoria('ANTHROPIC_MODELO'),
        maximoTokens: Number(this.obrigatoria('ANTHROPIC_MAXIMO_TOKENS')),
      },
      aplicacao: {
        porta:    Number(this.obrigatoria('APP_PORTA')),
        ambiente: this.obrigatoria('APP_AMBIENTE'),
      },
      negocio: {
        intervaloMinimoMinutos: Number(this.obrigatoria('INTERVALO_MINIMO_MINUTOS')),
      },
    };
  }

  /**
   * Retorna toda a configuração tipada.
   */
  obter(): Configuracao {
    return this.configuracao;
  }

  /**
   * Lê uma variável obrigatória. Lança erro na inicialização se ausente.
   */
  private obrigatoria(chave: string): string {
    const valor = process.env[chave];
    if (!valor) {
      throw new Error(`Variável de ambiente obrigatória ausente: ${chave}`);
    }
    return valor;
  }
}
```

### config.module.ts

```typescript
import { Module, Global } from '@nestjs/common';
import { ConfigService } from './config.service';

@Global()
@Module({
  providers: [ConfigService],
  exports:   [ConfigService],
})
export class ConfigModule {}
```

---

## Integração com DatabaseModule

Atualizar `database.provider.ts` para usar o `ConfigService` ao invés de
`process.env` diretamente:

```typescript
import { ConfigService } from '../../config/config.service';

export const databaseProvider = {
  provide:    DATABASE_CONNECTION,
  inject:     [ConfigService],
  useFactory: (configService: ConfigService) => {
    const { host, porta, nome, usuario, senha } = configService.obter().bancoDados;
    return Knex({
      client: 'pg',
      connection: { host, port: porta, database: nome, user: usuario, password: senha },
      migrations: { directory: './src/database/migrations', extension: 'ts' },
    });
  },
};
```

Registrar `ConfigModule` no `AppModule` antes do `DatabaseModule`.

---

## NÃO implementar nesta task

- Nenhum módulo de negócio
- Nenhuma lógica de autenticação
- Nenhum uso do ConfigService fora do DatabaseProvider por enquanto
- Nenhuma variável de ambiente além das já listadas no .env.example
