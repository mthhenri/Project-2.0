import { HttpTestingController, TestRequest } from '@angular/common/http/testing';

/** Pega a única requisição pendente do método e do caminho (sufixo da URL). Falha se não houver ou houver mais de uma. */
export function esperarRequisicao(http: HttpTestingController, metodo: string, caminho: string): TestRequest {
  return http.expectOne((requisicao) => requisicao.method === metodo && requisicao.url.endsWith(caminho));
}

/** Responde com o envelope `StandardResponse` de sucesso. */
export function responderSucesso<T>(requisicao: TestRequest, dados: T, status = 200): void {
  requisicao.flush({ sucesso: true, dados, mensagem: 'ok' }, { status, statusText: 'OK' });
}

/** Responde com erro do backend no formato do envelope (`erros` / `mensagem`). */
export function responderErro(requisicao: TestRequest, status: number, mensagem: string, erros: string[] = [mensagem]): void {
  requisicao.flush({ sucesso: false, mensagem, erros }, { status, statusText: 'Erro' });
}
