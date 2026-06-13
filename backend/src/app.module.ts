import { Module } from '@nestjs/common';
import { DatabaseModule } from './core/database/database.module';

@Module({
  imports: [DatabaseModule],
})
export class AppModule {}
