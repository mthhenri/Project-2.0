import { HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { ExecucaoAtivaService } from '../services/execucao-ativa.service';

const PADRAO_ENCERRAR = /\/execucao\/\d+\/encerrar$/;
const PADRAO_INICIAR = /\/execucao$/;

/**
 * Qualquer tela que inicia (`POST /execucao`) ou encerra (`PATCH /execucao/:id/encerrar`) uma
 * execução bem-sucedida faz o chip da topbar se ressincronizar — sem cada tela precisar avisar.
 */
export const execucaoAtivaInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  const alteraExecucao =
    (requisicao.method === 'POST' && PADRAO_INICIAR.test(requisicao.url)) ||
    (requisicao.method === 'PATCH' && PADRAO_ENCERRAR.test(requisicao.url));
  if (!alteraExecucao) return proximo(requisicao);

  const execucaoAtiva = inject(ExecucaoAtivaService);
  return proximo(requisicao).pipe(
    tap((evento) => {
      if (evento.type === HttpEventType.Response) execucaoAtiva.carregar();
    }),
  );
};
