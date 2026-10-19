import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { EstadoIaEnum, ExecucaoAtivaDto, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../testes/montar-componente';
import { esperarRequisicao, responderSucesso } from '../../../../testes/http-teste';
import { AutenticacaoService } from '../../../core/services/autenticacao.service';
import { IaDisponibilidadeService } from '../../../core/services/ia-disponibilidade.service';
import { TemaService } from '../../../core/services/tema.service';
import { TopbarComponent } from './topbar.component';

// Topbar: chip da execução ativa, hora, tema, anotações e menu do perfil (nome, login, tipo, tempos em dias, sair). Ao nascer confere a
// execução ativa; voltar para a aba a confere de novo (o backend encerra execuções às 23:59:59). "Voltar para a IA" aparece depois do
// "Agora não" com a IA no ar.

type Montado = ComponenteMontado<TopbarComponent>;

const ATIVA: ExecucaoAtivaDto = { id: 4, atividadeId: 2, descricao: 'Revisando o PR', inicioData: new Date() };

/** A hora do minuto seguinte é um `timer` do rxjs: temporizadores simulados desde o início (e `whenStable` não espera por eles). */
const SEM_DESKTOP = { disponivel: false, versao: null, nomeArquivo: null, tamanhoBytes: null };
const COM_DESKTOP = { disponivel: true, versao: '1.2.0', nomeArquivo: 'Project-Desktop-1.2.0.exe', tamanhoBytes: 87_654_321 };

async function montarBarra(usuario = TipoUsuarioEnum.DESENVOLVEDOR, ativa: ExecucaoAtivaDto | null = null, provedores: unknown[] = [], desktop: typeof SEM_DESKTOP | typeof COM_DESKTOP = SEM_DESKTOP): Promise<Montado> {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  const montado = await montarComponente(TopbarComponent, {
    usuario,
    rotas: [{ path: 'chat', children: [] }],
    provedores: provedores as never[],
  });
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/execucao/ativa'), ativa);
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/desktop/versao'), desktop);
  await montado.atualizar();
  return montado;
}

const texto = (montado: Montado) => (montado.elemento.textContent ?? '').replace(/\s+/g, ' ');
const porRotulo = (montado: Montado, rotulo: string) => montado.elemento.querySelector<HTMLElement>(`[aria-label="${rotulo}"]`);
const botaoPorTexto = (rotulo: string) =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((candidato) => candidato.textContent?.trim() === rotulo);

afterEach(() => {
  vi.useRealTimers();
  document.querySelectorAll('.p-popover').forEach((popover) => popover.remove());
  localStorage.removeItem('tema');
});

describe('TopbarComponent — conteúdo', () => {
  it('mostra as iniciais (duas primeiras palavras) e o primeiro nome do usuário', async () => {
    const montado = await montarBarra(TipoUsuarioEnum.GESTOR);
    expect(montado.componente.iniciais()).toBe('UG');
    expect(montado.elemento.querySelector('.topbar__avatar')?.textContent?.trim()).toBe('UG');
    expect(montado.elemento.querySelector('.topbar__perfil-nome')?.textContent?.trim()).toBe('Usuário');
    expect(porRotulo(montado, 'Menu de Usuário GESTOR')).not.toBeNull();
  });

  it('mostra a hora atual no formato "hh:mm dd/mm/aaaa"', async () => {
    const montado = await montarBarra();
    expect(montado.elemento.querySelector('.topbar__hora')?.textContent?.trim()).toMatch(/^\d{2}:\d{2} \d{2}\/\d{2}\/\d{4}$/);
  });

  it('sem execução ativa o chip diz "Sem execução ativa"', async () => {
    const montado = await montarBarra();
    expect(texto(montado)).toContain('Sem execução ativa');
  });

  it('com execução ativa o chip mostra a descrição em todas as telas', async () => {
    const montado = await montarBarra(TipoUsuarioEnum.DESENVOLVEDOR, ATIVA);
    expect(texto(montado)).toContain('Revisando o PR');
    expect(porRotulo(montado, 'Pausar execução')).not.toBeNull();
  });

  it('o botão de anotações abre o drawer do pad do próprio usuário', async () => {
    const montado = await montarBarra();
    const botao = porRotulo(montado, 'Minhas anotações')!;
    (botao.tagName === 'BUTTON' ? botao : botao.querySelector('button')!).click();
    await montado.atualizar();
    const requisicoes = montado.http.match((requisicao) => requisicao.url.includes('/anotacao'));
    expect(requisicoes.length).toBeGreaterThan(0);
  });
});

describe('TopbarComponent — execução ativa e retorno à aba', () => {
  it('voltar a ver a aba (visibilitychange) confere a execução ativa de novo', async () => {
    const montado = await montarBarra();
    document.dispatchEvent(new Event('visibilitychange'));
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/execucao/ativa'), ATIVA);
    await montado.atualizar();
    expect(texto(montado)).toContain('Revisando o PR');
  });

  it('o foco da janela também confere a execução ativa de novo', async () => {
    const montado = await montarBarra();
    window.dispatchEvent(new Event('focus'));
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/execucao/ativa'), null);
  });

  it('aba oculta não gasta requisição', async () => {
    const montado = await montarBarra();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    window.dispatchEvent(new Event('focus'));
    montado.http.expectNone((requisicao) => requisicao.url.endsWith('/execucao/ativa'));
  });
});

describe('TopbarComponent — tema', () => {
  it('o botão alterna entre tema escuro e claro e troca o rótulo', async () => {
    const montado = await montarBarra();
    const tema = TestBed.inject(TemaService);
    const antes = tema.eEscuro();
    const rotuloAntes = antes ? 'Usar tema claro' : 'Usar tema escuro';
    const botao = porRotulo(montado, rotuloAntes)!;
    (botao.tagName === 'BUTTON' ? botao : botao.querySelector('button')!).click();
    await montado.atualizar();

    expect(tema.eEscuro()).toBe(!antes);
    expect(porRotulo(montado, antes ? 'Usar tema escuro' : 'Usar tema claro')).not.toBeNull();
  });

  it('o "???" do tema personalizado só aparece depois do botão direito no botão de tema', async () => {
    const montado = await montarBarra();
    expect(texto(montado)).not.toContain('???');
    const botao = porRotulo(montado, TestBed.inject(TemaService).eEscuro() ? 'Usar tema claro' : 'Usar tema escuro')!;
    const evento = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    (botao.tagName === 'BUTTON' ? botao : botao.querySelector('button')!).dispatchEvent(evento);
    await montado.atualizar();

    expect(evento.defaultPrevented).toBe(true);
    expect(texto(montado)).toContain('???');
  });
});

describe('TopbarComponent — menu do perfil', () => {
  async function abrirPerfil(montado: Montado): Promise<void> {
    porRotulo(montado, `Menu de ${montado.componente.sessao.nomeCompleto()}`)!.click();
    await montado.atualizar();
    vi.advanceTimersByTime(100);
    await montado.atualizar();
  }

  it('mostra nome, login e tipo do usuário', async () => {
    const montado = await montarBarra(TipoUsuarioEnum.ADMINISTRADOR);
    await abrirPerfil(montado);
    const corpo = document.body.textContent ?? '';
    expect(corpo).toContain('Usuário ADMINISTRADOR');
    expect(corpo).toContain('@administrador.teste');
    expect(corpo).toContain('Administrador');
  });

  it('"Baixar Project Desktop" aparece com a versão e o tamanho quando há executável publicado, e o clique baixa o arquivo (task 198)', async () => {
    const montado = await montarBarra(TipoUsuarioEnum.DESENVOLVEDOR, null, [], COM_DESKTOP);
    await abrirPerfil(montado);
    const botao = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((candidato) => candidato.textContent?.includes('Baixar Project Desktop'))!;
    expect(botao.textContent).toContain('v1.2.0');
    expect(botao.textContent).toContain('83,6 MB');
    botao.click();
    esperarRequisicao(montado.http, 'GET', '/desktop/download');
  });

  it('sem executável publicado o menu não tem o botão de baixar o desktop', async () => {
    const montado = await montarBarra();
    await abrirPerfil(montado);
    expect(document.body.textContent).not.toContain('Baixar Project Desktop');
  });

  it('"Sair" encerra a sessão pelo serviço de autenticação', async () => {
    const sair = vi.fn();
    const montado = await montarBarra(TipoUsuarioEnum.DESENVOLVEDOR, null, [{ provide: AutenticacaoService, useValue: { logout: sair } }]);
    await abrirPerfil(montado);
    botaoPorTexto('Sair')!.click();
    expect(sair).toHaveBeenCalledTimes(1);
  });

  it('o seletor "Tempos em dias" alterna a unidade de tempo', async () => {
    const montado = await montarBarra();
    await abrirPerfil(montado);
    const antes = montado.componente.unidadeTempo.emDias();
    document.querySelector<HTMLInputElement>('#switch-tempo-dias')!.click();
    await montado.atualizar();
    expect(montado.componente.unidadeTempo.emDias()).toBe(!antes);
  });
});

describe('TopbarComponent — "Voltar para a IA"', () => {
  it('não aparece sem o "Agora não"', async () => {
    const montado = await montarBarra();
    TestBed.inject(IaDisponibilidadeService).estadoReal.set(EstadoIaEnum.NO_AR);
    await montado.atualizar();
    expect(texto(montado)).not.toContain('Voltar para a IA');
  });

  it('aparece com a IA no ar em modo convencional e leva ao chat pedindo a retomada', async () => {
    const montado = await montarBarra();
    const ia = TestBed.inject(IaDisponibilidadeService);
    ia.estadoReal.set(EstadoIaEnum.NO_AR);
    ia.agoraNao();
    await montado.atualizar();
    expect(texto(montado)).toContain('Voltar para a IA');

    Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('button')).find((botao) => botao.textContent?.includes('Voltar para a IA'))!.click();
    await montado.fixture.whenStable();
    await montado.atualizar();

    expect(TestBed.inject(Router).url).toBe('/chat');
    expect(ia.retomadaPendente()).toBe(true);
    expect(texto(montado)).not.toContain('Voltar para a IA');
  });
});
