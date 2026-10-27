import { Module } from '@nestjs/common';
import { DemandaModule } from '../demanda/demanda.module';
import { IaCustoModule } from '../ia-custo/ia-custo.module';
import { IaModule } from '../ia/ia.module';
import { PromptModule } from '../prompt/prompt.module';
import { AssistenteController } from './controllers/assistente.controller';
import { AssistenteService } from './services/assistente.service';

@Module({
  imports: [IaModule, DemandaModule, IaCustoModule, PromptModule],
  controllers: [AssistenteController],
  providers: [AssistenteService],
})
export class AssistenteModule {}
