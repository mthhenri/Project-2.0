import { HttpException, HttpStatus } from '@nestjs/common';

export class ResourceNotFoundException extends HttpException {
  constructor(nomeEntidade: string) {
    super(
      {
        sucesso:  false,
        mensagem: `${nomeEntidade} não encontrado`,
        dados:    null,
        erros:    [],
      },
      HttpStatus.NOT_FOUND,
    );
  }
}
