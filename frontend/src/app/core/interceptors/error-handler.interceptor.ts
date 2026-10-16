import { HttpContext, HttpContextToken, HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';

/** A tela trata o erro sozinha (ex.: o login mostra a mensagem num banner): sem toast nem redirect global. */
export const ERRO_TRATADO_PELA_TELA = new HttpContextToken<boolean>(() => false);

export const comErroTratadoPelaTela = (): { context: HttpContext } => ({
  context: new HttpContext().set(ERRO_TRATADO_PELA_TELA, true),
});

export const errorHandlerInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  const roteador = inject(Router);
  const messageService = inject(MessageService);

  if (requisicao.context.get(ERRO_TRATADO_PELA_TELA)) return proximo(requisicao);

  return proximo(requisicao).pipe(
    catchError((erro: HttpErrorResponse) => {
      switch (erro.status) {
        case 401:
          localStorage.removeItem('access_token');
          localStorage.removeItem('usuario_sessao');
          // Sessão expirada: volta ao login e, depois dele, à tela em que o usuário estava.
          roteador.navigate(['/autenticacao'], { queryParams: parametrosRetorno(roteador.url) });
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

/** `returnUrl` só quando há um destino útil (nem a raiz, nem o próprio login). */
export function parametrosRetorno(urlAtual: string): { returnUrl?: string } {
  return urlAtual && urlAtual !== '/' && !urlAtual.startsWith('/autenticacao') ? { returnUrl: urlAtual } : {};
}
