import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ReferenciaMensagemDiretaEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { MensagemDiretaReferenciaService } from '../../services/mensagem-direta-referencia.service';
import { MensagemDiretaReferenciaCartaoComponent } from './mensagem-direta-referencia-cartao.component';

// O cartão de uma referência (task 211), resolvido para quem está olhando: acessível (link), bloqueado (sem título) ou com erro (tenta de novo).

const BLOQUEADA = { acessivel: false, nome: null, situacao: null, projetoId: null, demandaId: null, demandaNome: null };

describe('MensagemDiretaReferenciaCartaoComponent', () => {
  async function montar(tipo: ReferenciaMensagemDiretaEnum, id: number) {
    return montarComponente(MensagemDiretaReferenciaCartaoComponent, {
      usuario: TipoUsuarioEnum.DESENVOLVEDOR,
      entradas: { tipo, id },
      rotas: [{ path: '**', children: [] }],
    });
  }

  it('demanda com acesso: o cartão mostra nome e status e leva ao projeto dela', async () => {
    const tela = await montar(ReferenciaMensagemDiretaEnum.DEMANDA, 212);
    expect(tela.elemento.querySelector('[aria-busy="true"]')).not.toBeNull();
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/referencia/DEMANDA/212'), {
      tipo: 'DEMANDA', id: 212, acessivel: true, nome: 'Corrigir filtro de execuções ativas', situacao: 'DESENVOLVENDO', projetoId: 5, demandaId: null, demandaNome: null,
    });
    await tela.atualizar();

    expect(tela.elemento.textContent).toContain('Corrigir filtro de execuções ativas');
    expect(tela.elemento.textContent).toContain('Demanda · Desenvolvendo');
    const link = tela.elemento.querySelector<HTMLAnchorElement>('a')!;
    expect(link.getAttribute('href')).toBe('/demanda?projetoId=5');
  });

  it('atividade com acesso: mostra a demanda dela e leva à página da atividade', async () => {
    const tela = await montar(ReferenciaMensagemDiretaEnum.ATIVIDADE, 57);
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/referencia/ATIVIDADE/57'), {
      tipo: 'ATIVIDADE', id: 57, acessivel: true, nome: 'Tela de login', situacao: 'PENDENTE', projetoId: 5, demandaId: 212, demandaNome: 'Autenticação',
    });
    await tela.atualizar();

    expect(tela.elemento.textContent).toContain('Atividade · Autenticação · Pendente');
    expect(tela.elemento.querySelector<HTMLAnchorElement>('a')!.getAttribute('href')).toBe('/atividade/57');
  });

  it('sem acesso: cartão bloqueado, sem título e sem link', async () => {
    const tela = await montar(ReferenciaMensagemDiretaEnum.DEMANDA, 999);
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/referencia/DEMANDA/999'), { tipo: 'DEMANDA', id: 999, ...BLOQUEADA });
    await tela.atualizar();

    expect(tela.elemento.textContent).toContain('Sem acesso a esta demanda');
    expect(tela.elemento.querySelector('a')).toBeNull();
    expect(tela.elemento.querySelector('.pi-lock')).not.toBeNull();
  });

  it('erro de rede: avisa e "Tentar de novo" consulta outra vez (a falha não fica guardada)', async () => {
    const tela = await montar(ReferenciaMensagemDiretaEnum.ATIVIDADE, 7);
    responderErro(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/referencia/ATIVIDADE/7'), 500, 'falhou');
    await tela.atualizar();
    expect(tela.elemento.textContent).toContain('Não foi possível carregar a atividade');

    tela.elemento.querySelector<HTMLButtonElement>('button')!.click();
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/referencia/ATIVIDADE/7'), {
      tipo: 'ATIVIDADE', id: 7, acessivel: true, nome: 'Revisar tela', situacao: 'PLANEJADA', projetoId: 1, demandaId: 2, demandaNome: 'Demanda 2',
    });
    await tela.atualizar();
    expect(tela.elemento.textContent).toContain('Revisar tela');
  });

  it('a mesma referência citada de novo não consulta a API outra vez (cache da sessão) e limpar() esquece', async () => {
    const tela = await montar(ReferenciaMensagemDiretaEnum.DEMANDA, 1);
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/referencia/DEMANDA/1'), { tipo: 'DEMANDA', id: 1, ...BLOQUEADA });
    await tela.atualizar();

    const servico = TestBed.inject(MensagemDiretaReferenciaService);
    await servico.recuperar(ReferenciaMensagemDiretaEnum.DEMANDA, 1);
    tela.http.expectNone((requisicao) => requisicao.url.endsWith('/referencia/DEMANDA/1'));

    servico.limpar();
    const outra = servico.recuperar(ReferenciaMensagemDiretaEnum.DEMANDA, 1);
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/referencia/DEMANDA/1'), { tipo: 'DEMANDA', id: 1, ...BLOQUEADA });
    expect((await outra)?.acessivel).toBe(false);
  });
});
