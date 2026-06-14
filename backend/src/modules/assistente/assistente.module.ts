import { Module } from '@nestjs/common';
import { ConfigModule } from '../../config/config.module';
import { AssistenteController } from './controllers/assistente.controller';
import { AssistenteService } from './services/assistente.service';

@Module({
  imports: [ConfigModule],
  controllers: [AssistenteController],
  providers: [AssistenteService],
})
export class AssistenteModule {}
