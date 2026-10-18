import { Module, OnModuleInit } from '@nestjs/common';
import { ProjetoController } from './controllers/projeto.controller';
import { ProjetoService } from './services/projeto.service';
import { ProjetoRepository } from './repositories/projeto.repository';
import { FerramentaIaModule } from '../ferramenta-ia/ferramenta-ia.module';
import { FerramentaIaRegistro } from '../ferramenta-ia/services/ferramenta-ia.registro';
import { ExecutorPropostaIaRegistro } from '../proposta-ia/domain/executor-proposta-ia';
import { PropostaIaModule } from '../proposta-ia/proposta-ia.module';
import { CriarProjetoExecutor } from './executores/criar-projeto.executor';
import { ListarProjetosFerramenta } from './ferramentas/listar-projetos.ferramenta';
import { ProporCriarProjetoFerramenta } from './ferramentas/propor-criar-projeto.ferramenta';

@Module({
  imports:     [FerramentaIaModule, PropostaIaModule],
  controllers: [ProjetoController],
  providers:   [ProjetoService, ProjetoRepository, ListarProjetosFerramenta, ProporCriarProjetoFerramenta, CriarProjetoExecutor],
  exports:     [ProjetoService, ProjetoRepository],
})
export class ProjetoModule implements OnModuleInit {
  constructor(
    private readonly registroDeFerramentas: FerramentaIaRegistro,
    private readonly listarProjetos: ListarProjetosFerramenta,
    private readonly proporCriarProjeto: ProporCriarProjetoFerramenta,
    private readonly registroDeExecutores: ExecutorPropostaIaRegistro,
    private readonly criarProjetoExecutor: CriarProjetoExecutor,
  ) {}

  /** As ferramentas de IA do domínio de projeto se registram aqui (a IA só lê o que a service entrega ao usuário). */
  onModuleInit(): void {
    this.registroDeFerramentas.registrar(this.listarProjetos);
    this.registroDeFerramentas.registrar(this.proporCriarProjeto);
    this.registroDeExecutores.registrar(this.criarProjetoExecutor);
  }
}
