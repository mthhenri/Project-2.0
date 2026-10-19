import { Module } from '@nestjs/common';
import { ConfigModule } from '../../config/config.module';
import { DesktopController } from './controllers/desktop.controller';
import { DesktopService } from './services/desktop.service';

@Module({
  imports:     [ConfigModule],
  controllers: [DesktopController],
  providers:   [DesktopService],
})
export class DesktopModule {}
