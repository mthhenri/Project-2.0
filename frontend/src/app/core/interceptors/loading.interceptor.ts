import { HttpContext, HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs';
import { carregamento } from '../signals/carregamento.signal';

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

let requisicoesAtivas = 0;
let temporizador: ReturnType<typeof setTimeout> | null = null;

export const loadingInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  if (requisicao.context.get(SEM_OVERLAY_GLOBAL)) return proximo(requisicao);

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
