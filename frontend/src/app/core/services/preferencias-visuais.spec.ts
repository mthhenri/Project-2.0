import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TemaService } from './tema.service';
import { TemaPersonalizadoService } from './tema-personalizado.service';
import { VisualizacaoTempoService } from './visualizacao-tempo.service';
import { UsuarioSessaoService } from './usuario-sessao.service';
import { COR_CHAVE_COR, COR_CHAVE_DESBLOQUEADO, COR_CHAVE_DONO } from '../models/tema-personalizado.model';
import { VISUALIZACAO_TEMPO_CHAVE_LOCAL_STORAGE } from '../models/visualizacao-tempo.model';
import { TEMA_CHAVE_LOCAL_STORAGE, TEMA_CLASSE_ESCURO } from '../models/tema.model';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove(TEMA_CLASSE_ESCURO);
  TestBed.resetTestingModule();
});

describe('TemaService', () => {
  it('sem valor salvo começa no tema claro, sem a classe app-escuro', () => {
    const servico = TestBed.inject(TemaService);
    expect(servico.temaAtual()).toBe('claro');
    expect(servico.eEscuro()).toBe(false);
    expect(document.documentElement.classList.contains(TEMA_CLASSE_ESCURO)).toBe(false);
  });

  it('valor salvo "escuro" é restaurado e a classe vai para o <html> já na criação', () => {
    localStorage.setItem(TEMA_CHAVE_LOCAL_STORAGE, 'escuro');
    const servico = TestBed.inject(TemaService);
    expect(servico.eEscuro()).toBe(true);
    expect(document.documentElement.classList.contains(TEMA_CLASSE_ESCURO)).toBe(true);
  });

  it('valor salvo inválido cai no padrão claro', () => {
    localStorage.setItem(TEMA_CHAVE_LOCAL_STORAGE, 'roxo');
    expect(TestBed.inject(TemaService).temaAtual()).toBe('claro');
  });

  it('definirTema persiste e liga/desliga a classe no <html>', () => {
    const servico = TestBed.inject(TemaService);
    servico.definirTema('escuro');
    expect(localStorage.getItem(TEMA_CHAVE_LOCAL_STORAGE)).toBe('escuro');
    expect(document.documentElement.classList.contains(TEMA_CLASSE_ESCURO)).toBe(true);

    servico.definirTema('claro');
    expect(localStorage.getItem(TEMA_CHAVE_LOCAL_STORAGE)).toBe('claro');
    expect(document.documentElement.classList.contains(TEMA_CLASSE_ESCURO)).toBe(false);
  });

  it('alternarTema vai e volta entre claro e escuro', () => {
    const servico = TestBed.inject(TemaService);
    servico.alternarTema();
    expect(servico.temaAtual()).toBe('escuro');
    servico.alternarTema();
    expect(servico.temaAtual()).toBe('claro');
  });
});

describe('VisualizacaoTempoService', () => {
  it('o padrão é horas (emDias falso), mesmo com valor inválido salvo', () => {
    expect(TestBed.inject(VisualizacaoTempoService).emDias()).toBe(false);
    TestBed.resetTestingModule();
    localStorage.setItem(VISUALIZACAO_TEMPO_CHAVE_LOCAL_STORAGE, 'talvez');
    expect(TestBed.inject(VisualizacaoTempoService).emDias()).toBe(false);
  });

  it('preferência "true" salva é restaurada', () => {
    localStorage.setItem(VISUALIZACAO_TEMPO_CHAVE_LOCAL_STORAGE, 'true');
    expect(TestBed.inject(VisualizacaoTempoService).emDias()).toBe(true);
  });

  it('definir e alternar persistem a escolha como texto', () => {
    const servico = TestBed.inject(VisualizacaoTempoService);
    servico.definir(true);
    expect(servico.emDias()).toBe(true);
    expect(localStorage.getItem(VISUALIZACAO_TEMPO_CHAVE_LOCAL_STORAGE)).toBe('true');

    servico.alternar();
    expect(servico.emDias()).toBe(false);
    expect(localStorage.getItem(VISUALIZACAO_TEMPO_CHAVE_LOCAL_STORAGE)).toBe('false');
  });
});

