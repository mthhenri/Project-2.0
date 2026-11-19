import { HttpContext, HttpContextToken, HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';
import { AutenticacaoService } from '../services/autenticacao.service';

/** A tela trata o erro sozinha (ex.: o login mostra a mensagem num banner): sem toast nem redirect global. */
export const ERRO_TRATADO_PELA_TELA = new HttpContextToken<boolean>(() => false);

/**
 * Leitura que o usuário não pediu (conferência periódica, foco da janela, reconferência da sessão): falha em silêncio.
 * Só o 401 continua valendo, porque a sessão expirada precisa levar ao login.
 */
export const LEITURA_DE_FUNDO = new HttpContextToken<boolean>(() => false);

export const comErroTratadoPelaTela = (): { context: HttpContext } => ({
    context: new HttpContext().set(ERRO_TRATADO_PELA_TELA, true),
});

export const errorHandlerInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
    const roteador = inject(Router);
    const messageService = inject(MessageService);
    // Resolvido só no 403 (o `inject` não vale dentro do `catchError`, e instanciar o serviço em toda requisição seria à toa).
    const injetor = inject(Injector);

    if (requisicao.context.get(ERRO_TRATADO_PELA_TELA)) return proximo(requisicao);

    const leituraDeFundo = requisicao.context.get(LEITURA_DE_FUNDO);

    return proximo(requisicao).pipe(
        catchError((erro: HttpErrorResponse) => {
            if (leituraDeFundo && erro.status !== 401) return throwError(() => erro);

            switch (erro.status) {
                case 401:
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('usuario_sessao');
                    // Sessão expirada: volta ao login e, depois dele, à tela em que o usuário estava.
                    roteador.navigate(['/autenticacao'], { queryParams: parametrosRetorno(roteador.url) });
                    break;
                case 403:
                    messageService.add({ severity: 'error', summary: 'Erro', detail: 'Acesso não permitido' });
                    // O tipo do usuário pode ter mudado: reconfere (com intervalo mínimo) para menus e telas acompanharem.
                    injetor.get(AutenticacaoService).reconferirAposAcessoNegado();
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
