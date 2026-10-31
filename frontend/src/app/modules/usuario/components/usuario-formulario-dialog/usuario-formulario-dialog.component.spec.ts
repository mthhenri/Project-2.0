import { describe, it, expect } from 'vitest';
import { TipoUsuarioEnum, TipoUsuarioStatusEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { criarUsuarioTeste } from '../../../../../testes/usuarios-teste';
import { UsuarioFormularioDialogComponent } from './usuario-formulario-dialog.component';

// Criar e editar usuário (SYSTEM.SPEC.md §14): o gestor não vê a opção de administrador; ninguém muda o próprio tipo nem status.

async function montar(tipoLogado: TipoUsuarioEnum) {
  const montado = await montarComponente(UsuarioFormularioDialogComponent, { usuario: tipoLogado });
  const criados: number[] = [];
  const alterados: number[] = [];
  montado.componente.aoCriar.subscribe(() => criados.push(1));
  montado.componente.aoAlterar.subscribe(() => alterados.push(1));
  return { montado, criados, alterados };
}

const rotulosDosTipos = (componente: UsuarioFormularioDialogComponent) => componente.tiposOpcoes().map((opcao) => opcao.label);

const USUARIO_EDITADO = {
  id: 50, login: 'beto', nomeCompleto: 'Beto Lima', cargoTitulo: 'Dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR,
  status: TipoUsuarioStatusEnum.ATIVO, horasDiariasNecessarias: 6, createdDate: '2026-01-15T00:00:00Z',
};

describe('UsuarioFormularioDialogComponent — criar', () => {
  it('abre limpo, sem senha até haver nome, e com tipo desenvolvedor', async () => {
    const { montado } = await montar(TipoUsuarioEnum.GESTOR);
    montado.componente.abrir();
    await montado.atualizar();
    const valores = montado.componente.formulario.getRawValue();
    expect(montado.componente.editando()).toBe(false);
    expect(valores.nomeCompleto).toBe('');
    expect(valores.senhaNaoEncriptada).toBe('');
    expect(valores.tipo).toBe(TipoUsuarioEnum.DESENVOLVEDOR);
    expect(document.body.textContent).toContain('Novo Usuário');
  });

  it('o login acompanha o nome até ser editado à mão', async () => {
    const { montado } = await montar(TipoUsuarioEnum.GESTOR);
    montado.componente.abrir();
    montado.componente.formulario.controls.nomeCompleto.setValue('João da Silva');
    expect(montado.componente.formulario.controls.login.value).toBe('joao.silva');

    montado.componente.aoEditarLogin();
    montado.componente.formulario.controls.login.setValue('jsilva');
    montado.componente.formulario.controls.nomeCompleto.setValue('Outro Nome');
    expect(montado.componente.formulario.controls.login.value).toBe('jsilva');
  });

  it('a senha sugerida acompanha o nome até ser editada à mão, e não há como gerar outra', async () => {
    const { montado } = await montar(TipoUsuarioEnum.GESTOR);
    montado.componente.abrir();
    await montado.atualizar();
    montado.componente.formulario.controls.nomeCompleto.setValue('Matheus Caranguejo');
    expect(montado.componente.formulario.controls.senhaNaoEncriptada.value).toBe('Dev@MCaranguejo!');
    expect(document.body.querySelector('[aria-label="Gerar outra senha"]')).toBeNull();

    montado.componente.aoEditarSenha();
    montado.componente.formulario.controls.senhaNaoEncriptada.setValue('Minha#Senha1');
    montado.componente.formulario.controls.nomeCompleto.setValue('Outro Nome');
    expect(montado.componente.formulario.controls.senhaNaoEncriptada.value).toBe('Minha#Senha1');
  });

  it('gestor não vê "Administrador" nas opções de tipo', async () => {
    const { montado } = await montar(TipoUsuarioEnum.GESTOR);
    expect(rotulosDosTipos(montado.componente)).toEqual(['Desenvolvedor', 'Gestor']);
  });

  it('administrador vê "Administrador" nas opções de tipo', async () => {
    const { montado } = await montar(TipoUsuarioEnum.ADMINISTRADOR);
    expect(rotulosDosTipos(montado.componente)).toEqual(['Desenvolvedor', 'Gestor', 'Administrador']);
  });

  it('formulário inválido não chama a API e marca os campos', async () => {
    const { montado } = await montar(TipoUsuarioEnum.GESTOR);
    montado.componente.abrir();
    montado.componente.formulario.controls.senhaNaoEncriptada.setValue('curta');
    montado.componente.salvar();
    await montado.atualizar();
    montado.http.expectNone(() => true);
    expect(montado.componente.campoInvalido('nomeCompleto')).toBe(true);
    expect(montado.componente.campoInvalido('cargoTitulo')).toBe(true);
    expect(montado.componente.campoInvalido('senhaNaoEncriptada')).toBe(true);
    expect(document.body.textContent).toContain('Nome é obrigatório');
    expect(document.body.textContent).toContain('Mínimo de 8 caracteres');
  });

  it('nome com menos de 3 caracteres e login com menos de 4 são recusados', async () => {
    const { montado } = await montar(TipoUsuarioEnum.GESTOR);
    montado.componente.abrir();
    montado.componente.formulario.patchValue({ nomeCompleto: 'Al', cargoTitulo: 'Dev', login: 'abc' });
    montado.componente.salvar();
    montado.http.expectNone(() => true);
    expect(montado.componente.formulario.controls.nomeCompleto.hasError('minlength')).toBe(true);
    expect(montado.componente.formulario.controls.login.hasError('minlength')).toBe(true);
  });

  it('salvar envia o corpo certo (sem o campo "ativo"), fecha e avisa a listagem', async () => {
    const { montado, criados } = await montar(TipoUsuarioEnum.GESTOR);
    montado.componente.abrir();
    montado.componente.formulario.patchValue({ nomeCompleto: 'Ana Souza', cargoTitulo: 'Dev Pleno', horasDiariasNecessarias: 6 });
    montado.componente.salvar();
    await montado.atualizar();

    const requisicao = esperarRequisicao(montado.http, 'POST', '/usuario');
    expect(Object.keys(requisicao.request.body).sort()).toEqual(
      ['cargoTitulo', 'horasDiariasNecessarias', 'login', 'nomeCompleto', 'senhaNaoEncriptada', 'tipo']);
    expect(requisicao.request.body).toMatchObject({ nomeCompleto: 'Ana Souza', login: 'ana.souza', tipo: TipoUsuarioEnum.DESENVOLVEDOR, horasDiariasNecessarias: 6 });
    responderSucesso(requisicao, { id: 9, login: 'ana.souza', nomeCompleto: 'Ana Souza' }, 201);
    await montado.atualizar();

    expect(montado.componente.mostrarDialog()).toBe(false);
    expect(criados).toHaveLength(1);
  });

  it('erro do backend (login já em uso): o dialog continua aberto e nada é emitido', async () => {
    const { montado, criados } = await montar(TipoUsuarioEnum.GESTOR);
    montado.componente.abrir();
    montado.componente.formulario.patchValue({ nomeCompleto: 'Ana Souza', cargoTitulo: 'Dev' });
    montado.componente.salvar();
    responderErro(esperarRequisicao(montado.http, 'POST', '/usuario'), 400, 'Login já está em uso');
    await montado.atualizar();

    expect(montado.componente.mostrarDialog()).toBe(true);
    expect(montado.componente.carregando()).toBe(false);
    expect(criados).toHaveLength(0);
  });
});

describe('UsuarioFormularioDialogComponent — editar', () => {
  async function abrirEdicao(tipoLogado: TipoUsuarioEnum, usuario = USUARIO_EDITADO) {
    const contexto = await montar(tipoLogado);
    contexto.montado.componente.abrirEdicao(usuario.id);
    responderSucesso(esperarRequisicao(contexto.montado.http, 'GET', `/usuario/${usuario.id}`), usuario);
    await contexto.montado.atualizar();
    return contexto;
  }

  it('carrega o usuário no formulário com o login, sem senha e sem status', async () => {
    const { montado } = await abrirEdicao(TipoUsuarioEnum.GESTOR);
    expect(montado.componente.editando()).toBe(true);
    expect(montado.componente.formulario.getRawValue()).toMatchObject({ nomeCompleto: 'Beto Lima', cargoTitulo: 'Dev', horasDiariasNecessarias: 6, login: 'beto' });
    expect(document.body.textContent).toContain('Editar Usuário');
    expect((document.body.querySelector('#login') as HTMLInputElement).value).toBe('beto');
    expect(document.body.querySelector('#senhaNaoEncriptada')).toBeNull();
    expect(document.body.querySelector('p-toggleswitch')).toBeNull();
  });

  it('gestor editando outra pessoa envia o login e o tipo, nunca o status', async () => {
    const { montado, alterados } = await abrirEdicao(TipoUsuarioEnum.GESTOR);
    montado.componente.formulario.patchValue({ tipo: TipoUsuarioEnum.GESTOR, login: 'beto.lima' });
    montado.componente.salvar();
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/usuario/50');
    expect(requisicao.request.body).toEqual({
      login: 'beto.lima', nomeCompleto: 'Beto Lima', cargoTitulo: 'Dev', horasDiariasNecessarias: 6, tipo: TipoUsuarioEnum.GESTOR,
    });
    responderSucesso(requisicao, USUARIO_EDITADO);
    await montado.atualizar();
    expect(alterados).toHaveLength(1);
    expect(montado.componente.mostrarDialog()).toBe(false);
  });

  it('ninguém muda o próprio tipo: o corpo vai sem ele (e o login segue editável)', async () => {
    const proprio = { ...USUARIO_EDITADO, id: criarUsuarioTeste().id, tipo: TipoUsuarioEnum.GESTOR };
    const { montado } = await abrirEdicao(TipoUsuarioEnum.GESTOR, proprio);
    expect(montado.componente.podeEditarTipo()).toBe(false);
    montado.componente.salvar();
    const corpo = esperarRequisicao(montado.http, 'PUT', `/usuario/${proprio.id}`).request.body;
    expect('tipo' in corpo).toBe(false);
    expect(corpo.login).toBe('beto');
  });

  it('editar não gera sugestão de login nem de senha ao mudar o nome', async () => {
    const { montado } = await abrirEdicao(TipoUsuarioEnum.GESTOR);
    montado.componente.formulario.controls.nomeCompleto.setValue('Outro Nome');
    expect(montado.componente.formulario.controls.login.value).toBe('beto');
  });

  it('ao editar um administrador a opção "Administrador" aparece para mostrar o valor atual, mesmo para o gestor', async () => {
    const administrador = { ...USUARIO_EDITADO, tipo: TipoUsuarioEnum.ADMINISTRADOR };
    const { montado } = await abrirEdicao(TipoUsuarioEnum.GESTOR, administrador);
    expect(rotulosDosTipos(montado.componente)).toContain('Administrador');
  });

  it('falha ao carregar o usuário fecha o dialog', async () => {
    const { montado } = await montar(TipoUsuarioEnum.GESTOR);
    montado.componente.abrirEdicao(50);
    responderErro(esperarRequisicao(montado.http, 'GET', '/usuario/50'), 404, 'Usuário não encontrado');
    await montado.atualizar();
    expect(montado.componente.mostrarDialog()).toBe(false);
  });
});
