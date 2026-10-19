import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from 'primeng/api';
import { TipoUsuarioEnum, PontoJustificativaResumoDto } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { criarUsuarioTeste } from '../../../../../testes/usuarios-teste';
import { PontoJustificativaDialogComponent } from './ponto-justificativa-dialog.component';

type Montado = ComponenteMontado<PontoJustificativaDialogComponent>;

const MES = new Date(2026, 2, 15); // março de 2026

const justificativa = (id: number, sobrescrita: Partial<PontoJustificativaResumoDto> = {}): PontoJustificativaResumoDto => ({
  id, usuarioId: 3, nomeUsuario: 'Ana', diaData: '2026-03-0' + id, nome: `Justificativa ${id}`, descricao: 'Motivo combinado',
  horasCobertas: 2, gestorId: 1, nomeGestor: 'Gil', createdDate: new Date('2026-03-01T12:00:00Z'), ...sobrescrita,
} as PontoJustificativaResumoDto);

async function abrir(preenchimento?: { data: string; horasFaltantes: number }) {
  TestBed.resetTestingModule();
  const montado = await montarComponente(PontoJustificativaDialogComponent, { usuario: TipoUsuarioEnum.GESTOR });
  montado.componente.abrir(3, MES, preenchimento);
  await montado.atualizar();
  return montado;
}

/** Atende a jornada do usuário e a lista de justificativas do mês, as duas leituras que o dialog faz ao abrir. */
async function carregar(montado: Montado, { horas = 8, lista = [] as PontoJustificativaResumoDto[] } = {}) {
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/usuario/3'), { ...criarUsuarioTeste(), id: 3, horasDiariasNecessarias: horas });
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/ponto-justificativa'), lista);
  await montado.atualizar();
}

const preencher = (montado: Montado, valores: { diaData?: Date | null; nome?: string; descricao?: string; horasCobertas?: number | null }) =>
  montado.componente.formulario.patchValue(valores);

describe('PontoJustificativaDialogComponent: abertura', () => {
  it('abre limitado ao mês visível, com o formulário limpo e as duas leituras de apoio', async () => {
    const montado = await abrir();
    const requisicaoLista = esperarRequisicao(montado.http, 'GET', '/ponto-justificativa');
    expect(requisicaoLista.request.params.get('usuarioId')).toBe('3');
    expect(requisicaoLista.request.params.get('ano')).toBe('2026');
    expect(requisicaoLista.request.params.get('mes')).toBe('3');
    expect(montado.componente.mostrarDialog()).toBe(true);
    expect(montado.componente.carregandoLista()).toBe(true);
    expect(montado.componente.dataMinima()).toEqual(new Date(2026, 2, 1));
    expect(montado.componente.dataMaxima()).toEqual(new Date(2026, 2, 31));
    expect(montado.componente.formulario.getRawValue()).toEqual({ diaData: null, nome: '', descricao: '', horasCobertas: null });
    responderSucesso(requisicaoLista, []);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/usuario/3'), { ...criarUsuarioTeste(), horasDiariasNecessarias: 8 });
  });

  it('o teto de horas é a jornada diária do usuário e os atalhos usam esse teto', async () => {
    const montado = await abrir();
    await carregar(montado, { horas: 6 });
    expect(montado.componente.maximoHoras()).toBe(6);
    expect(montado.componente.atalhosHoras().map((atalho) => atalho.horas)).toEqual([6, 3]);
    expect(document.body.textContent).toContain('Máximo: 6 h (jornada diária do usuário)');
  });

  it('vindo da linha de um dia: dia e horas faltantes pré-preenchidos, com o atalho "Faltante" limitado ao teto', async () => {
    const montado = await abrir({ data: '2026-03-10', horasFaltantes: 3.456 });
    await carregar(montado);
    const valores = montado.componente.formulario.getRawValue();
    expect(valores.diaData).toEqual(new Date('2026-03-10T12:00:00'));
    expect(valores.horasCobertas).toBe(3.46);
    expect(montado.componente.atalhosHoras().map((atalho) => atalho.horas)).toEqual([8, 4, 3.46]);
  });

  it('a sugestão de horas nunca passa da jornada do usuário', async () => {
    const montado = await abrir({ data: '2026-03-10', horasFaltantes: 8 });
    await carregar(montado, { horas: 6 });
    expect(montado.componente.formulario.controls.horasCobertas.value).toBe(6);
  });

  it('lista as justificativas do mês, ou diz que não há nenhuma', async () => {
    const vazio = await abrir();
    await carregar(vazio);
    expect(document.body.textContent).toContain('Nenhuma justificativa neste mês.');

    const cheio = await abrir();
    await carregar(cheio, { lista: [justificativa(2), justificativa(5, { horasCobertas: 4 })] });
    expect(cheio.componente.justificativas()).toHaveLength(2);
    expect(document.body.textContent).toContain('Justificativa 5');
    expect(document.body.textContent).toContain('4 h');
  });

  it('aplicarHoras preenche o campo e respeita o teto', async () => {
    const montado = await abrir();
    await carregar(montado, { horas: 8 });
    montado.componente.aplicarHoras(4);
    expect(montado.componente.formulario.controls.horasCobertas.value).toBe(4);
    montado.componente.aplicarHoras(20);
    expect(montado.componente.formulario.controls.horasCobertas.value).toBe(8);
  });
});

