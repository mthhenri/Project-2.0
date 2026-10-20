import { TestBed } from '@angular/core/testing';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { EstadoIaEnum, ExecucaoAtivaDto, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { ExecucaoAtivaService } from '../../../../core/services/execucao-ativa.service';
import { IaDisponibilidadeService } from '../../../../core/services/ia-disponibilidade.service';
import { ChipExecucaoAtivaComponent } from './chip-execucao-ativa.component';

// Chip global da execução ativa (task 95): aparece em todas as telas enquanto há execução (descrição + cronômetro ao vivo) e some ao
// encerrar; sem execução vira "Sem execução ativa" apontando para onde se inicia uma. A pausa é inline e otimista, com descrição
// obrigatória para o desenvolvedor e opcional para o gestor (SYSTEM.SPEC.md §14).

type Montado = ComponenteMontado<ChipExecucaoAtivaComponent>;

const INICIO = new Date('2026-10-19T12:00:00.000Z');

function execucao(parcial: Partial<ExecucaoAtivaDto> = {}): ExecucaoAtivaDto {
  return { id: 9, atividadeId: 3, descricao: 'Montando o formulário', inicioData: new Date(INICIO.getTime() - (5 * 60 + 3) * 1000), ...parcial };
}

/** O relógio do chip é um `setInterval` de 1 s (tarefa pendente do zone.js): temporizadores e `Date` simulados desde o início. */
async function montarChip(usuario = TipoUsuarioEnum.DESENVOLVEDOR): Promise<Montado> {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
  vi.setSystemTime(INICIO);
  return montarComponente(ChipExecucaoAtivaComponent, { usuario, rotas: [{ path: '**', children: [] }] });
}

/** Carrega a execução ativa pelo serviço, como a topbar faz ao abrir. */
async function carregarAtiva(montado: Montado, ativa: ExecucaoAtivaDto | null): Promise<void> {
  TestBed.inject(ExecucaoAtivaService).carregar();
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/execucao/ativa'), ativa);
  await montado.atualizar();
}

const texto = (montado: Montado) => (montado.elemento.textContent ?? '').replace(/\s+/g, ' ');
const cronometro = (montado: Montado) => montado.elemento.querySelector('[role="timer"]')?.textContent?.trim();
const botaoPausar = (montado: Montado) => montado.elemento.querySelector<HTMLElement>('[aria-label="Pausar execução"]');
const campoDescricao = () => document.querySelector<HTMLTextAreaElement>('textarea#chip-execucao-descricao');
const botaoConfirmar = () =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((candidato) => candidato.textContent?.trim() === 'Pausar');

function cliqueNoBotaoPausar(montado: Montado): void {
  const alvo = botaoPausar(montado)!;
  (alvo.tagName === 'BUTTON' ? alvo : alvo.querySelector('button')!).click();
}

async function abrirPopover(montado: Montado): Promise<void> {
  cliqueNoBotaoPausar(montado);
  await montado.atualizar();
  vi.advanceTimersByTime(100);
  await montado.atualizar();
}

afterEach(() => {
  vi.useRealTimers();
  document.querySelectorAll('.p-popover').forEach((popover) => popover.remove());
});

describe('ChipExecucaoAtivaComponent — presença', () => {
  it('na primeira carga mostra só o esqueleto', async () => {
    const montado = await montarChip();
    TestBed.inject(ExecucaoAtivaService).carregar();
    await montado.atualizar();
    expect(montado.elemento.querySelector('.chip-execucao--esqueleto')).not.toBeNull();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/execucao/ativa'), null);
  });

  it('sem execução ativa mostra "Sem execução ativa" apontando para Atividades', async () => {
    const montado = await montarChip();
    await carregarAtiva(montado, null);
    const vazio = montado.elemento.querySelector<HTMLAnchorElement>('.chip-execucao--vazio')!;
    expect(vazio.textContent).toContain('Sem execução ativa');
    expect(vazio.getAttribute('href')).toBe('/atividade');
    expect(botaoPausar(montado)).toBeNull();
  });

  it('com a IA no ar o "Sem execução ativa" segue apontando para Atividades', async () => {
    const montado = await montarChip();
    TestBed.inject(IaDisponibilidadeService).estadoReal.set(EstadoIaEnum.NO_AR);
    await carregarAtiva(montado, null);
    expect(montado.elemento.querySelector('.chip-execucao--vazio')?.getAttribute('href')).toBe('/atividade');
  });

  it('com execução ativa mostra a descrição, o cronômetro e o botão de pausar', async () => {
    const montado = await montarChip();
    await carregarAtiva(montado, execucao());
    expect(texto(montado)).toContain('Montando o formulário');
    expect(cronometro(montado)).toBe('00:05:03');
    expect(botaoPausar(montado)).not.toBeNull();
    expect(montado.elemento.querySelector('.chip-execucao--vazio')).toBeNull();
  });

  it('execução sem descrição mostra "Execução em andamento"', async () => {
    const montado = await montarChip();
    await carregarAtiva(montado, execucao({ descricao: '' }));
    expect(texto(montado)).toContain('Execução em andamento');
  });

  it('o cronômetro corre ao vivo, de segundo em segundo', async () => {
    const montado = await montarChip();
    await carregarAtiva(montado, execucao());
    vi.advanceTimersByTime(2000);
    montado.fixture.detectChanges();
    expect(cronometro(montado)).toBe('00:05:05');
  });

  it('o cronômetro passa de uma hora corretamente (hh:mm:ss)', async () => {
    const montado = await montarChip();
    await carregarAtiva(montado, execucao({ inicioData: new Date(INICIO.getTime() - (3600 + 2 * 60 + 7) * 1000) }));
    expect(cronometro(montado)).toBe('01:02:07');
  });

  it('ao encerrar (execução some do serviço) o chip vira "Sem execução ativa"', async () => {
    const montado = await montarChip();
    await carregarAtiva(montado, execucao());
    TestBed.inject(ExecucaoAtivaService).definir(null);
    await montado.atualizar();
    expect(montado.elemento.querySelector('.chip-execucao--ativa')).toBeNull();
    expect(texto(montado)).toContain('Sem execução ativa');
  });

  it('o relógio só corre com execução ativa: sem ela não sobra temporizador', async () => {
    const montado = await montarChip();
    await carregarAtiva(montado, execucao());
    const comRelogio = vi.getTimerCount();
    TestBed.inject(ExecucaoAtivaService).definir(null);
    await montado.atualizar();
    expect(vi.getTimerCount()).toBe(comRelogio - 1);
  });
});

describe('ChipExecucaoAtivaComponent — pausa inline', () => {
  it('desenvolvedor: o popover vem com a descrição atual e o campo é obrigatório', async () => {
    const montado = await montarChip();
    await carregarAtiva(montado, execucao());
    await abrirPopover(montado);

    expect(campoDescricao()?.value).toBe('Montando o formulário');
    expect(document.body.textContent).toContain('Descrição da execução');
    expect(montado.componente.descricaoObrigatoria()).toBe(true);
  });

  it('desenvolvedor sem descrição não pausa: mostra o erro e não chama a API', async () => {
    const montado = await montarChip();
    await carregarAtiva(montado, execucao());
    await abrirPopover(montado);

    const campo = campoDescricao()!;
    campo.value = '';
    campo.dispatchEvent(new Event('input'));
    botaoConfirmar()!.click();
    await montado.atualizar();

    expect(document.body.textContent).toContain('Informe a descrição para pausar.');
    montado.http.expectNone((requisicao) => requisicao.method === 'PATCH');
    expect(montado.componente.execucaoAtiva.ativa()).not.toBeNull();
  });

  it('gestor pode pausar sem descrição (campo opcional)', async () => {
    const montado = await montarChip(TipoUsuarioEnum.GESTOR);
    await carregarAtiva(montado, execucao());
    await abrirPopover(montado);
    expect(montado.componente.descricaoObrigatoria()).toBe(false);

    const campo = campoDescricao()!;
    campo.value = '';
    campo.dispatchEvent(new Event('input'));
    botaoConfirmar()!.click();
    await montado.atualizar();

    const requisicao = esperarRequisicao(montado.http, 'PATCH', '/execucao/9/encerrar');
    expect(requisicao.request.body.descricao).toBeUndefined();
    responderSucesso(requisicao, { id: 9, duracaoMinutos: 5 });
  });

  it('pausar envia a descrição, tira o chip na hora (otimista), avisa a tela e confirma a duração', async () => {
    const montado = await montarChip();
    await carregarAtiva(montado, execucao());
    await abrirPopover(montado);

    const campo = campoDescricao()!;
    campo.value = '  Terminei o formulário  ';
    campo.dispatchEvent(new Event('input'));
    const avisos: { severity?: string; detail?: string }[] = [];
    montado.mensagens.messageObserver.subscribe((mensagem) => avisos.push(...[mensagem].flat()));
    botaoConfirmar()!.click();
    await montado.atualizar();

    const requisicao = esperarRequisicao(montado.http, 'PATCH', '/execucao/9/encerrar');
    expect(requisicao.request.body).toEqual({ descricao: 'Terminei o formulário' });
    expect(montado.componente.execucaoAtiva.ativa()).toBeNull();
    expect(texto(montado)).toContain('Sem execução ativa');

    responderSucesso(requisicao, { id: 9, duracaoMinutos: 90 });
    await montado.atualizar();
    expect(montado.componente.execucaoAtiva.pausasDoChip()).toBe(1);
    expect(avisos.some((aviso) => aviso.severity === 'success' && aviso.detail?.startsWith('Execução pausada'))).toBe(true);
  });

  it('se a API recusa a pausa o chip volta com a execução de antes', async () => {
    const montado = await montarChip();
    await carregarAtiva(montado, execucao());
    await abrirPopover(montado);

    botaoConfirmar()!.click();
    await montado.atualizar();
    responderErro(esperarRequisicao(montado.http, 'PATCH', '/execucao/9/encerrar'), 400, 'Não foi possível pausar');
    await montado.atualizar();

    expect(montado.componente.execucaoAtiva.ativa()?.id).toBe(9);
    expect(texto(montado)).toContain('Montando o formulário');
    expect(montado.componente.execucaoAtiva.pausasDoChip()).toBe(0);
  });
});
