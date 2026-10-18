import { Module, OnModuleInit } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { ConfiguracaoIaModule } from '../configuracao-ia/configuracao-ia.module';
import { ExecucaoModule } from '../execucao/execucao.module';
import { FerramentaIaModule } from '../ferramenta-ia/ferramenta-ia.module';
import { FerramentaIaRegistro } from '../ferramenta-ia/services/ferramenta-ia.registro';
import { ExecutorPropostaIaRegistro } from '../proposta-ia/domain/executor-proposta-ia';
import { PropostaIaModule } from '../proposta-ia/proposta-ia.module';
import { CheckinController } from './controllers/checkin.controller';
import { SuspenderCheckinExecutor } from './executores/suspender-checkin.executor';
import { ProporRetomarCheckinFerramenta, ProporSuspenderCheckinFerramenta } from './ferramentas/propor-checkin.ferramentas';
import { CheckinSuspensaoService } from './services/checkin-suspensao.service';
import { CheckinService } from './services/checkin.service';

/** Check-in do desenvolvedor: a suspensão por reunião (task 148), a situação e a conversa do check-in (task 149). */
@Module({
  imports:     [FerramentaIaModule, PropostaIaModule, ConfiguracaoIaModule, ChatModule, ExecucaoModule],
  controllers: [CheckinController],
  providers:   [CheckinSuspensaoService, CheckinService, SuspenderCheckinExecutor, ProporSuspenderCheckinFerramenta, ProporRetomarCheckinFerramenta],
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
