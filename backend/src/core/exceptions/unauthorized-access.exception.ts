import { HttpException, HttpStatus } from '@nestjs/common';

export class UnauthorizedAccessException extends HttpException {
  constructor(mensagem = 'Acesso não autorizado') {
    super(
      { sucesso: false, mensagem, dados: null, erros: [] },
      HttpStatus.FORBIDDEN,
    );
  }
}
