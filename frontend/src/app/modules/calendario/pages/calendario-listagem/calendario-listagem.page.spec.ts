import { describe, it, expect, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DiaNaoUtilResumoDto, TipoDiaNaoUtilDuracaoEnum, TipoDiaNaoUtilEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { CalendarioListagemPage } from './calendario-listagem.page';

type Montado = ComponenteMontado<CalendarioListagemPage>;

// "Hoje" fixo em março de 2026 (só o relógio é falso): o calendário abre no mês de hoje.
afterEach(() => vi.useRealTimers());

const texto = (elemento: Element) => (elemento.textContent ?? '').replace(/\s+/g, ' ').trim();

const dia = (id: number, diaData: string, descricao: string, sobrescrita: Partial<DiaNaoUtilResumoDto> = {}): DiaNaoUtilResumoDto => ({
  id, diaData, descricao, tipo: TipoDiaNaoUtilEnum.FERIADO, duracao: TipoDiaNaoUtilDuracaoEnum.INTEGRAL, recorrente: false, ...sobrescrita,
} as DiaNaoUtilResumoDto);

const DIAS = [
  dia(2, '2020-03-17', 'Recesso fixo', { tipo: TipoDiaNaoUtilEnum.RECESSO, duracao: TipoDiaNaoUtilDuracaoEnum.MEIO_PERIODO, recorrente: true }),
  dia(1, '2026-03-10', 'Aniversário da cidade'),
  dia(3, '2026-04-05', 'Fora do mês'),
  dia(4, '2025-03-12', 'Março de outro ano'),
];

async function montarPagina(usuario: TipoUsuarioEnum, dias: DiaNaoUtilResumoDto[] | null = DIAS): Promise<Montado> {
  TestBed.resetTestingModule();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 2, 15, 12));
  const montado = await montarComponente(CalendarioListagemPage, { usuario });
  if (dias) {
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/calendario'), dias);
    await montado.atualizar();
  }
  return montado;
}

const botaoPorTexto = (conteudo: string) =>
  Array.from(document.body.querySelectorAll('button')).find((botao) => botao.textContent?.includes(conteudo));

const linhas = (montado: Montado) => Array.from(montado.elemento.querySelectorAll('tr[data-dia-id]'));

describe('CalendarioListagemPage: estados da lista', () => {
  it('abre no mês de hoje, pede /calendario e mostra o esqueleto até a resposta', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.GESTOR, null);
    expect(montado.componente.rotuloMes()).toBe('Março de 2026');
    expect(montado.componente.primeiraCarga()).toBe(true);
    expect(montado.elemento.querySelector('app-skeleton-lista')).not.toBeNull();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/calendario'), []);
    await montado.atualizar();
    expect(montado.elemento.querySelector('app-skeleton-lista')).toBeNull();
  });

  it('cheio: a tabela traz só os dias do mês exibido (recorrente de qualquer ano e pontual do ano), em ordem de dia', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.GESTOR);
    expect(linhas(montado).map((linha) => linha.getAttribute('data-dia-id'))).toEqual(['1', '2']);
    expect(texto(linhas(montado)[0])).toContain('Aniversário da cidade');
    expect(texto(linhas(montado)[0])).toContain('Feriado');
    // O recorrente mostra a data no ano exibido (17/03/2026 é terça) e os selos de meio período e todo ano.
    expect(texto(linhas(montado)[1])).toContain('ter, 17/03');
    expect(texto(linhas(montado)[1])).toContain('Meio período');
    expect(texto(linhas(montado)[1])).toContain('Todo ano');
    expect(texto(linhas(montado)[0])).not.toContain('Todo ano');
  });

  it('vazio: o gestor vê a mensagem do mês e o atalho para cadastrar; o desenvolvedor só a mensagem', async () => {
    const gestor = await montarPagina(TipoUsuarioEnum.GESTOR, []);
    expect(texto(gestor.elemento)).toContain('Nenhum dia não útil em Março de 2026');
    expect(texto(gestor.elemento)).toContain('Cadastrar dia não útil');

    const desenvolvedor = await montarPagina(TipoUsuarioEnum.DESENVOLVEDOR, []);
    expect(texto(desenvolvedor.elemento)).toContain('Nenhum dia não útil em Março de 2026');
    expect(texto(desenvolvedor.elemento)).not.toContain('Cadastrar dia não útil');
  });

  it('erro ao carregar tira o esqueleto e deixa a lista vazia (a falha é do interceptor)', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.GESTOR, null);
    responderErro(esperarRequisicao(montado.http, 'GET', '/calendario'), 500, 'Erro interno');
    await montado.atualizar();
    await new Promise((resolver) => setTimeout(resolver, 0));
    expect(montado.componente.carregando()).toBe(false);
    expect(montado.elemento.querySelector('app-skeleton-lista')).toBeNull();
    expect(linhas(montado)).toHaveLength(0);
    expect(montado.errosHttpNaoTratados).toHaveLength(1);
  });

  it('trocar de mês (ano ‹ ›, mês, Hoje) muda o conteúdo da tabela e o botão Hoje só vale fora do mês de hoje', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.GESTOR);
    expect(montado.componente.noMesDeHoje()).toBe(true);
    montado.componente.irParaMes(2026, 4);
    await montado.atualizar();
    expect(linhas(montado).map((linha) => linha.getAttribute('data-dia-id'))).toEqual(['3']);
    expect(montado.componente.noMesDeHoje()).toBe(false);

    montado.componente.mudarAno(-1);
    await montado.atualizar();
    expect(montado.componente.mesExibido()).toEqual({ ano: 2025, mes: 4 });
    expect(linhas(montado)).toHaveLength(0);

    montado.componente.irParaHoje();
    await montado.atualizar();
    expect(montado.componente.mesExibido()).toEqual({ ano: 2026, mes: 3 });
  });
});

