export interface DatabaseConfig {
  host: string;
  port: number;
  nome: string;
  usuario: string;
  senha: string;
}

export interface JwtConfig {
  secreto: string;
  expiracao: string;
}

export interface AppConfig {
  porta: number;
  ambiente: string;
}

export interface AnthropicConfig {
  apiKey: string;
  modelo: string;
  maximoTokens: number;
}

export interface RegraConfig {
  intervaloMinimoMinutos: number;
}
