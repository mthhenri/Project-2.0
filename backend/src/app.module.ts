import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './core/database/database.module';
import { CoreModule } from './core/core.module';
import { UsuarioModule } from './modules/usuario/usuario.module';

@Module({
  imports: [ConfigModule, DatabaseModule, CoreModule, UsuarioModule],
})
export class AppModule {}
