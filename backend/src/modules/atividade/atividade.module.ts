import { Module, OnModuleInit } from '@nestjs/common';
import { AtividadeController } from './controllers/atividade.controller';
import { AtividadeService } from './services/atividade.service';
import { AtividadeRepository } from './repositories/atividade.repository';
import { DemandaModule } from '../demanda/demanda.module';
import { TagModule } from '../tag/tag.module';
import { FerramentaIaModule } from '../ferramenta-ia/ferramenta-ia.module';
import { FerramentaIaRegistro } from '../ferramenta-ia/services/ferramenta-ia.registro';
import { ListarMinhasAtividadesFerramenta } from './ferramentas/listar-minhas-atividades.ferramenta';

@Module({
  imports:     [DemandaModule, TagModule, FerramentaIaModule],
  controllers: [AtividadeController],
  providers:   [AtividadeService, AtividadeRepository, ListarMinhasAtividadesFerramenta],
  exports:     [AtividadeService, AtividadeRepository],
})
export class AtividadeModule implements OnModuleInit {
  constructor(
    private readonly registroDeFerramentas: FerramentaIaRegistro,
    private readonly listarMinhasAtividades: ListarMinhasAtividadesFerramenta,
  ) {}

  /** As ferramentas de IA do domínio de atividade se registram aqui (a IA só lê o que a service entrega ao usuário). */
  onModuleInit(): void {
    this.registroDeFerramentas.registrar(this.listarMinhasAtividades);
  }
}
