import { Module } from '@nestjs/common';
import { PropostaIaController } from './controllers/proposta-ia.controller';
import { PropostaIaService } from './services/proposta-ia.service';
import { PropostaIaRepository } from './repositories/proposta-ia.repository';
import { ExecutorPropostaIaRegistro } from './domain/executor-proposta-ia';

@Module({
  controllers: [PropostaIaController],
  providers:   [PropostaIaService, PropostaIaRepository, ExecutorPropostaIaRegistro],
  exports:     [PropostaIaService, ExecutorPropostaIaRegistro],
})
export class PropostaIaModule {}
