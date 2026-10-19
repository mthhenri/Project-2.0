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

  // DIVERGÊNCIA (produção, não corrigida aqui): o formulário é projetado dentro do p-dialog e nasce já na montagem do componente,
  // então o ngOnInit dele roda antes de abrir(). A demanda passada em abrir(10) chega só ao input (demandaIdInicial = 10) e nunca ao
  // controle `demandaId`; o comentário do dialog ("formulário recriado a cada abertura") também não vale. Quando corrigir, ativar:
  // abrirDialog(10) -> formularioHospedado(montado).formulario.controls.demandaId.value === 10.
  it.todo('o formulário hospedado recebe a demanda inicial passada em abrir()');

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
