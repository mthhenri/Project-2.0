import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ModelagemColunaDto, ModelagemDiagramaDto, ModelagemTabelaDto, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { ModelagemPage } from './modelagem.page';

const pk: ModelagemColunaDto = { nome: 'id', tipo: 'serial', marca: 'pk', tabelaReferenciada: null };
const simples = (nome: string): ModelagemColunaDto => ({ nome, tipo: 'varchar', marca: '', tabelaReferenciada: null });
const fk = (nome: string, tabela: string): ModelagemColunaDto => ({ nome, tipo: 'int', marca: 'fk', tabelaReferenciada: tabela });
const tabela = (nome: string, grupoId: number | null, x: number, colunas: ModelagemColunaDto[]): ModelagemTabelaDto => ({ nome, grupoId, x, y: 0, largura: 220, colunas });

const DIAGRAMA: ModelagemDiagramaDto = {
  origem: 'PostgreSQL · última migration: 0099 - Teste',
  colunasOcultas: ['created_date'],
  avisos: [],
  grupos: [
    { id: 1, titulo: 'Domínio', rotulo: 'Domínio', corIndice: 0 },
    { id: 2, titulo: 'Usuários', rotulo: 'Usuários', corIndice: 1 },
    { id: 3, titulo: 'Vazio', rotulo: 'Vazio', corIndice: 2 },
  ],
  tabelas: [
    tabela('demanda', 1, 0, [pk, simples('nome')]),
    tabela('atividade', 1, 400, [pk, fk('demanda_id', 'demanda'), fk('usuario_id', 'usuario')]),
    tabela('execucao', 1, 800, [pk, fk('atividade_id', 'atividade')]),
    tabela('usuario', 2, 1200, [pk, simples('login'), simples('senha_encriptada')]),
  ],
};

// A tela busca o diagrama no backend: o teste responde a requisição com o diagrama de teste.
async function montar(usuario = TipoUsuarioEnum.DESENVOLVEDOR, diagrama: ModelagemDiagramaDto | null = DIAGRAMA) {
  TestBed.resetTestingModule();
  const montado = await montarComponente(ModelagemPage, { usuario });
  const requisicao = esperarRequisicao(montado.http, 'GET', '/modelagem');
  if (diagrama) responderSucesso(requisicao, diagrama);
  else responderErro(requisicao, 500, 'Falha');
  await montado.atualizar();
  return montado;
}

const tabelas = (elemento: HTMLElement) => Array.from(elemento.querySelectorAll<SVGGElement>('.modelagem-diagrama__tabela'));
const nome = (tabelaSvg: SVGGElement) => tabelaSvg.getAttribute('aria-label')?.replace('Tabela ', '');
const clicar = (alvo: Element) => {
  alvo.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 }));
  alvo.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 0, clientY: 0 }));
};
const arrastar = (alvo: Element) => {
  alvo.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));
  alvo.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 90, clientY: 50 }));
  alvo.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 90, clientY: 50 }));
};
const botoesDeGrupo = (elemento: HTMLElement) => Array.from(elemento.querySelectorAll<HTMLButtonElement>('button.modelagem__grupo'));

