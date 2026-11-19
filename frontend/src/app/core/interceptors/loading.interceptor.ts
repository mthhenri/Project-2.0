import { HttpContext, HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs';
import { carregamento } from '../signals/carregamento.signal';
import { ERRO_TRATADO_PELA_TELA, LEITURA_DE_FUNDO } from './error-handler.interceptor';

// Requisições rápidas não devem disparar o overlay: só mostramos o spinner se a
// requisição passar deste limite. Isso elimina o "flicker" em chamadas curtas.
const ATRASO_EXIBICAO_MS = 250;

/**
 * Marca requisições cuja tela já dá o próprio feedback (esqueleto na primeira carga, conteúdo
 * esmaecido + barra fina nas recargas — task 98): elas não acionam o overlay global.
 */
export const SEM_OVERLAY_GLOBAL = new HttpContextToken<boolean>(() => false);

/** Opções de `HttpClient` para uma leitura com feedback próprio da tela. */
export const comFeedbackProprio = (): { context: HttpContext } => ({
    context: new HttpContext().set(SEM_OVERLAY_GLOBAL, true),
});

/**
 * Feedback próprio **e** erro tratado pela tela, no mesmo contexto. Não dá para espalhar
 * `...comFeedbackProprio(), ...comErroTratadoPelaTela()`: o segundo `context` substitui o primeiro.
 */
export const comFeedbackProprioEErroTratado = (): { context: HttpContext } => ({
    context: new HttpContext().set(SEM_OVERLAY_GLOBAL, true).set(ERRO_TRATADO_PELA_TELA, true),
});

/**
 * Leitura de fundo: sem overlay e sem toast de erro (o 401 ainda leva ao login). Para o que a casca pede sozinha, sem ação do usuário.
 * Fica num contexto só pelo mesmo motivo do anterior: um `context` substitui o outro.
 */
export const comLeituraDeFundo = (): { context: HttpContext } => ({
    context: new HttpContext().set(SEM_OVERLAY_GLOBAL, true).set(LEITURA_DE_FUNDO, true),
});

let requisicoesAtivas = 0;
let temporizador: ReturnType<typeof setTimeout> | null = null;

export const loadingInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
    // Leituras usam esqueleto/loading local; o scrim global é só das mutações (task 96).
    if (requisicao.method === 'GET' || requisicao.context.get(SEM_OVERLAY_GLOBAL)) return proximo(requisicao);

    requisicoesAtivas++;

    // Agenda a exibição apenas quando a primeira requisição da rajada começa.
    if (requisicoesAtivas === 1 && temporizador === null) {
        temporizador = setTimeout(() => {
            carregamento.set(true);
            temporizador = null;
        }, ATRASO_EXIBICAO_MS);
    }

    return proximo(requisicao).pipe(
        finalize(() => {
            requisicoesAtivas--;

            // Só esconde quando todas as requisições em andamento terminam.
            if (requisicoesAtivas === 0) {
                if (temporizador !== null) {
                    clearTimeout(temporizador);
                    temporizador = null;
                }
                carregamento.set(false);
            }
        }),
    );
};
