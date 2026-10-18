import { Module, OnModuleInit } from '@nestjs/common';
import { ExecucaoController } from './controllers/execucao.controller';
import { ExecucaoService } from './services/execucao.service';
import { ExecucaoRepository } from './repositories/execucao.repository';
import { AtividadeModule } from '../atividade/atividade.module';
import { FerramentaIaModule } from '../ferramenta-ia/ferramenta-ia.module';
import { FerramentaIaRegistro } from '../ferramenta-ia/services/ferramenta-ia.registro';
import { ConsultarExecucaoAtivaFerramenta } from './ferramentas/consultar-execucao-ativa.ferramenta';
import { ListarMinhasExecucoesDoDiaFerramenta } from './ferramentas/listar-minhas-execucoes-do-dia.ferramenta';

@Module({
  imports:     [AtividadeModule, FerramentaIaModule],
  controllers: [ExecucaoController],
  providers:   [ExecucaoService, ExecucaoRepository, ConsultarExecucaoAtivaFerramenta, ListarMinhasExecucoesDoDiaFerramenta],
  exports:     [ExecucaoService, ExecucaoRepository],
})
export class ExecucaoModule implements OnModuleInit {
  constructor(
    private readonly registroDeFerramentas: FerramentaIaRegistro,
    private readonly consultarExecucaoAtiva: ConsultarExecucaoAtivaFerramenta,
    private readonly listarMinhasExecucoesDoDia: ListarMinhasExecucoesDoDiaFerramenta,
  ) {}

  /** As ferramentas de IA do domínio de execução se registram aqui. */
  onModuleInit(): void {
    this.registroDeFerramentas.registrar(this.consultarExecucaoAtiva);
    this.registroDeFerramentas.registrar(this.listarMinhasExecucoesDoDia);
  }
}
