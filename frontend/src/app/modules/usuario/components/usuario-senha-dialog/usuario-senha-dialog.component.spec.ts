import { describe, it, expect } from 'vitest';
import { TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { UsuarioSenhaDialogComponent } from './usuario-senha-dialog.component';

async function abrir() {
  const montado = await montarComponente(UsuarioSenhaDialogComponent, { usuario: TipoUsuarioEnum.GESTOR });
  montado.componente.abrir(7, 'Carla Dias');
  await montado.atualizar();
  return montado;
}

describe('UsuarioSenhaDialogComponent', () => {
  it('abre com o nome da pessoa e uma senha nova já gerada', async () => {
    const montado = await abrir();
    expect(montado.componente.usuarioNome()).toBe('Carla Dias');
    expect(montado.componente.formulario.controls.senhaNova.value).toHaveLength(12);
    expect(montado.componente.mostrarDialog()).toBe(true);
  });

  it('gerar outra senha troca o valor e zera o aviso de copiada', async () => {
    const montado = await abrir();
    const antes = montado.componente.formulario.controls.senhaNova.value;
    montado.componente.senhaCopiada.set(true);
    montado.componente.gerarNovaSenha();
    expect(montado.componente.formulario.controls.senhaNova.value).not.toBe(antes);
    expect(montado.componente.senhaCopiada()).toBe(false);
  });

  it('senha com menos de 8 caracteres é recusada e não chama a API', async () => {
    const montado = await abrir();
    montado.componente.formulario.controls.senhaNova.setValue('curta');
    montado.componente.salvar();
    montado.http.expectNone(() => true);
    expect(montado.componente.campoInvalido()).toBe(true);
  });

  it('salvar envia PATCH com a senha nova para a pessoa certa e fecha', async () => {
    const montado = await abrir();
    montado.componente.formulario.controls.senhaNova.setValue('Nova#Senha123');
    montado.componente.salvar();
    const requisicao = esperarRequisicao(montado.http, 'PATCH', '/usuario/7/senha');
    expect(requisicao.request.body).toEqual({ senhaNova: 'Nova#Senha123' });
    responderSucesso(requisicao, { mensagem: 'Senha alterada com sucesso' });
    await montado.atualizar();
    expect(montado.componente.mostrarDialog()).toBe(false);
    expect(montado.componente.carregando()).toBe(false);
  });

  it('erro do backend (por exemplo, gestor sobre administrador) mantém o dialog aberto', async () => {
    const montado = await abrir();
    montado.componente.salvar();
    responderErro(esperarRequisicao(montado.http, 'PATCH', '/usuario/7/senha'), 403, 'Apenas administradores podem gerenciar administradores');
    await montado.atualizar();
    expect(montado.componente.mostrarDialog()).toBe(true);
    expect(montado.componente.carregando()).toBe(false);
  });
});
