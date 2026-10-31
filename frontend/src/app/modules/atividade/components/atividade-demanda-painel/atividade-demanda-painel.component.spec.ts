import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TipoDemandaStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { CampoDocumentoDaDemanda } from '../atividade-documentos-indicador/atividade-documentos-indicador.component';
import { AtividadeDemandaPainelComponent } from './atividade-demanda-painel.component';

// A demanda ao lado da lista de Atividades (task 288): leitura por aba, "Editar" só para quem pode e aviso de texto não salvo.

const DEMANDA = {
  id: 10, projetoId: 7, demandaPaiId: null, nome: 'Demanda de teste', descricaoTecnica: '# Texto tecnico', descricaoCliente: 'Texto do cliente',
  documentacao: '', horasEstimadas: 8, status: TipoDemandaStatusEnum.PLANEJADA, isEstrutural: false, previsaoFimData: null, createdDate: '2026-01-01T00:00:00Z', podeEditar: true,
};

async function abrir(opcoes: { campo?: CampoDocumentoDaDemanda; usuario?: TipoUsuarioEnum; podeEditar?: boolean } = {}) {
  const montado = await montarComponente(AtividadeDemandaPainelComponent, {
    usuario: opcoes.usuario ?? TipoUsuarioEnum.GESTOR,
    entradas: { demandaId: 10, campo: opcoes.campo ?? 'descricaoTecnica', nomeProjeto: 'Portal', nomeDemanda: 'Demanda de teste' },
  });
  const abas: CampoDocumentoDaDemanda[] = [];
  const fechamentos: number[] = [];
  const salvos: unknown[] = [];
  montado.componente.campoEscolhido.subscribe((campo) => abas.push(campo));
  montado.componente.fechar.subscribe(() => fechamentos.push(1));
  montado.componente.textoSalvo.subscribe((evento) => salvos.push(evento));
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/10'), { ...DEMANDA, podeEditar: opcoes.podeEditar ?? true });
  await montado.atualizar();
  return { montado, abas, fechamentos, salvos };
}

const botao = (elemento: HTMLElement, rotulo: string) =>
  Array.from(elemento.querySelectorAll('button')).find((item) => item.textContent?.trim() === rotulo);

describe('AtividadeDemandaPainelComponent', () => {
  it('mostra a trilha, o nome, o status com o nome, as horas e o texto da aba aberta', async () => {
    const { montado } = await abrir();
    const texto = montado.elemento.textContent ?? '';
    expect(texto).toContain('Portal › Demanda');
    expect(texto).toContain('Demanda de teste');
    expect(texto).toContain('Planejada');
    expect(texto).toContain('8h estimadas');
    expect(texto).toContain('Texto tecnico');
  });

  it('as três abas existem, a aberta fica selecionada e clicar noutra só pede a troca (a hospedeira decide)', async () => {
    const { montado, abas } = await abrir();
    const abasDom = Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    expect(abasDom.map((aba) => aba.textContent?.trim())).toEqual(['Cliente', 'Técnica', 'Documentação']);
    expect(abasDom.map((aba) => aba.getAttribute('aria-label'))).toEqual(['Descrição do cliente', 'Descrição técnica', 'Documentação']);
    expect(abasDom.map((aba) => aba.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    abasDom[0].click();
    abasDom[1].click();
    expect(abas).toEqual(['descricaoCliente']);
  });

  it('texto vazio mostra "Sem conteúdo"', async () => {
    const { montado } = await abrir({ campo: 'documentacao' });
    expect(montado.elemento.textContent).toContain('Sem conteúdo');
  });

  it('Editar aparece na técnica e na documentação para quem pode editar a demanda, e não na descrição do cliente', async () => {
    const tecnica = await abrir();
    expect(botao(tecnica.montado.elemento, 'Editar')).toBeDefined();

    TestBed.resetTestingModule();
    const cliente = await abrir({ campo: 'descricaoCliente' });
    expect(botao(cliente.montado.elemento, 'Editar')).toBeUndefined();

    TestBed.resetTestingModule();
    const semPermissao = await abrir({ usuario: TipoUsuarioEnum.DESENVOLVEDOR, podeEditar: false });
    expect(botao(semPermissao.montado.elemento, 'Editar')).toBeUndefined();
  });

  it('Editar troca a leitura pelo editor da task 278, e Salvar grava só o campo, avisa a lista e volta à leitura', async () => {
    const { montado, salvos } = await abrir();
    botao(montado.elemento, 'Editar')!.click();
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/10'), DEMANDA);
    await montado.atualizar();
    expect(montado.elemento.querySelector('app-demanda-descricao-editor')).not.toBeNull();

    const editor = montado.elemento.querySelector('app-demanda-descricao-editor')!;
    const salvar = Array.from(editor.querySelectorAll('button')).find((item) => item.textContent?.trim() === 'Salvar')!;
    const componenteEditor = montado.fixture.debugElement.query((no) => no.name === 'app-demanda-descricao-editor').componentInstance;
    componenteEditor.formulario.patchValue({ valor: 'novo texto' });
    salvar.click();
    await montado.atualizar();
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/demanda/10');
    expect(requisicao.request.body).toEqual({ descricaoTecnica: 'novo texto' });
    responderSucesso(requisicao, DEMANDA);
    await montado.atualizar();

    expect(salvos).toEqual([{ demandaId: 10, campo: 'descricaoTecnica', temConteudo: true }]);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/10'), { ...DEMANDA, descricaoTecnica: 'novo texto' });
    await montado.atualizar();
    expect(montado.elemento.querySelector('app-demanda-descricao-editor')).toBeNull();
    expect(montado.elemento.textContent).toContain('novo texto');
  });

  it('com texto não salvo, trocar de aba ou fechar pergunta antes; Descartar segue, sem texto novo segue direto', async () => {
    const { montado, abas, fechamentos } = await abrir();
    botao(montado.elemento, 'Editar')!.click();
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/10'), DEMANDA);
    await montado.atualizar();

    montado.componente.escolherAba('documentacao');
    expect(abas).toEqual(['documentacao']);

    const componenteEditor = montado.fixture.debugElement.query((no) => no.name === 'app-demanda-descricao-editor').componentInstance;
    componenteEditor.formulario.patchValue({ valor: 'digitei algo' });
    montado.componente.solicitarFechar();
    await montado.atualizar();
    expect(fechamentos).toEqual([]);
    expect(document.body.textContent).toContain('Alterações não salvas');

    const descartar = Array.from(document.body.querySelectorAll('.p-confirmdialog button')).find((item) => item.textContent?.trim() === 'Descartar') as HTMLButtonElement;
    descartar.click();
    await montado.atualizar();
    expect(fechamentos).toEqual([1]);
  });

  it('erro ao carregar mostra o aviso e não oferece Editar', async () => {
    const montado = await montarComponente(AtividadeDemandaPainelComponent, {
      usuario: TipoUsuarioEnum.GESTOR,
      entradas: { demandaId: 10, campo: 'descricaoTecnica', nomeProjeto: 'Portal', nomeDemanda: 'Demanda de teste' },
    });
    responderErro(esperarRequisicao(montado.http, 'GET', '/demanda/10'), 500, 'Falha');
    await montado.atualizar();
    expect(montado.elemento.textContent).toContain('Não foi possível carregar a demanda.');
    expect(botao(montado.elemento, 'Editar')).toBeUndefined();
  });
});
