import { Module } from '@nestjs/common';
import { ARMAZENAMENTO_DE_MENSAGEM_DIRETA, armazenamentoDeMensagemDiretaProvider } from './repositories/armazenamento-de-mensagem-direta';

/**
 * Mensagens entre colaboradores (chat um a um). Por enquanto só o armazenamento (tasks 206 e 207); a service e as rotas entram na task 208, que
 * também registra este módulo no `AppModule`: sem consumidor ele não sobe.
 */
@Module({
  providers: [armazenamentoDeMensagemDiretaProvider],
  exports: [ARMAZENAMENTO_DE_MENSAGEM_DIRETA],
})
export class MensagemDiretaModule {}
