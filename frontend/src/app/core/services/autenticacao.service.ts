import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AutenticacaoLoginDto, AutenticacaoTokenDto, StandardResponse } from '@project20/shared';
import { UsuarioSessaoService } from './usuario-sessao.service';
import { ambiente } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AutenticacaoService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sessao = inject(UsuarioSessaoService);

  login(dto: AutenticacaoLoginDto): Observable<StandardResponse<AutenticacaoTokenDto>> {
    return this.http.post<StandardResponse<AutenticacaoTokenDto>>(
      `${ambiente.apiUrl}/autenticacao/login`,
      dto,
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
    this.router.navigate(['/autenticacao']);
  }

  estaAutenticado(): boolean {
    return !!localStorage.getItem('access_token');
  }
}