describe('CalendarioListagemPage: permissão por tipo de usuário', () => {
  it('o gestor vê "Novo Dia Não Útil" e a coluna de ações (editar e excluir) em cada linha', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.GESTOR);
    expect(texto(montado.elemento)).toContain('Novo Dia Não Útil');
    expect(texto(montado.elemento.querySelector('p-table thead')!)).toContain('Ações');
    expect(linhas(montado)[0].querySelectorAll('button')).toHaveLength(2);
  });

  it('o desenvolvedor só lê: sem botão de novo, sem coluna de ações e sem editar ou excluir', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.DESENVOLVEDOR);
    expect(texto(montado.elemento)).not.toContain('Novo Dia Não Útil');
    expect(texto(montado.elemento.querySelector('p-table thead')!)).not.toContain('Ações');
    expect(linhas(montado)[0].querySelectorAll('button')).toHaveLength(0);
    expect(texto(linhas(montado)[0])).toContain('Aniversário da cidade');
  });

  it('clicar num dia vazio abre a criação com a data só para o gestor', async () => {
    const gestor = await montarPagina(TipoUsuarioEnum.GESTOR);
    const alvo = document.createElement('span');
    gestor.componente.aoClicarDia({ currentTarget: alvo } as unknown as Event, { day: 12, month: 2, year: 2026 });
    expect(gestor.componente.mostrarDialog()).toBe(true);
    expect(gestor.componente.formulario.getRawValue().diaData).toEqual(new Date(2026, 2, 12));

    const desenvolvedor = await montarPagina(TipoUsuarioEnum.DESENVOLVEDOR);
    desenvolvedor.componente.aoClicarDia({ currentTarget: alvo } as unknown as Event, { day: 12, month: 2, year: 2026 });
    expect(desenvolvedor.componente.mostrarDialog()).toBe(false);
  });
});

