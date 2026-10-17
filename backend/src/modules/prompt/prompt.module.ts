import { Module } from '@nestjs/common';
import { PromptController } from './controllers/prompt.controller';
import { PromptService } from './services/prompt.service';
import { PromptRepository } from './repositories/prompt.repository';

@Module({
  controllers: [PromptController],
  providers:   [PromptService, PromptRepository],
  exports:     [PromptService],
})
export class PromptModule {}
