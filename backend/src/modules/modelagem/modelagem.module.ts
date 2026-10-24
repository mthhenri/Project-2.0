import { Module } from '@nestjs/common';
import { ModelagemController } from './controllers/modelagem.controller';
import { ModelagemCatalogoRepository } from './repositories/modelagem-catalogo.repository';
import { ModelagemGrupoRepository } from './repositories/modelagem-grupo.repository';
import { ModelagemTabelaRepository } from './repositories/modelagem-tabela.repository';
import { ModelagemService } from './services/modelagem.service';

@Module({
  controllers: [ModelagemController],
  providers:   [ModelagemService, ModelagemCatalogoRepository, ModelagemGrupoRepository, ModelagemTabelaRepository],
})
export class ModelagemModule {}
