import { Module } from '@nestjs/common';
import { ConfiguracaoIaModule } from '../configuracao-ia/configuracao-ia.module';
import { PropostaIaController } from './controllers/proposta-ia.controller';
import { PropostaIaService } from './services/proposta-ia.service';
import { PropostaIaRepository } from './repositories/proposta-ia.repository';
import { ExecutorPropostaIaRegistro } from './domain/executor-proposta-ia';

@Module({
  imports:     [ConfiguracaoIaModule],
  controllers: [PropostaIaController],
  providers:   [PropostaIaService, PropostaIaRepository, ExecutorPropostaIaRegistro],
  exports:     [PropostaIaService, ExecutorPropostaIaRegistro],
})
export class PropostaIaModule {}
