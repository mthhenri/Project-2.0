import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AutenticacaoLoginDto, AutenticacaoTokenDto, StandardResponse, UsuarioRecuperadoDto } from '@project20/shared';
import { UsuarioSessaoService } from './usuario-sessao.service';
import { ExecucaoAtivaService } from './execucao-ativa.service';
import { comErroTratadoPelaTela } from '../interceptors/error-handler.interceptor';
import { ambiente } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AutenticacaoService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sessao = inject(UsuarioSessaoService);
  private readonly execucaoAtiva = inject(ExecucaoAtivaService);

  login(dto: AutenticacaoLoginDto): Observable<StandardResponse<AutenticacaoTokenDto>> {
    return this.http.post<StandardResponse<AutenticacaoTokenDto>>(
      `${ambiente.apiUrl}/autenticacao/login`,
      dto,
      comErroTratadoPelaTela(),
    ).pipe(
      tap((resposta) => {
        if (resposta.sucesso && resposta.dados) {
          localStorage.setItem('access_token', resposta.dados.accessToken);
          this.sessao.definirUsuario(resposta.dados.usuario as any);
        }
      }),
    );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    this.sessao.limpar();
    this.execucaoAtiva.limpar();
    this.router.navigate(['/autenticacao']);
  }

  /**
   * Troca o usuário guardado no login pelo atual do servidor (P-062): o token dura dias, e uma mudança de tipo ou de nome
   * nesse intervalo não chegaria aos menus. O backend já confere o tipo atual em cada requisição, então aqui só a tela
   * alcança a verdade. Falha de rede deixa a sessão como está; 401 segue o redirecionamento global.
   */
  atualizarSessao(): void {
    const usuario = this.sessao.usuarioAtual();
    if (!usuario || !this.estaAutenticado()) return;

    this.http.get<StandardResponse<UsuarioRecuperadoDto>>(`${ambiente.apiUrl}/usuario/${usuario.id}`).subscribe({
      next: (resposta) => {
        // O usuário pode ter saído (ou trocado de conta) enquanto a resposta voltava.
        if (resposta.sucesso && resposta.dados && this.sessao.id() === resposta.dados.id) this.sessao.definirUsuario(resposta.dados);
      },
      error: () => undefined,
    });
  }

  estaAutenticado(): boolean {
    return !!localStorage.getItem('access_token');
  }
}
