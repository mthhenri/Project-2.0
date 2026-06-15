import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ambiente } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AutenticacaoService {
  private readonly httpClient = inject(HttpClient);
  private readonly urlBase = `${ambiente.apiUrl}/autenticacao`;
}