describe('PontoJustificativaDialogComponent: criar', () => {
  it('formulário vazio é recusado, marca os campos e não chama a API', async () => {
    const montado = await abrir();
    await carregar(montado);
    montado.componente.salvar();
    await montado.atualizar();
    montado.http.expectNone(() => true);
    for (const campo of ['diaData', 'nome', 'descricao', 'horasCobertas']) expect(montado.componente.campoInvalido(campo)).toBe(true);
    expect(document.body.textContent).toContain('Informe o dia justificado');
    expect(document.body.textContent).toContain('Informe um título');
    expect(document.body.textContent).toContain('Informe o motivo da justificativa');
    expect(document.body.textContent).toContain('Informe as horas cobertas');
  });

  it('horas negativas ou título com mais de 255 caracteres não passam', async () => {
    const montado = await abrir();
    await carregar(montado);
    preencher(montado, { diaData: new Date(2026, 2, 10), nome: 'x'.repeat(256), descricao: 'm', horasCobertas: 2 });
    expect(montado.componente.formulario.controls.nome.invalid).toBe(true);
    preencher(montado, { nome: 'ok', horasCobertas: -1 });
    expect(montado.componente.formulario.controls.horasCobertas.invalid).toBe(true);
  });

  it('salvar envia o usuário do dialog e o dia no formato ISO, depois limpa o formulário, recarrega a lista e avisa o pai', async () => {
    const montado = await abrir();
    await carregar(montado);
    let alteracoes = 0;
    montado.componente.aoAlterar.subscribe(() => alteracoes++);
    const aviso = vi.spyOn(montado.mensagens, 'add');
    preencher(montado, { diaData: new Date(2026, 2, 10), nome: 'Consulta médica', descricao: 'Exame de rotina', horasCobertas: 2.5 });

    montado.componente.salvar();
    expect(montado.componente.salvando()).toBe(true);
    const requisicao = esperarRequisicao(montado.http, 'POST', '/ponto-justificativa');
    expect(requisicao.request.body).toEqual({
      usuarioId: 3, diaData: '2026-03-10', nome: 'Consulta médica', descricao: 'Exame de rotina', horasCobertas: 2.5,
    });
    responderSucesso(requisicao, { id: 9 });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/ponto-justificativa'), [justificativa(1)]);
    await montado.atualizar();

    expect(montado.componente.salvando()).toBe(false);
    expect(alteracoes).toBe(1);
    expect(montado.componente.formulario.getRawValue()).toEqual({ diaData: null, nome: '', descricao: '', horasCobertas: null });
    expect(montado.componente.justificativas()).toHaveLength(1);
    expect(aviso).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Justificativa criada' }));
  });

  it('recusa do backend (por exemplo, já existe justificativa no dia) mantém o que foi digitado e não avisa o pai', async () => {
    const montado = await abrir();
    await carregar(montado);
    let alteracoes = 0;
    montado.componente.aoAlterar.subscribe(() => alteracoes++);
    preencher(montado, { diaData: new Date(2026, 2, 10), nome: 'Consulta', descricao: 'Motivo', horasCobertas: 2 });

    montado.componente.salvar();
    responderErro(esperarRequisicao(montado.http, 'POST', '/ponto-justificativa'), 400, 'Já existe uma justificativa para esse usuário nesse dia');
    await montado.atualizar();

    expect(montado.componente.salvando()).toBe(false);
    expect(alteracoes).toBe(0);
    expect(montado.componente.formulario.controls.nome.value).toBe('Consulta');
    expect(montado.componente.mostrarDialog()).toBe(true);
  });
});

describe('PontoJustificativaDialogComponent: remover', () => {
  async function comUmaJustificativa() {
    const montado = await abrir();
    await carregar(montado, { lista: [justificativa(4)] });
    const confirmacao = montado.fixture.debugElement.injector.get(ConfirmationService);
    return { montado, confirmacao };
  }

  it('pede confirmação com o nome da justificativa e, sem confirmar, não chama a API', async () => {
    const { montado, confirmacao } = await comUmaJustificativa();
    const mensagens: string[] = [];
    confirmacao.requireConfirmation$.subscribe((pedido) => mensagens.push(pedido?.message ?? ''));
    montado.componente.confirmarRemocao(justificativa(4), new Event('click'));
    expect(mensagens).toEqual(['Remover a justificativa "Justificativa 4"?']);
    montado.http.expectNone(() => true);
  });

  it('confirmar exclui pelo id, recarrega a lista e avisa o pai', async () => {
    const { montado, confirmacao } = await comUmaJustificativa();
    let alteracoes = 0;
    montado.componente.aoAlterar.subscribe(() => alteracoes++);
    confirmacao.requireConfirmation$.subscribe((pedido) => pedido?.accept?.());

    montado.componente.confirmarRemocao(justificativa(4), new Event('click'));
    responderSucesso(esperarRequisicao(montado.http, 'DELETE', '/ponto-justificativa/4'), null);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/ponto-justificativa'), []);
    await montado.atualizar();

    expect(alteracoes).toBe(1);
    expect(montado.componente.justificativas()).toEqual([]);
  });

  it('falha na exclusão não avisa o pai', async () => {
    const { montado, confirmacao } = await comUmaJustificativa();
    let alteracoes = 0;
    montado.componente.aoAlterar.subscribe(() => alteracoes++);
    confirmacao.requireConfirmation$.subscribe((pedido) => pedido?.accept?.());

    montado.componente.confirmarRemocao(justificativa(4), new Event('click'));
    responderErro(esperarRequisicao(montado.http, 'DELETE', '/ponto-justificativa/4'), 404, 'Justificativa não encontrada');
    await montado.atualizar();
    expect(alteracoes).toBe(0);
  });
});
