import { Module } from '@nestjs/common';
import { AtividadeModule } from '../atividade/atividade.module';
import { DemandaModule } from '../demanda/demanda.module';
import { UsuarioModule } from '../usuario/usuario.module';
import { MensagemDiretaController } from './controllers/mensagem-direta.controller';
import { ARMAZENAMENTO_DE_MENSAGEM_DIRETA, armazenamentoDeMensagemDiretaProvider } from './repositories/armazenamento-de-mensagem-direta';
import { MensagemDiretaLeituraRepository } from './repositories/mensagem-direta-leitura.repository';
import { MensagemDiretaPreferenciaRepository } from './repositories/mensagem-direta-preferencia.repository';
import { MensagemDiretaService } from './services/mensagem-direta.service';

/**
 * Chat entre colaboradores (conversa um a um). Armazenamento das mensagens (tasks 206 e 207) mais a service e as rotas (task 208). O stream de
 * eventos entra na task 209 e a supervisão, na 214.
 */
@Module({
  imports:     [UsuarioModule, DemandaModule, AtividadeModule],
  controllers: [MensagemDiretaController],
  providers:   [armazenamentoDeMensagemDiretaProvider, MensagemDiretaLeituraRepository, MensagemDiretaPreferenciaRepository, MensagemDiretaService],
  exports:     [ARMAZENAMENTO_DE_MENSAGEM_DIRETA, MensagemDiretaService],
})
export class MensagemDiretaModule {}
