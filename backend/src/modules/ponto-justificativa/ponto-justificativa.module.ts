import { Module } from '@nestjs/common';
import { PontoJustificativaController } from './controllers/ponto-justificativa.controller';
import { PontoJustificativaService } from './services/ponto-justificativa.service';
import { PontoJustificativaRepository } from './repositories/ponto-justificativa.repository';
import { UsuarioModule } from '../usuario/usuario.module';

@Module({
  imports:     [UsuarioModule],
  controllers: [PontoJustificativaController],
  providers:   [PontoJustificativaService, PontoJustificativaRepository],
  exports:     [PontoJustificativaService, PontoJustificativaRepository],
})
export class PontoJustificativaModule {}
