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
}
