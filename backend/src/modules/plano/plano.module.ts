import { Module } from '@nestjs/common';
import { PlanoController } from './controllers/plano.controller';
import { PlanoService } from './services/plano.service';
import { PlanoRepository } from './repositories/plano.repository';
import { DemandaModule } from '../demanda/demanda.module';
import { ProjetoModule } from '../projeto/projeto.module';

@Module({
  imports:     [DemandaModule, ProjetoModule],
  controllers: [PlanoController],
  providers:   [PlanoService, PlanoRepository],
  exports:     [PlanoService, PlanoRepository],
})
export class PlanoModule {}
