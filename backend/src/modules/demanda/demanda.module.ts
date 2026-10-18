import { Module, OnModuleInit } from '@nestjs/common';
import { DemandaController } from './controllers/demanda.controller';
import { DemandaService } from './services/demanda.service';
import { DemandaRepository } from './repositories/demanda.repository';
import { TagModule } from '../tag/tag.module';
import { UsuarioModule } from '../usuario/usuario.module';
import { FerramentaIaModule } from '../ferramenta-ia/ferramenta-ia.module';
import { FerramentaIaRegistro } from '../ferramenta-ia/services/ferramenta-ia.registro';
import { ListarMinhasDemandasFerramenta } from './ferramentas/listar-minhas-demandas.ferramenta';

@Module({
  imports:     [TagModule, UsuarioModule, FerramentaIaModule],
  controllers: [DemandaController],
  providers:   [DemandaService, DemandaRepository, ListarMinhasDemandasFerramenta],
  exports:     [DemandaService, DemandaRepository],
})
export class DemandaModule implements OnModuleInit {
  constructor(
    private readonly registroDeFerramentas: FerramentaIaRegistro,
    private readonly listarMinhasDemandas: ListarMinhasDemandasFerramenta,
  ) {}

  /** As ferramentas de IA do domínio de demanda se registram aqui. */
  onModuleInit(): void {
    this.registroDeFerramentas.registrar(this.listarMinhasDemandas);
  }
}
