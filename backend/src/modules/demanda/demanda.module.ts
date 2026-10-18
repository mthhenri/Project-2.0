import { Module, OnModuleInit } from '@nestjs/common';
import { DemandaController } from './controllers/demanda.controller';
import { DemandaService } from './services/demanda.service';
import { DemandaRepository } from './repositories/demanda.repository';
import { TagModule } from '../tag/tag.module';
import { UsuarioModule } from '../usuario/usuario.module';
import { FerramentaIaModule } from '../ferramenta-ia/ferramenta-ia.module';
import { FerramentaIaRegistro } from '../ferramenta-ia/services/ferramenta-ia.registro';
import { ExecutorPropostaIaRegistro } from '../proposta-ia/domain/executor-proposta-ia';
import { PropostaIaModule } from '../proposta-ia/proposta-ia.module';
import { ProjetoModule } from '../projeto/projeto.module';
import { CriarDemandaExecutor } from './executores/criar-demanda.executor';
import { ConsultarGrafoDoProjetoFerramenta } from './ferramentas/consultar-grafo-do-projeto.ferramenta';
import { ListarDemandasDoProjetoFerramenta } from './ferramentas/listar-demandas-do-projeto.ferramenta';
import { ListarMinhasDemandasFerramenta } from './ferramentas/listar-minhas-demandas.ferramenta';
import { ProporCriarDemandaFerramenta } from './ferramentas/propor-criar-demanda.ferramenta';

@Module({
  imports:     [TagModule, UsuarioModule, FerramentaIaModule, PropostaIaModule, ProjetoModule],
  controllers: [DemandaController],
  providers:   [DemandaService, DemandaRepository, ListarMinhasDemandasFerramenta, ListarDemandasDoProjetoFerramenta, ConsultarGrafoDoProjetoFerramenta, ProporCriarDemandaFerramenta, CriarDemandaExecutor],
  exports:     [DemandaService, DemandaRepository],
})
export class DemandaModule implements OnModuleInit {
  constructor(
    private readonly registroDeFerramentas: FerramentaIaRegistro,
    private readonly listarMinhasDemandas: ListarMinhasDemandasFerramenta,
    private readonly listarDemandasDoProjeto: ListarDemandasDoProjetoFerramenta,
    private readonly consultarGrafoDoProjeto: ConsultarGrafoDoProjetoFerramenta,
    private readonly proporCriarDemanda: ProporCriarDemandaFerramenta,
    private readonly registroDeExecutores: ExecutorPropostaIaRegistro,
    private readonly criarDemandaExecutor: CriarDemandaExecutor,
  ) {}

  /** As ferramentas de IA do domínio de demanda se registram aqui. */
  onModuleInit(): void {
    this.registroDeFerramentas.registrar(this.listarMinhasDemandas);
    this.registroDeFerramentas.registrar(this.listarDemandasDoProjeto);
    this.registroDeFerramentas.registrar(this.consultarGrafoDoProjeto);
    this.registroDeFerramentas.registrar(this.proporCriarDemanda);
    this.registroDeExecutores.registrar(this.criarDemandaExecutor);
  }
}
