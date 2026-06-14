import { Module } from '@nestjs/common';
import { ExecucaoController } from './controllers/execucao.controller';
import { ExecucaoService } from './services/execucao.service';
import { ExecucaoRepository } from './repositories/execucao.repository';
import { AtividadeModule } from '../atividade/atividade.module';

@Module({
  imports:     [AtividadeModule],
  controllers: [ExecucaoController],
  providers:   [ExecucaoService, ExecucaoRepository],
  exports:     [ExecucaoService, ExecucaoRepository],
})
export class ExecucaoModule {}
