import { TestBed } from '@angular/core/testing';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../testes/http-teste';
import { DesfazerService } from '../../../core/services/desfazer.service';
import { AssistenteDescricaoComponent, MINIMO_CARACTERES_ASSISTENTE } from './assistente-descricao.component';

// Assistente de descrição por IA: o backend recusa texto com menos de 10 caracteres; a sugestão é editável e, aceita, oferece Desfazer.

type Montado = ComponenteMontado<AssistenteDescricaoComponent>;

const TEXTO = 'Montou o formulário de login';
const SUGESTAO = 'Implementou o formulário de login com validação.';

const botao = (montado: Montado, rotulo: string) =>
  Array.from(montado.elemento.querySelectorAll('button')).find((candidato) => candidato.textContent?.includes(rotulo)) as HTMLButtonElement;

async function montar(textoAtual: string, entradas: Record<string, unknown> = {}): Promise<Montado> {
  return montarComponente(AssistenteDescricaoComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, entradas: { textoAtual, ...entradas } });
}

async function pedirSugestao(montado: Montado, sugestao = SUGESTAO): Promise<void> {
  botao(montado, 'Auxiliar com IA').click();
  responderSucesso(esperarRequisicao(montado.http, 'POST', '/assistente/auxiliar-descricao'), { textoAuxiliado: sugestao });
  await montado.atualizar();
}

afterEach(() => vi.useRealTimers());

describe('AssistenteDescricaoComponent — pedir a sugestão', () => {
  it(`texto com menos de ${MINIMO_CARACTERES_ASSISTENTE} caracteres mantém "Auxiliar com IA" desabilitado e não faz requisição`, async () => {
    const montado = await montar('curto');
    expect(botao(montado, 'Auxiliar com IA').disabled).toBe(true);
    botao(montado, 'Auxiliar com IA').click();
    await montado.atualizar();
    montado.http.expectNone((requisicao) => requisicao.url.endsWith('/assistente/auxiliar-descricao'));
  });

  it('espaços nas pontas não contam para o mínimo', async () => {
    const montado = await montar('   abc   ');
    expect(montado.componente.podeAuxiliar()).toBe(false);
  });

  it('com texto suficiente envia texto, tipo da entidade e contexto e mostra original e sugestão editável', async () => {
    const montado = await montar(TEXTO, { tipoEntidade: 'demanda', contextoEntidade: 'Demanda Login' });
    expect(botao(montado, 'Auxiliar com IA').disabled).toBe(false);

    botao(montado, 'Auxiliar com IA').click();
    const requisicao = esperarRequisicao(montado.http, 'POST', '/assistente/auxiliar-descricao');
    expect(requisicao.request.body).toEqual({ textoOriginal: TEXTO, tipoEntidade: 'demanda', contextoEntidade: 'Demanda Login' });
    responderSucesso(requisicao, { textoAuxiliado: SUGESTAO });
    await montado.atualizar();

    expect(montado.elemento.textContent).toContain('Texto original');
    expect(montado.elemento.textContent).toContain(TEXTO);
    expect((montado.elemento.querySelector('textarea') as HTMLTextAreaElement).value).toBe(SUGESTAO);
  });

  it('o tipo de entidade padrão é "execucao"', async () => {
    const montado = await montar(TEXTO);
    botao(montado, 'Auxiliar com IA').click();
    const requisicao = esperarRequisicao(montado.http, 'POST', '/assistente/auxiliar-descricao');
    expect(requisicao.request.body.tipoEntidade).toBe('execucao');
    responderSucesso(requisicao, { textoAuxiliado: SUGESTAO });
  });

  it('IA fora do ar (erro do backend): não abre a comparação e libera o botão para tentar de novo', async () => {
    const montado = await montar(TEXTO);
    botao(montado, 'Auxiliar com IA').click();
    responderErro(esperarRequisicao(montado.http, 'POST', '/assistente/auxiliar-descricao'), 503, 'A IA está fora do ar');
    await montado.atualizar();

    expect(montado.componente.mostrarComparacao()).toBe(false);
    expect(montado.elemento.textContent).not.toContain('Sugestão (editável)');
    expect(montado.componente.carregandoAuxilio()).toBe(false);
    expect(botao(montado, 'Auxiliar com IA').disabled).toBe(false);
    // O interceptor já avisou o usuário (toast); o rxjs reporta a falha relançada um tick depois.
    await new Promise((resolver) => setTimeout(resolver, 0));
    expect(montado.errosHttpNaoTratados).toHaveLength(1);
  });

  it('enquanto a IA responde o botão fica ocupado e um segundo clique não duplica o pedido', async () => {
    const montado = await montar(TEXTO);
    botao(montado, 'Auxiliar com IA').click();
    await montado.atualizar();
    expect(montado.componente.carregandoAuxilio()).toBe(true);
    montado.componente.auxiliar();
    const requisicao = esperarRequisicao(montado.http, 'POST', '/assistente/auxiliar-descricao');
    responderSucesso(requisicao, { textoAuxiliado: SUGESTAO });
  });
});

