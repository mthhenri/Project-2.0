import { Module, OnModuleInit } from '@nestjs/common';
import { RelatorioController } from './controllers/relatorio.controller';
import { RelatorioService } from './services/relatorio.service';
import { ExecucaoModule } from '../execucao/execucao.module';
import { ProjetoModule } from '../projeto/projeto.module';
import { IaModule } from '../ia/ia.module';
import { FerramentaIaModule } from '../ferramenta-ia/ferramenta-ia.module';
import { FerramentaIaRegistro } from '../ferramenta-ia/services/ferramenta-ia.registro';
import { ConsultarRelatorioDeExecucoesFerramenta } from './ferramentas/consultar-relatorio-de-execucoes.ferramenta';

@Module({
  imports:     [ExecucaoModule, ProjetoModule, IaModule, FerramentaIaModule],
  controllers: [RelatorioController],
  providers:   [RelatorioService, ConsultarRelatorioDeExecucoesFerramenta],
})
export class RelatorioModule implements OnModuleInit {
  constructor(
    private readonly registroDeFerramentas: FerramentaIaRegistro,
    private readonly consultarRelatorioDeExecucoes: ConsultarRelatorioDeExecucoesFerramenta,
  ) {}

  /** A ferramenta de IA do relatório se registra aqui (só o gestor a vê). */
  onModuleInit(): void {
    this.registroDeFerramentas.registrar(this.consultarRelatorioDeExecucoes);
  }
}
