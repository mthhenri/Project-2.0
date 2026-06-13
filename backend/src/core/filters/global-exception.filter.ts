import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(excecao: unknown, host: ArgumentsHost): void {
    const contexto = host.switchToHttp();
    const resposta = contexto.getResponse<Response>();

    if (excecao instanceof HttpException) {
      const status = excecao.getStatus();
      const corpo  = excecao.getResponse();

      if (typeof corpo === 'object' && 'sucesso' in (corpo as object)) {
        resposta.status(status).json(corpo);
        return;
      }

      const erros = Array.isArray((corpo as any).message)
        ? (corpo as any).message
        : [(corpo as any).message];

      resposta.status(status).json({
        sucesso:  false,
        dados:    null,
        mensagem: 'Dados inválidos',
        erros,
      });
      return;
    }

    resposta.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      sucesso:  false,
      dados:    null,
      mensagem: 'Erro interno do servidor',
      erros:    [],
    });
  }
}
