import { describe, it, expect } from 'vitest';
import { By } from '@angular/platform-browser';
import { TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderSucesso } from '../../../../../testes/http-teste';
import { AtividadeFormularioComponent } from '../atividade-formulario/atividade-formulario.component';
import { AtividadeNovaDialogComponent } from './atividade-nova-dialog.component';

// Dialog de nova atividade: único ponto de criação; hospeda o formulário e decide se fecha ou fica aberto ("Salvar e criar outra").

type Montado = ComponenteMontado<AtividadeNovaDialogComponent>;

const DEMANDAS = [{ id: 10, nome: 'Login', projetoId: 3, nomeProjeto: 'Portal' }];

async function abrirDialog(demandaId: number | null = null): Promise<{ montado: Montado; criacoes: number[] }> {
  const montado = await montarComponente(AtividadeNovaDialogComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR });
  const criacoes: number[] = [];
  montado.componente.aoCriar.subscribe(() => criacoes.push(1));
  montado.componente.abrir(demandaId);
  await montado.atualizar();
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/atividade-prioridade'), []);
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/atribuidas'), DEMANDAS);
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/tag'), []);
  await montado.atualizar();
  return { montado, criacoes };
}

function formularioHospedado(montado: Montado): AtividadeFormularioComponent {
  return montado.fixture.debugElement.query(By.directive(AtividadeFormularioComponent)).componentInstance;
}

describe('AtividadeNovaDialogComponent', () => {
  it('nasce fechado e sem formulário; abrir() mostra o dialog com a demanda recebida', async () => {
    const montado = await montarComponente(AtividadeNovaDialogComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    expect(montado.componente.visivel()).toBe(false);
    expect(montado.fixture.debugElement.query(By.directive(AtividadeFormularioComponent))).toBeNull();
    expect(montado.componente.salvando()).toBe(false);

    montado.componente.abrir(10);
    expect(montado.componente.visivel()).toBe(true);
    expect(montado.componente.demandaIdInicial()).toBe(10);
  });

  it('abrir sem demanda deixa a demanda inicial nula', async () => {
    const { montado } = await abrirDialog();
    expect(montado.componente.demandaIdInicial()).toBeNull();
    expect(formularioHospedado(montado).formulario.controls.demandaId.value).toBeNull();
  });

  it('o formulário hospedado recebe a demanda inicial passada em abrir()', async () => {
    const { montado } = await abrirDialog(10);
    expect(formularioHospedado(montado).formulario.controls.demandaId.value).toBe(10);
  });

  it('cada abertura recria o formulário: o que foi digitado antes não volta', async () => {
    const { montado } = await abrirDialog();
    formularioHospedado(montado).formulario.patchValue({ nome: 'Rascunho antigo' });
    montado.componente.visivel.set(false);
    await montado.atualizar();
    expect(montado.fixture.debugElement.query(By.directive(AtividadeFormularioComponent))).toBeNull();

    montado.componente.abrir(10);
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/atribuidas'), DEMANDAS);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/tag'), []);
    await montado.atualizar();
    const formulario = formularioHospedado(montado).formulario;
    expect([formulario.controls.nome.value, formulario.controls.demandaId.value]).toEqual(['', 10]);
  });

  it('salvar() com formulário inválido não chama a API nem fecha o dialog', async () => {
    const { montado, criacoes } = await abrirDialog();
    montado.componente.salvar();
    montado.http.expectNone((requisicao) => requisicao.method === 'POST');
    expect(montado.componente.visivel()).toBe(true);
    expect(criacoes).toEqual([]);
  });

  it('criar fecha o dialog e avisa o chamador para recarregar', async () => {
    const { montado, criacoes } = await abrirDialog();
    formularioHospedado(montado).formulario.patchValue({ nome: 'Nova atividade', demandaId: 10 });
    montado.componente.salvar();
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/atividade'), { id: 50 }, 201);
    await montado.atualizar();
    expect(montado.componente.visivel()).toBe(false);
    expect(criacoes).toHaveLength(1);
  });

  it('"Salvar e criar outra" mantém o dialog aberto, mas ainda avisa o chamador', async () => {
    const { montado, criacoes } = await abrirDialog();
    formularioHospedado(montado).formulario.patchValue({ nome: 'Primeira', demandaId: 10 });
    montado.componente.salvar(true);
    expect(montado.componente.salvando()).toBe(true);
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/atividade'), { id: 51 }, 201);
    await montado.atualizar();
    expect(montado.componente.visivel()).toBe(true);
    expect(montado.componente.salvando()).toBe(false);
    expect(criacoes).toHaveLength(1);
  });

  it('aoCriarAtividade fecha só quando não é para criar outra', async () => {
    const { montado } = await abrirDialog(10);
    montado.componente.aoCriarAtividade(true);
    expect(montado.componente.visivel()).toBe(true);
    montado.componente.aoCriarAtividade(false);
    expect(montado.componente.visivel()).toBe(false);
  });
});
