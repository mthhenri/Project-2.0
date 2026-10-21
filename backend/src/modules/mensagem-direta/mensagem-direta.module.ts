import { Module } from '@nestjs/common';
import { ARMAZENAMENTO_DE_MENSAGEM_DIRETA, armazenamentoDeMensagemDiretaProvider } from './repositories/armazenamento-de-mensagem-direta';

/**
 * Mensagens entre colaboradores (chat um a um). Por enquanto só o armazenamento (task 206); a service e as rotas entram na task 208, que
 * também registra este módulo no `AppModule`: sem consumidor ele não sobe, e `CHAT_ARMAZENAMENTO=postgres` ainda não tem implementação (207).
 */
@Module({
  providers: [armazenamentoDeMensagemDiretaProvider],
  exports: [ARMAZENAMENTO_DE_MENSAGEM_DIRETA],
})
export class MensagemDiretaModule {}