describe('CalendarioListagemPage: formulário de cadastro', () => {
  it('abre limpo: feriado, integral, não recorrente, e o título de criação', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.GESTOR);
    montado.componente.abrirDialogNovo();
    await montado.atualizar();
    expect(montado.componente.tituloDialog()).toBe('Novo Dia Não Útil');
    expect(montado.componente.formulario.getRawValue()).toEqual({
      diaData: null, descricao: '', tipo: TipoDiaNaoUtilEnum.FERIADO, duracao: TipoDiaNaoUtilDuracaoEnum.INTEGRAL, recorrente: false,
    });
    expect(botaoPorTexto('Salvar e adicionar outro')).toBeDefined();
  });

  it('salvar sem data e sem descrição não envia nada e mostra os dois avisos', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.GESTOR);
    montado.componente.abrirDialogNovo();
    await montado.atualizar();
    montado.componente.salvar();
    await montado.atualizar();
    montado.http.expectNone((requisicao) => requisicao.method === 'POST');
    expect(document.body.textContent).toContain('Data é obrigatória');
    expect(document.body.textContent).toContain('Descrição é obrigatória');
  });

  it('duração de meio período e recorrência mostram o que significam', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.GESTOR);
    montado.componente.abrirDialogNovo();
    await montado.atualizar();
    expect(document.body.textContent).not.toContain('A meta diária do ponto é reduzida à metade neste dia.');
    expect(document.body.textContent).not.toContain('será considerado em todos os anos');

    montado.componente.formulario.patchValue({ duracao: TipoDiaNaoUtilDuracaoEnum.MEIO_PERIODO, recorrente: true });
    await montado.atualizar();
    expect(document.body.textContent).toContain('A meta diária do ponto é reduzida à metade neste dia.');
    expect(document.body.textContent).toContain('será considerado em todos os anos');
  });

  it('salvar envia o cadastro com a data ISO local, fecha o dialog e recarrega a lista', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.GESTOR);
    const aviso = vi.spyOn(montado.mensagens, 'add');
    montado.componente.abrirDialogNovo();
    montado.componente.formulario.patchValue({
      diaData: new Date(2026, 2, 5), descricao: 'Recesso de março', tipo: TipoDiaNaoUtilEnum.RECESSO,
      duracao: TipoDiaNaoUtilDuracaoEnum.MEIO_PERIODO, recorrente: true,
    });
    montado.componente.salvar();
    const requisicao = esperarRequisicao(montado.http, 'POST', '/calendario');
    expect(requisicao.request.body).toEqual({
      diaData: '2026-03-05', descricao: 'Recesso de março', tipo: 'RECESSO', duracao: 'MEIO_PERIODO', recorrente: true,
    });
    expect(montado.componente.carregandoSalvar()).toBe(true);
    responderSucesso(requisicao, { id: 9 }, 201);
    await montado.atualizar();

    expect(montado.componente.carregandoSalvar()).toBe(false);
    expect(montado.componente.mostrarDialog()).toBe(false);
    expect(aviso).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', detail: '"Recesso de março" cadastrado com sucesso' }));
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/calendario'), DIAS);
  });

  it('"Salvar e adicionar outro" mantém o dialog aberto, limpa data e descrição e preserva tipo, duração e recorrência', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.GESTOR);
    montado.componente.abrirDialogNovo();
    montado.componente.formulario.patchValue({
      diaData: new Date(2026, 2, 5), descricao: 'Primeiro', tipo: TipoDiaNaoUtilEnum.PONTO_FACULTATIVO,
      duracao: TipoDiaNaoUtilDuracaoEnum.MEIO_PERIODO, recorrente: true,
    });
    montado.componente.salvar(true);
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/calendario'), { id: 9 }, 201);
    await montado.atualizar();

    expect(montado.componente.mostrarDialog()).toBe(true);
    expect(montado.componente.formulario.getRawValue()).toEqual({
      diaData: null, descricao: '', tipo: TipoDiaNaoUtilEnum.PONTO_FACULTATIVO, duracao: TipoDiaNaoUtilDuracaoEnum.MEIO_PERIODO, recorrente: true,
    });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/calendario'), DIAS);
  });

  it('falha ao salvar (400) mantém o dialog aberto com o que foi digitado', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.GESTOR);
    montado.componente.abrirDialogNovo();
    montado.componente.formulario.patchValue({ diaData: new Date(2026, 2, 5), descricao: 'Repetido' });
    montado.componente.salvar();
    responderErro(esperarRequisicao(montado.http, 'POST', '/calendario'), 400, 'Dados inválidos');
    await montado.atualizar();
    await new Promise((resolver) => setTimeout(resolver, 0));
    expect(montado.componente.mostrarDialog()).toBe(true);
    expect(montado.componente.carregandoSalvar()).toBe(false);
    expect(montado.componente.formulario.getRawValue().descricao).toBe('Repetido');
  });
});

