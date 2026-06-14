import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './core/database/database.module';
import { CoreModule } from './core/core.module';
import { AutenticacaoModule } from './modules/autenticacao/autenticacao.module';
import { UsuarioModule } from './modules/usuario/usuario.module';
import { TagModule } from './modules/tag/tag.module';
import { ProjetoModule } from './modules/projeto/projeto.module';
import { DemandaModule } from './modules/demanda/demanda.module';
import { AtividadeModule } from './modules/atividade/atividade.module';
import { ExecucaoModule } from './modules/execucao/execucao.module';
import { CalendarioModule } from './modules/calendario/calendario.module';
import { PontoModule } from './modules/ponto/ponto.module';
import { AssistenteModule } from './modules/assistente/assistente.module';

@Module({
  imports: [ConfigModule, DatabaseModule, CoreModule, AutenticacaoModule, UsuarioModule, TagModule, ProjetoModule, DemandaModule, AtividadeModule, ExecucaoModule, CalendarioModule, PontoModule, AssistenteModule],
})
export class AppModule {}
