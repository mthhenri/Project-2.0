import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ExecucaoAtivaDto, StandardResponse } from '@project20/shared';
import { ambiente } from '../../../environments/environment';
import { comFeedbackProprio } from '../interceptors/loading.interceptor';

/**
 * Execução ativa do usuário logado, compartilhada por todas as telas (chip da topbar — task 95).
 * Carrega no boot, re-sincroniza ao voltar para a aba (o backend encerra execuções às 23:59:59)
 * e é atualizada pelo `execucaoAtivaInterceptor` após iniciar/encerrar em qualquer tela.
 */
@Injectable({ providedIn: 'root' })
export class ExecucaoAtivaService {
  private readonly http = inject(HttpClient);

  private readonly _ativa = signal<ExecucaoAtivaDto | null>(null);
  private readonly _carregando = signal<boolean>(false);
  private readonly _jaCarregou = signal<boolean>(false);
  private readonly _pausasDoChip = signal<number>(0);

  readonly ativa = this._ativa.asReadonly();
  /** Só a primeira carga mostra esqueleto; as demais ressincronizações são silenciosas. */
  readonly primeiraCarga = computed(() => this._carregando() && !this._jaCarregou());
  /** Contador incrementado quando a pausa parte do chip: telas de lista se recarregam. */
  readonly pausasDoChip = this._pausasDoChip.asReadonly();

  carregar(): void {
    this._carregando.set(true);
    this.http
      .get<StandardResponse<ExecucaoAtivaDto | null>>(`${ambiente.apiUrl}/execucao/ativa`, comFeedbackProprio())
      .subscribe({
        next: (resposta) => this._ativa.set(resposta.sucesso ? resposta.dados ?? null : null),
        error: () => this._carregando.set(false),
        complete: () => {
          this._carregando.set(false);
          this._jaCarregou.set(true);
        },
      });
  }

  /** Atualização otimista (pausa pelo chip) com possibilidade de rollback. */
  definir(execucao: ExecucaoAtivaDto | null): void {
    this._ativa.set(execucao);
  }

  registrarPausaDoChip(): void {
    this._pausasDoChip.update((valor) => valor + 1);
  }

  limpar(): void {
    this._ativa.set(null);
    this._jaCarregou.set(false);
  }
}
