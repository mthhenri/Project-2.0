import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

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

  const porta = process.env.APP_PORTA ?? 3000;
  await aplicacao.listen(porta);
}

inicializar();
