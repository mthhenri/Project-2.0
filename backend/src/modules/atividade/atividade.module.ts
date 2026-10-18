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
import { ProporCriarAtividadeFerramenta } from './ferramentas/propor-criar-atividade.ferramenta';
import { ListarMinhasAtividadesFerramenta } from './ferramentas/listar-minhas-atividades.ferramenta';

@Module({
  imports:     [DemandaModule, TagModule, FerramentaIaModule, PropostaIaModule],
  controllers: [AtividadeController],
  providers:   [AtividadeService, AtividadeRepository, ListarMinhasAtividadesFerramenta, ProporCriarAtividadeFerramenta, CriarAtividadeExecutor],
  exports:     [AtividadeService, AtividadeRepository],
})
export class AtividadeModule implements OnModuleInit {
  constructor(
    private readonly registroDeFerramentas: FerramentaIaRegistro,
    private readonly listarMinhasAtividades: ListarMinhasAtividadesFerramenta,
    private readonly proporCriarAtividade: ProporCriarAtividadeFerramenta,
    private readonly registroDeExecutores: ExecutorPropostaIaRegistro,
    private readonly criarAtividadeExecutor: CriarAtividadeExecutor,
  ) {}

  /** As ferramentas de IA do domínio de atividade se registram aqui (a IA só lê o que a service entrega ao usuário). */
  onModuleInit(): void {
    this.registroDeFerramentas.registrar(this.listarMinhasAtividades);
    this.registroDeFerramentas.registrar(this.proporCriarAtividade);
    this.registroDeExecutores.registrar(this.criarAtividadeExecutor);
  }
}
