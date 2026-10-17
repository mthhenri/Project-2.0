import { Module } from '@nestjs/common';
import { ChatMensagemRepository, clienteOpenSearchChatProvider } from './repositories/chat-mensagem.repository';

@Module({
  providers: [clienteOpenSearchChatProvider, ChatMensagemRepository],
  exports:   [ChatMensagemRepository],
})
export class ChatModule {}
