import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TipoDemandaStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { CampoDescricaoDemanda } from '../../utils/demanda-context-menu.factory';
import { DemandaDescricaoEditorComponent } from './demanda-descricao-editor.component';

// O editor de uma descrição da demanda no modo Dividido (task 278): carrega sozinho, só edita quem pode e avisa se há texto não salvo.

const DEMANDA = {
  id: 10, projetoId: 7, demandaPaiId: null, nome: 'Demanda de teste', descricaoTecnica: 'texto tecnico', descricaoCliente: 'texto do cliente', documentacao: '',
  horasEstimadas: 8, status: TipoDemandaStatusEnum.PLANEJADA, isEstrutural: false, previsaoFimData: null, createdDate: '2026-01-01T00:00:00Z', podeEditar: true,
};

async function abrir(opcoes: { usuario?: TipoUsuarioEnum; campo?: CampoDescricaoDemanda; podeEditar?: boolean } = {}) {
  const montado = await montarComponente(DemandaDescricaoEditorComponent, {
    usuario: opcoes.usuario ?? TipoUsuarioEnum.GESTOR,
    entradas: { demandaId: 10, campo: opcoes.campo ?? 'descricaoTecnica' },
  });
  const salvas: number[] = [];
  const fechamentos: number[] = [];
  montado.componente.salva.subscribe((id) => salvas.push(id));
  montado.componente.fecharSolicitado.subscribe(() => fechamentos.push(1));
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/10'), { ...DEMANDA, podeEditar: opcoes.podeEditar ?? true });
  await montado.atualizar();
  return { montado, salvas, fechamentos };
}

const botao = (elemento: HTMLElement, rotulo: string) =>
  Array.from(elemento.querySelectorAll('button')).find((item) => item.textContent?.trim() === rotulo);

describe('DemandaDescricaoEditorComponent', () => {
  it('carrega a demanda e abre o campo pedido, com o título e o nome da demanda', async () => {
    const { montado } = await abrir();
    expect(montado.componente.titulo()).toBe('Descrição Técnica');
    expect(montado.componente.formulario.value.valor).toBe('texto tecnico');
    expect(montado.elemento.textContent).toContain('Demanda de teste');
    expect(montado.componente.temAlteracoesNaoSalvas()).toBe(false);
  });

  it('o campo muda o título e o texto: documentação vazia abre vazia', async () => {
    const { montado } = await abrir({ campo: 'documentacao' });
    expect(montado.componente.titulo()).toBe('Documentação');
    expect(montado.componente.formulario.value.valor).toBe('');
  });

  it('digitar marca alteração não salva; voltar ao texto original desmarca', async () => {
    const { montado } = await abrir();
    montado.componente.formulario.patchValue({ valor: 'novo texto' });
    expect(montado.componente.temAlteracoesNaoSalvas()).toBe(true);
    montado.componente.formulario.patchValue({ valor: 'texto tecnico' });
    expect(montado.componente.temAlteracoesNaoSalvas()).toBe(false);
  });

  it('Salvar envia só o campo, avisa a hospedeira e zera a marca de alteração', async () => {
    const { montado, salvas } = await abrir();
    montado.componente.formulario.patchValue({ valor: 'novo texto' });
    botao(montado.elemento, 'Salvar')!.click();
    await montado.atualizar();

    const requisicao = esperarRequisicao(montado.http, 'PUT', '/demanda/10');
    expect(requisicao.request.body).toEqual({ descricaoTecnica: 'novo texto' });
    responderSucesso(requisicao, DEMANDA);
    await montado.atualizar();

    expect(salvas).toEqual([10]);
    expect(montado.componente.temAlteracoesNaoSalvas()).toBe(false);
  });

  it('Cancelar só pede para sair; quem hospeda decide se confirma', async () => {
    const { montado, fechamentos } = await abrir();
    botao(montado.elemento, 'Cancelar')!.click();
    expect(fechamentos).toEqual([1]);
  });

  it('a descrição do cliente é só do gestor: o desenvolvedor membro lê, sem editor nem Salvar', async () => {
    const { montado } = await abrir({ usuario: TipoUsuarioEnum.DESENVOLVEDOR, campo: 'descricaoCliente', podeEditar: true });
    expect(montado.componente.podeEditar()).toBe(false);
    expect(botao(montado.elemento, 'Salvar')).toBeUndefined();
    expect(botao(montado.elemento, 'Fechar')).toBeDefined();
    expect(montado.elemento.querySelector('app-markdown-editor')).toBeNull();
    montado.componente.formulario.patchValue({ valor: 'x' });
    expect(montado.componente.temAlteracoesNaoSalvas()).toBe(false);
  });

  it('quem não é membro lê a técnica; o membro edita', async () => {
    const naoMembro = await abrir({ usuario: TipoUsuarioEnum.DESENVOLVEDOR, podeEditar: false });
    expect(naoMembro.montado.componente.podeEditar()).toBe(false);
    expect(naoMembro.montado.elemento.textContent).toContain('texto tecnico');

    TestBed.resetTestingModule();
    const membro = await abrir({ usuario: TipoUsuarioEnum.DESENVOLVEDOR, podeEditar: true });
    expect(membro.montado.componente.podeEditar()).toBe(true);
  });

  it('erro ao carregar mostra o aviso e não deixa salvar', async () => {
    const montado = await montarComponente(DemandaDescricaoEditorComponent, {
      usuario: TipoUsuarioEnum.GESTOR,
      entradas: { demandaId: 10, campo: 'descricaoTecnica' },
    });
    responderErro(esperarRequisicao(montado.http, 'GET', '/demanda/10'), 500, 'Falha');
    await montado.atualizar();
    expect(montado.elemento.textContent).toContain('Não foi possível carregar a demanda.');
    montado.componente.salvar();
    montado.http.expectNone((requisicao) => requisicao.method === 'PUT');
  });
});