describe('CalendarioListagemPage: edição', () => {
  it('editar traz os valores, trava a data e esconde "Salvar e adicionar outro"', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.GESTOR);
    montado.componente.abrirDialogEditar(DIAS[0]);
    await montado.atualizar();
    expect(montado.componente.tituloDialog()).toBe('Editar Dia Não Útil');
    expect(montado.componente.formulario.controls.diaData.disabled).toBe(true);
    expect(montado.componente.formulario.getRawValue()).toEqual({
      diaData: new Date(2020, 2, 17), descricao: 'Recesso fixo', tipo: 'RECESSO', duracao: 'MEIO_PERIODO', recorrente: true,
    });
    expect(botaoPorTexto('Salvar e adicionar outro')).toBeUndefined();
    expect(document.body.textContent).toContain('A data não pode ser alterada.');
  });

  it('salvar a edição faz PUT sem a data, fecha o dialog e recarrega', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.GESTOR);
    montado.componente.abrirDialogEditar(DIAS[1]);
    montado.componente.formulario.patchValue({ descricao: 'Aniversário (novo)', duracao: TipoDiaNaoUtilDuracaoEnum.MEIO_PERIODO });
    montado.componente.salvar();
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/calendario/1');
    expect(requisicao.request.body).toEqual({
      descricao: 'Aniversário (novo)', tipo: 'FERIADO', duracao: 'MEIO_PERIODO', recorrente: false,
    });
    responderSucesso(requisicao, { id: 1 });
    await montado.atualizar();
    expect(montado.componente.mostrarDialog()).toBe(false);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/calendario'), DIAS);
  });

  it('"Excluir e recriar" exclui o registro e reabre a criação com o resto preenchido', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.GESTOR);
    montado.componente.abrirDialogEditar(DIAS[0]);
    montado.componente.excluirERecriar(DIAS[0]);
    esperarRequisicao(montado.http, 'DELETE', '/calendario/2');
    expect(montado.componente.diaEmEdicao()).toBeNull();
    expect(montado.componente.mostrarDialog()).toBe(true);
    expect(montado.componente.formulario.getRawValue()).toEqual({
      diaData: null, descricao: 'Recesso fixo', tipo: 'RECESSO', duracao: 'MEIO_PERIODO', recorrente: true,
    });
  });
});

describe('CalendarioListagemPage: exclusão com desfazer', () => {
  it('excluir tira a linha na hora, faz DELETE e oferece "Desfazer"', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.GESTOR);
    montado.componente.excluir(DIAS[1]);
    await montado.atualizar();
    expect(linhas(montado).map((linha) => linha.getAttribute('data-dia-id'))).toEqual(['2']);
    responderSucesso(esperarRequisicao(montado.http, 'DELETE', '/calendario/1'), null);
    expect(TestBed.inject(DesfazerService).oferta()?.mensagem).toBe('"Aniversário da cidade" excluído');
  });

  it('"Desfazer" faz PATCH em restaurar e recarrega a lista', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.GESTOR);
    montado.componente.excluir(DIAS[1]);
    responderSucesso(esperarRequisicao(montado.http, 'DELETE', '/calendario/1'), null);
    TestBed.inject(DesfazerService).executar();
    responderSucesso(esperarRequisicao(montado.http, 'PATCH', '/calendario/1/restaurar'), { id: 1 });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/calendario'), DIAS);
    await montado.atualizar();
    expect(linhas(montado)).toHaveLength(2);
  });

  it('falha ao excluir devolve a linha à lista e não oferece desfazer', async () => {
    const montado = await montarPagina(TipoUsuarioEnum.GESTOR);
    montado.componente.excluir(DIAS[1]);
    responderErro(esperarRequisicao(montado.http, 'DELETE', '/calendario/1'), 500, 'Erro interno');
    await montado.atualizar();
    await new Promise((resolver) => setTimeout(resolver, 0));
    expect(linhas(montado)).toHaveLength(2);
    expect(TestBed.inject(DesfazerService).oferta()).toBeNull();
  });
});
