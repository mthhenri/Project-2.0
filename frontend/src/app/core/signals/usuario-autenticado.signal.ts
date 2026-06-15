import { signal } from '@angular/core';

export interface UsuarioAutenticado {
  sub: number;
  login: string;
  nomeCompleto: string;
  tipo: string;
}

export const usuarioAutenticado = signal<UsuarioAutenticado | null>(null);
