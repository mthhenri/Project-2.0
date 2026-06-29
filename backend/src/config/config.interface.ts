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
  modelo: string;
  maximoTokens: number;
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

export interface Configuracao {
  bancoDados:  ConfiguracaoBancoDados;
  jwt:         ConfiguracaoJwt;
  anthropic:   ConfiguracaoAnthropic;
  aplicacao:   ConfiguracaoAplicacao;
  negocio:     ConfiguracaoNegocio;
}
