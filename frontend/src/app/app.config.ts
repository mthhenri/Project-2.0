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
import { TRADUCAO_PT_BR } from './core/config/primeng-traducao-pt-br';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { errorHandlerInterceptor } from './core/interceptors/error-handler.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';

const TemaAzul = definePreset(Aura, {
  semantic: {
    primary: {
      50:  '{blue.50}',
      100: '{blue.100}',
      200: '{blue.200}',
      300: '{blue.300}',
      400: '{blue.400}',
      500: '{blue.500}',
      600: '{blue.600}',
      700: '{blue.700}',
      800: '{blue.800}',
      900: '{blue.900}',
      950: '{blue.950}',
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
