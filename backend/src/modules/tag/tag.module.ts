import { Module } from '@nestjs/common';
import { TagController } from './controllers/tag.controller';
import { TagService } from './services/tag.service';
import { TagRepository } from './repositories/tag.repository';

@Module({
  controllers: [TagController],
  providers:   [TagService, TagRepository],
  exports:     [TagService, TagRepository],
})
export class TagModule {}
