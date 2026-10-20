import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EsforcoIaEnum, ModoContextoChatEnum, TipoProvedorIaEnum } from '@project20/shared';
import { SEM_OVERLAY_GLOBAL } from '../../../core/interceptors/loading.interceptor';
import { ConfiguracaoIaService } from './configuracao-ia.service';

let http: HttpTestingController;
let servico: ConfiguracaoIaService;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  http = TestBed.inject(HttpTestingController);
  servico = TestBed.inject(ConfiguracaoIaService);
});

const pedido = (metodo: string, sufixo: string) =>
  http.expectOne((r) => r.method === metodo && r.urlWithParams.endsWith(sufixo));

describe('ConfiguracaoIaService (frontend)', () => {
  it('recuperarAtiva faz GET em /configuracao-ia; leitura sem o scrim global', () => {
    servico.recuperarAtiva().subscribe();
    expect(pedido('GET', '/configuracao-ia').request.context.get(SEM_OVERLAY_GLOBAL)).toBe(true);
  });

  it('listarVersoes faz GET em /configuracao-ia/versoes com 50 por página por padrão, ou o tamanho pedido', () => {
    servico.listarVersoes().subscribe();
    const padrao = pedido('GET', '/configuracao-ia/versoes?itensPorPagina=50');
    expect(padrao.request.context.get(SEM_OVERLAY_GLOBAL)).toBe(true);

    servico.listarVersoes(10).subscribe();
    expect(pedido('GET', '/configuracao-ia/versoes?itensPorPagina=10').request.params.get('itensPorPagina')).toBe('10');
  });

  it('criar faz POST em /configuracao-ia com o corpo e mantém o scrim global (é mutação)', () => {
    const dto = {
      provedor: TipoProvedorIaEnum.ANTHROPIC, fallbacks: [TipoProvedorIaEnum.GOOGLE],
      modelosProvedor: { ANTHROPIC: { modeloRapido: 'a', modeloPadrao: 'b', modeloAnalitico: 'c' }, GOOGLE: { modeloRapido: 'd', modeloPadrao: 'e', modeloAnalitico: 'f' } },
      esforcoAnalitico: EsforcoIaEnum.MEDIO, checkinMinimoMinutos: 20, checkinMaximoMinutos: 40, duracaoRecomendadaMinutos: 90,
      checkinInteligente: true, rigorProporcional: true, deteccaoAutomatica: true,
    duvidasCodigo: false, modoContextoChat: ModoContextoChatEnum.MISTURADO, iaDesligada: false,
    };
    servico.criar(dto).subscribe();
    const requisicao = pedido('POST', '/configuracao-ia');
    expect(requisicao.request.body).toEqual(dto);
    expect(requisicao.request.context.get(SEM_OVERLAY_GLOBAL)).toBe(false);
  });

  it('recuperarEstado faz GET em /ia/estado (rota de administrador); leitura sem o scrim global', () => {
    servico.recuperarEstado().subscribe();
    expect(pedido('GET', '/ia/estado').request.context.get(SEM_OVERLAY_GLOBAL)).toBe(true);
  });
});
