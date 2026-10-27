import { Module } from '@nestjs/common';
import { ConfigModule } from '../../config/config.module';
import { ChatModule } from '../chat/chat.module';
import { ConfiguracaoIaModule } from '../configuracao-ia/configuracao-ia.module';
import { IaCustoController } from './controllers/ia-custo.controller';
import { IaCustoService } from './services/ia-custo.service';
import { IaUsoService } from './services/ia-uso.service';

@Module({
  imports:     [ConfigModule, ConfiguracaoIaModule, ChatModule],
  controllers: [IaCustoController],
  providers:   [IaCustoService, IaUsoService],
  exports:     [IaUsoService],
})
export class IaCustoModule {}
