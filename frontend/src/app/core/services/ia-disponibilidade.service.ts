import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { EstadoIaEnum, IaEstadoRecuperadoDto, StandardResponse } from '@project20/shared';
import { ambiente } from '../../../environments/environment';
import { comFeedbackProprio } from '../interceptors/loading.interceptor';
import { estadoEfetivoDaIa, iaVoltou } from '../utils/retorno-da-ia';

const CHAVE_MODO_CONVENCIONAL = 'ia_modo_convencional';

/**
 * Estado da IA para qualquer usuário (`GET /ia/disponibilidade`): o chat e a barra lateral leem daqui. Enquanto a IA está "no ar", as
 * telas que o chat substitui ficam desabilitadas; desligada ou fora do ar, elas voltam (fallback da guarda-chuva). `null` até a
 * primeira resposta (por falta de informação, nada fica desabilitado).
 *
 * `estado` é o que as telas convencionais enxergam; `estadoReal` é o da IA de fato (o chat usa este). Quando a IA volta de uma queda o
 * usuário escolhe: "Voltar para a IA" (a conversa retoma de onde parou) ou "Agora não", que mantém o modo convencional até ele voltar
 * (o modo vale na sessão do navegador).
 */
@Injectable({ providedIn: 'root' })
export class IaDisponibilidadeService {
  private readonly httpClient = inject(HttpClient);

  readonly estadoReal = signal<EstadoIaEnum | null>(null);
  /** O usuário escolheu "Agora não" depois da volta da IA: as telas convencionais seguem à mão. */
  readonly modoConvencional = signal(lerModoConvencional());
  readonly estado = computed(() => estadoEfetivoDaIa(this.estadoReal(), this.modoConvencional()));
  /** A IA acabou de voltar de uma queda e o usuário ainda não decidiu se quer voltar para ela. */
  readonly avisoDeRetorno = signal(false);
  /** O usuário voltou para a IA: o chat retoma a conversa do dia (a IA lê o que mudou durante a queda). */
  readonly retomadaPendente = signal(false);

  /** Consulta o estado agora (guardando no sinal) e o devolve, ou `null` se a consulta falhar: o login decide o destino por ele. */
  consultar(): Observable<EstadoIaEnum | null> {
    return this.httpClient.get<StandardResponse<IaEstadoRecuperadoDto>>(`${ambiente.apiUrl}/ia/disponibilidade`, comFeedbackProprio()).pipe(
      tap((resposta) => {
        if (resposta.dados) this.aplicar(resposta.dados.estado);
      }),
      map((resposta) => resposta.dados?.estado ?? null),
      catchError(() => of(null)),
    );
  }

  carregar(): void {
    this.httpClient
      .get<StandardResponse<IaEstadoRecuperadoDto>>(`${ambiente.apiUrl}/ia/disponibilidade`, comFeedbackProprio())
      .pipe(catchError(() => of(null)))
      .subscribe((resposta) => {
        if (resposta?.dados) this.aplicar(resposta.dados.estado);
      });
  }

  /** "Agora não": mantém as telas convencionais e some o aviso (o botão "Voltar para a IA" fica na barra superior). */
  agoraNao(): void {
    this.avisoDeRetorno.set(false);
    this.definirModoConvencional(true);
  }

  /** "Voltar para a IA": sai do modo convencional e pede ao chat para retomar a conversa. */
  voltarParaAIa(): void {
    this.avisoDeRetorno.set(false);
    this.definirModoConvencional(false);
    this.retomadaPendente.set(true);
  }

  /** O chat pergunta uma vez se há retomada pedida (e a consome). */
  consumirRetomada(): boolean {
    const pendente = this.retomadaPendente();
    if (pendente) this.retomadaPendente.set(false);
    return pendente;
  }

  private aplicar(novo: EstadoIaEnum): void {
    const anterior = this.estadoReal();
    this.estadoReal.set(novo);
    if (iaVoltou(anterior, novo)) this.avisoDeRetorno.set(true);
    // Caiu de novo (ou foi desligada): o "agora não" de antes perde o sentido e o aviso volta na próxima volta.
    if (novo !== EstadoIaEnum.NO_AR) {
      this.definirModoConvencional(false);
      this.avisoDeRetorno.set(false);
    }
  }

  private definirModoConvencional(valor: boolean): void {
    this.modoConvencional.set(valor);
    try {
      if (valor) sessionStorage.setItem(CHAVE_MODO_CONVENCIONAL, '1');
      else sessionStorage.removeItem(CHAVE_MODO_CONVENCIONAL);
    } catch {
      // Sem armazenamento: o modo vale até recarregar a página.
    }
  }
}

function lerModoConvencional(): boolean {
  try {
    return sessionStorage.getItem(CHAVE_MODO_CONVENCIONAL) === '1';
  } catch {
    return false;
  }
}
