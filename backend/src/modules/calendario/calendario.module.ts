import { Module, OnModuleInit } from '@nestjs/common';
import { CalendarioController } from './controllers/calendario.controller';
import { CalendarioService } from './services/calendario.service';
import { CalendarioRepository } from './repositories/calendario.repository';
import { FerramentaIaModule } from '../ferramenta-ia/ferramenta-ia.module';
import { FerramentaIaRegistro } from '../ferramenta-ia/services/ferramenta-ia.registro';
import { ConsultarDiasNaoUteisFerramenta } from './ferramentas/consultar-dias-nao-uteis.ferramenta';

@Module({
  imports:     [FerramentaIaModule],
  controllers: [CalendarioController],
  providers:   [CalendarioService, CalendarioRepository, ConsultarDiasNaoUteisFerramenta],
  exports:     [CalendarioService, CalendarioRepository],
})
export class CalendarioModule implements OnModuleInit {
  constructor(
    private readonly registroDeFerramentas: FerramentaIaRegistro,
    private readonly consultarDiasNaoUteis: ConsultarDiasNaoUteisFerramenta,
  ) {}

  /** A ferramenta de IA do calendário se registra aqui. */
  onModuleInit(): void {
    this.registroDeFerramentas.registrar(this.consultarDiasNaoUteis);
  }
}
