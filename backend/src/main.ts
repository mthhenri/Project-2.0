import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  const documentoConfig = new DocumentBuilder()
    .setTitle('Project 2.0 API')
    .setDescription('API de controle de ponto e gestão de projetos')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const documento = SwaggerModule.createDocument(aplicacao, documentoConfig);
  SwaggerModule.setup('api/docs', aplicacao, documento);

  const configService = aplicacao.get(ConfigService);
  await aplicacao.listen(configService.obter().aplicacao.porta);
}

inicializar();
