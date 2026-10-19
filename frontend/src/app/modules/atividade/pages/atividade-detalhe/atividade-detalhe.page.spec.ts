import { describe, it, expect, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import {
  AtividadeRecuperadaDto,
  ExecucaoItemDto,
  TipoAtividadePrioridadeEnum,
  TipoAtividadeStatusEnum,
  TipoUsuarioEnum,
} from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { ExecucaoAtivaService } from '../../../../core/services/execucao-ativa.service';
import { AtividadeDetalhePage } from './atividade-detalhe.page';

type Montado = ComponenteMontado<AtividadeDetalhePage>;

const PRIORIDADE = { codigo: TipoAtividadePrioridadeEnum.MEDIA, descricao: 'Média', ordem: 3, cor: '#ccaa00' };

function criarAtividade(sobrescritas: Partial<AtividadeRecuperadaDto> = {}): AtividadeRecuperadaDto {
  return {
    id: 7, demandaId: 10, nomeDemanda: 'Demanda dez', projetoId: 5, nomeProjeto: 'Portal', usuarioId: 1, nomeUsuario: 'Maria Souza',
    usuarioTipo: TipoUsuarioEnum.DESENVOLVEDOR, nome: 'Implementar login', status: TipoAtividadeStatusEnum.PLANEJADA, prioridade: PRIORIDADE,
    posicaoAtividadeUsuario: 1, createdDate: new Date('2026-02-01T12:00:00.000Z'), ...sobrescritas,
  };
}

function criarExecucao(id: number, sobrescritas: Partial<ExecucaoItemDto> = {}): ExecucaoItemDto {
  return {
    id, atividadeId: 7, nomeAtividade: 'Implementar login', demandaId: 10, nomeDemanda: 'Demanda dez', projetoId: 5, nomeProjeto: 'Portal',
    descricao: `Execução ${id}`, inicioData: new Date('2026-02-02T10:00:00.000Z'), fimData: new Date('2026-02-02T11:00:00.000Z'), duracaoMinutos: 60,
    usuarioId: 1, nomeUsuario: 'Maria Souza', ...sobrescritas,
  };
}

const pagina = (itens: ExecucaoItemDto[]) => ({ itens, totalItens: itens.length, pagina: 1, itensPorPagina: 200 });

interface OpcoesDetalhe {
  usuario?: TipoUsuarioEnum;
  id?: string;
}

afterEach(() => vi.useRealTimers());

async function montarPagina({ usuario = TipoUsuarioEnum.DESENVOLVEDOR, id = '7' }: OpcoesDetalhe = {}) {
  // O cronômetro usa setInterval; sem isso a zona nunca fica estável e o teste espera para sempre.
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  TestBed.resetTestingModule();
  const rota = { snapshot: { paramMap: convertToParamMap({ id }) }, paramMap: of(convertToParamMap({ id })) };
  const montado = await montarComponente(AtividadeDetalhePage, { usuario, provedores: [{ provide: ActivatedRoute, useValue: rota }] });
  const irPara = vi.fn().mockResolvedValue(true);
  (montado.fixture.debugElement.injector.get(Router) as unknown as { navigate: unknown }).navigate = irPara;
  return { montado, irPara };
}

interface Carga {
  atividade?: AtividadeRecuperadaDto;
  execucoes?: ExecucaoItemDto[];
  tags?: Array<{ id: number; nome: string; cor: string }>;
  execucaoAtiva?: { id: number; atividadeId: number; descricao: string; inicioData: Date } | null;
}

/** Atende a carga inicial da tela (prioridades, execução ativa, atividade, tags, todas as tags e execuções). */
async function carregar(montado: Montado, { atividade = criarAtividade(), execucoes = [], tags = [], execucaoAtiva = null }: Carga = {}): Promise<void> {
  for (const requisicao of montado.http.match((r) => r.method === 'GET' && r.url.endsWith('/atividade-prioridade'))) responderSucesso(requisicao, [PRIORIDADE]);
  const ativa = esperarRequisicao(montado.http, 'GET', '/execucao/ativa');
  responderSucesso(ativa, execucaoAtiva);
  responderSucesso(esperarRequisicao(montado.http, 'GET', `/atividade/${atividade.id}`), atividade);
  responderSucesso(esperarRequisicao(montado.http, 'GET', `/atividade/${atividade.id}/tag`), tags);
  responderSucesso(montado.http.expectOne((r) => r.method === 'GET' && /\/tag$/.test(r.url) && !r.url.includes('/atividade/')), tags);
  responderSucesso(montado.http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/execucao')), pagina(execucoes));
  for (const requisicao of montado.http.match((r) => r.method === 'GET' && r.url.endsWith('/demanda/atribuidas'))) responderSucesso(requisicao, []);
  await montado.atualizar();
}

const texto = (montado: Montado) => montado.elemento.textContent ?? '';
const secao = (montado: Montado, rotulo: string) => montado.elemento.querySelector(`section[aria-label="${rotulo}"]`);
const botaoPorTexto = (montado: Montado, rotulo: string) =>
  Array.from(montado.elemento.querySelectorAll('button')).find((botao) => (botao.textContent ?? '').includes(rotulo)) as HTMLButtonElement | undefined;

describe('AtividadeDetalhePage: carga e estados', () => {
  it('mostra o esqueleto enquanto carrega e depois o cabeçalho da atividade', async () => {
    const { montado } = await montarPagina();
    expect(montado.elemento.querySelector('app-skeleton-lista')).not.toBeNull();
    await carregar(montado);
    expect(montado.elemento.querySelector('app-skeleton-lista')).toBeNull();
    expect(montado.elemento.querySelector('h1')?.textContent).toContain('Implementar login');
    expect(texto(montado)).toContain('Demanda #10 — Demanda dez');
    expect(texto(montado)).toContain('Planejada');
  });

  it('id que não é número não chama a API e mostra "Atividade não encontrada"', async () => {
    const { montado } = await montarPagina({ id: 'nova' });
    montado.http.expectNone((r) => r.url.includes('/atividade/'));
    expect(texto(montado)).toContain('Atividade não encontrada.');
  });

  it('as execuções recentes mostram só as cinco mais novas, com "Ver histórico completo"', async () => {
    const { montado, irPara } = await montarPagina();
    await carregar(montado, { execucoes: [1, 2, 3, 4, 5, 6, 7].map((id) => criarExecucao(id)) });
    expect(montado.elemento.querySelectorAll('li.atividade-detalhe__execucao').length).toBe(5);
    botaoPorTexto(montado, 'Ver histórico completo')!.click();
    expect(irPara).toHaveBeenCalledWith(['/execucao'], { queryParams: { atividadeId: 7 } });
  });

  it('sem execuções, mostra o vazio e oferece iniciar a primeira', async () => {
    const { montado } = await montarPagina();
    await carregar(montado);
    expect(texto(montado)).toContain('Nenhuma execução registrada ainda.');
    expect(botaoPorTexto(montado, 'Iniciar primeira execução')).toBeDefined();
  });

  it('o breadcrumb da demanda leva às atividades daquela demanda', async () => {
    const { montado, irPara } = await montarPagina();
    await carregar(montado);
    montado.componente.verAtividadesDaDemanda();
    expect(irPara).toHaveBeenCalledWith(['/atividade'], { queryParams: { demandaId: 10 } });
  });

  it('só o gestor vê "Registrar tempo"', async () => {
    const gestor = await montarPagina({ usuario: TipoUsuarioEnum.GESTOR });
    await carregar(gestor.montado, { atividade: criarAtividade({ usuarioId: 9 }) });
    expect(botaoPorTexto(gestor.montado, 'Registrar tempo')).toBeDefined();

    const desenvolvedor = await montarPagina();
    await carregar(desenvolvedor.montado);
    expect(botaoPorTexto(desenvolvedor.montado, 'Registrar tempo')).toBeUndefined();
  });
});

describe('AtividadeDetalhePage: faixa de execução', () => {
  it('livre: Planejada ou Desenvolvendo, dono sem execução, mostra o campo de descrição e o Iniciar', async () => {
    const { montado } = await montarPagina();
    await carregar(montado);
    expect(montado.componente.estadoFaixa()).toBe('livre');
    expect(secao(montado, 'Iniciar execução')).not.toBeNull();
    expect(texto(montado)).toContain('O que você vai fazer?');
  });

  it('bloqueada: Pendente ou Desenvolvida explica por que não dá para iniciar', async () => {
    const { montado } = await montarPagina();
    await carregar(montado, { atividade: criarAtividade({ status: TipoAtividadeStatusEnum.PENDENTE }) });
    expect(montado.componente.estadoFaixa()).toBe('bloqueada');
    expect(secao(montado, 'Execução indisponível')?.textContent).toContain('Planejadas ou Desenvolvendo');
  });

  it('oculta: o desenvolvedor que não é o dono não vê a faixa nem edita as tags', async () => {
    const { montado } = await montarPagina();
    await carregar(montado, { atividade: criarAtividade({ usuarioId: 9 }), tags: [{ id: 1, nome: 'Bug', cor: '#ff0000' }] });
    expect(montado.componente.estadoFaixa()).toBe('oculta');
    expect(montado.elemento.querySelector('section.atividade-detalhe__faixa')).toBeNull();
    expect(montado.elemento.querySelector('button.atividade-detalhe__tags--editavel')).toBeNull();
    expect(texto(montado)).toContain('Bug');
    montado.componente.abrirTags(new Event('click'), document.createElement('div'));
  });

  it('o gestor age em qualquer atividade, mesmo de outro dono', async () => {
    const { montado } = await montarPagina({ usuario: TipoUsuarioEnum.GESTOR });
    await carregar(montado, { atividade: criarAtividade({ usuarioId: 9 }) });
    expect(montado.componente.podeAgir()).toBe(true);
    expect(montado.componente.estadoFaixa()).toBe('livre');
  });

  it('ativa: com execução aberta, mostra o timer, a descrição e o botão Pausar', async () => {
    const aberta = criarExecucao(3, { fimData: null, duracaoMinutos: null, descricao: 'Ajustando o login', inicioData: new Date() });
    const { montado } = await montarPagina();
    await carregar(montado, {
      execucoes: [aberta],
      execucaoAtiva: { id: 3, atividadeId: 7, descricao: 'Ajustando o login', inicioData: aberta.inicioData },
    });
    const faixa = secao(montado, 'Execução em andamento')!;
    expect(faixa).not.toBeNull();
    expect(faixa.querySelector('app-execucao-timer')).not.toBeNull();
    expect(faixa.textContent).toContain('Ajustando o login');
    expect(faixa.textContent).toContain('Pausar');
    expect(faixa.textContent).not.toContain('Em execução por');
  });

  it('o timer da faixa mostra o tempo desde o início da execução', async () => {
    const inicio = new Date(Date.now() - 3_725_000);
    const aberta = criarExecucao(3, { fimData: null, duracaoMinutos: null, inicioData: inicio });
    const { montado } = await montarPagina();
    await carregar(montado, { execucoes: [aberta], execucaoAtiva: { id: 3, atividadeId: 7, descricao: 'x', inicioData: inicio } });
    expect(secao(montado, 'Execução em andamento')!.querySelector('app-execucao-timer')!.textContent).toMatch(/01:02:0\d/);
  });

  it('o status trava enquanto há execução aberta', async () => {
    const aberta = criarExecucao(3, { fimData: null, duracaoMinutos: null });
    const { montado } = await montarPagina();
    await carregar(montado, { execucoes: [aberta] });
    expect(montado.componente.statusBloqueado()).toBe(true);
    expect(montado.componente.formularioStatus.controls.status.disabled).toBe(true);
  });

  it('pausa em 1 clique: encerra a execução pelo id, mantendo a descrição, sem abrir dialog', async () => {
    const aberta = criarExecucao(3, { fimData: null, duracaoMinutos: null, descricao: 'Ajustando o login' });
    const { montado } = await montarPagina();
    await carregar(montado, { execucoes: [aberta], execucaoAtiva: { id: 3, atividadeId: 7, descricao: 'Ajustando o login', inicioData: aberta.inicioData } });
    botaoPorTexto(montado, 'Pausar')!.click();
    const requisicao = esperarRequisicao(montado.http, 'PATCH', '/execucao/3/encerrar');
    expect(requisicao.request.body).toEqual({ descricao: 'Ajustando o login' });
    expect(montado.componente.executando()).toBe(true);
    responderSucesso(requisicao, {});
    await montado.atualizar();
    // Depois de pausar, a atividade e as execuções são recarregadas e o campo de descrição volta vazio.
    esperarRequisicao(montado.http, 'GET', '/atividade/7');
    expect(montado.componente.descricaoInicio.value).toBe('');
    expect(montado.componente.executando()).toBe(false);
  });

  it('a pausa em andamento não duplica: o segundo clique é ignorado', async () => {
    const aberta = criarExecucao(3, { fimData: null, duracaoMinutos: null });
    const { montado } = await montarPagina();
    await carregar(montado, { execucoes: [aberta] });
    montado.componente.pausarExecucao(aberta);
    montado.componente.pausarExecucao(aberta);
    esperarRequisicao(montado.http, 'PATCH', '/execucao/3/encerrar');
  });

  it('quando a pausa falha, a execução continua e o botão volta a ficar livre', async () => {
    const aberta = criarExecucao(3, { fimData: null, duracaoMinutos: null });
    const { montado } = await montarPagina();
    await carregar(montado, { execucoes: [aberta] });
    montado.componente.pausarExecucao(aberta);
    responderErro(esperarRequisicao(montado.http, 'PATCH', '/execucao/3/encerrar'), 400, 'falhou');
    await montado.atualizar();
    expect(montado.componente.executando()).toBe(false);
    expect(montado.componente.execucaoAberta()?.id).toBe(3);
  });

  it('a execução aberta de outro usuário aparece com o nome dele e o dono não consegue "pausá-la" como se fosse sua', async () => {
    const aberta = criarExecucao(3, { fimData: null, duracaoMinutos: null, usuarioId: 9, nomeUsuario: 'Carlos Lima' });
    const { montado } = await montarPagina({ usuario: TipoUsuarioEnum.GESTOR });
    await carregar(montado, { atividade: criarAtividade({ usuarioId: 9 }), execucoes: [aberta], execucaoAtiva: null });
    expect(montado.componente.execucaoAbertaEhMinha()).toBe(false);
    expect(secao(montado, 'Execução em andamento')?.textContent).toContain('Em execução por Carlos Lima');
  });

  it('iniciar: Enter no campo envia atividade e descrição e limpa o campo', async () => {
    const { montado } = await montarPagina();
    await carregar(montado);
    const campo = montado.elemento.querySelector('#faixa-descricao') as HTMLInputElement;
    campo.value = '  Ajustar login  ';
    campo.dispatchEvent(new Event('input'));
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    const requisicao = esperarRequisicao(montado.http, 'POST', '/execucao');
    expect(requisicao.request.body).toEqual({ atividadeId: 7, descricao: 'Ajustar login' });
    responderSucesso(requisicao, {});
    await montado.atualizar();
    expect(montado.componente.descricaoInicio.value).toBe('');
    esperarRequisicao(montado.http, 'GET', '/atividade/7');
  });

  it('iniciar sem descrição: obrigatória para dono desenvolvedor, opcional para dono gestor', async () => {
    const desenvolvedor = await montarPagina();
    await carregar(desenvolvedor.montado);
    desenvolvedor.montado.componente.iniciarExecucao();
    desenvolvedor.montado.http.expectNone((r) => r.method === 'POST' && r.url.endsWith('/execucao'));
    await desenvolvedor.montado.atualizar();
    expect(texto(desenvolvedor.montado)).toContain('Informe o que será feito');

    const gestor = await montarPagina({ usuario: TipoUsuarioEnum.GESTOR });
    await carregar(gestor.montado, { atividade: criarAtividade({ usuarioId: 1, usuarioTipo: TipoUsuarioEnum.GESTOR }) });
    expect(gestor.montado.componente.descricaoObrigatoria()).toBe(false);
    expect(texto(gestor.montado)).toContain('(opcional)');
    gestor.montado.componente.iniciarExecucao();
    expect(esperarRequisicao(gestor.montado.http, 'POST', '/execucao').request.body).toEqual({ atividadeId: 7, descricao: '' });
  });

  it('"Reutilizar última" copia a descrição da última execução encerrada', async () => {
    const { montado } = await montarPagina();
    await carregar(montado, { execucoes: [criarExecucao(2, { descricao: 'Revisar testes' }), criarExecucao(1, { descricao: 'Antiga' })] });
    expect(montado.componente.ultimaDescricao()).toBe('Revisar testes');
    botaoPorTexto(montado, 'Reutilizar última')!.click();
    expect(montado.componente.descricaoInicio.value).toBe('Revisar testes');
  });

  it('outra: o dono que já executa outra atividade pode pausar lá e iniciar aqui, nessa ordem', async () => {
    const { montado } = await montarPagina();
    await carregar(montado, { execucaoAtiva: { id: 50, atividadeId: 99, descricao: 'Lá', inicioData: new Date() } });
    expect(montado.componente.estadoFaixa()).toBe('outra');
    expect(secao(montado, 'Execução em outra atividade')).not.toBeNull();

    montado.componente.descricaoInicio.setValue('Aqui');
    botaoPorTexto(montado, 'Pausar lá e iniciar aqui')!.click();
    montado.http.expectNone((r) => r.method === 'POST' && r.url.endsWith('/execucao'));
    const encerrar = esperarRequisicao(montado.http, 'PATCH', '/execucao/50/encerrar');
    expect(encerrar.request.body).toEqual({ descricao: 'Lá' });
    responderSucesso(encerrar, {});
    const iniciar = esperarRequisicao(montado.http, 'POST', '/execucao');
    expect(iniciar.request.body).toEqual({ atividadeId: 7, descricao: 'Aqui' });
  });

  it('se encerrar a outra execução falha, nada é iniciado aqui', async () => {
    const { montado } = await montarPagina();
    await carregar(montado, { execucaoAtiva: { id: 50, atividadeId: 99, descricao: 'Lá', inicioData: new Date() } });
    montado.componente.descricaoInicio.setValue('Aqui');
    montado.componente.pausarLaEIniciarAqui();
    responderErro(esperarRequisicao(montado.http, 'PATCH', '/execucao/50/encerrar'), 400, 'falhou');
    await montado.atualizar();
    montado.http.expectNone((r) => r.method === 'POST' && r.url.endsWith('/execucao'));
    expect(montado.componente.executando()).toBe(false);
  });

  it('o gestor que olha atividade de um dev não vê a faixa "outra" por causa da própria execução (a trava é do dono)', async () => {
    const { montado } = await montarPagina({ usuario: TipoUsuarioEnum.GESTOR });
    await carregar(montado, { atividade: criarAtividade({ usuarioId: 9 }), execucaoAtiva: { id: 50, atividadeId: 99, descricao: 'Lá', inicioData: new Date() } });
    expect(montado.componente.minhaExecucaoEmOutra()).toBeNull();
    expect(montado.componente.estadoFaixa()).toBe('livre');
  });
});

describe('AtividadeDetalhePage: status, prioridade e tags', () => {
  it('trocar o status é otimista e volta ao anterior se a API recusa', async () => {
    const { montado } = await montarPagina();
    await carregar(montado);
    montado.componente.formularioStatus.controls.status.setValue(TipoAtividadeStatusEnum.DESENVOLVENDO);
    montado.componente.alterarStatus();
    expect(montado.componente.atividade()?.status).toBe(TipoAtividadeStatusEnum.DESENVOLVENDO);
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/atividade/7');
    expect(requisicao.request.body).toEqual({ status: 'DESENVOLVENDO' });
    responderErro(requisicao, 400, 'recusado');
    expect(montado.componente.atividade()?.status).toBe(TipoAtividadeStatusEnum.PLANEJADA);
    expect(montado.componente.formularioStatus.controls.status.value).toBe(TipoAtividadeStatusEnum.PLANEJADA);
  });

  it('trocar a prioridade envia o código novo e atualiza a atividade com o que a API devolveu', async () => {
    const { montado } = await montarPagina();
    await carregar(montado);
    montado.componente.formularioStatus.controls.prioridade.setValue(TipoAtividadePrioridadeEnum.URGENTE);
    montado.componente.alterarPrioridade();
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/atividade/7');
    expect(requisicao.request.body).toEqual({ prioridade: 'URGENTE' });
    const urgente = { ...PRIORIDADE, codigo: TipoAtividadePrioridadeEnum.URGENTE, descricao: 'Urgente', ordem: 1 };
    responderSucesso(requisicao, { prioridade: urgente });
    expect(montado.componente.atividade()?.prioridade.codigo).toBe('URGENTE');
  });

  it('escolher a mesma prioridade ou o mesmo status não chama a API', async () => {
    const { montado } = await montarPagina();
    await carregar(montado);
    montado.componente.alterarStatus();
    montado.componente.alterarPrioridade();
    montado.http.expectNone((r) => r.method === 'PUT');
  });

  it('salvar as tags aplica na hora e volta ao conjunto anterior se a API recusa', async () => {
    const bug = { id: 1, nome: 'Bug', cor: '#ff0000' };
    const { montado } = await montarPagina();
    await carregar(montado, { tags: [] });
    montado.componente.tagsDisponiveis.set([bug]);
    montado.componente.salvarTags([1]);
    expect(montado.componente.tagsDaAtividade()).toEqual([bug]);
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/atividade/7/tag');
    expect(requisicao.request.body).toEqual({ tagIds: [1] });
    responderErro(requisicao, 400, 'recusado');
    expect(montado.componente.tagsDaAtividade()).toEqual([]);
  });

  it('a pausa feita pelo chip da topbar recarrega a atividade e as execuções desta tela', async () => {
    const { montado } = await montarPagina();
    await carregar(montado);
    TestBed.inject(ExecucaoAtivaService).registrarPausaDoChip();
    await montado.atualizar();
    esperarRequisicao(montado.http, 'GET', '/atividade/7');
    montado.http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/execucao'));
  });
});
