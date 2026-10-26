import { Module, OnModuleInit } from '@nestjs/common';
import { AtividadeController } from './controllers/atividade.controller';
import { AtividadeService } from './services/atividade.service';
import { AtividadeRepository } from './repositories/atividade.repository';
import { DemandaModule } from '../demanda/demanda.module';
import { TagModule } from '../tag/tag.module';
import { UsuarioModule } from '../usuario/usuario.module';
import { FerramentaIaModule } from '../ferramenta-ia/ferramenta-ia.module';
import { FerramentaIaRegistro } from '../ferramenta-ia/services/ferramenta-ia.registro';
import { ExecutorPropostaIaRegistro } from '../proposta-ia/domain/executor-proposta-ia';
import { PropostaIaModule } from '../proposta-ia/proposta-ia.module';
import { CriarAtividadeExecutor } from './executores/criar-atividade.executor';
import { AlterarAtividadeExecutor } from './executores/alterar-atividade.executor';
import { AtribuirTagExecutor } from './executores/atribuir-tag.executor';
import { MoverAtividadeExecutor } from './executores/mover-atividade.executor';
import { ProporMoverAtividadeFerramenta } from './ferramentas/propor-mover-atividade.ferramenta';
import { ExcluirAtividadeExecutor } from './executores/excluir-atividade.executor';
import { ProporExcluirAtividadeFerramenta } from './ferramentas/propor-excluir-atividade.ferramenta';
import { ProporAtribuirTagFerramenta } from './ferramentas/propor-atribuir-tag.ferramenta';
import { ProporCriarAtividadeFerramenta } from './ferramentas/propor-criar-atividade.ferramenta';
import { ProporAlterarAtividadeFerramenta } from './ferramentas/propor-alterar-atividade.ferramenta';
import { ConsultarChecklistDaDemandaFerramenta } from './ferramentas/consultar-checklist-da-demanda.ferramenta';
import { ConsultarDemandaFerramenta } from './ferramentas/consultar-demanda.ferramenta';
import { ListarMinhasAtividadesFerramenta } from './ferramentas/listar-minhas-atividades.ferramenta';

@Module({
  imports:     [DemandaModule, TagModule, UsuarioModule, FerramentaIaModule, PropostaIaModule],
  controllers: [AtividadeController],
  providers:   [AtividadeService, AtividadeRepository, ListarMinhasAtividadesFerramenta, ConsultarDemandaFerramenta, ConsultarChecklistDaDemandaFerramenta, ProporCriarAtividadeFerramenta, CriarAtividadeExecutor, ProporAlterarAtividadeFerramenta, AlterarAtividadeExecutor, ProporAtribuirTagFerramenta, AtribuirTagExecutor, ProporMoverAtividadeFerramenta, MoverAtividadeExecutor, ProporExcluirAtividadeFerramenta, ExcluirAtividadeExecutor],
  exports:     [AtividadeService, AtividadeRepository],
})
export class AtividadeModule implements OnModuleInit {
  constructor(
    private readonly registroDeFerramentas: FerramentaIaRegistro,
    private readonly listarMinhasAtividades: ListarMinhasAtividadesFerramenta,
    private readonly consultarDemanda: ConsultarDemandaFerramenta,
    private readonly consultarChecklistDaDemanda: ConsultarChecklistDaDemandaFerramenta,
    private readonly proporCriarAtividade: ProporCriarAtividadeFerramenta,
    private readonly registroDeExecutores: ExecutorPropostaIaRegistro,
    private readonly criarAtividadeExecutor: CriarAtividadeExecutor,
    private readonly proporAlterarAtividade: ProporAlterarAtividadeFerramenta,
    private readonly alterarAtividadeExecutor: AlterarAtividadeExecutor,
    private readonly proporAtribuirTag: ProporAtribuirTagFerramenta,
    private readonly atribuirTagExecutor: AtribuirTagExecutor,
    private readonly proporMoverAtividade: ProporMoverAtividadeFerramenta,
    private readonly moverAtividadeExecutor: MoverAtividadeExecutor,
    private readonly proporExcluirAtividade: ProporExcluirAtividadeFerramenta,
    private readonly excluirAtividadeExecutor: ExcluirAtividadeExecutor,
  ) {}

  /** As ferramentas de IA do domínio de atividade se registram aqui (a IA só lê o que a service entrega ao usuário). */
  onModuleInit(): void {
    this.registroDeFerramentas.registrar(this.listarMinhasAtividades);
    this.registroDeFerramentas.registrar(this.consultarDemanda);
    this.registroDeFerramentas.registrar(this.consultarChecklistDaDemanda);
    this.registroDeFerramentas.registrar(this.proporCriarAtividade);
    this.registroDeExecutores.registrar(this.criarAtividadeExecutor);
    this.registroDeFerramentas.registrar(this.proporAlterarAtividade);
    this.registroDeExecutores.registrar(this.alterarAtividadeExecutor);
    this.registroDeFerramentas.registrar(this.proporAtribuirTag);
    this.registroDeExecutores.registrar(this.atribuirTagExecutor);
    this.registroDeFerramentas.registrar(this.proporMoverAtividade);
    this.registroDeExecutores.registrar(this.moverAtividadeExecutor);
    this.registroDeFerramentas.registrar(this.proporExcluirAtividade);
    this.registroDeExecutores.registrar(this.excluirAtividadeExecutor);
  }
}
