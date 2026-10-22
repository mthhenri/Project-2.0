import { describe, it, expect, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { ProjectDesktopService } from '../../../../core/services/project-desktop.service';
import { MensagemDiretaAvisosService } from '../../services/mensagem-direta-avisos.service';
import { MensagemDiretaNotificacoesComponent } from './mensagem-direta-notificacoes.component';

// O menu "Notificações" (task 212): interruptores gravados na hora (o conjunto inteiro), silêncio geral e volta ao valor anterior quando a gravação falha.

const PREFERENCIA = { avisosAtivos: true, avisoDesktopAtivo: true, somAtivo: false, silenciadoAteDate: null, atalhoGlobal: 'Ctrl+Shift+Space' };

describe('MensagemDiretaNotificacoesComponent', () => {
  let tela: ComponenteMontado<MensagemDiretaNotificacoesComponent>;
  let avisos: MensagemDiretaAvisosService;

  async function montar() {
    tela = await montarComponente(MensagemDiretaNotificacoesComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    avisos = TestBed.inject(MensagemDiretaAvisosService);
    // Só se grava depois de ler o que está gravado (senão o padrão apagaria a escolha do usuário).
    const leitura = avisos.carregarPreferencia();
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/preferencia'), PREFERENCIA);
    await leitura;
    await tela.atualizar();
  }

  async function abrirMenu() {
    tela.elemento.querySelector<HTMLButtonElement>('button[aria-label="Configurar notificações"]')!.click();
    await tela.atualizar();
  }

  const menu = () => document.body.querySelector('.menu-notificacoes') as HTMLElement | null;
  const botao = (texto: string) => Array.from(menu()!.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes(texto))!;
  const interruptor = (rotulo: string) => menu()!.querySelector<HTMLInputElement>(`input[aria-label="${rotulo}"]`)!;

  afterEach(() => {
    document.body.querySelectorAll('.p-popover').forEach((elemento) => elemento.remove());
  });

  it('abre com os três interruptores e as três opções de silêncio', async () => {
    await montar();
    await abrirMenu();
    expect(menu()).not.toBeNull();
    expect(menu()!.textContent).toContain('Avisos de mensagem');
    expect(menu()!.textContent).toContain('Aviso no Project Desktop');
    expect(menu()!.textContent).toContain('Som');
    for (const opcao of ['Por 1 hora (reunião)', 'Até amanhã às 8h', 'Até eu reativar']) expect(menu()!.textContent).toContain(opcao);
    expect(interruptor('Avisos de mensagem').checked).toBe(true);
    expect(interruptor('Som').checked).toBe(false);
  });

  it('ligar o som grava o CONJUNTO inteiro (a rota troca tudo) e mantém a tela', async () => {
    await montar();
    await abrirMenu();
    interruptor('Som').click();
    await tela.atualizar();

    const requisicao = esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/preferencia');
    expect(requisicao.request.body).toEqual({ avisosAtivos: true, avisoDesktopAtivo: true, somAtivo: true, silenciadoAteDate: null, atalhoGlobal: 'Ctrl+Shift+Space' });
    responderSucesso(requisicao, { ...PREFERENCIA, somAtivo: true });
    await tela.atualizar();
    expect(avisos.preferencia().somAtivo).toBe(true);
    expect(interruptor('Som').checked).toBe(true);
  });

  it('desligar os avisos e o aviso do Desktop grava cada um', async () => {
    await montar();
    await abrirMenu();
    interruptor('Avisos de mensagem').click();
    await tela.atualizar();
    responderSucesso(esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/preferencia'), { ...PREFERENCIA, avisosAtivos: false });
    await tela.atualizar();
    expect(avisos.preferencia().avisosAtivos).toBe(false);

    interruptor('Aviso no Project Desktop').click();
    await tela.atualizar();
    const requisicao = esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/preferencia');
    expect(requisicao.request.body).toMatchObject({ avisosAtivos: false, avisoDesktopAtivo: false });
    responderSucesso(requisicao, { ...PREFERENCIA, avisosAtivos: false, avisoDesktopAtivo: false });
  });

  it('se o servidor recusar, a tela VOLTA ao valor anterior e o menu avisa', async () => {
    await montar();
    await abrirMenu();
    interruptor('Som').click();
    await tela.atualizar();
    responderErro(esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/preferencia'), 500, 'falhou');
    await tela.atualizar();

    expect(avisos.preferencia().somAtivo).toBe(false);
    expect(interruptor('Som').checked).toBe(false);
    expect(menu()!.textContent).toContain('Não foi possível salvar.');
  });

  it('silenciar por 1 hora grava a data, mostra "Silenciado até" e "Reativar" limpa', async () => {
    await montar();
    await abrirMenu();
    botao('Por 1 hora').click();
    await tela.atualizar();
    const requisicao = esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/preferencia');
    const ate = new Date(requisicao.request.body.silenciadoAteDate).getTime();
    expect(ate - Date.now()).toBeGreaterThan(3_500_000);
    expect(ate - Date.now()).toBeLessThanOrEqual(3_600_000);
    responderSucesso(requisicao, { ...PREFERENCIA, silenciadoAteDate: requisicao.request.body.silenciadoAteDate });
    await tela.atualizar();
    expect(menu()!.textContent).toContain('Silenciado até');

    botao('Reativar').click();
    await tela.atualizar();
    const reativar = esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/preferencia');
    expect(reativar.request.body.silenciadoAteDate).toBeNull();
    responderSucesso(reativar, PREFERENCIA);
    await tela.atualizar();
    expect(menu()!.textContent).not.toContain('Silenciado até');
  });

  it('se a leitura da preferência falhou, o interruptor tenta ler de novo antes de gravar e não grava o padrão por cima', async () => {
    tela = await montarComponente(MensagemDiretaNotificacoesComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    avisos = TestBed.inject(MensagemDiretaAvisosService);
    const leitura = avisos.carregarPreferencia();
    responderErro(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/preferencia'), 500, 'falhou');
    await leitura;

    await abrirMenu();
    interruptor('Som').click();
    await tela.atualizar();
    // Nova leitura, e ela vem com avisos desligados: é isso que vai por baixo da mudança.
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/preferencia'), { ...PREFERENCIA, avisosAtivos: false });
    await tela.atualizar();
    const requisicao = esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/preferencia');
    expect(requisicao.request.body).toMatchObject({ avisosAtivos: false, somAtivo: true });
    responderSucesso(requisicao, { ...PREFERENCIA, avisosAtivos: false, somAtivo: true });
  });

  it('com duas gravações em voo que falham, a tela volta ao último valor que o servidor confirmou', async () => {
    await montar();
    await abrirMenu();
    interruptor('Som').click();
    await tela.atualizar();
    const primeira = esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/preferencia');
    interruptor('Avisos de mensagem').click();
    await tela.atualizar();
    const segunda = esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/preferencia');
    responderErro(primeira, 500, 'falhou');
    responderErro(segunda, 500, 'falhou');
    await tela.atualizar();
    expect(avisos.preferencia().somAtivo).toBe(false);
    expect(avisos.preferencia().avisosAtivos).toBe(true);
  });

  it('"Até eu reativar" mostra o texto próprio, e o sino fica em alerta com o silêncio ou os avisos desligados', async () => {
    await montar();
    const sino = () => tela.elemento.querySelector('p-button')!;
    expect(sino().innerHTML).not.toContain('p-button-warn');

    await abrirMenu();
    botao('Até eu reativar').click();
    await tela.atualizar();
    const requisicao = esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/preferencia');
    responderSucesso(requisicao, { ...PREFERENCIA, silenciadoAteDate: requisicao.request.body.silenciadoAteDate });
    await tela.atualizar();
    expect(menu()!.textContent).toContain('Silenciado até você reativar');
    expect(sino().innerHTML).toContain('p-button-warn');
  });
});

describe('MensagemDiretaNotificacoesComponent: atalho do chat no Project Desktop (task 213)', () => {
  let tela: ComponenteMontado<MensagemDiretaNotificacoesComponent>;
  let situacao: { atalho: string | null; registrado: boolean };

  async function montarNoDesktop(disponivel: boolean) {
    situacao = { atalho: 'Ctrl+Shift+Space', registrado: true };
    tela = await montarComponente(MensagemDiretaNotificacoesComponent, {
      usuario: TipoUsuarioEnum.DESENVOLVEDOR,
      provedores: [{ provide: ProjectDesktopService, useValue: { disponivel, situacaoDoAtalho: () => Promise.resolve(situacao) } }],
    });
    const leitura = TestBed.inject(MensagemDiretaAvisosService).carregarPreferencia();
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/preferencia'), PREFERENCIA);
    await leitura;
    await tela.atualizar();
  }

  const abrir = async () => {
    tela.elemento.querySelector<HTMLButtonElement>('button[aria-label="Configurar notificações"]')!.click();
    await tela.atualizar();
    await new Promise((resolver) => setTimeout(resolver, 0));
    await tela.atualizar();
  };
  const menu = () => document.body.querySelector('.menu-notificacoes') as HTMLElement;
  const botaoAlterar = () => Array.from(menu().querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes('Alterar'));
  const campo = () => menu().querySelector<HTMLInputElement>('input[aria-label^="Gravar o novo atalho"]')!;
  /**
   * Clica em "Alterar" e espera o campo de gravação existir **e continuar existindo**: o campo fecha no `blur`, e o popover do PrimeNG pode mexer no foco
   * logo depois de abrir. Se ele sumir nesse intervalo, o botão volta e o clique é repetido.
   */
  const iniciarGravacao = async () => {
    const campoPresente = () => menu().querySelector('input[aria-label^="Gravar o novo atalho"]') !== null;
    for (let tentativa = 0; tentativa < 10; tentativa++) {
      if (!campoPresente()) botaoAlterar()?.click();
      await tela.atualizar();
      await new Promise((resolver) => setTimeout(resolver, 30));
      await tela.atualizar();
      if (campoPresente()) return;
    }
    throw new Error('O campo de gravação do atalho não abriu.');
  };
  const teclar = (parcial: KeyboardEventInit) => campo().dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...parcial }));

  afterEach(() => document.body.querySelectorAll('.p-popover').forEach((elemento) => elemento.remove()));

  it('no navegador o menu não mostra o atalho', async () => {
    await montarNoDesktop(false);
    await abrir();
    expect(menu().textContent).not.toContain('Atalho global');
    expect(botaoAlterar()).toBeUndefined();
  });

  it('no Desktop mostra o atalho atual e grava o novo tecla a tecla (a combinação inteira, com a preferência completa)', async () => {
    await montarNoDesktop(true);
    await abrir();
    expect(menu().textContent).toContain('Atalho global');
    expect(menu().querySelector('kbd')?.textContent).toContain('Ctrl+Shift+Space');

    await iniciarGravacao();
    teclar({ key: 'Control', code: 'ControlLeft', ctrlKey: true });
    teclar({ key: 'k', code: 'KeyK', ctrlKey: true, altKey: true });
    await tela.atualizar();

    const requisicao = esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/preferencia');
    expect(requisicao.request.body).toMatchObject({ atalhoGlobal: 'Ctrl+Alt+K', avisosAtivos: true });
    responderSucesso(requisicao, { ...PREFERENCIA, atalhoGlobal: 'Ctrl+Alt+K' });
    await tela.atualizar();
    expect(menu().querySelector('kbd')?.textContent).toContain('Ctrl+Alt+K');
    expect(menu().textContent).toContain('O novo atalho vale em até 1 minuto.');
  });

  it('Esc desiste da gravação, e tecla sem modificador não é atalho', async () => {
    await montarNoDesktop(true);
    await abrir();
    await iniciarGravacao();
    teclar({ key: 'k', code: 'KeyK' });
    await tela.atualizar();
    expect(campo()).not.toBeNull();
    teclar({ key: 'Escape', code: 'Escape' });
    await tela.atualizar();
    expect(menu().querySelector('kbd')?.textContent).toContain('Ctrl+Shift+Space');
    tela.http.expectNone((requisicao) => requisicao.method === 'PUT');
  });

  it('avisa quando o sistema recusou o atalho (outro programa já o usa)', async () => {
    await montarNoDesktop(true);
    situacao = { atalho: 'Ctrl+Shift+Space', registrado: false };
    await abrir();
    expect(menu().textContent).toContain('Outro programa já usa este atalho.');
  });
});
