import { Module } from '@nestjs/common';
import { IaModule } from '../ia/ia.module';
import { PromptController } from './controllers/prompt.controller';
import { PromptService } from './services/prompt.service';
import { PromptTesteService } from './services/prompt-teste.service';
import { PromptRepository } from './repositories/prompt.repository';

@Module({
  imports:     [IaModule],
  controllers: [PromptController],
  providers:   [PromptService, PromptTesteService, PromptRepository],
  exports:     [PromptService],
})
export class PromptModule {}
