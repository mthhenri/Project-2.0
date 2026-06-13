import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';

async function inicializar(): Promise<void> {
  const aplicacao = await NestFactory.create(AppModule);

  aplicacao.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: true,
      transform:            true,
    }),
  );

  aplicacao.setGlobalPrefix('api/v1');

  const configService = aplicacao.get(ConfigService);
  await aplicacao.listen(configService.app.porta);
}

inicializar();
