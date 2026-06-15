import { signal } from '@angular/core';
import { UsuarioRecuperadoDto } from '@project20/shared';

export const usuarioAutenticado = signal<UsuarioRecuperadoDto | null>(null);
