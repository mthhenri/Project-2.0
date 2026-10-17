import { Module } from '@nestjs/common';
import { ConfiguracaoIaController } from './controllers/configuracao-ia.controller';
import { ConfiguracaoIaService } from './services/configuracao-ia.service';
import { ConfiguracaoIaRepository } from './repositories/configuracao-ia.repository';

@Module({
  controllers: [ConfiguracaoIaController],
  providers:   [ConfiguracaoIaService, ConfiguracaoIaRepository],
  exports:     [ConfiguracaoIaService],
})
export class ConfiguracaoIaModule {}
