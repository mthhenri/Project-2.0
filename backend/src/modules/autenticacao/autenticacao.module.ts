import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '../../config/config.service';
import { UsuarioModule } from '../usuario/usuario.module';
import { AutenticacaoController } from './controllers/autenticacao.controller';
import { AutenticacaoService } from './services/autenticacao.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GestorGuard } from './guards/gestor.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret:       configService.obter().jwt.secreto,
        signOptions:  { expiresIn: configService.obter().jwt.expiracao },
      }),
      inject: [ConfigService],
    }),
    UsuarioModule,
  ],
  controllers: [AutenticacaoController],
  providers: [
    AutenticacaoService,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: GestorGuard },
  ],
})
export class AutenticacaoModule {}
