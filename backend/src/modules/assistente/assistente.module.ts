import { Module } from '@nestjs/common';
import { IaModule } from '../ia/ia.module';
import { AssistenteController } from './controllers/assistente.controller';
import { AssistenteService } from './services/assistente.service';

@Module({
  imports: [IaModule],
  controllers: [AssistenteController],
  providers: [AssistenteService],
})
export class AssistenteModule {}
