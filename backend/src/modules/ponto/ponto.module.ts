import { Module, OnModuleInit } from '@nestjs/common';
import { PontoController } from './controllers/ponto.controller';
import { PontoService } from './services/ponto.service';
import { ExecucaoModule } from '../execucao/execucao.module';
import { CalendarioModule } from '../calendario/calendario.module';
import { UsuarioModule } from '../usuario/usuario.module';
import { PontoJustificativaModule } from '../ponto-justificativa/ponto-justificativa.module';
import { FerramentaIaModule } from '../ferramenta-ia/ferramenta-ia.module';
import { FerramentaIaRegistro } from '../ferramenta-ia/services/ferramenta-ia.registro';
import { ConsultarPontoDoDiaFerramenta } from './ferramentas/consultar-ponto-do-dia.ferramenta';
import { ConsultarPontoDoMesFerramenta } from './ferramentas/consultar-ponto-do-mes.ferramenta';
import { ExecutorPropostaIaRegistro } from '../proposta-ia/domain/executor-proposta-ia';
import { PropostaIaModule } from '../proposta-ia/proposta-ia.module';
import { JustificarPontoExecutor } from './executores/justificar-ponto.executor';
import { ProporJustificarPontoFerramenta } from './ferramentas/propor-justificar-ponto.ferramenta';

@Module({
  imports:     [ExecucaoModule, CalendarioModule, UsuarioModule, PontoJustificativaModule, FerramentaIaModule, PropostaIaModule],
  controllers: [PontoController],
  providers:   [PontoService, ConsultarPontoDoDiaFerramenta, ConsultarPontoDoMesFerramenta, ProporJustificarPontoFerramenta, JustificarPontoExecutor],
})
export class PontoModule implements OnModuleInit {
  constructor(
    private readonly registroDeFerramentas: FerramentaIaRegistro,
    private readonly consultarPontoDoDia: ConsultarPontoDoDiaFerramenta,
    private readonly consultarPontoDoMes: ConsultarPontoDoMesFerramenta,
    private readonly proporJustificarPonto: ProporJustificarPontoFerramenta,
    private readonly registroDeExecutores: ExecutorPropostaIaRegistro,
    private readonly justificarPontoExecutor: JustificarPontoExecutor,
  ) {}

  /** As ferramentas de IA do ponto se registram aqui (leitura, pela mesma service da tela). */
  onModuleInit(): void {
    this.registroDeFerramentas.registrar(this.consultarPontoDoDia);
    this.registroDeFerramentas.registrar(this.consultarPontoDoMes);
    this.registroDeFerramentas.registrar(this.proporJustificarPonto);
    this.registroDeExecutores.registrar(this.justificarPontoExecutor);
  }
}
