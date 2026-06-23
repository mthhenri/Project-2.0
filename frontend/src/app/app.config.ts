import { ApplicationConfig } from '@angular/core';
import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeng/themes';
import { MessageService } from 'primeng/api';
import Aura from '@primeng/themes/aura';
import { rotas } from './app.routes';
import { resolverPaletaPrimariaInicial } from './core/models/tema-personalizado.model';
import { TRADUCAO_PT_BR } from './core/config/primeng-traducao-pt-br';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { errorHandlerInterceptor } from './core/interceptors/error-handler.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';

const TemaAzul = definePreset(Aura, {
  semantic: {
    // Aplica a cor primária salva (se houver) já na montagem do preset, evitando
    // que o tema padrão sobrescreva a preferência após o F5.
    primary: resolverPaletaPrimariaInicial(),
    colorScheme: {
      // No tema escuro o backdrop padrão do PrimeNG (preto translúcido) some
      // sobre a página já escura. Trocamos por um véu claro/acinzentado
      // (branco translúcido) que destaca o dialog por cima. Ajuste a % para
      // mais branco (maior) ou mais sutil (menor).
      dark: {
        mask: {
          background: 'color-mix(in srgb, {surface.0} 15%, transparent)',
        },
      },
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(rotas, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([
        authTokenInterceptor,
        errorHandlerInterceptor,
        loadingInterceptor,
      ]),
    ),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: { preset: TemaAzul, options: { darkModeSelector: '.app-escuro' } },
      translation: TRADUCAO_PT_BR,
    }),
    MessageService,
    // Datas/horas sempre no horário do Brasil (UTC-3 fixo, sem horário de verão desde 2019),
    // independente do fuso do computador do usuário. O DatePipe não aceita nome IANA
    // (America/Sao_Paulo) — só offset. Ver docs/DEPLOY.md (timestamps naïve assumem BRT).
    { provide: DATE_PIPE_DEFAULT_OPTIONS, useValue: { timezone: '-0300' } },
  ],
};
