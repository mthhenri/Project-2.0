import { HttpException, HttpStatus } from '@nestjs/common';

/** O recurso mudou desde que o cliente o leu (concorrência otimista). A tela recarrega e avisa. */
export class ConflictException extends HttpException {
  constructor(mensagem = 'O recurso foi alterado por outra operação') {
    super(
      { sucesso: false, mensagem, dados: null, erros: [] },
      HttpStatus.CONFLICT,
    );
  }
}
