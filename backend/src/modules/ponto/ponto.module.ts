import { Module } from '@nestjs/common';
import { PontoController } from './controllers/ponto.controller';
import { PontoService } from './services/ponto.service';
import { ExecucaoModule } from '../execucao/execucao.module';
import { CalendarioModule } from '../calendario/calendario.module';
import { UsuarioModule } from '../usuario/usuario.module';
import { PontoJustificativaModule } from '../ponto-justificativa/ponto-justificativa.module';

@Module({
  imports:     [ExecucaoModule, CalendarioModule, UsuarioModule, PontoJustificativaModule],
  controllers: [PontoController],
  providers:   [PontoService],
})
export class PontoModule {}
