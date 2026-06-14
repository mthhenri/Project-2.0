import { Module } from '@nestjs/common';
import { AtividadeController } from './controllers/atividade.controller';
import { AtividadeService } from './services/atividade.service';
import { AtividadeRepository } from './repositories/atividade.repository';
import { DemandaModule } from '../demanda/demanda.module';
import { TagModule } from '../tag/tag.module';

@Module({
  imports:     [DemandaModule, TagModule],
  controllers: [AtividadeController],
  providers:   [AtividadeService, AtividadeRepository],
  exports:     [AtividadeService, AtividadeRepository],
})
export class AtividadeModule {}
