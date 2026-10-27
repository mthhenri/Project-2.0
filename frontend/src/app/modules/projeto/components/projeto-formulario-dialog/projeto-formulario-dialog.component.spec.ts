import { describe, it, expect } from 'vitest';
import { TipoProjetoStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { ProjetoFormularioDialogComponent } from './projeto-formulario-dialog.component';
import { By } from '@angular/platform-browser';
import { ProjetoVolumeVigenciasComponent } from '../projeto-volume-vigencias/projeto-volume-vigencias.component';

async function montar() {
  const montado = await montarComponente(ProjetoFormularioDialogComponent, { usuario: TipoUsuarioEnum.GESTOR });
  const criados: number[] = [];
  const alterados: unknown[] = [];
  montado.componente.aoCriar.subscribe((id) => criados.push(id));
  montado.componente.aoAlterar.subscribe((projeto) => alterados.push(projeto));
  return { montado, criados, alterados };
}

const PROJETO_COMPLETO = {
  id: 12, nome: 'Projeto Antigo', codigo: 'ANTIGO', cor: '#112233', status: TipoProjetoStatusEnum.PAUSADO,
  inicioData: '2026-03-01', previsaoFimData: '2026-09-30', createdDate: '2026-01-01T00:00:00Z',
};

describe('ProjetoFormularioDialogComponent — criar', () => {
  it('abre limpo, com status Ativo e o título de criação', async () => {
    const { montado } = await montar();
    montado.componente.abrir();
    await montado.atualizar();
    expect(montado.componente.eEdicao()).toBe(false);
    expect(montado.componente.formulario.getRawValue()).toMatchObject({ nome: null, status: TipoProjetoStatusEnum.ATIVO });
    expect(document.body.textContent).toContain('Novo Projeto');
  });

  it('o código acompanha o nome até ser digitado à mão; apagar o código devolve a derivação automática', async () => {
    const { montado } = await montar();
    montado.componente.abrir();
    montado.componente.formulario.controls.nome.setValue('Sistema de Gestão');
    expect(montado.componente.formulario.controls.codigo.value).toBe('SISTEMA-DE-GESTAO');

    montado.componente.formulario.controls.codigo.setValue('SGX');
    montado.componente.formulario.controls.nome.setValue('Outro Nome');
    expect(montado.componente.formulario.controls.codigo.value).toBe('SGX');

    montado.componente.formulario.controls.codigo.setValue('');
    montado.componente.formulario.controls.nome.setValue('Terceiro Nome');
    expect(montado.componente.formulario.controls.codigo.value).toBe('TERCEIRO-NOME');
  });

  it('formulário vazio não chama a API e marca os campos obrigatórios', async () => {
    const { montado } = await montar();
    montado.componente.abrir();
    montado.componente.salvar();
    await montado.atualizar();
    montado.http.expectNone(() => true);
    expect(montado.componente.campoInvalido('nome')).toBe(true);
    expect(montado.componente.campoInvalido('codigo')).toBe(true);
  });

  it('nome com caractere proibido é recusado; acento e hífen passam', async () => {
    const { montado } = await montar();
    montado.componente.abrir();
    const nome = montado.componente.formulario.controls.nome;
    nome.setValue("Projeto 'X'");
    expect(nome.invalid).toBe(true);
    nome.setValue('Ação – relatório-mensal');
    expect(nome.valid).toBe(true);
  });

  it('previsão de fim igual ou anterior ao início invalida o formulário', async () => {
    const { montado } = await montar();
    montado.componente.abrir();
    montado.componente.formulario.patchValue({ nome: 'A', codigo: 'A', inicioData: new Date(2026, 5, 10), previsaoFimData: new Date(2026, 5, 10) });
    expect(montado.componente.formulario.hasError('previsaoAnteriorAoInicio')).toBe(true);
    montado.componente.salvar();
    montado.http.expectNone(() => true);
    montado.componente.formulario.patchValue({ previsaoFimData: new Date(2026, 5, 11) });
    expect(montado.componente.formulario.hasError('previsaoAnteriorAoInicio')).toBe(false);
  });

  it('salvar envia o corpo com código em maiúsculas e datas ISO, fecha e emite o id criado', async () => {
    const { montado, criados } = await montar();
    montado.componente.abrir();
    montado.componente.formulario.patchValue({ nome: 'Projeto Novo', codigo: 'novo-1', cor: '#aabbcc', inicioData: new Date(2026, 0, 5) });
    montado.componente.salvar();
    await montado.atualizar();

    const requisicao = esperarRequisicao(montado.http, 'POST', '/projeto');
    expect(requisicao.request.body).toEqual({
      nome: 'Projeto Novo', codigo: 'NOVO-1', cor: '#aabbcc', status: TipoProjetoStatusEnum.ATIVO, inicioData: '2026-01-05',
    });
    responderSucesso(requisicao, { id: 33, nome: 'Projeto Novo', codigo: 'NOVO-1' }, 201);
    await montado.atualizar();
    expect(montado.componente.mostrarDialog()).toBe(false);
    expect(criados).toEqual([33]);
  });

  it('criar com volume registra a primeira vigência no mês do início', async () => {
    const { montado, criados } = await montar();
    montado.componente.abrir();
    montado.componente.formulario.patchValue({ nome: 'Novo', codigo: 'NOVO', inicioData: new Date(2026, 3, 17), volumeInicialHoras: 160 });
    montado.componente.salvar();
    const requisicao = esperarRequisicao(montado.http, 'POST', '/projeto');
    expect(requisicao.request.body.volumeInicialHoras).toBeUndefined();
    responderSucesso(requisicao, { ...PROJETO_COMPLETO, id: 34 });
    const vigencia = esperarRequisicao(montado.http, 'POST', '/projeto/34/volume-vigencia');
    expect(vigencia.request.body).toEqual({ projetoId: 34, vigenciaInicioData: '2026-04-17', volumeEsperadoHoras: 160 });
    responderSucesso(vigencia, { id: 1 });
    await montado.atualizar();
    expect(criados).toEqual([34]);
    expect(montado.componente.mostrarDialog()).toBe(false);
  });

  it('falha no volume inicial mantém o projeto em edição sem duplicar a criação', async () => {
    const { montado, criados } = await montar();
    montado.componente.abrir();
    montado.componente.formulario.patchValue({ nome: 'Novo', codigo: 'NOVO', volumeInicialHoras: 0 });
    montado.componente.salvar();
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/projeto'), PROJETO_COMPLETO);
    responderErro(esperarRequisicao(montado.http, 'POST', '/projeto/12/volume-vigencia'), 500, 'Falha de teste');
    await carregarVigencias(montado);
    expect(montado.componente.projetoIdEdicao()).toBe(12);
    expect(montado.componente.mostrarDialog()).toBe(true);
    expect(criados).toEqual([]);
    montado.componente.salvar();
    responderSucesso(esperarRequisicao(montado.http, 'PUT', '/projeto/12'), PROJETO_COMPLETO);
    expect(criados).toEqual([12]);
  });

  it('erro de código duplicado: o dialog continua aberto, nada é emitido e o botão volta a ficar livre', async () => {
    const { montado, criados } = await montar();
    montado.componente.abrir();
    montado.componente.formulario.patchValue({ nome: 'Projeto Novo', codigo: 'DUP' });
    montado.componente.salvar();
    responderErro(esperarRequisicao(montado.http, 'POST', '/projeto'), 400, 'Código de projeto já está em uso');
    await montado.atualizar();
    expect(montado.componente.mostrarDialog()).toBe(true);
    expect(montado.componente.carregando()).toBe(false);
    expect(criados).toHaveLength(0);
  });
});

describe('ProjetoFormularioDialogComponent — editar', () => {
  it('reabrir o mesmo projeto carrega novamente as vigências', async () => {
    const { montado } = await montar();
    montado.componente.abrirEdicao(PROJETO_COMPLETO as never);
    await carregarVigencias(montado);
    montado.componente.mostrarDialog.set(false);
    await montado.atualizar();
    montado.componente.abrirEdicao(PROJETO_COMPLETO as never);
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/projeto/12/volume-vigencia'), []);
  });
  it('Enter nas horas salva a vigência e mantém aberto o cadastro', async () => {
    const { montado } = await montar();
    montado.componente.abrirEdicao({ ...PROJETO_COMPLETO, createdDate: new Date(PROJETO_COMPLETO.createdDate) });
    await carregarVigencias(montado);
    const bloco = montado.fixture.debugElement.query(By.directive(ProjetoVolumeVigenciasComponent)).componentInstance as ProjetoVolumeVigenciasComponent;
    bloco.formulario.patchValue({ horas: 120 });
    await montado.atualizar();
    const campo = document.body.querySelector('app-projeto-volume-vigencias input[role="spinbutton"]')!;
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/projeto/12/volume-vigencia'), { id: 1, projetoId: 12, vigenciaInicioData: '2026-10-01', volumeEsperadoHoras: 120 });
    montado.http.expectNone(requisicao => requisicao.method === 'PUT');
    expect(montado.componente.mostrarDialog()).toBe(true);
  });
  it('com o projeto completo preenche direto, sem GET, trava o código e abre o período quando há datas', async () => {
    const { montado } = await montar();
    montado.componente.abrirEdicao(PROJETO_COMPLETO as never);
    await carregarVigencias(montado);
    await montado.atualizar();
    montado.http.expectNone(() => true);
    expect(montado.componente.eEdicao()).toBe(true);
    expect(montado.componente.formulario.controls.codigo.disabled).toBe(true);
    expect(montado.componente.formulario.controls.nome.value).toBe('Projeto Antigo');
    expect(montado.componente.periodoAberto()).toBe(true);
  });

  it('com só o resumo (listagem) busca o projeto para trazer as datas', async () => {
    const { montado } = await montar();
    montado.componente.abrirEdicao({ id: 12 });
    await carregarVigencias(montado);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/projeto/12'), PROJETO_COMPLETO);
    await montado.atualizar();
    expect(montado.componente.formulario.controls.nome.value).toBe('Projeto Antigo');
    expect(montado.componente.carregandoDados()).toBe(false);
  });

  it('salvar envia PUT sem o código e emite o projeto alterado', async () => {
    const { montado, alterados } = await montar();
    montado.componente.abrirEdicao(PROJETO_COMPLETO as never);
    await carregarVigencias(montado);
    montado.componente.formulario.patchValue({ nome: 'Renomeado', status: TipoProjetoStatusEnum.CONCLUIDO });
    montado.componente.salvar();
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/projeto/12');
    expect('codigo' in requisicao.request.body).toBe(false);
    expect(requisicao.request.body).toMatchObject({ nome: 'Renomeado', status: TipoProjetoStatusEnum.CONCLUIDO, inicioData: '2026-03-01' });
    responderSucesso(requisicao, { id: 12, nome: 'Renomeado', cor: '#112233', status: TipoProjetoStatusEnum.CONCLUIDO });
    await montado.atualizar();
    expect(alterados).toHaveLength(1);
    expect(montado.componente.mostrarDialog()).toBe(false);
  });
});

async function carregarVigencias(montado: Awaited<ReturnType<typeof montar>>['montado']) {
  await montado.atualizar();
  for (const requisicao of montado.http.match(requisicao => requisicao.method === 'GET' && requisicao.url.endsWith('/volume-vigencia'))) responderSucesso(requisicao, []);
  await montado.atualizar();
}
