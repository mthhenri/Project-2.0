import { Module } from '@nestjs/common';
import { DemandaController } from './controllers/demanda.controller';
import { DemandaService } from './services/demanda.service';
import { DemandaRepository } from './repositories/demanda.repository';
import { TagModule } from '../tag/tag.module';
import { UsuarioModule } from '../usuario/usuario.module';

@Module({
  imports:     [TagModule, UsuarioModule],
  controllers: [DemandaController],
  providers:   [DemandaService, DemandaRepository],
  exports:     [DemandaService, DemandaRepository],
})
export class DemandaModule {}
