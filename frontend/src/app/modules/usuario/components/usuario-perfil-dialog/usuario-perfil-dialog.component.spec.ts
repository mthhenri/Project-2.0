import { describe, it, expect } from 'vitest';
import { TipoUsuarioEnum, TipoUsuarioStatusEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { criarUsuarioTeste } from '../../../../../testes/usuarios-teste';
import { UsuarioPerfilDialogComponent } from './usuario-perfil-dialog.component';

const PERFIL = (id: number) => ({
  id, login: 'carla', nomeCompleto: 'Carla Dias', cargoTitulo: 'Analista', tipo: TipoUsuarioEnum.DESENVOLVEDOR,
  status: TipoUsuarioStatusEnum.ATIVO, horasDiariasNecessarias: 6, createdDate: '2026-01-15T00:00:00Z',
});

async function abrirPerfil(tipoLogado: TipoUsuarioEnum, idDoPerfil: number) {
  const montado = await montarComponente(UsuarioPerfilDialogComponent, { usuario: tipoLogado });
  montado.componente.abrir(idDoPerfil);
  await montado.atualizar();
  return montado;
}

const botoes = () => Array.from(document.body.querySelectorAll('button')).map((botao) => botao.textContent?.trim());

describe('UsuarioPerfilDialogComponent', () => {
  it('mostra o carregando e depois os dados do perfil', async () => {
    const montado = await abrirPerfil(TipoUsuarioEnum.GESTOR, 5);
    expect(montado.componente.carregando()).toBe(true);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/usuario/5'), PERFIL(5));
    await montado.atualizar();

    const texto = document.body.textContent ?? '';
    expect(montado.componente.carregando()).toBe(false);
    for (const esperado of ['Carla Dias', 'carla', 'Analista', '6h', 'Desenvolvedor', 'Ativo']) expect(texto).toContain(esperado);
  });

  it('gestor vê as ações Editar, Alterar Senha e Anotações', async () => {
    const montado = await abrirPerfil(TipoUsuarioEnum.GESTOR, 5);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/usuario/5'), PERFIL(5));
    await montado.atualizar();
    expect(montado.componente.podeEditar()).toBe(true);
    expect(botoes()).toEqual(expect.arrayContaining(['Editar', 'Alterar Senha', 'Anotações']));
  });

  it('desenvolvedor vendo o perfil de outro não vê ação nenhuma', async () => {
    const montado = await abrirPerfil(TipoUsuarioEnum.DESENVOLVEDOR, 5);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/usuario/5'), PERFIL(5));
    await montado.atualizar();
    expect(montado.componente.podeEditar()).toBe(false);
    expect(botoes()).not.toContain('Editar');
  });

  it('pedir edição ou senha fecha o perfil e avisa quem abriu', async () => {
    const montado = await abrirPerfil(TipoUsuarioEnum.GESTOR, 5);
    const pedidos: unknown[] = [];
    montado.componente.editarSolicitado.subscribe((id) => pedidos.push(['editar', id]));
    montado.componente.senhaSolicitada.subscribe((dados) => pedidos.push(['senha', dados]));
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/usuario/5'), PERFIL(5));
    await montado.atualizar();

    montado.componente.pedirEdicao(montado.componente.usuario()!);
    expect(montado.componente.mostrarDialog()).toBe(false);
    montado.componente.mostrarDialog.set(true);
    montado.componente.pedirSenha(montado.componente.usuario()!);
    expect(pedidos).toEqual([['editar', 5], ['senha', { id: 5, nomeCompleto: 'Carla Dias' }]]);
  });

  it('erro ao carregar deixa o perfil vazio e sai do carregando', async () => {
    const montado = await abrirPerfil(TipoUsuarioEnum.GESTOR, 99);
    responderErro(esperarRequisicao(montado.http, 'GET', '/usuario/99'), 404, 'Usuário não encontrado');
    await montado.atualizar();
    expect(montado.componente.usuario()).toBeNull();
    expect(montado.componente.carregando()).toBe(false);
  });

  it('o id do próprio usuário logado também libera as ações', async () => {
    const idProprio = criarUsuarioTeste().id;
    const montado = await abrirPerfil(TipoUsuarioEnum.DESENVOLVEDOR, idProprio);
    responderSucesso(esperarRequisicao(montado.http, 'GET', `/usuario/${idProprio}`), PERFIL(idProprio));
    await montado.atualizar();
    expect(montado.componente.podeEditar()).toBe(true);
  });
});
