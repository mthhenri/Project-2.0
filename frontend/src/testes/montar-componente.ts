import { EnvironmentProviders, Provider, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { config as rxjsConfig } from 'rxjs';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Routes } from '@angular/router';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { TipoUsuarioEnum } from '@project20/shared';
import { errorHandlerInterceptor } from '../app/core/interceptors/error-handler.interceptor';
import { UsuarioSessaoService } from '../app/core/services/usuario-sessao.service';
import { criarUsuarioTeste } from './usuarios-teste';

// O interceptor relança a falha HTTP; sem tratamento da tela, o rxjs a reporta como erro global, às vezes depois
// do teardown do teste. O coletor fica instalado no arquivo todo: a falha é guardada para o teste afirmar sobre
// ela, e qualquer outro erro continua sendo lançado.
let destinoDosErrosHttp: HttpErrorResponse[] = [];
rxjsConfig.onUnhandledError = (erro) => {
  if (erro instanceof HttpErrorResponse) destinoDosErrosHttp.push(erro);
  else throw erro;
};

export interface OpcoesMontagem {
  /** Tipo do usuário autenticado; omitido = ninguém autenticado. */
  usuario?: TipoUsuarioEnum;
  /** Rotas do roteador de teste (padrão: nenhuma). */
  rotas?: Routes;
  /** Chaves do localStorage já preenchidas antes de o componente nascer (ele é limpo a cada montagem). */
  armazenamento?: Record<string, string>;
  /** Entradas (`input()`) do componente, aplicadas antes da primeira detecção de mudanças. */
  entradas?: Record<string, unknown>;
  /** Provedores extras (substituições de serviço, por exemplo). */
  provedores?: Array<Provider | EnvironmentProviders>;
}

export interface ComponenteMontado<T> {
  fixture: ComponentFixture<T>;
  componente: T;
  /** Raiz do DOM do componente. */
  elemento: HTMLElement;
  http: HttpTestingController;
  /** Falhas HTTP que o componente não tratou (o interceptor as relança, e o rxjs as reporta como erro global). */
  errosHttpNaoTratados: HttpErrorResponse[];
  mensagens: MessageService;
  /** Detecta mudanças e espera a estabilização (efeitos, Signals e promessas pendentes). */
  atualizar(): Promise<void>;
}

/**
 * Configura o TestBed no molde da aplicação (HttpClient com o interceptor de erros real, roteador, PrimeNG sem
 * tema, animações desligadas, usuário autenticado) e monta o componente. Requisições saem pelo
 * `HttpTestingController`: nenhuma chega à rede.
 */
export async function montarComponente<T>(componente: Type<T>, opcoes: OpcoesMontagem = {}): Promise<ComponenteMontado<T>> {
  localStorage.clear();
  for (const [chave, valor] of Object.entries(opcoes.armazenamento ?? {})) localStorage.setItem(chave, valor);
  TestBed.configureTestingModule({
    imports: [componente],
    providers: [
      provideHttpClient(withInterceptors([errorHandlerInterceptor])),
      provideHttpClientTesting(),
      provideRouter(opcoes.rotas ?? []),
      provideNoopAnimations(),
      providePrimeNG({ theme: 'none' }),
      MessageService,
      ...(opcoes.provedores ?? []),
    ],
  });

  if (opcoes.usuario) TestBed.inject(UsuarioSessaoService).definirUsuario(criarUsuarioTeste(opcoes.usuario));

  // Lista nova por montagem; o coletor global (abaixo) grava sempre na lista da montagem mais recente.
  const errosHttpNaoTratados: HttpErrorResponse[] = [];
  destinoDosErrosHttp = errosHttpNaoTratados;

  const fixture = TestBed.createComponent(componente);
  for (const [nome, valor] of Object.entries(opcoes.entradas ?? {})) fixture.componentRef.setInput(nome, valor);
  const montado: ComponenteMontado<T> = {
    fixture,
    componente: fixture.componentInstance,
    elemento: fixture.nativeElement as HTMLElement,
    http: TestBed.inject(HttpTestingController),
    errosHttpNaoTratados,
    mensagens: TestBed.inject(MessageService),
    async atualizar() {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    },
  };
  await montado.atualizar();
  return montado;
}
