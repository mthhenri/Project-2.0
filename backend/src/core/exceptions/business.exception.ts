import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(mensagem: string) {
    super(
      { sucesso: false, mensagem, dados: null, erros: [] },
      HttpStatus.BAD_REQUEST,
    );
  }
}