describe('AssistenteDescricaoComponent — aceitar, regenerar e descartar', () => {
  it('"Aceitar" emite a sugestão (inclusive editada), fecha a comparação e oferece "Desfazer"', async () => {
    const montado = await montar(TEXTO);
    const aceitos: string[] = [];
    montado.componente.textoAuxiliadoAceito.subscribe((texto) => aceitos.push(texto));
    await pedirSugestao(montado);

    const campo = montado.elemento.querySelector('textarea') as HTMLTextAreaElement;
    campo.value = 'Sugestão ajustada pelo usuário';
    campo.dispatchEvent(new Event('input'));
    await montado.atualizar();
    botao(montado, 'Aceitar').click();
    // Sem `whenStable`: o temporizador do "Desfazer" (5 s) manteria o teste esperando.
    montado.fixture.detectChanges();

    expect(aceitos).toEqual(['Sugestão ajustada pelo usuário']);
    expect(montado.componente.mostrarComparacao()).toBe(false);
    expect(TestBed.inject(DesfazerService).oferta()?.mensagem).toBe('Texto substituído pela sugestão da IA');
    TestBed.inject(DesfazerService).dispensarSemEncerrar();
  });

  it('"Desfazer" depois de aceitar devolve o texto de antes pelo mesmo evento', async () => {
    const montado = await montar(TEXTO);
    const aceitos: string[] = [];
    montado.componente.textoAuxiliadoAceito.subscribe((texto) => aceitos.push(texto));
    await pedirSugestao(montado);
    botao(montado, 'Aceitar').click();
    TestBed.inject(DesfazerService).executar();

    expect(aceitos).toEqual([SUGESTAO, TEXTO]);
  });

  it('"Regenerar" pede outra sugestão com o mesmo texto e substitui a anterior', async () => {
    const montado = await montar(TEXTO);
    await pedirSugestao(montado);
    botao(montado, 'Regenerar').click();
    const requisicao = esperarRequisicao(montado.http, 'POST', '/assistente/auxiliar-descricao');
    expect(requisicao.request.body.textoOriginal).toBe(TEXTO);
    responderSucesso(requisicao, { textoAuxiliado: 'Outra sugestão da IA' });
    await montado.atualizar();

    expect((montado.elemento.querySelector('textarea') as HTMLTextAreaElement).value).toBe('Outra sugestão da IA');
  });

  it('"Descartar" fecha a comparação sem emitir nada nem oferecer "Desfazer"', async () => {
    const montado = await montar(TEXTO);
    const aceitos: string[] = [];
    montado.componente.textoAuxiliadoAceito.subscribe((texto) => aceitos.push(texto));
    await pedirSugestao(montado);
    botao(montado, 'Descartar').click();
    await montado.atualizar();

    expect(aceitos).toEqual([]);
    expect(montado.componente.mostrarComparacao()).toBe(false);
    expect(montado.componente.textoAuxiliado()).toBe('');
    expect(TestBed.inject(DesfazerService).oferta()).toBeNull();
  });
});
