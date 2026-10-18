import { Module } from '@nestjs/common';
import { FerramentaIaModule } from '../ferramenta-ia/ferramenta-ia.module';
import { IaModule } from '../ia/ia.module';
import { PromptModule } from '../prompt/prompt.module';
import { PropostaIaModule } from '../proposta-ia/proposta-ia.module';
import { ChatController } from './controllers/chat.controller';
import { ARMAZENAMENTO_DE_CHAT, armazenamentoDeChatProvider } from './repositories/armazenamento-de-chat';
import { ChatService } from './services/chat.service';

@Module({
  imports:     [IaModule, PromptModule, FerramentaIaModule, PropostaIaModule],
  controllers: [ChatController],
  providers:   [armazenamentoDeChatProvider, ChatService],
  exports:     [ARMAZENAMENTO_DE_CHAT, ChatService],
})
export class ChatModule {}
