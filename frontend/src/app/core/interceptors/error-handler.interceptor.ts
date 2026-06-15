import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';

export const errorHandlerInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  const roteador = inject(Router);
  const messageService = inject(MessageService);

  return proximo(requisicao).pipe(
    catchError((erro: HttpErrorResponse) => {
      switch (erro.status) {
        case 401:
          localStorage.removeItem('access_token');
          roteador.navigate(['/autenticacao']);
          break;
        case 403:
          messageService.add({ severity: 'error', summary: 'Erro', detail: 'Acesso não permitido' });
          break;
        case 400: {
          const corpo = erro.error;
          const detalhe = corpo?.erros?.[0] ?? corpo?.mensagem ?? 'Requisição inválida';
          messageService.add({ severity: 'warn', summary: 'Atenção', detail: detalhe });
          break;
        }
        case 404:
          messageService.add({ severity: 'warn', summary: 'Não encontrado', detail: 'Registro não encontrado' });
          break;
        default:
          messageService.add({ severity: 'error', summary: 'Erro', detail: 'Erro interno. Tente novamente.' });
      }

      return throwError(() => erro);
    }),
  );
};
