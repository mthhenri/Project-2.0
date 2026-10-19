import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { DesktopVersaoRecuperadaDto, StandardResponse } from '@project20/shared';
import { ambiente } from '../../../environments/environment';
import { comFeedbackProprio } from '../interceptors/loading.interceptor';
import { comErroTratadoPelaTela } from '../interceptors/error-handler.interceptor';

/** O Project Desktop publicado no servidor (task 198): a versão disponível e o download pelo botão da topbar. */
@Injectable({ providedIn: 'root' })
export class DesktopDownloadService {
  private readonly http = inject(HttpClient);

  private readonly _versao = signal<DesktopVersaoRecuperadaDto | null>(null);
  readonly baixando = signal<boolean>(false);

  /** A versão publicada, ou `null` quando não há executável (o botão não aparece). */
  readonly versao = computed(() => {
    const atual = this._versao();
    return atual?.disponivel ? atual : null;
  });

  /** Lê a versão publicada; falha em silêncio (sem o botão, nada mais muda). */
  carregar(): void {
    this.http
      .get<StandardResponse<DesktopVersaoRecuperadaDto>>(`${ambiente.apiUrl}/desktop/versao`, { ...comFeedbackProprio(), ...comErroTratadoPelaTela() })
      .subscribe({
        next: (resposta) => this._versao.set(resposta.sucesso ? resposta.dados ?? null : null),
        error: () => this._versao.set(null),
      });
  }

  /** Baixa o executável como arquivo (a rota exige o token, então não dá para ser um link simples). */
  baixar(): void {
    if (this.baixando()) return;
    this.baixando.set(true);
    this.http.get(`${ambiente.apiUrl}/desktop/download`, { responseType: 'blob', observe: 'response' }).subscribe({
      next: (resposta) => {
        this.salvar(resposta);
        this.baixando.set(false);
      },
      error: () => this.baixando.set(false),
    });
  }

  private salvar(resposta: HttpResponse<Blob>): void {
    const blob = resposta.body;
    if (!blob) return;
    const nome = /filename="?([^"]+)"?/.exec(resposta.headers.get('Content-Disposition') ?? '')?.[1] ?? this._versao()?.nomeArquivo ?? 'Project-Desktop.exe';
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nome;
    link.click();
    URL.revokeObjectURL(url);
  }
}
