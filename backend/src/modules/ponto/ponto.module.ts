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

@Module({
  imports:     [ExecucaoModule, CalendarioModule, UsuarioModule, PontoJustificativaModule, FerramentaIaModule],
  controllers: [PontoController],
  providers:   [PontoService, ConsultarPontoDoDiaFerramenta, ConsultarPontoDoMesFerramenta],
})
export class PontoModule implements OnModuleInit {
  constructor(
    private readonly registroDeFerramentas: FerramentaIaRegistro,
    private readonly consultarPontoDoDia: ConsultarPontoDoDiaFerramenta,
    private readonly consultarPontoDoMes: ConsultarPontoDoMesFerramenta,
  ) {}

  /** As ferramentas de IA do ponto se registram aqui (leitura, pela mesma service da tela). */
  onModuleInit(): void {
    this.registroDeFerramentas.registrar(this.consultarPontoDoDia);
    this.registroDeFerramentas.registrar(this.consultarPontoDoMes);
  }
}
