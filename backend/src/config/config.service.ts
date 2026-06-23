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
        ssl:     this.opcional('DB_SSL') === 'true',
      },
      jwt: {
        secreto:   this.obrigatoria('JWT_SECRETO'),
        expiracao: this.obrigatoria('JWT_EXPIRACAO'),
      },
      anthropic: {
        apiKey:       this.opcional('ANTHROPIC_API_KEY'),
        modelo:       this.opcional('ANTHROPIC_MODELO') ?? 'claude-sonnet-4-6',
        maximoTokens: Number(this.opcional('ANTHROPIC_MAXIMO_TOKENS') ?? '1024'),
      },
      aplicacao: {
        porta:      Number(this.opcional('PORT') ?? this.obrigatoria('APP_PORTA')),
        ambiente:   this.obrigatoria('APP_AMBIENTE'),
        corsOrigem: this.opcional('APP_CORS_ORIGEM'),
      },
      negocio: {
        intervaloMinimoMinutos: Number(this.obrigatoria('INTERVALO_MINIMO_MINUTOS')),
      },
    };
  }

  /** Retorna toda a configuração tipada. */
  obter(): Configuracao {
    return this.configuracao;
  }

  /** Lê uma variável obrigatória. Lança erro na inicialização se ausente. */
  private obrigatoria(chave: string): string {
    const valor = process.env[chave];
    if (!valor) {
      throw new Error(`Variável de ambiente obrigatória ausente: ${chave}`);
    }
    return valor;
  }

  /** Lê uma variável opcional. Retorna undefined quando ausente ou vazia. */
  private opcional(chave: string): string | undefined {
    const valor = process.env[chave];
    return valor ? valor : undefined;
  }
}
