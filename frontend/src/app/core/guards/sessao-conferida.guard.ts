import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { map } from 'rxjs';
import { AutenticacaoService } from '../services/autenticacao.service';

/**
 * Na primeira navegação de cada abertura do app, espera a conferência do tipo do usuário no servidor: os guards de tipo que vêm depois
 * decidem pelo tipo atual, não pelo gravado no login (P-062). Com o servidor fora ou lento a conferência cede e segue o que está guardado.
 */
export const sessaoConferidaGuard: CanActivateFn = () => inject(AutenticacaoService).garantirSessaoConferida().pipe(map(() => true));
