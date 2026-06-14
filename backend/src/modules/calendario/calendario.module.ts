import { Module } from '@nestjs/common';
import { CalendarioController } from './controllers/calendario.controller';
import { CalendarioService } from './services/calendario.service';
import { CalendarioRepository } from './repositories/calendario.repository';

@Module({
  controllers: [CalendarioController],
  providers:   [CalendarioService, CalendarioRepository],
  exports:     [CalendarioService, CalendarioRepository],
})
export class CalendarioModule {}
