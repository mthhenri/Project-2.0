import { ArmazenamentoDoChat } from './armazenamento-do-chat';
import { EventosDoChat } from './eventos-do-chat';
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

export interface ConfiguracaoGoogle {
  /** Chave da API do Gemini. Sem ela, o provedor Google fica indisponível. */
  apiKey: string | undefined;
}

export interface ConfiguracaoOpenAi {
  apiKey: string | undefined;
}

export interface ConfiguracaoChat {
  armazenamento: ArmazenamentoDoChat;
  /** Barramento dos eventos do chat entre colaboradores (task 209). */
  eventos: EventosDoChat;
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
  google:      ConfiguracaoGoogle;
  openAi:      ConfiguracaoOpenAi;
  chat:        ConfiguracaoChat;
  openSearch:  ConfiguracaoOpenSearch;
  elasticsearch: ConfiguracaoElasticsearch;
  aplicacao:   ConfiguracaoAplicacao;
  negocio:     ConfiguracaoNegocio;
  desktop:     ConfiguracaoDesktop;
}
