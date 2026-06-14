import { Module } from '@nestjs/common';
import { ProjetoController } from './controllers/projeto.controller';
import { ProjetoService } from './services/projeto.service';
import { ProjetoRepository } from './repositories/projeto.repository';

@Module({
  controllers: [ProjetoController],
  providers:   [ProjetoService, ProjetoRepository],
  exports:     [ProjetoService, ProjetoRepository],
})
export class ProjetoModule {}
