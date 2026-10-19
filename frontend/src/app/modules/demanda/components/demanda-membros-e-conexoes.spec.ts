import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { DemandaConexaoResumoDto, DemandaMembroDto, TipoUsuarioEnum, UsuarioResumoDto } from '@project20/shared';
import { montarComponente } from '../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../testes/http-teste';
import { criarUsuarioTeste } from '../../../../testes/usuarios-teste';
import { DesfazerService } from '../../../core/services/desfazer.service';
import { DemandaMembrosCabecalhoComponent } from './demanda-membros-cabecalho/demanda-membros-cabecalho.component';
import { DemandaMembroListaComponent } from './demanda-membro-lista/demanda-membro-lista.component';
import { DemandaConexaoListaComponent } from './demanda-conexao-lista/demanda-conexao-lista.component';

// Membros (SYSTEM.SPEC.md §14): o gestor atribui e remove qualquer um; o desenvolvedor só inclui e remove a si mesmo.

const EU = criarUsuarioTeste().id;

function membro(usuarioId: number, nome: string, tipo = TipoUsuarioEnum.DESENVOLVEDOR): DemandaMembroDto {
  return { usuarioId, nomeCompleto: nome, login: nome.toLowerCase(), tipo, cargoTitulo: 'Dev' } as DemandaMembroDto;
}
function usuario(id: number, nome: string): UsuarioResumoDto {
  return { id, nomeCompleto: nome, login: nome.toLowerCase(), cargoTitulo: 'Dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR, status: 'ATIVO', temAnotacoes: false } as UsuarioResumoDto;
}

// ---------------------------------------------------------------------------
// demanda-membros-cabecalho
// ---------------------------------------------------------------------------

describe('DemandaMembrosCabecalhoComponent', () => {
  async function montar(tipo: TipoUsuarioEnum, membros: DemandaMembroDto[], disponiveis: UsuarioResumoDto[] = []) {
    const montado = await montarComponente(DemandaMembrosCabecalhoComponent, {
      usuario: tipo, entradas: { demandaId: 10, membros, usuariosDisponiveis: disponiveis },
    });
    let alteracoes = 0;
    montado.componente.membrosAlterados.subscribe(() => alteracoes++);
    return { montado, alteracoes: () => alteracoes };
  }

  it('mostra as iniciais de cada membro; souMembro reflete o usuário logado', async () => {
    const { montado } = await montar(TipoUsuarioEnum.DESENVOLVEDOR, [membro(EU, 'Eu Mesmo'), membro(8, 'Beto Lima')]);
    expect(montado.elemento.textContent).toContain('EM');
    expect(montado.elemento.textContent).toContain('BL');
    expect(montado.componente.souMembro()).toBe(true);
  });

  it('a busca do gestor sugere só quem ainda não é membro, por nome ou login, sem acento', async () => {
    const { montado } = await montar(TipoUsuarioEnum.GESTOR, [membro(2, 'Ana')], [usuario(2, 'Ana'), usuario(3, 'Árvore Souza'), usuario(4, 'Caio')]);
    montado.componente.buscar({ query: 'arvore' } as never);
    expect(montado.componente.sugestoes().map((u) => u.id)).toEqual([3]);
    montado.componente.buscar({ query: 'ana' } as never);
    expect(montado.componente.sugestoes()).toEqual([]);
    montado.componente.buscar({ query: '' } as never);
    expect(montado.componente.sugestoes().map((u) => u.id)).toEqual([3, 4]);
  });

  it('escolher na lista adiciona o membro na hora e grava; falha devolve a lista anterior', async () => {
    const { montado, alteracoes } = await montar(TipoUsuarioEnum.GESTOR, [membro(2, 'Ana')], [usuario(3, 'Caio')]);
    montado.componente.aoEscolher(usuario(3, 'Caio'));
    expect(montado.componente.membros().map((m) => m.usuarioId)).toEqual([2, 3]);
    expect(montado.componente.adicionando()).toBe(false);
    const requisicao = esperarRequisicao(montado.http, 'POST', '/demanda/10/membro');
    expect(requisicao.request.body).toEqual({ usuarioId: 3 });
    responderSucesso(requisicao, null);
    expect(alteracoes()).toBe(1);

    montado.componente.aoEscolher(usuario(4, 'Duda'));
    responderErro(esperarRequisicao(montado.http, 'POST', '/demanda/10/membro'), 400, 'recusado');
    await montado.atualizar();
    expect(montado.componente.membros().map((m) => m.usuarioId)).toEqual([2, 3]);
  });

  it('remover tira o membro na hora, grava e oferece desfazer que o recoloca', async () => {
    const { montado, alteracoes } = await montar(TipoUsuarioEnum.GESTOR, [membro(2, 'Ana'), membro(3, 'Caio')]);
    montado.componente.remover(membro(3, 'Caio'));
    expect(montado.componente.membros().map((m) => m.usuarioId)).toEqual([2]);
    responderSucesso(esperarRequisicao(montado.http, 'DELETE', '/demanda/10/membro/3'), null);
    expect(TestBed.inject(DesfazerService).oferta()?.mensagem).toBe('Caio removido da demanda');
    expect(alteracoes()).toBe(1);

    TestBed.inject(DesfazerService).executar();
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/demanda/10/membro'), null);
    expect(montado.componente.membros().map((m) => m.usuarioId).sort()).toEqual([2, 3]);
  });

  it('se a API recusa a remoção (último membro), o membro volta', async () => {
    const { montado } = await montar(TipoUsuarioEnum.GESTOR, [membro(2, 'Ana')]);
    montado.componente.remover(membro(2, 'Ana'));
    responderErro(esperarRequisicao(montado.http, 'DELETE', '/demanda/10/membro/2'), 400, 'Não é possível remover o último membro da demanda');
    await montado.atualizar();
    expect(montado.componente.membros().map((m) => m.usuarioId)).toEqual([2]);
  });

  it('desenvolvedor participa sozinho: POST com o próprio id e recarrega a lista', async () => {
    const { montado, alteracoes } = await montar(TipoUsuarioEnum.DESENVOLVEDOR, [membro(2, 'Ana')]);
    montado.componente.participar();
    const requisicao = esperarRequisicao(montado.http, 'POST', '/demanda/10/membro');
    expect(requisicao.request.body).toEqual({ usuarioId: EU });
    responderSucesso(requisicao, null);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/10/membro'), [membro(2, 'Ana'), membro(EU, 'Eu')]);
    expect(montado.componente.souMembro()).toBe(true);
    expect(alteracoes()).toBe(1);
  });

  it('desenvolvedor sai de si mesmo: DELETE do próprio id; sem ser membro, "sair" não faz nada', async () => {
    const membro1 = await montar(TipoUsuarioEnum.DESENVOLVEDOR, [membro(EU, 'Eu'), membro(2, 'Ana')]);
    membro1.montado.componente.sair();
    esperarRequisicao(membro1.montado.http, 'DELETE', `/demanda/10/membro/${EU}`);
  });
});

// ---------------------------------------------------------------------------
// demanda-membro-lista (dialog "Membros" do menu de contexto)
// ---------------------------------------------------------------------------

describe('DemandaMembroListaComponent', () => {
  async function montar(tipo: TipoUsuarioEnum, atuais: DemandaMembroDto[]) {
    const montado = await montarComponente(DemandaMembroListaComponent, { usuario: tipo, entradas: { demandaId: 10, usuariosDisponiveis: signal([usuario(2, 'Ana'), usuario(3, 'Caio')]) } });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/10/membro'), atuais);
    await montado.atualizar();
    return montado;
  }

  it('carrega os membros ao abrir e sabe se o usuário logado é um deles', async () => {
    const montado = await montar(TipoUsuarioEnum.DESENVOLVEDOR, [membro(EU, 'Eu'), membro(2, 'Ana')]);
    expect(montado.componente.membros().map((m) => m.usuarioId)).toEqual([EU, 2]);
    expect(montado.componente.souMembro()).toBe(true);
  });

  it('salvar sincroniza a seleção: atribui os novos e remove os desmarcados, depois recarrega', async () => {
    const montado = await montar(TipoUsuarioEnum.GESTOR, [membro(2, 'Ana')]);
    montado.componente.abrirDialog();
    montado.componente.formularioMembro.setValue({ usuarioIds: [3] });
    montado.componente.salvarMembros();
    const atribuicao = esperarRequisicao(montado.http, 'POST', '/demanda/10/membro');
    expect(atribuicao.request.body).toEqual({ usuarioId: 3 });
    responderSucesso(atribuicao, null);
    responderSucesso(esperarRequisicao(montado.http, 'DELETE', '/demanda/10/membro/2'), null);
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/10/membro'), [membro(3, 'Caio')]);
    expect(montado.componente.mostrarDialog()).toBe(false);
    expect(montado.componente.membros().map((m) => m.usuarioId)).toEqual([3]);
  });

  it('salvar sem mudança só fecha o dialog, sem chamar a API', async () => {
    const montado = await montar(TipoUsuarioEnum.GESTOR, [membro(2, 'Ana')]);
    montado.componente.abrirDialog();
    montado.componente.salvarMembros();
    montado.http.expectNone(() => true);
    expect(montado.componente.mostrarDialog()).toBe(false);
  });

  it('desenvolvedor participa e sai pelo próprio id; a saída oferece desfazer e, se a API recusa, o membro volta', async () => {
    const montado = await montar(TipoUsuarioEnum.DESENVOLVEDOR, [membro(EU, 'Eu'), membro(2, 'Ana')]);
    montado.componente.sair();
    expect(montado.componente.membros().map((m) => m.usuarioId)).toEqual([2]);
    responderErro(esperarRequisicao(montado.http, 'DELETE', `/demanda/10/membro/${EU}`), 400, 'último membro');
    await montado.atualizar();
    expect(montado.componente.membros().map((m) => m.usuarioId)).toEqual([EU, 2]);

    montado.componente.participar();
    expect(esperarRequisicao(montado.http, 'POST', '/demanda/10/membro').request.body).toEqual({ usuarioId: EU });
  });

  it('iniciais em maiúsculas e rótulo curto do tipo', async () => {
    const montado = await montar(TipoUsuarioEnum.GESTOR, []);
    expect(montado.componente.iniciais('maria clara souza')).toBe('MC');
    expect(montado.componente.rotuloTipo(TipoUsuarioEnum.DESENVOLVEDOR)).toBe('Dev');
  });
});

// ---------------------------------------------------------------------------
// demanda-conexao-lista
// ---------------------------------------------------------------------------

describe('DemandaConexaoListaComponent', () => {
  const CONEXOES: DemandaConexaoResumoDto[] = [
    { id: 1, demandaConectadaId: 20, nomeDemandaConectada: 'Saída', direcao: 'saida' },
    { id: 2, demandaConectadaId: 21, nomeDemandaConectada: 'Entrada', direcao: 'entrada' },
    { id: 3, demandaConectadaId: 22, nomeDemandaConectada: 'Mútua', direcao: 'bidirecional' },
  ];
  const TODAS = [20, 21, 22, 23, 24].map((id) => ({ demandaConectadaId: id, nomeDemandaConectada: `D${id}` }));

  async function montar() {
    return montarComponente(DemandaConexaoListaComponent, {
      usuario: TipoUsuarioEnum.GESTOR, entradas: { demandaId: 10, nomeDemanda: 'Esta', todasDemandas: TODAS, conexoes: CONEXOES },
    });
  }

  it('candidatos são as demandas do projeto que ainda não estão conectadas', async () => {
    const montado = await montar();
    expect(montado.componente.candidatos().map((d) => d.demandaConectadaId)).toEqual([23, 24]);
  });

  it('o tooltip diz a direção em linguagem de dependência', async () => {
    const montado = await montar();
    expect(CONEXOES.map((conexao) => montado.componente.tooltipDirecao(conexao))).toEqual([
      'Esta demanda depende de "Saída"', '"Entrada" depende desta demanda', 'Dependência mútua com "Mútua"',
    ]);
  });

  it('adicionar sem destino escolhido não chama a API', async () => {
    const montado = await montar();
    montado.componente.adicionar();
    montado.http.expectNone(() => true);
  });

  it('adicionar manda o destino e a bidirecionalidade, limpa o formulário e recarrega as conexões', async () => {
    const montado = await montar();
    montado.componente.destinoId.set(23);
    montado.componente.ehBidirecional.set(true);
    montado.componente.adicionar();
    expect(montado.componente.salvando()).toBe(true);
    const requisicao = esperarRequisicao(montado.http, 'POST', '/demanda/10/conexao');
    expect(requisicao.request.body).toEqual({ demandaDestinoId: 23, ehBidirecional: true });
    responderSucesso(requisicao, { id: 9 }, 201);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/10/conexao'), [...CONEXOES, { id: 9, demandaConectadaId: 23, nomeDemandaConectada: 'D23', direcao: 'bidirecional' }]);
    expect(montado.componente.salvando()).toBe(false);
    expect([montado.componente.destinoId(), montado.componente.ehBidirecional()]).toEqual([null, false]);
    expect(montado.componente.conexoes()).toHaveLength(4);
  });

  it('ciclo: o erro aparece na própria linha (sem toast) e o formulário continua preenchido', async () => {
    const montado = await montar();
    const avisos: unknown[] = [];
    montado.mensagens.messageObserver.subscribe((mensagem) => avisos.push(mensagem));
    montado.componente.destinoId.set(23);
    montado.componente.adicionar();
    responderErro(esperarRequisicao(montado.http, 'POST', '/demanda/10/conexao'), 400, 'Essa conexão criaria um ciclo no grafo de demandas');
    await montado.atualizar();
    expect(montado.componente.erroInline()).toBe('Essa conexão criaria um ciclo no grafo de demandas');
    expect(montado.componente.destinoId()).toBe(23);
    expect(montado.componente.salvando()).toBe(false);
    expect(avisos).toEqual([]);
  });

  it('escolher outro destino apaga o erro anterior', async () => {
    const montado = await montar();
    montado.componente.erroInline.set('erro antigo');
    montado.componente.aoEscolherDestino(24);
    expect(montado.componente.erroInline()).toBeNull();
    expect(montado.componente.destinoId()).toBe(24);
  });

  it('excluir tira a conexão na hora, grava e oferece desfazer; falha devolve a conexão', async () => {
    const montado = await montar();
    montado.componente.excluir(CONEXOES[0]);
    expect(montado.componente.conexoes().map((c) => c.id)).toEqual([2, 3]);
    responderSucesso(esperarRequisicao(montado.http, 'DELETE', '/demanda/10/conexao/1'), null);
    expect(TestBed.inject(DesfazerService).oferta()?.mensagem).toBe('Conexão com "Saída" removida');

    montado.componente.excluir(CONEXOES[1]);
    responderErro(esperarRequisicao(montado.http, 'DELETE', '/demanda/10/conexao/2'), 400, 'recusado');
    await montado.atualizar();
    expect(montado.componente.conexoes().map((c) => c.id)).toEqual([2, 3]);
  });

  it('desfazer recria a conexão no sentido original: saída e bidirecional partem desta demanda; entrada parte da outra', async () => {
    const casos: Array<[DemandaConexaoResumoDto, string, unknown]> = [
      [CONEXOES[0], '/demanda/10/conexao', { demandaDestinoId: 20, ehBidirecional: false }],
      [CONEXOES[1], '/demanda/21/conexao', { demandaDestinoId: 10, ehBidirecional: false }],
      [CONEXOES[2], '/demanda/10/conexao', { demandaDestinoId: 22, ehBidirecional: true }],
    ];
    for (const [conexao, caminho, corpo] of casos) {
      const montado = await montar();
      montado.componente.excluir(conexao);
      responderSucesso(esperarRequisicao(montado.http, 'DELETE', `/demanda/10/conexao/${conexao.id}`), null);
      TestBed.inject(DesfazerService).executar();
      expect(esperarRequisicao(montado.http, 'POST', caminho).request.body).toEqual(corpo);
      TestBed.resetTestingModule();
    }
  });
});
