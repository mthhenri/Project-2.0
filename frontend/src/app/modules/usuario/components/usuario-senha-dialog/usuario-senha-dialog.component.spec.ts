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
  it('abre com o nome da pessoa e a senha sugerida (Dev@ + inicial + sobrenome + !)', async () => {
    const montado = await abrir();
    expect(montado.componente.usuarioNome()).toBe('Carla Dias');
    expect(montado.componente.formulario.controls.senhaNova.value).toBe('Dev@CDias!');
    expect(montado.componente.mostrarDialog()).toBe(true);
  });

  it('não oferece gerar outra senha', async () => {
    await abrir();
    expect(document.body.querySelector('[aria-label="Gerar outra senha"]')).toBeNull();
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
