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
    const contextoHttp = host.switchToHttp();
    const resposta     = contextoHttp.getResponse<Response>();

    if (excecao instanceof HttpException) {
      const statusHttp  = excecao.getStatus();
      const corpoErro   = excecao.getResponse();

      if (typeof corpoErro === 'object' && corpoErro !== null && 'sucesso' in corpoErro) {
        resposta.status(statusHttp).json(corpoErro);
        return;
      }

      resposta.status(statusHttp).json({
        sucesso:  false,
        dados:    null,
        mensagem: typeof corpoErro === 'string' ? corpoErro : 'Erro na requisição',
        erros:    [],
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
