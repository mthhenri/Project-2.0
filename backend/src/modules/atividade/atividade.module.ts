import { Module, OnModuleInit } from '@nestjs/common';
import { AtividadeController } from './controllers/atividade.controller';
import { AtividadeService } from './services/atividade.service';
import { AtividadeRepository } from './repositories/atividade.repository';
import { DemandaModule } from '../demanda/demanda.module';
import { TagModule } from '../tag/tag.module';
import { FerramentaIaModule } from '../ferramenta-ia/ferramenta-ia.module';
import { FerramentaIaRegistro } from '../ferramenta-ia/services/ferramenta-ia.registro';
import { ExecutorPropostaIaRegistro } from '../proposta-ia/domain/executor-proposta-ia';
import { PropostaIaModule } from '../proposta-ia/proposta-ia.module';
import { CriarAtividadeExecutor } from './executores/criar-atividade.executor';
import { AlterarAtividadeExecutor } from './executores/alterar-atividade.executor';
import { ProporCriarAtividadeFerramenta } from './ferramentas/propor-criar-atividade.ferramenta';
import { ProporAlterarAtividadeFerramenta } from './ferramentas/propor-alterar-atividade.ferramenta';
import { ConsultarDemandaFerramenta } from './ferramentas/consultar-demanda.ferramenta';
import { ListarMinhasAtividadesFerramenta } from './ferramentas/listar-minhas-atividades.ferramenta';

@Module({
  imports:     [DemandaModule, TagModule, FerramentaIaModule, PropostaIaModule],
  controllers: [AtividadeController],
  providers:   [AtividadeService, AtividadeRepository, ListarMinhasAtividadesFerramenta, ConsultarDemandaFerramenta, ProporCriarAtividadeFerramenta, CriarAtividadeExecutor, ProporAlterarAtividadeFerramenta, AlterarAtividadeExecutor],
  exports:     [AtividadeService, AtividadeRepository],
})
export class AtividadeModule implements OnModuleInit {
  constructor(
    private readonly registroDeFerramentas: FerramentaIaRegistro,
    private readonly listarMinhasAtividades: ListarMinhasAtividadesFerramenta,
    private readonly consultarDemanda: ConsultarDemandaFerramenta,
    private readonly proporCriarAtividade: ProporCriarAtividadeFerramenta,
    private readonly registroDeExecutores: ExecutorPropostaIaRegistro,
    private readonly criarAtividadeExecutor: CriarAtividadeExecutor,
    private readonly proporAlterarAtividade: ProporAlterarAtividadeFerramenta,
    private readonly alterarAtividadeExecutor: AlterarAtividadeExecutor,
  ) {}

  /** As ferramentas de IA do domínio de atividade se registram aqui (a IA só lê o que a service entrega ao usuário). */
  onModuleInit(): void {
    this.registroDeFerramentas.registrar(this.listarMinhasAtividades);
    this.registroDeFerramentas.registrar(this.consultarDemanda);
    this.registroDeFerramentas.registrar(this.proporCriarAtividade);
    this.registroDeExecutores.registrar(this.criarAtividadeExecutor);
    this.registroDeFerramentas.registrar(this.proporAlterarAtividade);
    this.registroDeExecutores.registrar(this.alterarAtividadeExecutor);
  }
}
