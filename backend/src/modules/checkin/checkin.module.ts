import { Module, OnModuleInit } from '@nestjs/common';
import { ConfiguracaoIaModule } from '../configuracao-ia/configuracao-ia.module';
import { FerramentaIaModule } from '../ferramenta-ia/ferramenta-ia.module';
import { FerramentaIaRegistro } from '../ferramenta-ia/services/ferramenta-ia.registro';
import { ExecutorPropostaIaRegistro } from '../proposta-ia/domain/executor-proposta-ia';
import { PropostaIaModule } from '../proposta-ia/proposta-ia.module';
import { CheckinController } from './controllers/checkin.controller';
import { SuspenderCheckinExecutor } from './executores/suspender-checkin.executor';
import { ProporRetomarCheckinFerramenta, ProporSuspenderCheckinFerramenta } from './ferramentas/propor-checkin.ferramentas';
import { CheckinSuspensaoService } from './services/checkin-suspensao.service';

/** Check-in do desenvolvedor. Por enquanto, a suspensão por reunião (task 148); o resto chega com o bloco 7. */
@Module({
  imports:     [FerramentaIaModule, PropostaIaModule, ConfiguracaoIaModule],
  controllers: [CheckinController],
  providers:   [CheckinSuspensaoService, SuspenderCheckinExecutor, ProporSuspenderCheckinFerramenta, ProporRetomarCheckinFerramenta],
  exports:     [CheckinSuspensaoService],
})
export class CheckinModule implements OnModuleInit {
  constructor(
    private readonly registroDeFerramentas: FerramentaIaRegistro,
    private readonly registroDeExecutores: ExecutorPropostaIaRegistro,
    private readonly suspenderCheckinExecutor: SuspenderCheckinExecutor,
    private readonly proporSuspender: ProporSuspenderCheckinFerramenta,
    private readonly proporRetomar: ProporRetomarCheckinFerramenta,
  ) {}

  onModuleInit(): void {
    this.registroDeFerramentas.registrar(this.proporSuspender);
    this.registroDeFerramentas.registrar(this.proporRetomar);
    this.registroDeExecutores.registrar(this.suspenderCheckinExecutor);
  }
}
