import { Injectable } from '@nestjs/common';
import { lerArmazenamentoDoChat } from './armazenamento-do-chat';
import { lerEventosDoChat } from './eventos-do-chat';
import { Configuracao } from './config.interface';

@Injectable()
export class ConfigService {
  private readonly configuracao: Configuracao;

  constructor() {
    const armazenamentoDoChat = lerArmazenamentoDoChat(this.opcional('CHAT_ARMAZENAMENTO'));
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
        apiKey: this.opcional('ANTHROPIC_API_KEY'),
      },
      google: {
        apiKey: this.opcional('GOOGLE_API_KEY'),
      },
      openAi: {
        apiKey: this.opcional('OPENAI_API_KEY'),
      },
      chat: { armazenamento: armazenamentoDoChat, eventos: lerEventosDoChat(this.opcional('CHAT_EVENTOS')) },
      openSearch: {
        url:     armazenamentoDoChat === 'opensearch' ? this.obrigatoria('OPENSEARCH_URL') : this.opcional('OPENSEARCH_URL'),
        usuario: this.opcional('OPENSEARCH_USUARIO'),
        senha:   this.opcional('OPENSEARCH_SENHA'),
      },
      elasticsearch: {
        url:     armazenamentoDoChat === 'elasticsearch' ? this.obrigatoria('ELASTICSEARCH_URL') : this.opcional('ELASTICSEARCH_URL'),
        usuario: this.opcional('ELASTICSEARCH_USUARIO'),
        senha:   this.opcional('ELASTICSEARCH_SENHA'),
        apiKey:  this.opcional('ELASTICSEARCH_API_KEY'),
      },
      aplicacao: {
        porta:       Number(this.opcional('PORT') ?? this.obrigatoria('APP_PORTA')),
        ambiente:    this.obrigatoria('APP_AMBIENTE'),
        corsOrigem:  this.opcional('APP_CORS_ORIGEM'),
        fusoHorario: this.opcional('APP_TIMEZONE') ?? 'America/Sao_Paulo',
      },
      negocio: {
        intervaloMinimoMinutos: Number(this.obrigatoria('INTERVALO_MINIMO_MINUTOS')),
      },
      desktop: {
        pastaExecutaveis: this.opcional('DESKTOP_PASTA_EXECUTAVEIS'),
      },
      buscaWeb: {
        chave: this.opcional('BUSCA_WEB_CHAVE'),
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
