import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { PromptResumoDto, PromptTipoResumoDto, TipoPromptEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { PromptsAbaComponent } from './prompts-aba.component';

// Task 133: cada tipo de prompt tem uma versão ativa, no máximo um rascunho e o histórico; o texto de uma versão nunca é reescrito.
// Salvar o rascunho é explícito, ativar vale para todos (pede confirmação) e sair com mudança pendente pergunta antes.

type Montado = ComponenteMontado<PromptsAbaComponent>;

const DATA = new Date('2026-10-01T12:00:00Z');

function versao(tipo: TipoPromptEnum, numero: number, conteudo: string, sobrescrita: Partial<PromptResumoDto> = {}): PromptResumoDto {
  return { id: numero + (tipo === TipoPromptEnum.PAD ? 100 : 0), tipo, versao: numero, conteudo, ativo: false, rascunho: false, usuarioId: 1, usuarioNome: 'Admin', createdDate: DATA, ...sobrescrita };
}

function resumoDoTipo(tipo: TipoPromptEnum, descricao: string, numeroAtivo: number, rascunho: string | null = null): PromptTipoResumoDto {
  return {
    tipo,
    descricao,
    ativa: versao(tipo, numeroAtivo, `Texto ativo v${numeroAtivo}`, { ativo: true }),
    rascunho: rascunho === null ? null : versao(tipo, numeroAtivo + 1, rascunho, { rascunho: true }),
  };
}

const TIPOS = (rascunhoDaConversa: string | null = null) => [
  resumoDoTipo(TipoPromptEnum.CONVERSA, 'Conversa do chat', 3, rascunhoDaConversa),
  resumoDoTipo(TipoPromptEnum.PAD, 'Pad estruturado', 1, 'Rascunho do pad'),
];

const VERSOES_CONVERSA = [
  versao(TipoPromptEnum.CONVERSA, 3, 'Texto ativo v3', { ativo: true }),
  versao(TipoPromptEnum.CONVERSA, 2, 'Texto antigo v2'),
  versao(TipoPromptEnum.CONVERSA, 1, 'Texto original v1'),
];

async function abrir(tipos = TIPOS(), versoes = VERSOES_CONVERSA): Promise<Montado> {
  const montado = await montarComponente(PromptsAbaComponent, { usuario: TipoUsuarioEnum.ADMINISTRADOR });
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/prompt'), tipos);
  await montado.atualizar();
  responderSucesso(esperarRequisicao(montado.http, 'GET', `/prompt/${tipos[0].tipo}/versoes`), { itens: versoes });
  await montado.atualizar();
  return montado;
}

const textoDaTela = () => document.body.textContent ?? '';
const todosOsBotoes = () => Array.from(document.body.querySelectorAll('button'));
const botao = (rotulo: string) => todosOsBotoes().find((candidato) => candidato.textContent?.includes(rotulo)) as HTMLButtonElement;
/** Botão cujo texto é exatamente o rótulo (distingue "Ativar" do botão "Ativar rascunho"). */
const botaoExato = (rotulo: string) => todosOsBotoes().find((candidato) => candidato.textContent?.trim() === rotulo) as HTMLButtonElement;
const botaoPorAria = (rotulo: string) => document.body.querySelector(`button[aria-label="${rotulo}"]`) as HTMLButtonElement;
const botaoDoTipo = (descricao: string) =>
  Array.from(document.body.querySelectorAll('nav[aria-label="Tipos de prompt"] button')).find((candidato) => candidato.textContent?.includes(descricao)) as HTMLButtonElement;
const avisosDe = (montado: Montado) => {
  const avisos: { severity?: string; summary?: string; detail?: string }[] = [];
  montado.mensagens.messageObserver.subscribe((mensagem) => avisos.push(...[mensagem].flat()));
  return avisos;
};

describe('PromptsAbaComponent — carregar', () => {
  it('mostra o esqueleto enquanto os tipos carregam e depois cada tipo com a versão ativa e a marca de rascunho', async () => {
    const montado = await montarComponente(PromptsAbaComponent, { usuario: TipoUsuarioEnum.ADMINISTRADOR });
    expect(document.body.querySelector('[aria-busy="true"]')).not.toBeNull();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/prompt'), TIPOS());
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/prompt/CONVERSA/versoes'), { itens: VERSOES_CONVERSA });
    await montado.atualizar();

    expect(document.body.querySelector('[aria-busy="true"]')).toBeNull();
    expect(botaoDoTipo('Conversa do chat').textContent).toContain('versão 3');
    expect(botaoDoTipo('Pad estruturado').textContent).toContain('versão 1');
    expect(botaoDoTipo('Pad estruturado').textContent).toContain('Rascunho');
    expect(botaoDoTipo('Conversa do chat').textContent).not.toContain('Rascunho');
    expect(textoDaTela()).toContain('todos os usuários');
  });

  it('abre o primeiro tipo com a versão ativa no cartão e o editor partindo dela, sem nada a salvar ou ativar', async () => {
    const montado = await abrir();
    expect(montado.componente.tipoAberto()).toBe(TipoPromptEnum.CONVERSA);
    expect(botaoDoTipo('Conversa do chat').getAttribute('aria-current')).toBe('true');
    expect(botaoDoTipo('Pad estruturado').getAttribute('aria-current')).toBeNull();
    expect(textoDaTela()).toContain('Versão ativa');
    expect(textoDaTela()).toContain('Texto ativo v3');
    expect(textoDaTela()).toContain('Sem rascunho: o editor parte da versão ativa.');
    expect(montado.componente.controleRascunho.value).toBe('Texto ativo v3');
    expect(botao('Salvar rascunho').disabled).toBe(true);
    expect(botao('Ativar rascunho').disabled).toBe(true);
    expect(botao('Testar antes de salvar').disabled).toBe(false);
  });

  it('tipo com rascunho salvo abre o editor com o rascunho e já permite ativar', async () => {
    const montado = await abrir(TIPOS('Rascunho da conversa'));
    expect(montado.componente.controleRascunho.value).toBe('Rascunho da conversa');
    expect(textoDaTela()).toContain('O rascunho está salvo e pronto para ativar.');
    expect(botao('Ativar rascunho').disabled).toBe(false);
    expect(botao('Descartar rascunho')).toBeTruthy();
  });

  it('falha ao carregar mostra o erro e "Tentar de novo" refaz o pedido', async () => {
    const montado = await montarComponente(PromptsAbaComponent, { usuario: TipoUsuarioEnum.ADMINISTRADOR });
    responderErro(esperarRequisicao(montado.http, 'GET', '/prompt'), 500, 'Falhou');
    await montado.atualizar();
    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar os prompts.');

    botao('Tentar de novo').click();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/prompt'), TIPOS());
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/prompt/CONVERSA/versoes'), { itens: VERSOES_CONVERSA });
    await montado.atualizar();
    expect(document.body.querySelector('[role="alert"]')).toBeNull();
    expect(botaoDoTipo('Conversa do chat')).toBeTruthy();
  });
});

describe('PromptsAbaComponent — rascunho', () => {
  it('editar o texto marca "Alterações não salvas", habilita salvar e mantém ativar desabilitado até salvar', async () => {
    const montado = await abrir(TIPOS('Rascunho da conversa'));
    montado.componente.controleRascunho.setValue('Texto novo');
    await montado.atualizar();

    expect(textoDaTela()).toContain('Alterações não salvas');
    expect(textoDaTela()).toContain('Salve o rascunho para poder ativá-lo.');
    expect(botao('Salvar rascunho').disabled).toBe(false);
    expect(botao('Ativar rascunho').disabled).toBe(true);
    expect(todosOsBotoes().some((candidato) => candidato.textContent?.includes('Descartar rascunho'))).toBe(false);
  });

  it('texto em branco não pode ser salvo', async () => {
    const montado = await abrir();
    montado.componente.controleRascunho.setValue('    ');
    await montado.atualizar();
    expect(botao('Salvar rascunho').disabled).toBe(true);
    montado.componente.salvarRascunho();
    montado.http.expectNone((requisicao) => requisicao.method === 'POST');
  });

  it('"Desfazer edição" volta o editor ao último texto gravado', async () => {
    const montado = await abrir();
    montado.componente.controleRascunho.setValue('Mudei de ideia');
    await montado.atualizar();
    botao('Desfazer edição').click();
    await montado.atualizar();

    expect(montado.componente.controleRascunho.value).toBe('Texto ativo v3');
    expect(textoDaTela()).not.toContain('Alterações não salvas');
  });

  it('"Salvar rascunho" faz POST em /prompt/:tipo/rascunho, avisa o sucesso e recarrega: o rascunho passa a "Salvo" e pode ser ativado', async () => {
    const montado = await abrir();
    const avisos = avisosDe(montado);
    montado.componente.controleRascunho.setValue('Texto novo da conversa');
    await montado.atualizar();

    botao('Salvar rascunho').click();
    const requisicao = esperarRequisicao(montado.http, 'POST', '/prompt/CONVERSA/rascunho');
    expect(requisicao.request.body).toEqual({ conteudo: 'Texto novo da conversa' });
    responderSucesso(requisicao, { id: 9 });
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/prompt'), TIPOS('Texto novo da conversa'));
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/prompt/CONVERSA/versoes'), { itens: VERSOES_CONVERSA });
    await montado.atualizar();

    expect(avisos.some((aviso) => aviso.severity === 'success')).toBe(true);
    expect(textoDaTela()).toContain('Salvo');
    expect(botao('Ativar rascunho').disabled).toBe(false);
    expect(montado.componente.operando()).toBe(false);
  });

  it('erro ao salvar libera os botões e mantém o texto digitado', async () => {
    const montado = await abrir();
    montado.componente.controleRascunho.setValue('Texto novo');
    await montado.atualizar();
    botao('Salvar rascunho').click();
    responderErro(esperarRequisicao(montado.http, 'POST', '/prompt/CONVERSA/rascunho'), 400, 'Texto inválido');
    await montado.atualizar();

    expect(montado.componente.operando()).toBe(false);
    expect(montado.componente.controleRascunho.value).toBe('Texto novo');
    expect(botao('Salvar rascunho').disabled).toBe(false);
  });

  it('"Descartar rascunho" faz DELETE, recarrega e oferece "Desfazer" que grava o mesmo texto de novo', async () => {
    const montado = await abrir(TIPOS('Rascunho da conversa'));
    botao('Descartar rascunho').click();
    responderSucesso(esperarRequisicao(montado.http, 'DELETE', '/prompt/CONVERSA/rascunho'), null);

    const desfazer = TestBed.inject(DesfazerService);
    const oferta = desfazer.oferta();
    expect(oferta?.mensagem).toBe('Rascunho descartado');
    desfazer.dispensarSemEncerrar();
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/prompt'), TIPOS());
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/prompt/CONVERSA/versoes'), { itens: VERSOES_CONVERSA });
    await montado.atualizar();
    expect(textoDaTela()).toContain('Sem rascunho');

    oferta?.desfazer().subscribe();
    const regravacao = esperarRequisicao(montado.http, 'POST', '/prompt/CONVERSA/rascunho');
    expect(regravacao.request.body).toEqual({ conteudo: 'Rascunho da conversa' });
    responderSucesso(regravacao, { id: 9 });
  });
});

describe('PromptsAbaComponent — ativar e restaurar o padrão', () => {
  it('"Ativar rascunho" pede confirmação e só então faz POST em /rascunho/ativar', async () => {
    const montado = await abrir(TIPOS('Rascunho da conversa'));
    const avisos = avisosDe(montado);
    botao('Ativar rascunho').click();
    await montado.atualizar();

    expect(textoDaTela()).toContain('passa a valer para todos os usuários agora');
    montado.http.expectNone((requisicao) => requisicao.url.endsWith('/rascunho/ativar'));

    botaoExato('Ativar').click();
    const requisicao = esperarRequisicao(montado.http, 'POST', '/prompt/CONVERSA/rascunho/ativar');
    responderSucesso(requisicao, { id: 9 });
    await montado.atualizar();
    expect(avisos.some((aviso) => aviso.severity === 'success')).toBe(true);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/prompt'), TIPOS());
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/prompt/CONVERSA/versoes'), { itens: VERSOES_CONVERSA });
  });

  it('cancelar a confirmação de ativação não faz requisição', async () => {
    const montado = await abrir(TIPOS('Rascunho da conversa'));
    botao('Ativar rascunho').click();
    await montado.atualizar();
    botaoExato('Cancelar').click();
    await montado.atualizar();
    montado.http.expectNone((requisicao) => requisicao.method === 'POST');
  });

  it('"Restaurar padrão" volta à versão 1 só depois de confirmar (POST em /restaurar-padrao)', async () => {
    const montado = await abrir();
    expect(botao('Restaurar padrão').disabled).toBe(false);
    botao('Restaurar padrão').click();
    await montado.atualizar();
    expect(textoDaTela()).toContain('A versão 1 (o texto original do sistema) volta a ser a ativa');
    montado.http.expectNone((requisicao) => requisicao.url.endsWith('/restaurar-padrao'));

    botaoExato('Restaurar').click();
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/prompt/CONVERSA/restaurar-padrao'), { id: 1 });
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/prompt'), TIPOS());
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/prompt/CONVERSA/versoes'), { itens: VERSOES_CONVERSA });
  });

  it('com a versão 1 já ativa, "Restaurar padrão" fica desabilitado', async () => {
    const tipos = [resumoDoTipo(TipoPromptEnum.CONVERSA, 'Conversa do chat', 1)];
    await abrir(tipos, [versao(TipoPromptEnum.CONVERSA, 1, 'Texto ativo v1', { ativo: true })]);
    expect(botao('Restaurar padrão').disabled).toBe(true);
  });
});

describe('PromptsAbaComponent — histórico de versões', () => {
  it('as setas navegam entre as versões (a mais nova não tem "seguinte"; a mais antiga não tem "anterior")', async () => {
    const montado = await abrir();
    expect(botaoPorAria('Versão seguinte').disabled).toBe(true);
    expect(botaoPorAria('Versão anterior').disabled).toBe(false);

    botaoPorAria('Versão anterior').click();
    await montado.atualizar();
    expect(textoDaTela()).toContain('Versão antiga');
    expect(textoDaTela()).toContain('Texto antigo v2');
    expect(botaoPorAria('Versão seguinte').disabled).toBe(false);

    botaoPorAria('Versão anterior').click();
    await montado.atualizar();
    expect(textoDaTela()).toContain('Texto original v1');
    expect(botaoPorAria('Versão anterior').disabled).toBe(true);
  });

  it('"Voltar à ativa" volta ao cartão da versão ativa', async () => {
    const montado = await abrir();
    botaoPorAria('Versão anterior').click();
    await montado.atualizar();
    botao('Voltar à ativa').click();
    await montado.atualizar();
    expect(textoDaTela()).toContain('Versão ativa');
    expect(textoDaTela()).toContain('Texto ativo v3');
  });

  it('"Usar como base" põe o texto da versão antiga no editor sem gravar nada', async () => {
    const montado = await abrir();
    const avisos = avisosDe(montado);
    botaoPorAria('Versão anterior').click();
    await montado.atualizar();
    botao('Usar como base').click();
    await montado.atualizar();

    expect(montado.componente.controleRascunho.value).toBe('Texto antigo v2');
    expect(textoDaTela()).toContain('Alterações não salvas');
    expect(avisos.some((aviso) => aviso.severity === 'info' && aviso.detail?.includes('versão 2'))).toBe(true);
    montado.http.expectNone((requisicao) => requisicao.method !== 'GET');
  });

  it('o rascunho não entra no histórico navegável e, com uma versão só, o botão de histórico fica desabilitado', async () => {
    const tipos = [resumoDoTipo(TipoPromptEnum.CONVERSA, 'Conversa do chat', 1, 'Rascunho')];
    const montado = await abrir(tipos, [versao(TipoPromptEnum.CONVERSA, 1, 'Texto ativo v1', { ativo: true }), versao(TipoPromptEnum.CONVERSA, 2, 'Rascunho', { rascunho: true })]);
    expect(montado.componente.versoesNavegaveis()).toHaveLength(1);
    expect(botaoPorAria('Histórico de versões').disabled).toBe(true);
  });
});

describe('PromptsAbaComponent — sair com mudança pendente', () => {
  it('trocar de tipo sem mudança vai direto e carrega as versões do outro tipo', async () => {
    const montado = await abrir();
    botaoDoTipo('Pad estruturado').click();
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/prompt/PAD/versoes'), { itens: [] });
    await montado.atualizar();

    expect(montado.componente.tipoAberto()).toBe(TipoPromptEnum.PAD);
    expect(montado.componente.controleRascunho.value).toBe('Rascunho do pad');
  });

  it('trocar de tipo com mudança pendente pergunta: "Continuar editando" mantém o tipo e o texto', async () => {
    const montado = await abrir();
    montado.componente.controleRascunho.setValue('Edição pendente');
    await montado.atualizar();

    botaoDoTipo('Pad estruturado').click();
    await montado.atualizar();
    expect(textoDaTela()).toContain('Sair agora as descarta.');
    botaoExato('Continuar editando').click();
    await montado.atualizar();

    expect(montado.componente.tipoAberto()).toBe(TipoPromptEnum.CONVERSA);
    expect(montado.componente.controleRascunho.value).toBe('Edição pendente');
    montado.http.expectNone((requisicao) => requisicao.url.endsWith('/prompt/PAD/versoes'));
  });

  it('trocar de tipo com mudança pendente e "Descartar e sair" descarta a edição e abre o outro tipo', async () => {
    const montado = await abrir();
    montado.componente.controleRascunho.setValue('Edição pendente');
    await montado.atualizar();

    botaoDoTipo('Pad estruturado').click();
    await montado.atualizar();
    botaoExato('Descartar e sair').click();
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/prompt/PAD/versoes'), { itens: [] });
    await montado.atualizar();

    expect(montado.componente.tipoAberto()).toBe(TipoPromptEnum.PAD);
    expect(montado.componente.controleRascunho.value).toBe('Rascunho do pad');
  });

  it('podeSair (usado pela rota) é verdadeiro sem mudança e pergunta com mudança', async () => {
    const montado = await abrir();
    expect(await montado.componente.podeSair()).toBe(true);

    montado.componente.controleRascunho.setValue('Edição pendente');
    const resposta = montado.componente.podeSair();
    await montado.atualizar();
    expect(textoDaTela()).toContain('Alterações não salvas');
    botaoExato('Descartar e sair').click();
    expect(await resposta).toBe(true);
  });
});

describe('PromptsAbaComponent — testar antes de salvar', () => {
  it('"Testar antes de salvar" abre o dialog de teste com o texto do editor', async () => {
    const montado = await abrir();
    botao('Testar antes de salvar').click();
    await montado.atualizar();

    expect(montado.componente.testando()).toBe(true);
    expect(textoDaTela()).toContain('Cole até 5 narrativas');
  });

  it('com o editor vazio o teste fica desabilitado', async () => {
    const montado = await abrir();
    montado.componente.controleRascunho.setValue('   ');
    await montado.atualizar();
    expect(botao('Testar antes de salvar').disabled).toBe(true);
  });
});
