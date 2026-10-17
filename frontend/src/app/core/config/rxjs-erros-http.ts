import { HttpErrorResponse } from '@angular/common/http';
import { config } from 'rxjs';

/**
 * Falha HTTP sem `error` no `subscribe` virava `HttpErrorResponse` não tratado no console, apesar de o interceptor
 * (`errorHandlerInterceptor`) já ter avisado o usuário. Aqui esse erro é considerado tratado; qualquer outro erro não
 * tratado continua estourando como antes (relançado fora da pilha do rxjs, como o rxjs faria).
 */
export function ignorarErrosHttpJaTratados(): void {
  config.onUnhandledError = (erro: unknown) => {
    if (erro instanceof HttpErrorResponse) return;
    setTimeout(() => {
      throw erro;
    });
  };
}
