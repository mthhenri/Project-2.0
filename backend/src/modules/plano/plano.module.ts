import { Module, OnModuleInit } from '@nestjs/common';
import { PlanoController } from './controllers/plano.controller';
import { PlanoService } from './services/plano.service';
import { PlanoRepository } from './repositories/plano.repository';
import { PlanoPontoRepository } from './repositories/plano-ponto.repository';
import { PlanoPontoService } from './services/plano-ponto.service';
import { PlanoFonteRepository } from './repositories/plano-fonte.repository';
import { PlanoFonteService } from './services/plano-fonte.service';
import { AnotarPontoEmAbertoFerramenta, ListarPontosDoPlanoFerramenta, ResolverPontoDoPlanoFerramenta } from './ferramentas/pontos-do-plano.ferramentas';
import { DemandaModule } from '../demanda/demanda.module';
import { ProjetoModule } from '../projeto/projeto.module';
import { FerramentaIaModule } from '../ferramenta-ia/ferramenta-ia.module';
import { FerramentaIaRegistro } from '../ferramenta-ia/services/ferramenta-ia.registro';
import { PropostaIaModule } from '../proposta-ia/proposta-ia.module';
import { ExecutorPropostaIaRegistro } from '../proposta-ia/domain/executor-proposta-ia';
import { ConsultarPlanoFerramenta } from './ferramentas/consultar-plano.ferramenta';
import { EscreverNoPlanoFerramenta } from './ferramentas/escrever-no-plano.ferramenta';
import { ProporAlterarTrechoDoPlanoFerramenta } from './ferramentas/propor-alterar-trecho-do-plano.ferramenta';
import { AlterarTrechoDoPlanoExecutor } from './executores/alterar-trecho-do-plano.executor';

@Module({
  imports:     [DemandaModule, ProjetoModule, FerramentaIaModule, PropostaIaModule],
  controllers: [PlanoController],
  providers:   [
    PlanoService,
    PlanoRepository,
    PlanoPontoRepository,
    PlanoPontoService,
    PlanoFonteRepository,
    PlanoFonteService,
    AnotarPontoEmAbertoFerramenta,
    ResolverPontoDoPlanoFerramenta,
    ListarPontosDoPlanoFerramenta,
    ConsultarPlanoFerramenta,
    EscreverNoPlanoFerramenta,
    ProporAlterarTrechoDoPlanoFerramenta,
    AlterarTrechoDoPlanoExecutor,
  ],
  exports:     [PlanoService, PlanoRepository, PlanoPontoService, PlanoFonteService],
})
export class PlanoModule implements OnModuleInit {
  constructor(
    private readonly registroDeFerramentas: FerramentaIaRegistro,
    private readonly registroDeExecutores: ExecutorPropostaIaRegistro,
    private readonly consultarPlano: ConsultarPlanoFerramenta,
    private readonly escreverNoPlano: EscreverNoPlanoFerramenta,
    private readonly proporAlterarTrecho: ProporAlterarTrechoDoPlanoFerramenta,
    private readonly alterarTrechoExecutor: AlterarTrechoDoPlanoExecutor,
    private readonly anotarPonto: AnotarPontoEmAbertoFerramenta,
    private readonly resolverPonto: ResolverPontoDoPlanoFerramenta,
    private readonly listarPontos: ListarPontosDoPlanoFerramenta,
  ) {}

  /** As ferramentas do planejamento (só a conversa do plano as vê) e o executor da alteração de trecho se registram aqui. */
  onModuleInit(): void {
    this.registroDeFerramentas.registrar(this.consultarPlano);
    this.registroDeFerramentas.registrar(this.escreverNoPlano);
    this.registroDeFerramentas.registrar(this.proporAlterarTrecho);
    this.registroDeExecutores.registrar(this.alterarTrechoExecutor);
    this.registroDeFerramentas.registrar(this.anotarPonto);
    this.registroDeFerramentas.registrar(this.resolverPonto);
    this.registroDeFerramentas.registrar(this.listarPontos);
  }
}
