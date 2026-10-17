import { Module } from '@nestjs/common';
import { AnotacaoController } from './controllers/anotacao.controller';
import { AnotacaoService } from './services/anotacao.service';
import { AnotacaoRepository } from './repositories/anotacao.repository';

@Module({
  controllers: [AnotacaoController],
  providers:   [AnotacaoService, AnotacaoRepository],
  exports:     [AnotacaoService, AnotacaoRepository],
})
export class AnotacaoModule {}
