import { Injectable } from '@nestjs/common';
import type { AnthropicConfig, AppConfig, DatabaseConfig, JwtConfig, RegraConfig } from './config.interface';

@Injectable()
export class ConfigService {
  get database(): DatabaseConfig {
    return {
      host:    this.obrigatorio('DB_HOST'),
      port:    Number(this.obrigatorio('DB_PORT')),
      nome:    this.obrigatorio('DB_NOME'),
      usuario: this.obrigatorio('DB_USUARIO'),
      senha:   this.obrigatorio('DB_SENHA'),
    };
  }

  get jwt(): JwtConfig {
    return {
      secreto:   this.obrigatorio('JWT_SECRETO'),
      expiracao: this.obrigatorio('JWT_EXPIRACAO'),
    };
  }

  get app(): AppConfig {
    return {
      porta:    Number(process.env['APP_PORTA'] ?? 3000),
      ambiente: process.env['APP_AMBIENTE'] ?? 'development',
    };
  }

  get anthropic(): AnthropicConfig {
    return {
      apiKey:       this.obrigatorio('ANTHROPIC_API_KEY'),
      modelo:       this.obrigatorio('ANTHROPIC_MODELO'),
      maximoTokens: Number(this.obrigatorio('ANTHROPIC_MAXIMO_TOKENS')),
    };
  }

  get regras(): RegraConfig {
    return {
      intervaloMinimoMinutos: Number(this.obrigatorio('INTERVALO_MINIMO_MINUTOS')),
    };
  }

  private obrigatorio(chave: string): string {
    const valor = process.env[chave];
    if (!valor) {
      throw new Error(`Variável de ambiente obrigatória não encontrada: ${chave}`);
    }
    return valor;
  }
}
