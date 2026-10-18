import { Module, OnModuleInit } from '@nestjs/common';
import { AnotacaoController } from './controllers/anotacao.controller';
import { AnotacaoService } from './services/anotacao.service';
import { AnotacaoRepository } from './repositories/anotacao.repository';
import { FerramentaIaModule } from '../ferramenta-ia/ferramenta-ia.module';
import { FerramentaIaRegistro } from '../ferramenta-ia/services/ferramenta-ia.registro';
import { ExecutorPropostaIaRegistro } from '../proposta-ia/domain/executor-proposta-ia';
import { PropostaIaModule } from '../proposta-ia/proposta-ia.module';
import { AnotarPadExecutor } from './executores/anotar-pad.executor';
import { ConsultarPadFerramenta } from './ferramentas/consultar-pad.ferramenta';
import { ProporAnotarPadFerramenta } from './ferramentas/propor-anotar-pad.ferramenta';

@Module({
  imports:     [FerramentaIaModule, PropostaIaModule],
  controllers: [AnotacaoController],
  providers:   [AnotacaoService, AnotacaoRepository, ConsultarPadFerramenta, ProporAnotarPadFerramenta, AnotarPadExecutor],
  exports:     [AnotacaoService, AnotacaoRepository],
})
export class AnotacaoModule implements OnModuleInit {
  constructor(
    private readonly registroDeFerramentas: FerramentaIaRegistro,
    private readonly consultarPad: ConsultarPadFerramenta,
    private readonly proporAnotarPad: ProporAnotarPadFerramenta,
    private readonly registroDeExecutores: ExecutorPropostaIaRegistro,
    private readonly anotarPadExecutor: AnotarPadExecutor,
  ) {}

  /** As ferramentas de IA do pad se registram aqui (a IA só lê e propõe pelo `AnotacaoService`, sempre no pad do usuário do token). */
  onModuleInit(): void {
    this.registroDeFerramentas.registrar(this.consultarPad);
    this.registroDeFerramentas.registrar(this.proporAnotarPad);
    this.registroDeExecutores.registrar(this.anotarPadExecutor);
  }
}
