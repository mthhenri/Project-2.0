import { Module } from '@nestjs/common';
import { ModelagemController } from './controllers/modelagem.controller';
import { ModelagemRepository } from './repositories/modelagem.repository';
import { ModelagemService } from './services/modelagem.service';

@Module({
  controllers: [ModelagemController],
  providers:   [ModelagemService, ModelagemRepository],
})
export class ModelagemModule {}
