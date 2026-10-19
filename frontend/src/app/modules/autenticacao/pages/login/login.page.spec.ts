import { describe, it, expect, vi } from 'vitest';
import { Router } from '@angular/router';
import { EstadoIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { LoginPage } from './login.page';

// Login (SYSTEM.SPEC.md §11): validação, erro de credencial e destino pós-login (chat com a IA no ar, Atividades sem ela).

type Montado = ComponenteMontado<LoginPage>;

const RESPOSTA_LOGIN = {
  accessToken: 'token', tipo: 'Bearer',
  usuario: { id: 1, login: 'maria', nomeCompleto: 'Maria Souza', tipo: TipoUsuarioEnum.GESTOR },
};

async function montarLogin(): Promise<{ montado: Montado; irPara: ReturnType<typeof vi.fn> }> {
  const montado = await montarComponente(LoginPage);
  const irPara = vi.fn().mockResolvedValue(true);
  (montado.fixture.debugElement.injector.get(Router) as unknown as { navigateByUrl: unknown }).navigateByUrl = irPara;
  return { montado, irPara };
}

async function preencher(montado: Montado, login: string, senha: string): Promise<void> {
  montado.componente.formulario.patchValue({ login, senha });
  await montado.atualizar();
}

async function enviar(montado: Montado): Promise<void> {
  montado.elemento.querySelector('form')!.dispatchEvent(new Event('submit'));
  await montado.atualizar();
}

const texto = (montado: Montado) => montado.elemento.textContent ?? '';

describe('LoginPage', () => {
  it('abre com o formulário completo e o botão Entrar', async () => {
    const { montado } = await montarLogin();
    expect(montado.elemento.querySelector('#login-input')).not.toBeNull();
    expect(texto(montado)).toContain('Faça login para continuar');
    expect(texto(montado)).toContain('Entrar');
  });

  it('formulário vazio não chama a API e mostra os avisos de campo obrigatório', async () => {
    const { montado } = await montarLogin();
    await enviar(montado);
    montado.http.expectNone(() => true);
    expect(texto(montado)).toContain('Login é obrigatório');
    expect(texto(montado)).toContain('Senha é obrigatória');
  });

  it('login com menos de 4 caracteres é recusado antes de chamar a API', async () => {
    const { montado } = await montarLogin();
    await preencher(montado, 'abc', 'segredo');
    await enviar(montado);
    montado.http.expectNone(() => true);
    expect(texto(montado)).toContain('Mínimo de 4 caracteres');
  });

  it('normaliza o login (espaços e maiúsculas) como o backend antes de enviar', async () => {
    const { montado } = await montarLogin();
    await preencher(montado, '  MARIA  ', 'segredo');
    await enviar(montado);
    expect(esperarRequisicao(montado.http, 'POST', '/autenticacao/login').request.body).toEqual({ login: 'maria', senha: 'segredo' });
  });

  it('credencial inválida mostra a mensagem do servidor, reabilita o formulário e não navega', async () => {
    const { montado, irPara } = await montarLogin();
    await preencher(montado, 'maria', 'errada');
    await enviar(montado);
    expect(montado.componente.carregando()).toBe(true);

    responderErro(esperarRequisicao(montado.http, 'POST', '/autenticacao/login'), 400, 'Credenciais inválidas');
    await montado.atualizar();

    expect(texto(montado)).toContain('Credenciais inválidas');
    expect(montado.componente.carregando()).toBe(false);
    expect(montado.componente.formulario.enabled).toBe(true);
    expect(irPara).not.toHaveBeenCalled();
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('servidor fora do ar (status 0 ou 500) avisa que está indisponível', async () => {
    const { montado } = await montarLogin();
    await preencher(montado, 'maria', 'segredo');
    await enviar(montado);
    esperarRequisicao(montado.http, 'POST', '/autenticacao/login').error(new ProgressEvent('error'), { status: 0 });
    await montado.atualizar();
    expect(texto(montado)).toContain('Servidor indisponível');
  });

  it('digitar de novo apaga o erro da tentativa anterior', async () => {
    const { montado } = await montarLogin();
    await preencher(montado, 'maria', 'errada');
    await enviar(montado);
    responderErro(esperarRequisicao(montado.http, 'POST', '/autenticacao/login'), 400, 'Credenciais inválidas');
    await montado.atualizar();
    montado.componente.formulario.patchValue({ senha: 'outra' });
    await montado.atualizar();
    expect(montado.componente.erroLogin()).toBe('');
  });

  async function entrarComSucesso(montado: Montado, estadoDaIa: EstadoIaEnum): Promise<void> {
    await preencher(montado, 'maria', 'segredo');
    await enviar(montado);
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/autenticacao/login'), RESPOSTA_LOGIN);
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/ia/disponibilidade'), { estado: estadoDaIa });
    await montado.atualizar();
  }

  it('com a IA no ar o login cai no chat', async () => {
    const { montado, irPara } = await montarLogin();
    await entrarComSucesso(montado, EstadoIaEnum.NO_AR);
    expect(irPara).toHaveBeenCalledWith('/chat');
    expect(localStorage.getItem('access_token')).toBe('token');
  });

  it('com a IA desligada o login cai em Atividades', async () => {
    const { montado, irPara } = await montarLogin();
    await entrarComSucesso(montado, EstadoIaEnum.DESLIGADA);
    expect(irPara).toHaveBeenCalledWith('/atividade');
  });

  it('se a consulta do estado da IA falha, o login cai em Atividades', async () => {
    const { montado, irPara } = await montarLogin();
    await preencher(montado, 'maria', 'segredo');
    await enviar(montado);
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/autenticacao/login'), RESPOSTA_LOGIN);
    await montado.atualizar();
    responderErro(esperarRequisicao(montado.http, 'GET', '/ia/disponibilidade'), 500, 'x');
    await montado.atualizar();
    expect(irPara).toHaveBeenCalledWith('/atividade');
  });

  it('"lembrar" guarda só login e nome, nunca a senha; desmarcado apaga o que havia', async () => {
    const { montado } = await montarLogin();
    await entrarComSucesso(montado, EstadoIaEnum.DESLIGADA);
    const guardado = JSON.parse(localStorage.getItem('ultimo_login')!);
    expect(guardado).toEqual({ login: 'maria', nomeCompleto: 'Maria Souza' });
    expect(JSON.stringify(guardado)).not.toContain('segredo');
  });

  it('usuário lembrado abre só com a senha e dá para trocar de usuário', async () => {
    const montado = await montarComponente(LoginPage, { armazenamento: { ultimo_login: JSON.stringify({ login: 'maria', nomeCompleto: 'Maria Souza' }) } });
    expect(texto(montado)).toContain('Bem-vindo de volta');
    expect(texto(montado)).toContain('Maria Souza');
    expect(montado.elemento.querySelector('#login-input')).toBeNull();

    montado.componente.entrarComOutroUsuario();
    await montado.atualizar();
    expect(texto(montado)).toContain('Faça login para continuar');
    expect(montado.elemento.querySelector('#login-input')).not.toBeNull();
  });

  it('formato antigo do usuário lembrado (com senha) é descartado na hora, sem reaproveitar nada', async () => {
    const montado = await montarComponente(LoginPage, { armazenamento: { ultimo_login: JSON.stringify({ login: 'maria', nomeCompleto: 'Maria', senha: 'antiga' }) } });
    expect(localStorage.getItem('ultimo_login')).toBeNull();
    expect(montado.elemento.querySelector('#login-input')).not.toBeNull();
  });

  it('com o lembrete desmarcado o login seguinte apaga o usuário guardado', async () => {
    const { montado } = await montarLogin();
    localStorage.setItem('ultimo_login', JSON.stringify({ login: 'antigo', nomeCompleto: 'Antigo' }));
    montado.componente.formulario.patchValue({ lembrar: false });
    await entrarComSucesso(montado, EstadoIaEnum.DESLIGADA);
    expect(localStorage.getItem('ultimo_login')).toBeNull();
  });
});
