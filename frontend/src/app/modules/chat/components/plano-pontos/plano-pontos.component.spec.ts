import { describe, it, expect } from 'vitest';
import { TipoPlanoPontoSituacaoEnum as Situacao, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { PlanoPontosComponent } from './plano-pontos.component';

// Painel dos pontos em aberto do plano (task 235, API em `/plano/:id/ponto`): abertos primeiro, fechados numa seção recolhível, anotar, resolver,
// dispensar com motivo opcional, registrar a decisão e reabrir.

type Montado = ComponenteMontado<PlanoPontosComponent>;

function ponto(id: number, situacao: Situacao, sobrescrita: Record<string, unknown> = {}) {
  return { id, planoId: 7, rotulo: `Rótulo ${id}`, texto: `Texto do ponto ${id}`, situacao, resolucaoTexto: null, createdDate: '2026-10-25T12:00:00.000Z', updatedDate: '2026-10-25T12:00:00.000Z', ...sobrescrita };
}

async function montar(pontos: unknown[] = []): Promise<Montado> {
  const montado = await montarComponente(PlanoPontosComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, entradas: { planoId: 7 } });
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/plano/7/ponto'), pontos);
  await montado.atualizar();
  return montado;
}

const texto = (montado: Montado) => montado.elemento.textContent ?? '';
const botao = (montado: Montado, rotulo: string) => Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.textContent?.trim() === rotulo);
const porRotuloDeAcessibilidade = (montado: Montado, rotulo: string) => montado.elemento.querySelector<HTMLButtonElement>(`button[aria-label="${rotulo}"]`);
const campo = (montado: Montado, rotulo: string) => montado.elemento.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[aria-label="${rotulo}"]`)!;
function escrever(alvo: HTMLInputElement | HTMLTextAreaElement, valor: string) {
  alvo.value = valor;
  alvo.dispatchEvent(new Event('input'));
}

describe('PlanoPontosComponent — listar', () => {
  it('sem pontos mostra o estado vazio e a contagem zero', async () => {
    const montado = await montar([]);
    expect(texto(montado)).toContain('Nenhum ponto em aberto.');
    expect(montado.elemento.querySelector('.plano-pontos__contagem')?.textContent?.trim()).toBe('0');
  });

  it('mostra os abertos com o rótulo livre e deixa os fechados recolhidos até abrir a seção', async () => {
    const montado = await montar([ponto(1, Situacao.ABERTO, { rotulo: 'Qualquer rótulo' }), ponto(2, Situacao.RESOLVIDO, { resolucaoTexto: 'Só gestor' }), ponto(3, Situacao.DECISAO, { resolucaoTexto: 'PDF' })]);

    expect(texto(montado)).toContain('Qualquer rótulo');
    expect(texto(montado)).toContain('Texto do ponto 1');
    expect(montado.elemento.querySelector('.plano-pontos__contagem')?.textContent?.trim()).toBe('1');
    expect(texto(montado)).not.toContain('Texto do ponto 2');
    expect(texto(montado)).toContain('Resolvidos, dispensados e decisões (2)');

    botao(montado, 'Resolvidos, dispensados e decisões (2)')!.click();
    await montado.atualizar();
    expect(texto(montado)).toContain('Texto do ponto 2');
    expect(texto(montado)).toContain('Só gestor');
    expect(texto(montado)).toContain('Decisão');
  });

  it('enquanto carrega mostra o esqueleto; se falha, avisa e oferece tentar de novo', async () => {
    const montado = await montarComponente(PlanoPontosComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, entradas: { planoId: 7 } });
    expect(montado.elemento.querySelector('[aria-busy="true"]')).not.toBeNull();
    esperarRequisicao(montado.http, 'GET', '/plano/7/ponto').flush({ mensagem: 'falhou' }, { status: 500, statusText: 'Erro' });
    await montado.atualizar();
    expect(texto(montado)).toContain('Não foi possível carregar os pontos.');

    botao(montado, 'Tentar de novo')!.click();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/plano/7/ponto'), [ponto(1, Situacao.ABERTO)]);
    await montado.atualizar();
    expect(texto(montado)).toContain('Texto do ponto 1');
  });

  it('recolher o painel esconde a lista e deixa só o trilho com a contagem; o trilho reabre', async () => {
    const montado = await montar([ponto(1, Situacao.ABERTO)]);
    porRotuloDeAcessibilidade(montado, 'Recolher painel')!.click();
    await montado.atualizar();
    expect(texto(montado)).not.toContain('Texto do ponto 1');
    expect(montado.elemento.querySelector('.plano-pontos--recolhido .plano-pontos__contagem')?.textContent?.trim()).toBe('1');

    porRotuloDeAcessibilidade(montado, 'Expandir pontos em aberto')!.click();
    await montado.atualizar();
    expect(texto(montado)).toContain('Texto do ponto 1');
  });
});

describe('PlanoPontosComponent — anotar à mão', () => {
  it('anota com o rótulo e o texto e relê a lista', async () => {
    const montado = await montar([]);
    porRotuloDeAcessibilidade(montado, 'Anotar ponto')!.click();
    await montado.atualizar();

    escrever(campo(montado, 'Rótulo do ponto'), 'Risco');
    escrever(campo(montado, 'Texto do ponto'), 'Sem teste de carga');
    await montado.atualizar();
    montado.elemento.querySelector<HTMLFormElement>('.plano-pontos__anotacao')!.dispatchEvent(new Event('submit'));

    const criacao = esperarRequisicao(montado.http, 'POST', '/plano/7/ponto');
    expect(criacao.request.body).toEqual({ rotulo: 'Risco', texto: 'Sem teste de carga' });
    responderSucesso(criacao, { id: 5, planoId: 7, rotulo: 'Risco', texto: 'Sem teste de carga', situacao: Situacao.ABERTO });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/plano/7/ponto'), [ponto(5, Situacao.ABERTO, { rotulo: 'Risco', texto: 'Sem teste de carga' })]);
    await montado.atualizar();

    expect(texto(montado)).toContain('Sem teste de carga');
    expect(montado.elemento.querySelector('.plano-pontos__anotacao')).toBeNull();
  });

  it('sem texto não anota (o rótulo em branco vira "Ponto")', async () => {
    const montado = await montar([]);
    montado.componente.alternarAnotacao();
    montado.componente.controleTexto.setValue('   ');
    montado.componente.anotar();
    montado.http.expectNone((requisicao) => requisicao.method === 'POST');

    montado.componente.controleTexto.setValue('Algo ficou em aberto');
    montado.componente.anotar();
    expect(esperarRequisicao(montado.http, 'POST', '/plano/7/ponto').request.body).toEqual({ rotulo: 'Ponto', texto: 'Algo ficou em aberto' });
  });
});

describe('PlanoPontosComponent — fechar e reabrir', () => {
  it('resolver pede a resposta (sem ela o Confirmar fica desabilitado) e manda RESOLVIDO com o texto', async () => {
    const montado = await montar([ponto(1, Situacao.ABERTO)]);
    botao(montado, 'Resolver')!.click();
    await montado.atualizar();
    expect(botao(montado, 'Confirmar')!.disabled).toBe(true);

    escrever(campo(montado, 'Resposta que resolve o ponto'), 'Só gestor e administrador');
    await montado.atualizar();
    expect(botao(montado, 'Confirmar')!.disabled).toBe(false);
    botao(montado, 'Confirmar')!.click();

    const alteracao = esperarRequisicao(montado.http, 'PATCH', '/plano/7/ponto/1/situacao');
    expect(alteracao.request.body).toEqual({ situacao: Situacao.RESOLVIDO, resolucaoTexto: 'Só gestor e administrador' });
    responderSucesso(alteracao, { id: 1, situacao: Situacao.RESOLVIDO, resolucaoTexto: 'Só gestor e administrador' });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/plano/7/ponto'), [ponto(1, Situacao.RESOLVIDO, { resolucaoTexto: 'Só gestor e administrador' })]);
    await montado.atualizar();

    expect(montado.elemento.querySelector('.plano-pontos__contagem')?.textContent?.trim()).toBe('0');
  });

  it('dispensar vale sem motivo e com motivo', async () => {
    const montado = await montar([ponto(1, Situacao.ABERTO)]);
    botao(montado, 'Dispensar')!.click();
    await montado.atualizar();
    expect(botao(montado, 'Confirmar')!.disabled).toBe(false);

    escrever(campo(montado, 'Motivo (opcional)'), 'Fica para a próxima versão');
    await montado.atualizar();
    botao(montado, 'Confirmar')!.click();
    expect(esperarRequisicao(montado.http, 'PATCH', '/plano/7/ponto/1/situacao').request.body).toEqual({ situacao: Situacao.DISPENSADO, resolucaoTexto: 'Fica para a próxima versão' });
  });

  it('dispensar sem motivo manda só a situação', async () => {
    const montado = await montar([ponto(1, Situacao.ABERTO)]);
    montado.componente.tratar(ponto(1, Situacao.ABERTO) as never, Situacao.DISPENSADO);
    montado.componente.confirmarTratamento();
    expect(esperarRequisicao(montado.http, 'PATCH', '/plano/7/ponto/1/situacao').request.body).toEqual({ situacao: Situacao.DISPENSADO });
  });

  it('registrar a decisão manda DECISAO com o texto', async () => {
    const montado = await montar([ponto(1, Situacao.ABERTO)]);
    botao(montado, 'Decisão')!.click();
    await montado.atualizar();
    escrever(campo(montado, 'Decisão tomada'), 'Exportar só em PDF');
    await montado.atualizar();
    botao(montado, 'Confirmar')!.click();
    expect(esperarRequisicao(montado.http, 'PATCH', '/plano/7/ponto/1/situacao').request.body).toEqual({ situacao: Situacao.DECISAO, resolucaoTexto: 'Exportar só em PDF' });
  });

  it('reabrir manda ABERTO', async () => {
    const montado = await montar([ponto(2, Situacao.DISPENSADO, { resolucaoTexto: 'Depois' })]);
    botao(montado, 'Resolvidos, dispensados e decisões (1)')!.click();
    await montado.atualizar();
    botao(montado, 'Reabrir')!.click();
    expect(esperarRequisicao(montado.http, 'PATCH', '/plano/7/ponto/2/situacao').request.body).toEqual({ situacao: Situacao.ABERTO });
  });

  it('falha ao alterar mostra o aviso com a mensagem da API e mantém a lista', async () => {
    const montado = await montar([ponto(1, Situacao.ABERTO)]);
    const avisos: Array<{ detail?: string }> = [];
    montado.mensagens.messageObserver.subscribe((aviso) => avisos.push(aviso as { detail?: string }));
    montado.componente.tratar(ponto(1, Situacao.ABERTO) as never, Situacao.RESOLVIDO);
    montado.componente.controleResolucao.setValue('x');
    montado.componente.confirmarTratamento();
    responderErro(esperarRequisicao(montado.http, 'PATCH', '/plano/7/ponto/1/situacao'), 400, 'Informe a resposta que resolve o ponto');
    await montado.atualizar();

    expect(avisos[0]?.detail).toBe('Informe a resposta que resolve o ponto');
    expect(texto(montado)).toContain('Texto do ponto 1');
  });
});
