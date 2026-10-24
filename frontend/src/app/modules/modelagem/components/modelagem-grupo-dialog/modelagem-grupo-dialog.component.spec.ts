import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ModelagemGrupoDto, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { GrupoSalvo, ModelagemGrupoDialogComponent } from './modelagem-grupo-dialog.component';

const GRUPO: ModelagemGrupoDto = { id: 4, titulo: 'Usuários, ponto e anotações', rotulo: 'Usuários e ponto', corIndice: 1 };

async function montar() {
  TestBed.resetTestingModule();
  const montado = await montarComponente(ModelagemGrupoDialogComponent, { usuario: TipoUsuarioEnum.GESTOR });
  const salvos: GrupoSalvo[] = [];
  const excluidos: number[] = [];
  montado.componente.aoSalvar.subscribe((salvo) => salvos.push(salvo));
  montado.componente.aoExcluir.subscribe((id) => excluidos.push(id));
  return { montado, salvos, excluidos };
}

const dialogo = () => document.body.querySelector('.p-dialog') as HTMLElement | null;
const campo = (id: string) => document.body.querySelector<HTMLInputElement>(`#${id}`)!;
const preencher = (id: string, texto: string) => {
  campo(id).value = texto;
  campo(id).dispatchEvent(new Event('input'));
};
const botao = (texto: string) => Array.from(document.body.querySelectorAll<HTMLButtonElement>('.p-dialog button')).find((candidato) => candidato.textContent?.includes(texto))!;

describe('ModelagemGrupoDialogComponent', () => {
  it('novo grupo: abre vazio, não envia com campo em branco e mostra o que falta', async () => {
    const { montado } = await montar();
    montado.componente.abrirParaCriar();
    await montado.atualizar();
    expect(dialogo()?.textContent).toContain('Novo grupo');
    expect(dialogo()?.textContent).not.toContain('Excluir');
    montado.componente.salvar();
    await montado.atualizar();
    expect(dialogo()?.textContent).toContain('O título é obrigatório');
    expect(dialogo()?.textContent).toContain('O rótulo é obrigatório');
    montado.http.expectNone((requisicao) => requisicao.url.endsWith('/modelagem/grupo'));
  });

  it('novo grupo: envia título e rótulo, fecha o dialog e entrega o grupo criado', async () => {
    const { montado, salvos } = await montar();
    montado.componente.abrirParaCriar();
    await montado.atualizar();
    preencher('modelagem-grupo-titulo', 'Ponto e justificativas');
    preencher('modelagem-grupo-rotulo', 'Ponto');
    montado.componente.salvar();
    const requisicao = esperarRequisicao(montado.http, 'POST', '/modelagem/grupo');
    expect(requisicao.request.body).toEqual({ titulo: 'Ponto e justificativas', rotulo: 'Ponto' });
    responderSucesso(requisicao, { id: 9, titulo: 'Ponto e justificativas', rotulo: 'Ponto', corIndice: 2 });
    await montado.atualizar();
    expect(salvos).toEqual([{ grupo: { id: 9, titulo: 'Ponto e justificativas', rotulo: 'Ponto', corIndice: 2 }, criado: true }]);
    expect(montado.componente.mostrarDialog()).toBe(false);
  });

  it('editar grupo: abre com os textos atuais e envia a alteração pela rota do grupo', async () => {
    const { montado, salvos } = await montar();
    montado.componente.abrirParaEditar(GRUPO, 3);
    await montado.atualizar();
    expect(dialogo()?.textContent).toContain('Editar grupo');
    expect(campo('modelagem-grupo-rotulo').value).toBe('Usuários e ponto');
    preencher('modelagem-grupo-rotulo', 'Usuários');
    montado.componente.salvar();
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/modelagem/grupo/4');
    expect(requisicao.request.body).toEqual({ titulo: 'Usuários, ponto e anotações', rotulo: 'Usuários' });
    responderSucesso(requisicao, { ...GRUPO, rotulo: 'Usuários' });
    await montado.atualizar();
    expect(salvos[0]).toEqual({ grupo: { ...GRUPO, rotulo: 'Usuários' }, criado: false });
  });

  it('o dialog continua aberto quando o backend recusa (rótulo repetido)', async () => {
    const { montado, salvos } = await montar();
    montado.componente.abrirParaCriar();
    await montado.atualizar();
    preencher('modelagem-grupo-titulo', 'Outro');
    preencher('modelagem-grupo-rotulo', 'Domínio');
    montado.componente.salvar();
    responderErro(esperarRequisicao(montado.http, 'POST', '/modelagem/grupo'), 400, 'Já existe um grupo com esse rótulo');
    await montado.atualizar();
    expect(salvos).toEqual([]);
    expect(montado.componente.mostrarDialog()).toBe(true);
    expect(montado.componente.carregando()).toBe(false);
  });

  it('grupo com tabelas não pode ser excluído: o botão fica desligado', async () => {
    const { montado } = await montar();
    montado.componente.abrirParaEditar(GRUPO, 3);
    await montado.atualizar();
    expect(botao('Excluir').disabled).toBe(true);
    montado.componente.confirmarExclusao(new Event('click'));
    montado.http.expectNone((requisicao) => requisicao.method === 'DELETE');
  });

  it('grupo vazio: pede confirmação e exclui pela rota do grupo', async () => {
    const { montado, excluidos } = await montar();
    montado.componente.abrirParaEditar(GRUPO, 0);
    await montado.atualizar();
    expect(botao('Excluir').disabled).toBe(false);
    botao('Excluir').click();
    await montado.atualizar();
    const aceitar = Array.from(document.body.querySelectorAll<HTMLButtonElement>('.p-confirmpopup button')).find((candidato) => candidato.textContent?.includes('Excluir'))!;
    aceitar.click();
    responderSucesso(esperarRequisicao(montado.http, 'DELETE', '/modelagem/grupo/4'), null);
    await montado.atualizar();
    expect(excluidos).toEqual([4]);
    expect(montado.componente.mostrarDialog()).toBe(false);
  });
});
