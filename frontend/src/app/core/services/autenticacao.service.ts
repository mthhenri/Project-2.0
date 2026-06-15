import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AutenticacaoLoginDto, AutenticacaoTokenDto, StandardResponse } from '@project20/shared';
import { usuarioAutenticado } from '../signals/usuario-autenticado.signal';
import { ambiente } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AutenticacaoService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  login(dto: AutenticacaoLoginDto): Observable<StandardResponse<AutenticacaoTokenDto>> {
    return this.http.post<StandardResponse<AutenticacaoTokenDto>>(
      `${ambiente.apiUrl}/autenticacao/login`,
      dto,
    ).pipe(
      tap((resposta) => {
        if (resposta.sucesso && resposta.dados) {
          localStorage.setItem('access_token', resposta.dados.accessToken);
          usuarioAutenticado.set(resposta.dados.usuario as any);
        }
      }),
    );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    usuarioAutenticado.set(null);
    this.router.navigate(['/autenticacao']);
  }

  estaAutenticado(): boolean {
    return !!localStorage.getItem('access_token');
  }
}
