import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EstadoIaEnum } from '@project20/shared';
import { SEM_OVERLAY_GLOBAL } from '../interceptors/loading.interceptor';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../testes/http-teste';
import { IaDisponibilidadeService } from './ia-disponibilidade.service';

// Fallback da guarda-chuva do chat: com a IA no ar as telas convencionais são substituídas; desligada ou fora do ar elas voltam.
// Quando a IA volta de uma queda, "Agora não" mantém o modo convencional até o usuário voltar (vale na sessão do navegador).

const CHAVE = 'ia_modo_convencional';
let http: HttpTestingController;

function criarServico(): IaDisponibilidadeService {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  http = TestBed.inject(HttpTestingController);
  return TestBed.inject(IaDisponibilidadeService);
}

function carregarComEstado(servico: IaDisponibilidadeService, estado: EstadoIaEnum): void {
  servico.carregar();
  responderSucesso(esperarRequisicao(http, 'GET', '/ia/disponibilidade'), { estado });
}

beforeEach(() => sessionStorage.clear());

describe('IaDisponibilidadeService — consulta', () => {
  it('começa sem informação: nada fica desabilitado enquanto o primeiro estado não chega', () => {
    const servico = criarServico();
    expect(servico.estadoReal()).toBeNull();
    expect(servico.estado()).toBeNull();
    expect(servico.avisoDeRetorno()).toBe(false);
  });

  it('consultar faz GET em /ia/disponibilidade sem scrim global, guarda o estado e o devolve', () => {
    const servico = criarServico();
    let devolvido: EstadoIaEnum | null | undefined;
    servico.consultar().subscribe((estado) => (devolvido = estado));
    const requisicao = esperarRequisicao(http, 'GET', '/ia/disponibilidade');
    expect(requisicao.request.context.get(SEM_OVERLAY_GLOBAL)).toBe(true);
    responderSucesso(requisicao, { estado: EstadoIaEnum.NO_AR });

    expect(devolvido).toBe(EstadoIaEnum.NO_AR);
    expect(servico.estadoReal()).toBe(EstadoIaEnum.NO_AR);
    expect(servico.estado()).toBe(EstadoIaEnum.NO_AR);
  });

  it('consultar com falha devolve null e não mexe no estado conhecido', () => {
    const servico = criarServico();
    carregarComEstado(servico, EstadoIaEnum.DESLIGADA);
    let devolvido: EstadoIaEnum | null | undefined;
    servico.consultar().subscribe((estado) => (devolvido = estado));
    responderErro(esperarRequisicao(http, 'GET', '/ia/disponibilidade'), 500, 'Falhou');

    expect(devolvido).toBeNull();
    expect(servico.estadoReal()).toBe(EstadoIaEnum.DESLIGADA);
  });

  it('carregar com falha fica quieto: o estado segue desconhecido', () => {
    const servico = criarServico();
    servico.carregar();
    responderErro(esperarRequisicao(http, 'GET', '/ia/disponibilidade'), 500, 'Falhou');
    expect(servico.estadoReal()).toBeNull();
  });
});

describe('IaDisponibilidadeService — volta da IA', () => {
  it('a IA voltar de uma queda liga o aviso de retorno', () => {
    const servico = criarServico();
    carregarComEstado(servico, EstadoIaEnum.FORA_DO_AR);
    expect(servico.avisoDeRetorno()).toBe(false);
    carregarComEstado(servico, EstadoIaEnum.NO_AR);
    expect(servico.avisoDeRetorno()).toBe(true);
  });

  it('a primeira resposta "no ar" não é uma volta: sem aviso', () => {
    const servico = criarServico();
    carregarComEstado(servico, EstadoIaEnum.NO_AR);
    expect(servico.avisoDeRetorno()).toBe(false);
  });

  it('"Agora não" some com o aviso e mantém o modo convencional (a tela enxerga a IA como fora do ar), lembrado na sessão', () => {
    const servico = criarServico();
    carregarComEstado(servico, EstadoIaEnum.DESLIGADA);
    carregarComEstado(servico, EstadoIaEnum.NO_AR);
    servico.agoraNao();

    expect(servico.avisoDeRetorno()).toBe(false);
    expect(servico.modoConvencional()).toBe(true);
    expect(servico.estadoReal()).toBe(EstadoIaEnum.NO_AR);
    expect(servico.estado()).toBe(EstadoIaEnum.FORA_DO_AR);
    expect(sessionStorage.getItem(CHAVE)).toBe('1');
  });

  it('um serviço novo na mesma sessão do navegador lê o modo convencional guardado', () => {
    sessionStorage.setItem(CHAVE, '1');
    expect(criarServico().modoConvencional()).toBe(true);
  });

  it('"Voltar para a IA" sai do modo convencional, pede a retomada ao chat e limpa o armazenamento', () => {
    const servico = criarServico();
    carregarComEstado(servico, EstadoIaEnum.FORA_DO_AR);
    carregarComEstado(servico, EstadoIaEnum.NO_AR);
    servico.agoraNao();
    servico.voltarParaAIa();

    expect(servico.modoConvencional()).toBe(false);
    expect(servico.avisoDeRetorno()).toBe(false);
    expect(servico.retomadaPendente()).toBe(true);
    expect(servico.estado()).toBe(EstadoIaEnum.NO_AR);
    expect(sessionStorage.getItem(CHAVE)).toBeNull();
  });

  it('consumirRetomada devolve true uma única vez', () => {
    const servico = criarServico();
    expect(servico.consumirRetomada()).toBe(false);
    servico.voltarParaAIa();
    expect(servico.consumirRetomada()).toBe(true);
    expect(servico.consumirRetomada()).toBe(false);
    expect(servico.retomadaPendente()).toBe(false);
  });

  it('a IA cair de novo depois do "Agora não" desfaz o modo convencional (o estado real já manda)', () => {
    const servico = criarServico();
    carregarComEstado(servico, EstadoIaEnum.FORA_DO_AR);
    carregarComEstado(servico, EstadoIaEnum.NO_AR);
    servico.agoraNao();
    carregarComEstado(servico, EstadoIaEnum.FORA_DO_AR);

    expect(servico.modoConvencional()).toBe(false);
    expect(servico.estado()).toBe(EstadoIaEnum.FORA_DO_AR);
    expect(sessionStorage.getItem(CHAVE)).toBeNull();
  });

  it('IA desligada some com o aviso de retorno que estava pendente', () => {
    const servico = criarServico();
    carregarComEstado(servico, EstadoIaEnum.FORA_DO_AR);
    carregarComEstado(servico, EstadoIaEnum.NO_AR);
    expect(servico.avisoDeRetorno()).toBe(true);
    carregarComEstado(servico, EstadoIaEnum.DESLIGADA);
    expect(servico.avisoDeRetorno()).toBe(false);
  });
});
