import { HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { ExecucaoAtivaService } from '../services/execucao-ativa.service';

const PADRAO_ENCERRAR = /\/execucao\/\d+\/encerrar$/;
const PADRAO_INICIAR = /\/execucao$/;
/** Confirmar ou desfazer uma proposta da IA pode iniciar, pausar ou reabrir uma execução (P-020), sem passar pelas rotas acima. */
const PADRAO_PROPOSTA = /\/proposta-ia\/\d+\/(confirmar|desfazer)$/;

/**
 * Qualquer tela que inicia (`POST /execucao`) ou encerra (`PATCH /execucao/:id/encerrar`) uma
 * execução bem-sucedida faz o chip da topbar se ressincronizar — sem cada tela precisar avisar.
 * O mesmo vale para confirmar/desfazer uma proposta da IA (`POST /proposta-ia/:id/confirmar|desfazer`):
 * não dá para saber pela URL se a proposta mexeu em execução, então qualquer uma ressincroniza (uma leitura barata).
 */
export const execucaoAtivaInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  const alteraExecucao =
    (requisicao.method === 'POST' && PADRAO_INICIAR.test(requisicao.url)) ||
    (requisicao.method === 'PATCH' && PADRAO_ENCERRAR.test(requisicao.url)) ||
    (requisicao.method === 'POST' && PADRAO_PROPOSTA.test(requisicao.url));
  if (!alteraExecucao) return proximo(requisicao);

  const execucaoAtiva = inject(ExecucaoAtivaService);
  return proximo(requisicao).pipe(
    tap((evento) => {
      if (evento.type === HttpEventType.Response) execucaoAtiva.carregar();
    }),
  );
};
