import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './core/database/database.module';
import { CoreModule } from './core/core.module';
import { AutenticacaoModule } from './modules/autenticacao/autenticacao.module';
import { UsuarioModule } from './modules/usuario/usuario.module';
import { TagModule } from './modules/tag/tag.module';
import { ProjetoModule } from './modules/projeto/projeto.module';
import { DemandaModule } from './modules/demanda/demanda.module';
import { AtividadeModule } from './modules/atividade/atividade.module';
import { AtividadePrioridadeModule } from './modules/atividade-prioridade/atividade-prioridade.module';
import { ExecucaoModule } from './modules/execucao/execucao.module';
import { CalendarioModule } from './modules/calendario/calendario.module';
import { PontoModule } from './modules/ponto/ponto.module';
import { PontoJustificativaModule } from './modules/ponto-justificativa/ponto-justificativa.module';
import { AnotacaoModule } from './modules/anotacao/anotacao.module';
import { ConfiguracaoIaModule } from './modules/configuracao-ia/configuracao-ia.module';
import { PromptModule } from './modules/prompt/prompt.module';
import { ChatModule } from './modules/chat/chat.module';
import { PropostaIaModule } from './modules/proposta-ia/proposta-ia.module';
import { FerramentaIaModule } from './modules/ferramenta-ia/ferramenta-ia.module';
import { AssistenteModule } from './modules/assistente/assistente.module';
import { RelatorioModule } from './modules/relatorio/relatorio.module';

@Module({
  imports: [ScheduleModule.forRoot(), ConfigModule, DatabaseModule, CoreModule, AutenticacaoModule, UsuarioModule, TagModule, ProjetoModule, DemandaModule, AtividadeModule, AtividadePrioridadeModule, ExecucaoModule, CalendarioModule, PontoModule, PontoJustificativaModule, AnotacaoModule, ConfiguracaoIaModule, PromptModule, ChatModule, PropostaIaModule, FerramentaIaModule, AssistenteModule, RelatorioModule],
})
export class AppModule {}