describe('TemaPersonalizadoService', () => {
  const idUsuario = signal<number | undefined>(undefined);

  function criar(): TemaPersonalizadoService {
    TestBed.configureTestingModule({
      providers: [{ provide: UsuarioSessaoService, useValue: { id: idUsuario } }],
    });
    return TestBed.inject(TemaPersonalizadoService);
  }

  beforeEach(() => idUsuario.set(undefined));

  it('começa trancado e sem cor quando nada foi salvo', () => {
    const servico = criar();
    expect(servico.desbloqueado()).toBe(false);
    expect(servico.corCustomizada()).toBeNull();
  });

  it('restaura desbloqueio e cor do localStorage', () => {
    localStorage.setItem(COR_CHAVE_DESBLOQUEADO, 'true');
    localStorage.setItem(COR_CHAVE_COR, '#10b981');
    const servico = criar();
    expect(servico.desbloqueado()).toBe(true);
    expect(servico.corCustomizada()).toBe('#10b981');
  });

  it('desbloquear grava o desbloqueio e registra o usuário atual como dono', () => {
    idUsuario.set(7);
    const servico = criar();
    servico.desbloquear();
    expect(servico.desbloqueado()).toBe(true);
    expect(localStorage.getItem(COR_CHAVE_DESBLOQUEADO)).toBe('true');
    expect(localStorage.getItem(COR_CHAVE_DONO)).toBe('7');
  });

  it('desbloquear sem usuário na sessão não grava dono', () => {
    const servico = criar();
    servico.desbloquear();
    expect(localStorage.getItem(COR_CHAVE_DONO)).toBeNull();
  });

  it('definirCor normaliza o hex sem # e persiste', () => {
    const servico = criar();
    servico.definirCor('ef4444');
    expect(servico.corCustomizada()).toBe('#ef4444');
    expect(localStorage.getItem(COR_CHAVE_COR)).toBe('#ef4444');
  });

  it('resetarCor volta ao padrão mas mantém o desbloqueio', () => {
    const servico = criar();
    servico.desbloquear();
    servico.definirCor('#ef4444');
    servico.resetarCor();
    expect(servico.corCustomizada()).toBeNull();
    expect(localStorage.getItem(COR_CHAVE_COR)).toBeNull();
    expect(servico.desbloqueado()).toBe(true);
    expect(localStorage.getItem(COR_CHAVE_DESBLOQUEADO)).toBe('true');
  });

  it('retrancar esquece desbloqueio, cor e dono', () => {
    idUsuario.set(7);
    const servico = criar();
    servico.desbloquear();
    servico.definirCor('#ef4444');
    servico.retrancar();
    expect(servico.desbloqueado()).toBe(false);
    expect(servico.corCustomizada()).toBeNull();
    expect(localStorage.getItem(COR_CHAVE_DESBLOQUEADO)).toBeNull();
    expect(localStorage.getItem(COR_CHAVE_COR)).toBeNull();
    expect(localStorage.getItem(COR_CHAVE_DONO)).toBeNull();
  });

  it('ao logar com outro usuário que não é o dono, a preferência é esquecida', () => {
    localStorage.setItem(COR_CHAVE_DESBLOQUEADO, 'true');
    localStorage.setItem(COR_CHAVE_COR, '#ef4444');
    localStorage.setItem(COR_CHAVE_DONO, '7');
    const servico = criar();

    idUsuario.set(8);
    TestBed.tick();

    expect(servico.desbloqueado()).toBe(false);
    expect(servico.corCustomizada()).toBeNull();
    expect(localStorage.getItem(COR_CHAVE_COR)).toBeNull();
  });

  it('o próprio dono logando mantém a preferência', () => {
    localStorage.setItem(COR_CHAVE_DESBLOQUEADO, 'true');
    localStorage.setItem(COR_CHAVE_COR, '#ef4444');
    localStorage.setItem(COR_CHAVE_DONO, '7');
    const servico = criar();

    idUsuario.set(7);
    TestBed.tick();

    expect(servico.desbloqueado()).toBe(true);
    expect(servico.corCustomizada()).toBe('#ef4444');
  });

  it('sessão sem usuário (logout ou boot) não apaga a preferência do dono', () => {
    localStorage.setItem(COR_CHAVE_DESBLOQUEADO, 'true');
    localStorage.setItem(COR_CHAVE_DONO, '7');
    const servico = criar();
    TestBed.tick();
    expect(servico.desbloqueado()).toBe(true);
  });

  it('usuário diferente com a troca de cor ainda trancada não faz nada', () => {
    localStorage.setItem(COR_CHAVE_DONO, '7');
    const servico = criar();
    idUsuario.set(8);
    TestBed.tick();
    expect(servico.desbloqueado()).toBe(false);
    expect(localStorage.getItem(COR_CHAVE_DONO)).toBe('7');
  });
});
