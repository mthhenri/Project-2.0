import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, it, expect } from 'vitest';
import { ConfiguracaoIaResumoDto, EsforcoIaEnum, EstadoIaEnum, ModoContextoChatEnum, TipoProvedorIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { PromptsAbaComponent } from '../../components/prompts-aba/prompts-aba.component';
import { configuracaoIaRotas } from '../../configuracao-ia.routes';
import { ConfiguracaoIaPage } from './configuracao-ia.page';

// Task 132: tela exclusiva de administrador. Cada gravação cria uma versão nova (a antiga nunca muda); o histórico mostra as
// versões e "Usar como base" só preenche o formulário. O acesso é da rota (administradorGuard).

type Montado = ComponenteMontado<ConfiguracaoIaPage>;

const ANTHROPIC = { modeloRapido: 'claude-haiku-5-5', modeloPadrao: 'claude-sonnet-5-5', modeloAnalitico: 'claude-opus-5-5' };
const GEMINI = { modeloRapido: 'gemini-2.5-flash', modeloPadrao: 'gemini-2.5-pro', modeloAnalitico: 'gemini-2.5-pro' };

function versao(numero: number, sobrescrita: Partial<ConfiguracaoIaResumoDto> = {}): ConfiguracaoIaResumoDto {
  return {
    id: numero, versao: numero, provedor: TipoProvedorIaEnum.ANTHROPIC,
    fallbacks: [], modelosProvedor: { [TipoProvedorIaEnum.ANTHROPIC]: ANTHROPIC },
    esforcoAnalitico: EsforcoIaEnum.MEDIO, checkinMinimoMinutos: 20, checkinMaximoMinutos: 40, duracaoRecomendadaMinutos: 90,
    checkinInteligente: true, rigorProporcional: true, deteccaoAutomatica: true,
    duvidasCodigo: false, modoContextoChat: ModoContextoChatEnum.MISTURADO, iaDesligada: false,
    usuarioId: 1, usuarioNome: 'Ana Admin', createdDate: new Date('2026-10-01T12:00:00Z'),
    ...sobrescrita,
  };
}

const ATIVA = versao(3);
const HISTORICO = [versao(3), versao(2, { modelosProvedor: { [TipoProvedorIaEnum.ANTHROPIC]: { ...ANTHROPIC, modeloRapido: 'claude-haiku-4' } }, iaDesligada: true, checkinMaximoMinutos: 50 }), versao(1)];

function responderCarga(montado: Montado, opcoes: { ativa?: ConfiguracaoIaResumoDto; historico?: ConfiguracaoIaResumoDto[]; estado?: EstadoIaEnum | 'ERRO' } = {}): void {
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/configuracao-ia'), opcoes.ativa ?? ATIVA);
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/configuracao-ia/versoes'), { itens: opcoes.historico ?? HISTORICO });
  const estado = esperarRequisicao(montado.http, 'GET', '/ia/estado');
  if (opcoes.estado === 'ERRO') responderErro(estado, 500, 'Falhou');
  else responderSucesso(estado, { estado: opcoes.estado ?? EstadoIaEnum.NO_AR });
}

async function abrir(opcoes: Parameters<typeof responderCarga>[1] = {}): Promise<Montado> {
  const montado = await montarComponente(ConfiguracaoIaPage, { usuario: TipoUsuarioEnum.ADMINISTRADOR });
  responderCarga(montado, opcoes);
  await montado.atualizar();
  return montado;
}

const textoDaTela = () => document.body.textContent ?? '';
const botao = (rotulo: string) =>
  Array.from(document.body.querySelectorAll('button')).find((candidato) => candidato.textContent?.includes(rotulo)) as HTMLButtonElement;
const avisosDe = (montado: Montado) => {
  const avisos: { severity?: string; summary?: string; detail?: string }[] = [];
  montado.mensagens.messageObserver.subscribe((mensagem) => avisos.push(...[mensagem].flat()));
  return avisos;
};

describe('ConfiguracaoIaPage — carregar', () => {
  it('mostra o esqueleto enquanto carrega e depois título, versão ativa, estado da IA e histórico', async () => {
    const montado = await montarComponente(ConfiguracaoIaPage, { usuario: TipoUsuarioEnum.ADMINISTRADOR });
    expect(document.body.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(montado.componente.jaCarregou()).toBe(false);

    responderCarga(montado);
    await montado.atualizar();

    expect(montado.componente.jaCarregou()).toBe(true);
    expect(textoDaTela()).toContain('Configurações da IA');
    expect(textoDaTela()).toContain('versão 3 ativa');
    expect(textoDaTela()).toContain('IA no ar');
    const historico = document.body.querySelector('aside[aria-label="Histórico de versões"]') as HTMLElement;
    expect(historico.textContent).toContain('Versão 3');
    expect(historico.textContent).toContain('Versão 1');
    expect(historico.textContent).toContain('Ana Admin');
    expect(historico.textContent?.match(/Ativa/g)).toHaveLength(1);
  });

  it('o estado "fora do ar" e "desligada" aparecem como o rótulo do estado', async () => {
    await abrir({ estado: EstadoIaEnum.FORA_DO_AR });
    expect(textoDaTela()).toContain('IA fora do ar');
  });

  it('se só o estado da IA falhar, a tela carrega normalmente sem a marca de estado', async () => {
    const montado = await abrir({ estado: 'ERRO' });
    expect(montado.componente.erro()).toBe(false);
    expect(montado.componente.estado()).toBeNull();
    expect(textoDaTela()).toContain('versão 3 ativa');
    expect(textoDaTela()).not.toContain('IA no ar');
  });

  it('o formulário nasce com os valores da versão ativa e sem nada a salvar', async () => {
    const montado = await abrir();
    expect(montado.componente.formulario.getRawValue()).toMatchObject({
      provedor: TipoProvedorIaEnum.ANTHROPIC, fallbackPrimeiro: null, fallbackSegundo: null, checkinMinimoMinutos: 20, iaDesligada: false,
    });
    expect(montado.componente.formulario.getRawValue().modelos.ANTHROPIC).toEqual(ANTHROPIC);
    expect((document.body.querySelector('#ia-modelo-rapido-ANTHROPIC') as HTMLInputElement).value).toBe('claude-haiku-5-5');
    expect(document.body.querySelector('#ia-modelo-rapido-GOOGLE'), 'provedor fora da cadeia não mostra o trio').toBeNull();
    expect(textoDaTela()).toContain('Nada a salvar: o formulário é igual à versão 3.');
    expect(botao('Salvar nova versão').disabled).toBe(true);
    expect(botao('Descartar alterações').disabled).toBe(true);
  });

  it('falha ao carregar mostra o erro e "Tentar de novo" refaz as consultas', async () => {
    const montado = await montarComponente(ConfiguracaoIaPage, { usuario: TipoUsuarioEnum.ADMINISTRADOR });
    responderErro(esperarRequisicao(montado.http, 'GET', '/configuracao-ia'), 500, 'Falhou');
    await montado.atualizar();
    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar a configuração da IA.');
    expect(document.body.querySelector('p-tabs')).toBeNull();

    // O forkJoin cancelou as outras duas consultas da primeira tentativa; elas ainda constam como abertas no controlador.
    montado.http.match((requisicao) => requisicao.url.endsWith('/configuracao-ia/versoes') || requisicao.url.endsWith('/ia/estado'));
    botao('Tentar de novo').click();
    responderCarga(montado);
    await montado.atualizar();
    expect(document.body.querySelector('[role="alert"]')).toBeNull();
    expect(textoDaTela()).toContain('versão 3 ativa');
  });
});

describe('ConfiguracaoIaPage — editar e salvar', () => {
  it('digitar no campo de modelo habilita salvar e avisa que cria a versão seguinte (a ativa continua no histórico)', async () => {
    const montado = await abrir();
    const campo = document.body.querySelector('#ia-modelo-rapido-ANTHROPIC') as HTMLInputElement;
    campo.value = 'claude-haiku-5-6';
    campo.dispatchEvent(new Event('input'));
    await montado.atualizar();

    expect(textoDaTela()).toContain('Salvar cria a versão 4; a versão 3 continua no histórico.');
    expect(botao('Salvar nova versão').disabled).toBe(false);
    expect(botao('Descartar alterações').disabled).toBe(false);
  });

  it('"Descartar alterações" devolve o formulário à versão ativa', async () => {
    const montado = await abrir();
    montado.componente.formulario.controls.iaDesligada.setValue(true);
    await montado.atualizar();
    botao('Descartar alterações').click();
    await montado.atualizar();

    expect(montado.componente.formulario.controls.iaDesligada.value).toBe(false);
    expect(textoDaTela()).toContain('Nada a salvar');
  });

  it('modelo em branco mostra o erro ao tentar salvar e não envia nada', async () => {
    const montado = await abrir();
    montado.componente.formulario.controls.modelos.controls.ANTHROPIC.patchValue({ modeloPadrao: '   ', modeloAnalitico: '' });
    await montado.atualizar();
    montado.componente.salvar();
    await montado.atualizar();

    expect(document.body.querySelectorAll('.configuracao-ia__erro-campo').length).toBeGreaterThan(0);
    expect(textoDaTela()).toContain('Anthropic está na cadeia, mas o modelo padrão não foi informado');
    expect(textoDaTela()).toContain('Anthropic está na cadeia, mas o modelo analítico não foi informado');
    montado.http.expectNone((requisicao) => requisicao.method === 'POST');
  });

  it('modelo de outro provedor no provedor padrão mostra o erro e não envia', async () => {
    const montado = await abrir();
    montado.componente.formulario.controls.modelos.controls.ANTHROPIC.patchValue({ modeloRapido: 'gemini-2.5-flash' });
    await montado.atualizar();
    montado.componente.salvar();
    await montado.atualizar();

    expect(textoDaTela()).toContain('O modelo rápido "gemini-2.5-flash" não é de Anthropic');
    montado.http.expectNone((requisicao) => requisicao.method === 'POST');
  });

  it('escolher um fallback mostra o trio dele; sem os modelos informados o erro aparece ao salvar, e com eles o POST leva a cadeia', async () => {
    const montado = await abrir();
    montado.componente.formulario.patchValue({ fallbackPrimeiro: TipoProvedorIaEnum.GOOGLE });
    await montado.atualizar();
    expect(document.body.querySelector('#ia-modelo-rapido-GOOGLE')).not.toBeNull();
    expect(textoDaTela()).toContain('fallback 1');

    montado.componente.salvar();
    await montado.atualizar();
    expect(textoDaTela()).toContain('Google está na cadeia, mas o modelo rápido não foi informado');
    montado.http.expectNone((requisicao) => requisicao.method === 'POST');

    montado.componente.formulario.controls.modelos.controls.GOOGLE.patchValue(GEMINI);
    await montado.atualizar();
    botao('Salvar nova versão').click();
    const requisicao = esperarRequisicao(montado.http, 'POST', '/configuracao-ia');
    expect(requisicao.request.body).toMatchObject({
      provedor: TipoProvedorIaEnum.ANTHROPIC,
      fallbacks: [TipoProvedorIaEnum.GOOGLE],
      modelosProvedor: { ANTHROPIC, GOOGLE: GEMINI },
    });
  });

  it('o provedor padrão e o outro fallback ficam desabilitados nas opções de cada fallback', async () => {
    const montado = await abrir();
    montado.componente.formulario.patchValue({ fallbackPrimeiro: TipoProvedorIaEnum.GOOGLE });
    await montado.atualizar();

    const desabilitadas = (opcoes: { valor: unknown; desabilitada?: boolean }[]) => opcoes.filter((opcao) => opcao.desabilitada).map((opcao) => opcao.valor);
    expect(desabilitadas(montado.componente.opcoesDoPrimeiroFallback())).toEqual([TipoProvedorIaEnum.ANTHROPIC]);
    expect(desabilitadas(montado.componente.opcoesDoSegundoFallback())).toEqual([TipoProvedorIaEnum.ANTHROPIC, TipoProvedorIaEnum.GOOGLE]);
  });

  it('trocar o padrão para o Gemini e voltar reaproveita o trio da Anthropic que já estava no formulário', async () => {
    const montado = await abrir();
    montado.componente.formulario.patchValue({ provedor: TipoProvedorIaEnum.GOOGLE });
    montado.componente.formulario.controls.modelos.controls.GOOGLE.patchValue(GEMINI);
    await montado.atualizar();
    expect(document.body.querySelector('#ia-modelo-rapido-ANTHROPIC')).toBeNull();

    montado.componente.formulario.patchValue({ provedor: TipoProvedorIaEnum.ANTHROPIC });
    await montado.atualizar();
    expect((document.body.querySelector('#ia-modelo-rapido-ANTHROPIC') as HTMLInputElement).value).toBe('claude-haiku-5-5');
    expect(montado.componente.provedoresDaCadeia()).toEqual([TipoProvedorIaEnum.ANTHROPIC]);
  });

  it('check-in com mínimo maior ou igual ao máximo mostra o erro do intervalo e não envia', async () => {
    const montado = await abrir();
    montado.componente.formulario.patchValue({ checkinMinimoMinutos: 40, checkinMaximoMinutos: 40 });
    await montado.atualizar();
    montado.componente.salvar();
    await montado.atualizar();

    expect(textoDaTela()).toContain('O mínimo do check-in deve ser menor que o máximo');
    montado.http.expectNone((requisicao) => requisicao.method === 'POST');
  });

  it('check-in abaixo de 1 minuto ou vazio é inválido', async () => {
    const montado = await abrir();
    montado.componente.formulario.patchValue({ duracaoRecomendadaMinutos: 0, checkinMinimoMinutos: null });
    await montado.atualizar();
    montado.componente.salvar();
    await montado.atualizar();

    expect(textoDaTela()).toContain('Informe um valor de 1 minuto ou mais');
    montado.http.expectNone((requisicao) => requisicao.method === 'POST');
  });

  it('salvar faz POST em /configuracao-ia com os nomes aparados, avisa o sucesso e recarrega mostrando a versão nova', async () => {
    const montado = await abrir();
    const avisos = avisosDe(montado);
    montado.componente.formulario.controls.modelos.controls.ANTHROPIC.patchValue({ modeloPadrao: '  claude-sonnet-5-6 ' });
    montado.componente.formulario.patchValue({ iaDesligada: true });
    await montado.atualizar();

    botao('Salvar nova versão').click();
    const requisicao = esperarRequisicao(montado.http, 'POST', '/configuracao-ia');
    expect(requisicao.request.body).toMatchObject({
      iaDesligada: true, fallbacks: [], checkinMinimoMinutos: 20, checkinMaximoMinutos: 40,
      modelosProvedor: { ANTHROPIC: { ...ANTHROPIC, modeloPadrao: 'claude-sonnet-5-6' } },
    });
    responderSucesso(requisicao, { id: 4, versao: 4 });
    await montado.atualizar();
    expect(avisos.some((aviso) => aviso.severity === 'success')).toBe(true);

    const nova = versao(4, { modelosProvedor: { [TipoProvedorIaEnum.ANTHROPIC]: { ...ANTHROPIC, modeloPadrao: 'claude-sonnet-5-6' } }, iaDesligada: true });
    responderCarga(montado, { ativa: nova, historico: [nova, ...HISTORICO] });
    await montado.atualizar();

    expect(textoDaTela()).toContain('versão 4 ativa');
    expect(textoDaTela()).toContain('Nada a salvar: o formulário é igual à versão 4.');
    expect(montado.componente.salvando()).toBe(false);
  });

  it('erro ao salvar libera o botão e mantém o que foi digitado', async () => {
    const montado = await abrir();
    montado.componente.formulario.controls.iaDesligada.setValue(true);
    await montado.atualizar();
    botao('Salvar nova versão').click();
    responderErro(esperarRequisicao(montado.http, 'POST', '/configuracao-ia'), 400, 'Intervalo inválido');
    await montado.atualizar();

    expect(montado.componente.salvando()).toBe(false);
    expect(montado.componente.formulario.controls.iaDesligada.value).toBe(true);
    expect(botao('Salvar nova versão').disabled).toBe(false);
  });
});

describe('ConfiguracaoIaPage — interruptor "Ligar a IA"', () => {
  const interruptorDaIa = () => {
    const secao = Array.from(document.body.querySelectorAll('section')).find((candidata) => candidata.textContent?.includes('Ligar a IA'));
    return secao?.querySelector('input[role="switch"]') as HTMLInputElement | null;
  };

  it('o texto é "Ligar a IA / IA ligada" e o interruptor aceso significa IA ligada (o dado segue sendo iaDesligada)', async () => {
    const montado = await abrir();
    expect(textoDaTela()).toContain('Ligar a IA');
    expect(textoDaTela()).toContain('IA ligada');
    expect(textoDaTela()).not.toContain('Desligar a IA');
    expect(montado.componente.formulario.controls.iaDesligada.value).toBe(false);
    expect(interruptorDaIa()?.checked).toBe(true);
  });

  it('com a IA desligada na versão ativa o interruptor aparece apagado', async () => {
    const ativa = versao(3, { iaDesligada: true });
    const montado = await montarComponente(ConfiguracaoIaPage, { usuario: TipoUsuarioEnum.ADMINISTRADOR });
    responderCarga(montado, { ativa, historico: [ativa] });
    await montado.atualizar();
    expect(interruptorDaIa()?.checked).toBe(false);
  });

  it('apagar o interruptor grava iaDesligada = true, e acender volta a false', async () => {
    const montado = await abrir();
    interruptorDaIa()!.click();
    await montado.atualizar();
    expect(montado.componente.formulario.controls.iaDesligada.value).toBe(true);
    expect(botao('Salvar nova versão').disabled).toBe(false);

    interruptorDaIa()!.click();
    await montado.atualizar();
    expect(montado.componente.formulario.controls.iaDesligada.value).toBe(false);
    expect(textoDaTela()).toContain('Nada a salvar');
  });

  it('o texto ao lado acompanha o interruptor: ligada explica que o chat responde, desligada que nada é chamado', async () => {
    const montado = await abrir();
    expect(montado.componente.iaLigada()).toBe(true);
    expect(textoDaTela()).toContain('O chat responde às mensagens');
    expect(textoDaTela()).not.toContain('IA desligada');
    expect(document.body.querySelector('.configuracao-ia__estado-ia--ligada')).not.toBeNull();

    interruptorDaIa()!.click();
    await montado.atualizar();
    expect(montado.componente.iaLigada()).toBe(false);
    expect(textoDaTela()).toContain('IA desligada');
    expect(textoDaTela()).toContain('o chat não responde');
    expect(textoDaTela()).not.toContain('O chat responde às mensagens');
    expect(document.body.querySelector('.configuracao-ia__estado-ia--ligada')).toBeNull();
  });
});

describe('ConfiguracaoIaPage — dúvidas de programação no chat (task 190)', () => {
  it('mostra o interruptor e a escolha do contexto, com o que cada modo faz, carregados da versão ativa', async () => {
    const ativa = versao(3, { duvidasCodigo: true, modoContextoChat: ModoContextoChatEnum.SEPARADO });
    const montado = await montarComponente(ConfiguracaoIaPage, { usuario: TipoUsuarioEnum.ADMINISTRADOR });
    responderCarga(montado, { ativa, historico: [ativa] });
    await montado.atualizar();

    expect(textoDaTela()).toContain('Dúvidas de programação no chat');
    expect(document.body.querySelector('#ia-modo-contexto')).not.toBeNull();
    expect(montado.componente.formulario.controls.duvidasCodigo.value).toBe(true);
    expect(montado.componente.formulario.controls.modoContextoChat.value).toBe(ModoContextoChatEnum.SEPARADO);
    expect(textoDaTela()).toContain('cada pergunta só vê as mensagens do próprio assunto');
    expect(textoDaTela()).toContain('Nada a salvar');
  });

  it('trocar o modo muda a explicação e habilita salvar; os dois campos entram no POST da versão nova', async () => {
    const montado = await abrir();
    expect(montado.componente.formulario.controls.duvidasCodigo.value).toBe(false);
    expect(textoDaTela()).toContain('pode relacionar uma com a outra');

    montado.componente.formulario.patchValue({ duvidasCodigo: true, modoContextoChat: ModoContextoChatEnum.SEPARADO });
    await montado.atualizar();
    expect(textoDaTela()).toContain('cada pergunta só vê as mensagens do próprio assunto');
    expect(botao('Salvar nova versão').disabled).toBe(false);

    botao('Salvar nova versão').click();
    const requisicao = esperarRequisicao(montado.http, 'POST', '/configuracao-ia');
    expect(requisicao.request.body).toMatchObject({ duvidasCodigo: true, modoContextoChat: ModoContextoChatEnum.SEPARADO });
  });

  it('o histórico mostra as flags de cada versão', async () => {
    const montado = await abrir();
    botao('Versão 2').click();
    await montado.atualizar();
    expect(document.body.querySelector('dl')?.textContent).toContain('Dúvidas de código');
    expect(document.body.querySelector('dl')?.textContent).toContain('Não · contexto misturado');
  });
});

describe('ConfiguracaoIaPage — histórico', () => {
  it('clicar numa versão abre os valores dela em leitura e clicar de novo fecha', async () => {
    const montado = await abrir();
    botao('Versão 2').click();
    await montado.atualizar();

    const historico = document.body.querySelector('aside[aria-label="Histórico de versões"]') as HTMLElement;
    expect(historico.textContent).toContain('claude-haiku-4');
    expect(historico.textContent).toContain('20 a 50 min');
    expect(historico.textContent).toContain('Desligada');
    expect(botao('Versão 2').getAttribute('aria-expanded')).toBe('true');

    botao('Versão 2').click();
    await montado.atualizar();
    expect(historico.textContent).not.toContain('claude-haiku-4');
    expect(botao('Versão 2').getAttribute('aria-expanded')).toBe('false');
  });

  it('"Usar como base" preenche o formulário com a versão escolhida, avisa e não grava nada', async () => {
    const montado = await abrir();
    const avisos = avisosDe(montado);
    botao('Versão 2').click();
    await montado.atualizar();
    botao('Usar como base').click();
    await montado.atualizar();

    expect(montado.componente.formulario.controls.modelos.controls.ANTHROPIC.controls.modeloRapido.value).toBe('claude-haiku-4');
    expect(montado.componente.formulario.controls.iaDesligada.value).toBe(true);
    expect(avisos.some((aviso) => aviso.severity === 'info' && aviso.detail === 'Valores da versão 2 no formulário. Salvar cria a versão 4.')).toBe(true);
    expect(textoDaTela()).toContain('Salvar cria a versão 4; a versão 3 continua no histórico.');
    expect(document.body.querySelector('dl')).toBeNull();
    montado.http.expectNone((requisicao) => requisicao.method !== 'GET');
  });
});

describe('ConfiguracaoIaPage — sair com rascunho de prompt pendente', () => {
  it('sem a aba de prompts alterada, pode sair', async () => {
    const montado = await abrir();
    expect(await montado.componente.podeSair()).toBe(true);
  });

  it('com rascunho de prompt pendente na aba Prompts, a saída pergunta antes (a página repassa para a aba)', async () => {
    const montado = await abrir();
    const aba = montado.fixture.debugElement.query(By.directive(PromptsAbaComponent)).componentInstance as PromptsAbaComponent;
    aba.controleRascunho.setValue('Edição pendente');
    const saida = montado.componente.podeSair();
    await montado.atualizar();

    expect(textoDaTela()).toContain('Alterações não salvas');
    const descartar = Array.from(document.body.querySelectorAll('button')).find((candidato) => candidato.textContent?.trim() === 'Continuar editando') as HTMLButtonElement;
    descartar.click();
    expect(await saida).toBe(false);
  });
});

describe('Rota de configuração da IA — acesso', () => {
  @Component({ standalone: true, template: '' })
  class InicioFalsoComponent {}

  const ROTAS = [{ path: 'configuracao-ia', children: configuracaoIaRotas }, { path: '', component: InicioFalsoComponent }];

  async function navegarComo(tipo: TipoUsuarioEnum): Promise<string> {
    const montado = await montarComponente(InicioFalsoComponent, { usuario: tipo, rotas: ROTAS });
    const roteador = TestBed.inject(Router);
    await roteador.navigateByUrl('/configuracao-ia');
    await montado.atualizar();
    return roteador.url;
  }

  it('o administrador entra', async () => {
    expect(await navegarComo(TipoUsuarioEnum.ADMINISTRADOR)).toBe('/configuracao-ia');
  });

  it('o gestor é mandado para a raiz', async () => {
    expect(await navegarComo(TipoUsuarioEnum.GESTOR)).toBe('/');
  });

  it('o desenvolvedor é mandado para a raiz', async () => {
    expect(await navegarComo(TipoUsuarioEnum.DESENVOLVEDOR)).toBe('/');
  });
});
