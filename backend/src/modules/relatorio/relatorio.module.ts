import { Module } from '@nestjs/common';
import { RelatorioController } from './controllers/relatorio.controller';
import { RelatorioService } from './services/relatorio.service';
import { ExecucaoModule } from '../execucao/execucao.module';
import { ProjetoModule } from '../projeto/projeto.module';
import { IaModule } from '../ia/ia.module';

@Module({
  imports:     [ExecucaoModule, ProjetoModule, IaModule],
  controllers: [RelatorioController],
  providers:   [RelatorioService],
})
export class RelatorioModule {}
