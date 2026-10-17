import { Module, OnModuleInit } from '@nestjs/common';
import { PropostaIaModule } from '../proposta-ia/proposta-ia.module';
import { FerramentaIaRegistro } from './services/ferramenta-ia.registro';
import { ConsultarDataEHoraFerramenta } from './ferramentas/consultar-data-e-hora.ferramenta';

/** Registro das ferramentas da IA. Os módulos de negócio (blocos 6 e 9) importam este módulo e registram as suas na subida. */
@Module({
  imports:   [PropostaIaModule],
  providers: [FerramentaIaRegistro, ConsultarDataEHoraFerramenta],
  exports:   [FerramentaIaRegistro],
})
export class FerramentaIaModule implements OnModuleInit {
  constructor(
    private readonly registro: FerramentaIaRegistro,
    private readonly consultarDataEHora: ConsultarDataEHoraFerramenta,
  ) {}

  onModuleInit(): void {
    this.registro.registrar(this.consultarDataEHora);
  }
}
