import { Module } from '@nestjs/common';
import { AtividadeModule } from '../atividade/atividade.module';
import { DemandaModule } from '../demanda/demanda.module';
import { FerramentaIaModule } from '../ferramenta-ia/ferramenta-ia.module';
import { IaModule } from '../ia/ia.module';
import { IaCustoModule } from '../ia-custo/ia-custo.module';
import { PromptModule } from '../prompt/prompt.module';
import { PropostaIaModule } from '../proposta-ia/proposta-ia.module';
import { UsuarioModule } from '../usuario/usuario.module';
import { MensagemDiretaController } from './controllers/mensagem-direta.controller';
import { MensagemDiretaGrupoController } from './controllers/mensagem-direta-grupo.controller';
import { ARMAZENAMENTO_DE_MENSAGEM_DIRETA, armazenamentoDeMensagemDiretaProvider } from './repositories/armazenamento-de-mensagem-direta';
import { GrupoLeituraRepository } from './repositories/grupo-leitura.repository';
import { GrupoRepository } from './repositories/grupo.repository';
import { MensagemDiretaLeituraRepository } from './repositories/mensagem-direta-leitura.repository';
import { MensagemDiretaPreferenciaRepository } from './repositories/mensagem-direta-preferencia.repository';
import { MensagemDiretaReacaoRepository } from './repositories/mensagem-direta-reacao.repository';
import { MensagemDiretaSupervisaoRepository } from './repositories/mensagem-direta-supervisao.repository';
import { publicadorDeEventosDiretosProvider } from './publicadores/publicador-de-eventos-diretos';
import { GrupoSupervisaoService } from './services/grupo-supervisao.service';
import { GrupoService } from './services/grupo.service';
import { MensagemDiretaEventosService } from './services/mensagem-direta-eventos.service';
import { MensagemDiretaIaService } from './services/mensagem-direta-ia.service';
import { MensagemDiretaSupervisaoService } from './services/mensagem-direta-supervisao.service';
import { MensagemDiretaService } from './services/mensagem-direta.service';

/**
 * Chat entre colaboradores (conversa um a um e grupos). Armazenamento das mensagens (tasks 206 e 207), a service e as rotas (task 208) e o tempo real
 * (task 209: stream, barramento entre instâncias e presença), a supervisão pelo gestor (task 214), o `@IA` (task 315) e o grupo livre (task 246).
 */
@Module({
    imports:     [UsuarioModule, DemandaModule, AtividadeModule, IaModule, FerramentaIaModule, PromptModule, PropostaIaModule, IaCustoModule],
    controllers: [MensagemDiretaController, MensagemDiretaGrupoController],
    providers:   [
        armazenamentoDeMensagemDiretaProvider,
        publicadorDeEventosDiretosProvider,
        GrupoRepository,
        GrupoLeituraRepository,
        MensagemDiretaLeituraRepository,
        MensagemDiretaPreferenciaRepository,
        MensagemDiretaReacaoRepository,
        MensagemDiretaSupervisaoRepository,
        MensagemDiretaEventosService,
        MensagemDiretaIaService,
        GrupoService,
        GrupoSupervisaoService,
        MensagemDiretaService,
        MensagemDiretaSupervisaoService,
    ],
    exports:     [ARMAZENAMENTO_DE_MENSAGEM_DIRETA, MensagemDiretaService],
})
export class MensagemDiretaModule {}
