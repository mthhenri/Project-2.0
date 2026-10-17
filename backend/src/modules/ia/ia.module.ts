import { Module } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { TipoProvedorIaEnum } from '@project20/shared';
import { ConfigModule } from '../../config/config.module';
import { ConfigService } from '../../config/config.service';
import { ConfiguracaoIaModule } from '../configuracao-ia/configuracao-ia.module';
import { AnthropicProvedor, ClienteAnthropic } from './provedores/anthropic.provedor';
import { IA_PROVEDORES, IaProvedores, IaService } from './services/ia.service';

/** Único módulo que importa o SDK de um provedor de IA. */
@Module({
  imports: [ConfigModule, ConfiguracaoIaModule],
  providers: [
    {
      provide: IA_PROVEDORES,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): IaProvedores => {
        const apiKey = configService.obter().anthropic.apiKey;
        const cliente = apiKey ? (new Anthropic({ apiKey }) as unknown as ClienteAnthropic) : null;
        return { [TipoProvedorIaEnum.ANTHROPIC]: new AnthropicProvedor(cliente) };
      },
    },
    IaService,
  ],
  exports: [IaService],
})
export class IaModule {}
