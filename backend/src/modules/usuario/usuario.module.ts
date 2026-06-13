import { Module } from '@nestjs/common';
import { UsuarioController } from './controllers/usuario.controller';
import { UsuarioService } from './services/usuario.service';
import { UsuarioRepository } from './repositories/usuario.repository';

@Module({
  controllers: [UsuarioController],
  providers:   [UsuarioService, UsuarioRepository],
  exports:     [UsuarioService, UsuarioRepository],
})
export class UsuarioModule {}
