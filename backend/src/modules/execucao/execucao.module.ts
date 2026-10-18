import { Module, OnModuleInit } from '@nestjs/common';
import { ExecucaoController } from './controllers/execucao.controller';
import { ExecucaoService } from './services/execucao.service';
import { ExecucaoRepository } from './repositories/execucao.repository';
import { AtividadeModule } from '../atividade/atividade.module';
import { FerramentaIaModule } from '../ferramenta-ia/ferramenta-ia.module';
import { FerramentaIaRegistro } from '../ferramenta-ia/services/ferramenta-ia.registro';
import { ExecutorPropostaIaRegistro } from '../proposta-ia/domain/executor-proposta-ia';
import { PropostaIaModule } from '../proposta-ia/proposta-ia.module';
import { DemandaModule } from '../demanda/demanda.module';
import { ConfiguracaoIaModule } from '../configuracao-ia/configuracao-ia.module';
import { IaModule } from '../ia/ia.module';
import { PromptModule } from '../prompt/prompt.module';
import { DescreverExecucaoExecutor } from './executores/descrever-execucao.executor';
import { ProporDescreverExecucaoFerramenta } from './ferramentas/propor-descrever-execucao.ferramenta';
import { IniciarExecucaoExecutor } from './executores/iniciar-execucao.executor';
import { PausarExecucaoExecutor } from './executores/pausar-execucao.executor';
import { ProporIniciarExecucaoFerramenta } from './ferramentas/propor-iniciar-execucao.ferramenta';
import { ProporPausarExecucaoFerramenta } from './ferramentas/propor-pausar-execucao.ferramenta';
import { ConsultarExecucaoAtivaFerramenta } from './ferramentas/consultar-execucao-ativa.ferramenta';
import { ListarMinhasExecucoesDoDiaFerramenta } from './ferramentas/listar-minhas-execucoes-do-dia.ferramenta';

@Module({
  imports:     [AtividadeModule, DemandaModule, FerramentaIaModule, PropostaIaModule, IaModule, PromptModule, ConfiguracaoIaModule],
  controllers: [ExecucaoController],
  providers:   [
    ExecucaoService,
    ExecucaoRepository,
    ConsultarExecucaoAtivaFerramenta,
    ListarMinhasExecucoesDoDiaFerramenta,
    ProporIniciarExecucaoFerramenta,
    ProporPausarExecucaoFerramenta,
    IniciarExecucaoExecutor,
    PausarExecucaoExecutor,
    ProporDescreverExecucaoFerramenta,
    DescreverExecucaoExecutor,
  ],
  exports:     [ExecucaoService, ExecucaoRepository],
})
export class ExecucaoModule implements OnModuleInit {
  constructor(
    private readonly registroDeFerramentas: FerramentaIaRegistro,
    private readonly consultarExecucaoAtiva: ConsultarExecucaoAtivaFerramenta,
    private readonly listarMinhasExecucoesDoDia: ListarMinhasExecucoesDoDiaFerramenta,
    private readonly proporIniciarExecucao: ProporIniciarExecucaoFerramenta,
    private readonly proporPausarExecucao: ProporPausarExecucaoFerramenta,
    private readonly registroDeExecutores: ExecutorPropostaIaRegistro,
    private readonly iniciarExecucaoExecutor: IniciarExecucaoExecutor,
    private readonly pausarExecucaoExecutor: PausarExecucaoExecutor,
    private readonly proporDescreverExecucao: ProporDescreverExecucaoFerramenta,
    private readonly descreverExecucaoExecutor: DescreverExecucaoExecutor,
  ) {}

  /** As ferramentas de IA do domínio de execução se registram aqui. */
  onModuleInit(): void {
    this.registroDeFerramentas.registrar(this.consultarExecucaoAtiva);
    this.registroDeFerramentas.registrar(this.listarMinhasExecucoesDoDia);
    this.registroDeFerramentas.registrar(this.proporIniciarExecucao);
    this.registroDeFerramentas.registrar(this.proporPausarExecucao);
    this.registroDeExecutores.registrar(this.iniciarExecucaoExecutor);
    this.registroDeExecutores.registrar(this.pausarExecucaoExecutor);
    this.registroDeFerramentas.registrar(this.proporDescreverExecucao);
    this.registroDeExecutores.registrar(this.descreverExecucaoExecutor);
  }
}
