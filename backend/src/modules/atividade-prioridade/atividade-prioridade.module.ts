import { Module } from '@nestjs/common';
import { AtividadePrioridadeController } from './controllers/atividade-prioridade.controller';
import { AtividadePrioridadeService } from './services/atividade-prioridade.service';
import { AtividadePrioridadeRepository } from './repositories/atividade-prioridade.repository';

@Module({
  controllers: [AtividadePrioridadeController],
  providers:   [AtividadePrioridadeService, AtividadePrioridadeRepository],
  exports:     [AtividadePrioridadeService],
})
export class AtividadePrioridadeModule {}
