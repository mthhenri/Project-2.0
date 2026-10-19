import { ArmazenamentoDoChat } from './armazenamento-do-chat';
export interface ConfiguracaoBancoDados {
  host: string;
  porta: number;
  nome: string;
  usuario: string;
  senha: string;
  ssl: boolean;
}

export interface ConfiguracaoJwt {
  secreto: string;
  expiracao: string;
}

export interface ConfiguracaoAnthropic {
  apiKey: string | undefined;
}

export interface ConfiguracaoChat {
  armazenamento: ArmazenamentoDoChat;
}

export interface ConfiguracaoOpenSearch {
  /** Obrigatória só com `CHAT_ARMAZENAMENTO=opensearch`. */
  url: string | undefined;
  usuario: string | undefined;
  senha: string | undefined;
}

export interface ConfiguracaoElasticsearch {
  /** Obrigatória só com `CHAT_ARMAZENAMENTO=elasticsearch`. */
  url: string | undefined;
  usuario: string | undefined;
  senha: string | undefined;
  /** Chave de API (Elastic Cloud); tem prioridade sobre usuário e senha. */
  apiKey: string | undefined;
}

export interface ConfiguracaoAplicacao {
  porta: number;
  ambiente: string;
  corsOrigem: string | undefined;
  fusoHorario: string;
}

export interface ConfiguracaoNegocio {
  intervaloMinimoMinutos: number;
}

export interface ConfiguracaoDesktop {
  /** Pasta com os `Project-Desktop-<versão>.exe` publicados; sem ela não há download (task 198). */
  pastaExecutaveis: string | undefined;
}

export interface Configuracao {
  bancoDados:  ConfiguracaoBancoDados;
  jwt:         ConfiguracaoJwt;
  anthropic:   ConfiguracaoAnthropic;
  chat:        ConfiguracaoChat;
  openSearch:  ConfiguracaoOpenSearch;
  elasticsearch: ConfiguracaoElasticsearch;
  aplicacao:   ConfiguracaoAplicacao;
  negocio:     ConfiguracaoNegocio;
  desktop:     ConfiguracaoDesktop;
}
