import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './core/database/database.module';
import { CoreModule } from './core/core.module';
import { AutenticacaoModule } from './modules/autenticacao/autenticacao.module';
import { UsuarioModule } from './modules/usuario/usuario.module';
import { TagModule } from './modules/tag/tag.module';

@Module({
  imports: [ConfigModule, DatabaseModule, CoreModule, AutenticacaoModule, UsuarioModule, TagModule],
})
export class AppModule {}
