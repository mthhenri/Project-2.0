import { Module } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { TipoProvedorIaEnum } from '@project20/shared';
import { ConfigModule } from '../../config/config.module';
import { ConfigService } from '../../config/config.service';
import { ConfiguracaoIaModule } from '../configuracao-ia/configuracao-ia.module';
import { IaController } from './controllers/ia.controller';
import { AnthropicProvedor, ClienteAnthropic } from './provedores/anthropic.provedor';
import { ClienteGoogle, GoogleProvedor } from './provedores/google.provedor';
import { ClienteOpenAi, OpenAiProvedor } from './provedores/openai.provedor';
import { IA_PROVEDORES, IaProvedores, IaService } from './services/ia.service';

/** Único módulo que importa o SDK de um provedor de IA (Anthropic, Google e OpenAI). Provedor sem chave no ambiente nasce indisponível e a cadeia o pula. */
/** Os SDKs recebem os parâmetros já montados pelo provedor (o tipo exato de cada um fica no provedor, testável sem SDK). */
function criarClienteGoogle(apiKey: string): ClienteGoogle {
  const sdk = new GoogleGenAI({ apiKey });
  return {
    gerar: (parametros) => sdk.models.generateContent(parametros as never) as unknown as ReturnType<ClienteGoogle['gerar']>,
    transmitir: (parametros) => sdk.models.generateContentStream(parametros as never) as unknown as ReturnType<ClienteGoogle['transmitir']>,
  };
}

function criarClienteOpenAi(apiKey: string): ClienteOpenAi {
  const sdk = new OpenAI({ apiKey });
  return {
    gerar: (parametros) => sdk.chat.completions.create(parametros as never) as unknown as ReturnType<ClienteOpenAi['gerar']>,
    transmitir: (parametros) => sdk.chat.completions.create(parametros as never) as unknown as ReturnType<ClienteOpenAi['transmitir']>,
  };
}

@Module({
  imports: [ConfigModule, ConfiguracaoIaModule],
  controllers: [IaController],
  providers: [
    {
      provide: IA_PROVEDORES,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): IaProvedores => {
        const { anthropic, google, openAi } = configService.obter();
        const clienteAnthropic = anthropic.apiKey ? (new Anthropic({ apiKey: anthropic.apiKey }) as unknown as ClienteAnthropic) : null;
        return {
          [TipoProvedorIaEnum.ANTHROPIC]: new AnthropicProvedor(clienteAnthropic),
          [TipoProvedorIaEnum.GOOGLE]: new GoogleProvedor(google.apiKey ? criarClienteGoogle(google.apiKey) : null),
          [TipoProvedorIaEnum.OPENAI]: new OpenAiProvedor(openAi.apiKey ? criarClienteOpenAi(openAi.apiKey) : null),
        };
      },
    },
    IaService,
  ],
  exports: [IaService],
})
export class IaModule {}
