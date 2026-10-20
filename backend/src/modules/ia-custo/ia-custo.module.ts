import { Module } from '@nestjs/common';
import { ConfiguracaoIaModule } from '../configuracao-ia/configuracao-ia.module';
import { IaCustoController } from './controllers/ia-custo.controller';
import { IaCustoRepository } from './repositories/ia-custo.repository';
import { IaCustoService } from './services/ia-custo.service';

@Module({
  imports:     [ConfiguracaoIaModule],
  controllers: [IaCustoController],
  providers:   [IaCustoService, IaCustoRepository],
  exports:     [IaCustoService],
})
export class IaCustoModule {}
