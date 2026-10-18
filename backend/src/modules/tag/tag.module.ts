import { Module, OnModuleInit } from '@nestjs/common';
import { TagController } from './controllers/tag.controller';
import { TagService } from './services/tag.service';
import { TagRepository } from './repositories/tag.repository';
import { FerramentaIaModule } from '../ferramenta-ia/ferramenta-ia.module';
import { FerramentaIaRegistro } from '../ferramenta-ia/services/ferramenta-ia.registro';
import { ListarTagsFerramenta } from './ferramentas/listar-tags.ferramenta';

@Module({
  imports:     [FerramentaIaModule],
  controllers: [TagController],
  providers:   [TagService, TagRepository, ListarTagsFerramenta],
  exports:     [TagService, TagRepository],
})
export class TagModule implements OnModuleInit {
  constructor(
    private readonly registroDeFerramentas: FerramentaIaRegistro,
    private readonly listarTags: ListarTagsFerramenta,
  ) {}

  /** A ferramenta de IA das tags se registra aqui. */
  onModuleInit(): void {
    this.registroDeFerramentas.registrar(this.listarTags);
  }
}