describe('ModelagemPage', () => {
  it('mostra o carregando até o diagrama chegar', async () => {
    TestBed.resetTestingModule();
    const montado = await montarComponente(ModelagemPage, { usuario: TipoUsuarioEnum.GESTOR });
    expect(montado.elemento.textContent).toContain('Carregando o diagrama');
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/modelagem'), DIAGRAMA);
    await montado.atualizar();
    expect(montado.elemento.textContent).not.toContain('Carregando o diagrama');
  });

  it('mostra o diagrama inteiro, com o total de tabelas, para qualquer tipo de usuário', async () => {
    for (const usuario of [TipoUsuarioEnum.DESENVOLVEDOR, TipoUsuarioEnum.GESTOR, TipoUsuarioEnum.ADMINISTRADOR]) {
      const { elemento } = await montar(usuario);
      expect(elemento.querySelector('h1')?.textContent).toContain('Modelagem do banco');
      expect(elemento.querySelector('.modelagem__contador')?.textContent).toContain('4 tabelas');
      expect(tabelas(elemento).map(nome)).toEqual(['demanda', 'atividade', 'execucao', 'usuario']);
    }
  });

  it('tem um botão de filtro por grupo com a contagem de tabelas e o painel de resumo no começo', async () => {
    const { elemento } = await montar();
    expect(botoesDeGrupo(elemento).map((botao) => botao.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['Domínio 3', 'Usuários 1', 'Vazio 0']);
    expect(elemento.querySelector('.modelagem-detalhe__nome')?.textContent).toContain('Banco de dados');
    expect(elemento.textContent).toContain('0099 - Teste');
  });

  it('desligar um grupo some com as tabelas dele; ligar de novo devolve', async () => {
    const { elemento, atualizar } = await montar();
    const botao = botoesDeGrupo(elemento)[0];
    botao.click();
    await atualizar();
    expect(botao.getAttribute('aria-pressed')).toBe('false');
    expect(tabelas(elemento).map(nome)).toEqual(['usuario']);
    botao.click();
    await atualizar();
    expect(tabelas(elemento).length).toBe(4);
  });

  it('clicar em uma tabela abre as colunas e as relações dela no painel', async () => {
    const { elemento, atualizar } = await montar();
    clicar(tabelas(elemento).find((candidata) => nome(candidata) === 'atividade')!);
    await atualizar();
    expect(elemento.querySelector('.modelagem-detalhe__nome')?.textContent).toContain('atividade');
    const relacoes = Array.from(elemento.querySelectorAll('.modelagem-detalhe__relacao')).map((botao) => botao.textContent?.replace(/\s+/g, ' ').trim());
    expect(relacoes).toEqual(['demanda via demanda_id', 'usuario via usuario_id', 'execucao via atividade_id']);
  });

  it('escolher uma relação no painel passa para a outra tabela', async () => {
    const { elemento, atualizar } = await montar();
    clicar(tabelas(elemento).find((candidata) => nome(candidata) === 'atividade')!);
    await atualizar();
    const paraDemanda = Array.from(elemento.querySelectorAll<HTMLButtonElement>('.modelagem-detalhe__relacao')).find((botao) => botao.textContent?.includes('demanda via demanda_id'))!;
    paraDemanda.click();
    await atualizar();
    expect(elemento.querySelector('.modelagem-detalhe__nome')?.textContent).toContain('demanda');
  });

  it('a busca apaga as tabelas sem o termo e Enter escolhe a primeira que casa', async () => {
    const { elemento, atualizar } = await montar();
    const campo = elemento.querySelector<HTMLInputElement>('input[aria-label="Buscar tabela ou coluna"]')!;
    campo.value = 'senha_encriptada';
    campo.dispatchEvent(new Event('input'));
    await atualizar();
    const claras = tabelas(elemento).filter((candidata) => !candidata.classList.contains('modelagem-diagrama__tabela--apagada'));
    expect(claras.map(nome)).toEqual(['usuario']);
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await atualizar();
    expect(elemento.querySelector('.modelagem-detalhe__nome')?.textContent).toContain('usuario');
  });

  it('Esc limpa a busca', async () => {
    const { elemento, atualizar } = await montar();
    const campo = elemento.querySelector<HTMLInputElement>('input[aria-label="Buscar tabela ou coluna"]')!;
    campo.value = 'usuario';
    campo.dispatchEvent(new Event('input'));
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await atualizar();
    expect(campo.value).toBe('');
  });

  it('com falha ao buscar o diagrama mostra o erro e "Tentar de novo" busca outra vez', async () => {
    const montado = await montar(TipoUsuarioEnum.GESTOR, null);
    expect(montado.elemento.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar o diagrama');
    const botao = Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('button')).find((candidato) => candidato.textContent?.includes('Tentar de novo'))!;
    botao.click();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/modelagem'), DIAGRAMA);
    await montado.atualizar();
    expect(tabelas(montado.elemento).length).toBe(4);
  });

  describe('quem só vê (desenvolvedor)', () => {
    it('não tem "Novo grupo", lápis de edição nem seletor de grupo, e arrastar não grava nada', async () => {
      const { elemento, http, atualizar } = await montar(TipoUsuarioEnum.DESENVOLVEDOR);
      expect(elemento.textContent).not.toContain('Novo grupo');
      expect(elemento.querySelectorAll('.modelagem__grupo-editar').length).toBe(0);
      arrastar(tabelas(elemento)[0]);
      await atualizar();
      http.expectNone((requisicao) => requisicao.method === 'PUT');
      clicar(tabelas(elemento)[1]);
      await atualizar();
      expect(elemento.querySelector('p-select')).toBeNull();
    });
  });

  describe('quem edita (gestor e administrador)', () => {
    it('tem "Novo grupo" e um lápis por grupo do banco', async () => {
      for (const usuario of [TipoUsuarioEnum.GESTOR, TipoUsuarioEnum.ADMINISTRADOR]) {
        const { elemento } = await montar(usuario);
        expect(elemento.textContent).toContain('Novo grupo');
        expect(elemento.querySelectorAll('.modelagem__grupo-editar').length).toBe(3);
      }
    });

    it('criar um grupo acrescenta o botão dele, ligado e com zero tabelas', async () => {
      const { elemento, http, atualizar } = await montar(TipoUsuarioEnum.GESTOR);
      Array.from(elemento.querySelectorAll<HTMLButtonElement>('button')).find((botao) => botao.textContent?.includes('Novo grupo'))!.click();
      await atualizar();
      const campoTitulo = document.body.querySelector<HTMLInputElement>('#modelagem-grupo-titulo')!;
      const campoRotulo = document.body.querySelector<HTMLInputElement>('#modelagem-grupo-rotulo')!;
      campoTitulo.value = 'Ponto e justificativas';
      campoTitulo.dispatchEvent(new Event('input'));
      campoRotulo.value = 'Ponto';
      campoRotulo.dispatchEvent(new Event('input'));
      Array.from(document.body.querySelectorAll<HTMLButtonElement>('.p-dialog button')).find((botao) => botao.textContent?.includes('Salvar'))!.click();
      responderSucesso(esperarRequisicao(http, 'POST', '/modelagem/grupo'), { id: 8, titulo: 'Ponto e justificativas', rotulo: 'Ponto', corIndice: 3 });
      await atualizar();
      const botoes = botoesDeGrupo(elemento);
      expect(botoes.map((botao) => botao.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['Domínio 3', 'Usuários 1', 'Vazio 0', 'Ponto 0']);
      expect(botoes[3].getAttribute('aria-pressed')).toBe('true');
    });

    it('soltar uma tabela arrastada grava só a posição dela e o diagrama passa a ter a nova posição', async () => {
      const { elemento, http, atualizar } = await montar(TipoUsuarioEnum.GESTOR);
      arrastar(tabelas(elemento)[0]);
      const requisicao = esperarRequisicao(http, 'PUT', '/modelagem/tabela/demanda');
      // Só a posição vai: o grupo que está no servidor não é tocado.
      expect(Object.keys(requisicao.request.body).sort()).toEqual(['x', 'y']);
      const { x, y } = requisicao.request.body;
      responderSucesso(requisicao, { nome: 'demanda', grupoId: 1, x, y });
      await atualizar();
      expect(tabelas(elemento)[0].getAttribute('transform')).toBe(`translate(${x},${y})`);
    });

    it('se a gravação do grupo falha, o seletor volta ao grupo que a tabela tem e o diagrama não muda', async () => {
      const { elemento, http, atualizar, componente } = await montar(TipoUsuarioEnum.GESTOR);
      clicar(tabelas(elemento).find((candidata) => nome(candidata) === 'execucao')!);
      await atualizar();
      componente.moverParaGrupo({ nome: 'execucao', grupoId: 3 });
      responderErro(esperarRequisicao(http, 'PUT', '/modelagem/tabela/execucao'), 404, 'Grupo não encontrado');
      await atualizar();
      http.expectNone((requisicao) => requisicao.method === 'GET');
      expect(botoesDeGrupo(elemento).map((botao) => botao.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['Domínio 3', 'Usuários 1', 'Vazio 0']);
    });

    it('se a gravação da posição falha, a tabela volta para onde estava', async () => {
      const { elemento, http, atualizar } = await montar(TipoUsuarioEnum.GESTOR);
      arrastar(tabelas(elemento)[0]);
      responderErro(esperarRequisicao(http, 'PUT', '/modelagem/tabela/demanda'), 400, 'Falha ao gravar');
      await atualizar();
      expect(tabelas(elemento)[0].getAttribute('transform')).toBe('translate(0,0)');
    });

    it('mover a tabela de grupo pelo painel grava só o grupo, liga o grupo se estava desligado e relê o diagrama', async () => {
      const { elemento, http, atualizar, componente } = await montar(TipoUsuarioEnum.GESTOR);
      botoesDeGrupo(elemento)[2].click();
      await atualizar();
      expect(botoesDeGrupo(elemento)[2].getAttribute('aria-pressed')).toBe('false');
      clicar(tabelas(elemento).find((candidata) => nome(candidata) === 'execucao')!);
      await atualizar();
      componente.moverParaGrupo({ nome: 'execucao', grupoId: 3 });
      const requisicao = esperarRequisicao(http, 'PUT', '/modelagem/tabela/execucao');
      expect(requisicao.request.body).toEqual({ grupoId: 3 });
      responderSucesso(requisicao, { nome: 'execucao', grupoId: 3, x: 800, y: 0 });
      // O servidor é a verdade: as tabelas que herdam o grupo de quem se mexeu (tipo_*) só se atualizam relendo o diagrama.
      const releitura = esperarRequisicao(http, 'GET', '/modelagem');
      responderSucesso(releitura, { ...DIAGRAMA, tabelas: DIAGRAMA.tabelas.map((candidata) => (candidata.nome === 'execucao' ? { ...candidata, grupoId: 3 } : candidata)) });
      await atualizar();
      expect(botoesDeGrupo(elemento).map((botao) => botao.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['Domínio 2', 'Usuários 1', 'Vazio 1']);
      expect(botoesDeGrupo(elemento)[2].getAttribute('aria-pressed')).toBe('true');
    });

    it('mover a tabela para "Sem grupo" cria o botão "Sem grupo" (sem lápis) com ela dentro', async () => {
      const { elemento, http, atualizar, componente } = await montar(TipoUsuarioEnum.GESTOR);
      componente.moverParaGrupo({ nome: 'usuario', grupoId: null });
      responderSucesso(esperarRequisicao(http, 'PUT', '/modelagem/tabela/usuario'), { nome: 'usuario', grupoId: null, x: 1200, y: 0 });
      responderSucesso(esperarRequisicao(http, 'GET', '/modelagem'), { ...DIAGRAMA, tabelas: DIAGRAMA.tabelas.map((candidata) => (candidata.nome === 'usuario' ? { ...candidata, grupoId: null } : candidata)) });
      await atualizar();
      const rotulos = botoesDeGrupo(elemento).map((botao) => botao.textContent?.replace(/\s+/g, ' ').trim());
      expect(rotulos).toEqual(['Domínio 3', 'Usuários 0', 'Vazio 0', 'Sem grupo 1']);
      expect(elemento.querySelectorAll('.modelagem__grupo-editar').length).toBe(3);
    });
  });
});
