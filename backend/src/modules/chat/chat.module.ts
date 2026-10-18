import { Module } from '@nestjs/common';
import { FerramentaIaModule } from '../ferramenta-ia/ferramenta-ia.module';
import { IaModule } from '../ia/ia.module';
import { PromptModule } from '../prompt/prompt.module';
import { PropostaIaModule } from '../proposta-ia/proposta-ia.module';
import { ChatController } from './controllers/chat.controller';
import { ChatMensagemRepository, clienteOpenSearchChatProvider } from './repositories/chat-mensagem.repository';
import { ChatService } from './services/chat.service';

@Module({
  imports:     [IaModule, PromptModule, FerramentaIaModule, PropostaIaModule],
  controllers: [ChatController],
  providers:   [clienteOpenSearchChatProvider, ChatMensagemRepository, ChatService],
  exports:     [ChatMensagemRepository, ChatService],
})
export class ChatModule {}
