import { describe, it, expect, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { StatusPropostaIaEnum, TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { PropostaCartaoComponent } from './proposta-cartao.component';

// Cartão de proposta da IA (SYSTEM.SPEC.md §12 "chat"/"proposta-ia"): nada roda sem o clique de Confirmar; Ajustar confirma já com os
// campos corrigidos; Recusar e Desfazer têm botões próprios; um 409 (já resolvida em outro lugar) recarrega o cartão em vez de insistir.
// O "Desfazer" do toast usa timer de 6 s: estes testes usam `detectChanges` (nunca `whenStable`) depois de confirmar e dispensam a oferta.

type Montado = ComponenteMontado<PropostaCartaoComponent>;

const ID = 7;

function proposta(tipo: TipoPropostaIaEnum, status: StatusPropostaIaEnum, dados: Record<string, unknown>) {
  return { id: ID, usuarioId: 1, tipo, status, dados, resultado: null, resolucaoData: null as string | null, createdDate: '2026-10-19T12:00:00.000Z' };
}

const CRIAR_ATIVIDADE = proposta(TipoPropostaIaEnum.CRIAR_ATIVIDADE, StatusPropostaIaEnum.PENDENTE, {
  nome: 'Montar o formulário', demandaNome: 'Login', prioridade: 'ALTA', usuarioNome: 'Ana',
});

const PRIORIDADES = [{ codigo: 'ALTA', descricao: 'Alta', ordem: 2, cor: '#ff0000' }, { codigo: 'INDEFINIDA', descricao: 'Indefinida', ordem: 5, cor: '#888888' }];

async function montarCartao(carregada: ReturnType<typeof proposta> | null = CRIAR_ATIVIDADE): Promise<Montado> {
  const montado = await montarComponente(PropostaCartaoComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, entradas: { propostaId: ID } });
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/atividade-prioridade'), PRIORIDADES);
  if (carregada) responderSucesso(esperarRequisicao(montado.http, 'GET', `/proposta-ia/${ID}`), carregada);
  await montado.atualizar();
  return montado;
}

/** Detecta mudanças sem esperar a estabilização: a oferta de desfazer deixa um timer pendente. */
function detectar(montado: Montado): void {
  montado.fixture.detectChanges();
}

const texto = (montado: Montado) => montado.elemento.textContent ?? '';
/** O botão pelo texto (cartão grande) ou pelo rótulo de acessibilidade (os ícones da linha compacta). */
const botao = (montado: Montado, rotulo: string) =>
  Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('button')).find((candidato) => candidato.textContent?.trim() === rotulo || candidato.getAttribute('aria-label') === rotulo);
const avisosDe = (montado: Montado) => {
  const avisos: { severity?: string; detail?: string }[] = [];
  montado.mensagens.messageObserver.subscribe((mensagem) => avisos.push(...[mensagem].flat()));
  return avisos;
};

afterEach(() => TestBed.inject(DesfazerService).dispensarSemEncerrar());

describe('PropostaCartaoComponent — carregar', () => {
  it('mostra um aviso discreto (sem esqueleto) enquanto a proposta carrega e depois o resumo, o status e os botões de uma pendente', async () => {
    const montado = await montarComponente(PropostaCartaoComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, entradas: { propostaId: ID } });
    expect(montado.elemento.querySelector('p-skeleton')).toBeNull();
    expect(montado.elemento.querySelector('.proposta-cartao__carregando')?.textContent).toContain('Carregando proposta');

    responderSucesso(esperarRequisicao(montado.http, 'GET', '/atividade-prioridade'), PRIORIDADES);
    responderSucesso(esperarRequisicao(montado.http, 'GET', `/proposta-ia/${ID}`), CRIAR_ATIVIDADE);
    await montado.atualizar();

    expect(montado.elemento.querySelector('.proposta-cartao__carregando')).toBeNull();
    // Criar atividade cabe numa linha (task 226): ação, nome, demanda e prioridade, com ✓, lápis e × em vez do cartão grande.
    expect(montado.elemento.querySelector('.proposta-cartao')).toBeNull();
    expect(texto(montado)).toContain('Criar atividade para Ana');
    expect(texto(montado)).toContain('Montar o formulário');
    expect(texto(montado)).toContain('Login');
    expect(texto(montado)).toContain('Alta');
    expect(botao(montado, 'Confirmar')).toBeDefined();
    expect(botao(montado, 'Ajustar')).toBeDefined();
    expect(botao(montado, 'Recusar')).toBeDefined();
    expect(botao(montado, 'Desfazer')).toBeUndefined();
  });

  it('falha ao carregar mostra o erro e "Tentar de novo" pede a proposta outra vez', async () => {
    const montado = await montarComponente(PropostaCartaoComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, entradas: { propostaId: ID } });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/atividade-prioridade'), PRIORIDADES);
    responderErro(esperarRequisicao(montado.http, 'GET', `/proposta-ia/${ID}`), 500, 'Falhou');
    await montado.atualizar();

    expect(texto(montado)).toContain('Não foi possível carregar a proposta.');
    botao(montado, 'Tentar de novo')!.click();
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', `/proposta-ia/${ID}`), CRIAR_ATIVIDADE);
    await montado.atualizar();

    expect(texto(montado)).toContain('Montar o formulário');
  });

  it('proposta já resolvida não oferece Confirmar nem Recusar; confirmada oferece só Desfazer', async () => {
    const montado = await montarCartao(proposta(TipoPropostaIaEnum.CRIAR_ATIVIDADE, StatusPropostaIaEnum.CONFIRMADA, CRIAR_ATIVIDADE.dados));

    // Confirmada vira a linha verde de "feito", sem Confirmar nem Recusar, só com Desfazer (e os detalhes).
    expect(texto(montado)).toContain('Feito');
    expect(botao(montado, 'Confirmar')).toBeUndefined();
    expect(botao(montado, 'Recusar')).toBeUndefined();
    expect(botao(montado, 'Desfazer')).toBeDefined();
  });

  it('proposta recusada/expirada ou desfeita fica sem ação: só a situação e o botão de detalhes', async () => {
    const expirada = await montarCartao(proposta(TipoPropostaIaEnum.CRIAR_ATIVIDADE, StatusPropostaIaEnum.EXPIRADA, CRIAR_ATIVIDADE.dados));
    expect(texto(expirada)).toContain('Recusada ou expirada');
    expect(Array.from(expirada.elemento.querySelectorAll('button')).map((item) => item.getAttribute('aria-label'))).toEqual(['Ver detalhes']);
  });

  it('só os tipos que sabem ser ajustados mostram "Ajustar"; os demais só Confirmar e Recusar', async () => {
    const montado = await montarCartao(
      proposta(TipoPropostaIaEnum.ALTERAR_ATIVIDADE, StatusPropostaIaEnum.PENDENTE, { atividadeNome: 'Formulário', atividadeId: 4 }),
    );

    expect(texto(montado)).toContain('Formulário');
    expect(botao(montado, 'Confirmar')).toBeDefined();
    expect(botao(montado, 'Recusar')).toBeDefined();
    expect(botao(montado, 'Ajustar')).toBeUndefined();
  });
});

describe('PropostaCartaoComponent — Confirmar', () => {
  it('Confirmar faz POST em /confirmar, mostra a proposta confirmada com Desfazer, avisa a tela e oferece o desfazer do toast', async () => {
    const montado = await montarCartao();
    const resolvidas: StatusPropostaIaEnum[] = [];
    montado.componente.resolvida.subscribe((resolvida) => resolvidas.push(resolvida.status));

    botao(montado, 'Confirmar')!.click();
    detectar(montado);
    const pedido = esperarRequisicao(montado.http, 'POST', `/proposta-ia/${ID}/confirmar`);
    responderSucesso(pedido, proposta(TipoPropostaIaEnum.CRIAR_ATIVIDADE, StatusPropostaIaEnum.CONFIRMADA, CRIAR_ATIVIDADE.dados));
    detectar(montado);

    expect(texto(montado)).toContain('Feito');
    expect(botao(montado, 'Desfazer')).toBeDefined();
    expect(botao(montado, 'Confirmar')).toBeUndefined();
    expect(resolvidas).toEqual([StatusPropostaIaEnum.CONFIRMADA]);
    expect(TestBed.inject(DesfazerService).oferta()?.mensagem).toBe('Proposta confirmada');
  });

  it('o "Desfazer" do toast desfaz no servidor e recarrega o cartão com a situação nova', async () => {
    const montado = await montarCartao();
    botao(montado, 'Confirmar')!.click();
    responderSucesso(
      esperarRequisicao(montado.http, 'POST', `/proposta-ia/${ID}/confirmar`),
      proposta(TipoPropostaIaEnum.CRIAR_ATIVIDADE, StatusPropostaIaEnum.CONFIRMADA, CRIAR_ATIVIDADE.dados),
    );

    TestBed.inject(DesfazerService).executar();
    responderSucesso(
      esperarRequisicao(montado.http, 'POST', `/proposta-ia/${ID}/desfazer`),
      proposta(TipoPropostaIaEnum.CRIAR_ATIVIDADE, StatusPropostaIaEnum.DESFEITA, CRIAR_ATIVIDADE.dados),
    );
    responderSucesso(
      esperarRequisicao(montado.http, 'GET', `/proposta-ia/${ID}`),
      proposta(TipoPropostaIaEnum.CRIAR_ATIVIDADE, StatusPropostaIaEnum.DESFEITA, CRIAR_ATIVIDADE.dados),
    );
    detectar(montado);

    expect(texto(montado)).toContain('Desfeita');
    expect(botao(montado, 'Desfazer')).toBeUndefined();
  });

  it('um segundo clique enquanto a chamada está em andamento não repete o POST', async () => {
    const montado = await montarCartao();

    botao(montado, 'Confirmar')!.click();
    botao(montado, 'Confirmar')!.click();

    const pedido = esperarRequisicao(montado.http, 'POST', `/proposta-ia/${ID}/confirmar`);
    responderSucesso(pedido, proposta(TipoPropostaIaEnum.CRIAR_ATIVIDADE, StatusPropostaIaEnum.CONFIRMADA, CRIAR_ATIVIDADE.dados));
  });

  it('409 (já resolvida em outro lugar) recarrega o cartão e avisa com severidade informativa, sem toast de erro', async () => {
    const montado = await montarCartao();
    const avisos = avisosDe(montado);

    botao(montado, 'Confirmar')!.click();
    responderErro(esperarRequisicao(montado.http, 'POST', `/proposta-ia/${ID}/confirmar`), 409, 'A proposta já foi resolvida.');
    responderSucesso(
      esperarRequisicao(montado.http, 'GET', `/proposta-ia/${ID}`),
      proposta(TipoPropostaIaEnum.CRIAR_ATIVIDADE, StatusPropostaIaEnum.EXPIRADA, CRIAR_ATIVIDADE.dados),
    );
    detectar(montado);

    expect(avisos).toEqual([expect.objectContaining({ severity: 'info', detail: 'A proposta já foi resolvida.' })]);
    expect(texto(montado)).toContain('Recusada ou expirada');
    expect(botao(montado, 'Confirmar')).toBeUndefined();
    expect(montado.errosHttpNaoTratados).toHaveLength(0);
  });

  it('outro erro mostra o aviso do backend, mantém os botões e não recarrega', async () => {
    const montado = await montarCartao();
    const avisos = avisosDe(montado);

    botao(montado, 'Confirmar')!.click();
    responderErro(esperarRequisicao(montado.http, 'POST', `/proposta-ia/${ID}/confirmar`), 400, 'Atividade sem demanda.');
    detectar(montado);

    expect(avisos).toEqual([expect.objectContaining({ severity: 'warn', detail: 'Atividade sem demanda.' })]);
    expect(botao(montado, 'Confirmar')).toBeDefined();
    expect(botao(montado, 'Confirmar')!.disabled).toBe(false);
    montado.http.expectNone((requisicao) => requisicao.method === 'GET');
  });
});

describe('PropostaCartaoComponent — prazo para desfazer (task 194)', () => {
  const confirmadaHa = (minutos: number, segundosExtra = 0) => ({
    ...proposta(TipoPropostaIaEnum.CRIAR_ATIVIDADE, StatusPropostaIaEnum.CONFIRMADA, CRIAR_ATIVIDADE.dados),
    resolucaoData: new Date(Date.now() - minutos * 60_000 + segundosExtra * 1000).toISOString(),
  });

  it('a linha de "feito" mostra Desfazer à direita e ativo dentro dos 30 minutos', async () => {
    const montado = await montarCartao(confirmadaHa(5));
    expect(montado.elemento.querySelector('.proposta-linha--feita .proposta-linha__acoes')).not.toBeNull();
    expect(botao(montado, 'Desfazer')!.disabled).toBe(false);
  });

  it('depois dos 30 minutos a linha de "feito" fica sem o botão Desfazer', async () => {
    const montado = await montarCartao(confirmadaHa(40));
    expect(texto(montado)).toContain('Feito');
    expect(botao(montado, 'Desfazer')).toBeUndefined();
    montado.http.expectNone((requisicao) => requisicao.url.endsWith('/desfazer'));
  });

  it('o prazo vence com a linha aberta: o botão some sozinho', async () => {
    const montado = await montarCartao(confirmadaHa(30, 1));
    expect(botao(montado, 'Desfazer')!.disabled).toBe(false);
    await new Promise((resolver) => setTimeout(resolver, 2600));
    detectar(montado);
    expect(botao(montado, 'Desfazer')).toBeUndefined();
  });

  it('nos detalhes abertos o prazo vencido segue como antes: botão desativado e sem chamar a API', async () => {
    const montado = await montarCartao(confirmadaHa(40));
    botao(montado, 'Ver detalhes')!.click();
    detectar(montado);
    expect(montado.elemento.querySelector('.proposta-cartao__acoes--desfazer')).not.toBeNull();
    expect(botao(montado, 'Desfazer')!.disabled).toBe(true);
    botao(montado, 'Desfazer')!.click();
    montado.http.expectNone((requisicao) => requisicao.url.endsWith('/desfazer'));
  });
});

describe('PropostaCartaoComponent — Recusar e Desfazer', () => {
  it('Recusar faz POST em /recusar e o cartão fica sem botões, sem oferecer desfazer no toast', async () => {
    const montado = await montarCartao();

    botao(montado, 'Recusar')!.click();
    responderSucesso(
      esperarRequisicao(montado.http, 'POST', `/proposta-ia/${ID}/recusar`),
      proposta(TipoPropostaIaEnum.CRIAR_ATIVIDADE, StatusPropostaIaEnum.EXPIRADA, CRIAR_ATIVIDADE.dados),
    );
    detectar(montado);

    expect(texto(montado)).toContain('Recusada ou expirada');
    expect(botao(montado, 'Confirmar')).toBeUndefined();
    expect(botao(montado, 'Recusar')).toBeUndefined();
    expect(TestBed.inject(DesfazerService).oferta()).toBeNull();
  });

  it('Desfazer (botão do cartão) faz POST em /desfazer e mostra a proposta desfeita', async () => {
    const montado = await montarCartao(proposta(TipoPropostaIaEnum.CRIAR_ATIVIDADE, StatusPropostaIaEnum.CONFIRMADA, CRIAR_ATIVIDADE.dados));

    botao(montado, 'Desfazer')!.click();
    responderSucesso(
      esperarRequisicao(montado.http, 'POST', `/proposta-ia/${ID}/desfazer`),
      proposta(TipoPropostaIaEnum.CRIAR_ATIVIDADE, StatusPropostaIaEnum.DESFEITA, CRIAR_ATIVIDADE.dados),
    );
    detectar(montado);

    expect(texto(montado)).toContain('Desfeita');
    expect(botao(montado, 'Desfazer')).toBeUndefined();
    expect(botao(montado, 'Confirmar')).toBeUndefined();
  });

  it('409 ao desfazer (já desfeita em outro lugar) recarrega o cartão', async () => {
    const montado = await montarCartao(proposta(TipoPropostaIaEnum.CRIAR_ATIVIDADE, StatusPropostaIaEnum.CONFIRMADA, CRIAR_ATIVIDADE.dados));

    botao(montado, 'Desfazer')!.click();
    responderErro(esperarRequisicao(montado.http, 'POST', `/proposta-ia/${ID}/desfazer`), 409, 'Já desfeita.');
    responderSucesso(
      esperarRequisicao(montado.http, 'GET', `/proposta-ia/${ID}`),
      proposta(TipoPropostaIaEnum.CRIAR_ATIVIDADE, StatusPropostaIaEnum.DESFEITA, CRIAR_ATIVIDADE.dados),
    );
    detectar(montado);

    expect(texto(montado)).toContain('Desfeita');
  });
});

describe('PropostaCartaoComponent — Ajustar', () => {
  const campoNome = (montado: Montado) => montado.elemento.querySelector<HTMLInputElement>('input[formcontrolname="nome"]')!;

  async function abrirAjuste(carregada = CRIAR_ATIVIDADE): Promise<Montado> {
    const montado = await montarCartao(carregada);
    botao(montado, 'Ajustar')!.click();
    await montado.atualizar();
    return montado;
  }

  async function digitarNome(montado: Montado, valor: string) {
    campoNome(montado).value = valor;
    campoNome(montado).dispatchEvent(new Event('input'));
    montado.fixture.detectChanges();
  }

  const enviarFormulario = (montado: Montado) => {
    montado.elemento.querySelector('form')!.dispatchEvent(new Event('submit'));
    detectar(montado);
  };

  it('abre o formulário com o nome proposto, troca os botões por "Confirmar com o ajuste" e "Cancelar"', async () => {
    const montado = await abrirAjuste();

    expect(campoNome(montado).value).toBe('Montar o formulário');
    expect(botao(montado, 'Confirmar com o ajuste')).toBeDefined();
    expect(botao(montado, 'Cancelar')).toBeDefined();
    expect(botao(montado, 'Confirmar')).toBeUndefined();
    expect(botao(montado, 'Recusar')).toBeUndefined();
  });

  it('Cancelar fecha o formulário sem chamar o servidor e devolve os botões da pendente', async () => {
    const montado = await abrirAjuste();

    botao(montado, 'Cancelar')!.click();
    await montado.atualizar();

    montado.http.expectNone((requisicao) => requisicao.method === 'POST');
    expect(montado.elemento.querySelector('form')).toBeNull();
    expect(botao(montado, 'Confirmar')).toBeDefined();
  });

  it('nome com menos de 3 caracteres: não envia e mostra o erro do campo', async () => {
    const montado = await abrirAjuste();

    await digitarNome(montado, 'ab');
    enviarFormulario(montado);

    montado.http.expectNone((requisicao) => requisicao.method === 'POST');
    expect(texto(montado)).toContain('Informe um nome com ao menos 3 caracteres');
  });

  it('Confirmar com o ajuste faz POST em /ajustar com os dados corrigidos (nome sem espaços nas pontas), fecha o formulário e oferece desfazer', async () => {
    const montado = await abrirAjuste();
    const resolvidas: StatusPropostaIaEnum[] = [];
    montado.componente.resolvida.subscribe((resolvida) => resolvidas.push(resolvida.status));

    await digitarNome(montado, '  Montar o formulário de cadastro ');
    enviarFormulario(montado);
    const pedido = esperarRequisicao(montado.http, 'POST', `/proposta-ia/${ID}/ajustar`);
    expect(pedido.request.body).toEqual({ dados: { ...CRIAR_ATIVIDADE.dados, nome: 'Montar o formulário de cadastro', prioridade: 'ALTA' } });
    responderSucesso(
      pedido,
      proposta(TipoPropostaIaEnum.CRIAR_ATIVIDADE, StatusPropostaIaEnum.AJUSTADA, { ...CRIAR_ATIVIDADE.dados, nome: 'Montar o formulário de cadastro' }),
    );
    detectar(montado);

    expect(montado.elemento.querySelector('form')).toBeNull();
    expect(texto(montado)).toContain('Feito');
    expect(texto(montado)).toContain('Montar o formulário de cadastro');
    expect(resolvidas).toEqual([StatusPropostaIaEnum.AJUSTADA]);
    expect(TestBed.inject(DesfazerService).oferta()?.mensagem).toBe('Proposta ajustada e confirmada');
  });

  it('409 ao ajustar recarrega o cartão e mantém o formulário aberto até a situação nova chegar', async () => {
    const montado = await abrirAjuste();

    enviarFormulario(montado);
    responderErro(esperarRequisicao(montado.http, 'POST', `/proposta-ia/${ID}/ajustar`), 409, 'Já resolvida.');
    responderSucesso(
      esperarRequisicao(montado.http, 'GET', `/proposta-ia/${ID}`),
      proposta(TipoPropostaIaEnum.CRIAR_ATIVIDADE, StatusPropostaIaEnum.CONFIRMADA, CRIAR_ATIVIDADE.dados),
    );
    detectar(montado);

    expect(texto(montado)).toContain('Confirmada');
  });

  it('no projeto proposto, o código é obrigatório, vai em maiúsculas e o nome também é ajustado', async () => {
    const projeto = proposta(TipoPropostaIaEnum.CRIAR_PROJETO, StatusPropostaIaEnum.PENDENTE, { nome: 'Loja virtual', codigo: 'LOJA', cor: '#112233' });
    const montado = await abrirAjuste(projeto);
    const campoCodigo = montado.elemento.querySelector<HTMLInputElement>('input[formcontrolname="codigo"]')!;

    campoCodigo.value = 'x';
    campoCodigo.dispatchEvent(new Event('input'));
    enviarFormulario(montado);
    montado.http.expectNone((requisicao) => requisicao.method === 'POST');
    expect(texto(montado)).toContain('Informe um código com ao menos 2 caracteres');

    campoCodigo.value = 'loja2';
    campoCodigo.dispatchEvent(new Event('input'));
    enviarFormulario(montado);
    const pedido = esperarRequisicao(montado.http, 'POST', `/proposta-ia/${ID}/ajustar`);
    expect(pedido.request.body).toEqual({ dados: { nome: 'Loja virtual', codigo: 'LOJA2', cor: '#112233' } });
    responderSucesso(pedido, { ...projeto, status: StatusPropostaIaEnum.AJUSTADA });
    detectar(montado);
  });
});

// Diff por palavra nos cartões (task 224): um caso por tipo que passou a mostrar o que muda; as propostas de antes dessa task, que não
// trazem o texto de antes, seguem mostrando o texto novo como sempre.
describe('PropostaCartaoComponent — diff por palavra', () => {
  const pendente = (tipo: TipoPropostaIaEnum, dados: Record<string, unknown>) => proposta(tipo, StatusPropostaIaEnum.PENDENTE, dados);
  const removidos = (montado: Montado) => Array.from(montado.elemento.querySelectorAll('del')).map((item) => item.textContent);
  const adicionados = (montado: Montado) => Array.from(montado.elemento.querySelectorAll('ins')).map((item) => item.textContent);

  it('Alterar atividade: o nome atual contra o novo, por palavra', async () => {
    const montado = await montarCartao(pendente(TipoPropostaIaEnum.ALTERAR_ATIVIDADE, { atividadeId: 3, atividadeNome: 'Montar o formulário de login', nome: 'Montar o formulário de acesso' }));
    expect(removidos(montado)).toEqual(['login']);
    expect(adicionados(montado)).toEqual(['acesso']);
    expect(texto(montado)).not.toContain('Novo nome');
  });

  it('Alterar demanda: o nome contra o novo e a documentação acrescentada em verde depois do fim da que existe', async () => {
    const montado = await montarCartao(pendente(TipoPropostaIaEnum.ALTERAR_DEMANDA, {
      demandaId: 4, demandaNome: 'Tela de login', nome: 'Tela de acesso', acrescentarDocumentacao: 'Bloqueia após 5 tentativas.', documentacaoAnterior: 'Login por e-mail e senha.',
    }));
    expect(removidos(montado)).toEqual(['login']);
    expect(adicionados(montado)).toEqual(['acesso', '\n\nBloqueia após 5 tentativas.']);
    expect(texto(montado)).toContain('Login por e-mail e senha.');
  });

  it('Alterar demanda: só o fim de uma documentação longa serve de contexto, aberto numa palavra inteira', async () => {
    const longa = Array.from({ length: 120 }, (_, indice) => `palavra${indice}`).join(' ');
    const montado = await montarCartao(pendente(TipoPropostaIaEnum.ALTERAR_DEMANDA, { demandaId: 4, acrescentarDocumentacao: 'Novo parágrafo.', documentacaoAnterior: longa }));
    const contexto = montado.componente.documentacaoAcrescentada();
    expect(contexto?.antes.startsWith('… palavra')).toBe(true);
    expect(contexto?.antes.endsWith('palavra119')).toBe(true);
    expect(contexto?.antes.length).toBeLessThan(300);
    expect(contexto?.depois).toBe(`${contexto?.antes}\n\nNovo parágrafo.`);
  });

  it('Alterar demanda de antes da task (sem a documentação de antes) mostra só o acréscimo, como sempre', async () => {
    const montado = await montarCartao(pendente(TipoPropostaIaEnum.ALTERAR_DEMANDA, { demandaId: 4, demandaNome: 'Tela de login', acrescentarDocumentacao: 'Bloqueia após 5 tentativas.' }));
    expect(montado.componente.documentacaoAcrescentada()).toBeNull();
    expect(texto(montado)).toContain('Bloqueia após 5 tentativas.');
    expect(montado.elemento.querySelector('ins')).toBeNull();
  });

  it('Corrigir execução: horário e duração, e a descrição, contra os de antes', async () => {
    const montado = await montarCartao(pendente(TipoPropostaIaEnum.CORRIGIR_EXECUCAO, {
      execucaoId: 9, atividadeNome: 'Revisar contrato', demandaNome: 'Jurídico',
      inicioAnteriorData: '2026-10-24T12:00:00.000Z', fimAnteriorData: '2026-10-24T14:00:00.000Z',
      periodoAnteriorTexto: '24/10 09:00–11:00', periodoNovoTexto: '24/10 09:00–18:00', duracaoNovaMinutos: 540,
      descricaoAnterior: 'Revisão inicial', descricao: 'Revisão completa',
    }));
    expect(montado.componente.periodoAnteriorDaExecucao()).toBe('24/10 09:00–11:00 (2h00)');
    expect(montado.componente.periodoNovoDaExecucao()).toBe('24/10 09:00–18:00 (9h00)');
    expect(removidos(montado)).toContain('09:00–11:00');
    expect(adicionados(montado)).toContain('09:00–18:00');
    expect(removidos(montado)).toContain('inicial');
    expect(adicionados(montado)).toContain('completa');
  });

  it('Trocar trecho do pad: o trecho antigo contra o novo, em um texto só', async () => {
    const montado = await montarCartao(pendente(TipoPropostaIaEnum.ANOTAR_PAD, { secao: 'FEITO', operacao: 'TROCAR', trechoAntigo: 'revisar o contrato', trechoNovo: 'revisar o aditivo' }));
    expect(removidos(montado)).toEqual(['contrato']);
    expect(adicionados(montado)).toEqual(['aditivo']);
    expect(texto(montado)).toContain('Trocar no pad');
  });

  it('Anotar no pad acrescentando não ganha diff: continua mostrando o texto a acrescentar', async () => {
    const montado = await montarCartao(pendente(TipoPropostaIaEnum.ANOTAR_PAD, { secao: 'FEITO', operacao: 'ANEXAR', texto: 'Revisei o contrato.' }));
    expect(montado.elemento.querySelector('app-diff-por-palavra')).toBeNull();
    expect(texto(montado)).toContain('Revisei o contrato.');
  });

  it('Descrever demanda: mostra as mudanças por padrão e alterna para o antes e o depois', async () => {
    const montado = await montarCartao(pendente(TipoPropostaIaEnum.DESCREVER_DEMANDA, {
      demandaId: 3, demandaNome: 'Cadastro', descricaoCliente: 'O cliente quer um cadastro simples.', descricaoClienteAnterior: 'O cliente quer um cadastro.',
      descricaoTecnica: 'Criar a tela', descricaoTecnicaAnterior: null,
    }));
    expect(adicionados(montado)).toEqual(['cadastro simples.', 'Criar a tela']);
    expect(removidos(montado)).toEqual(['cadastro.']);

    botao(montado, 'Antes')!.click();
    detectar(montado);
    expect(montado.elemento.querySelector('app-diff-por-palavra')).toBeNull();
    expect(texto(montado)).toContain('O cliente quer um cadastro.');
    expect(texto(montado)).toContain('Sem descrição até agora');

    botao(montado, 'Depois')!.click();
    detectar(montado);
    expect(montado.elemento.querySelector('app-diff-por-palavra')).toBeNull();
    expect(texto(montado)).toContain('O cliente quer um cadastro simples.');
    expect(texto(montado)).toContain('Criar a tela');
  });

  it('Descrever demanda de antes da task (sem o texto de antes) mostra só o texto novo, sem as opções', async () => {
    const montado = await montarCartao(pendente(TipoPropostaIaEnum.DESCREVER_DEMANDA, { demandaId: 3, descricaoCliente: 'O cliente quer um cadastro simples.' }));
    expect(botao(montado, 'Mudanças')).toBeUndefined();
    expect(montado.elemento.querySelector('app-diff-por-palavra')).toBeNull();
    expect(texto(montado)).toContain('O cliente quer um cadastro simples.');
  });

  it('os tipos que não mudaram seguem sem diff (regressão)', async () => {
    const montado = await montarCartao();
    expect(montado.elemento.querySelector('app-diff-por-palavra')).toBeNull();
  });
});

// A linha compacta (task 226): mudança pequena em uma linha, "feito" com Desfazer e o cartão grande para o que não cabe.
describe('PropostaCartaoComponent — linha compacta', () => {
  const pendente = (tipo: TipoPropostaIaEnum, dados: Record<string, unknown>) => proposta(tipo, StatusPropostaIaEnum.PENDENTE, dados);
  const rotulosDosBotoes = (montado: Montado) => Array.from(montado.elemento.querySelectorAll('button')).map((item) => item.getAttribute('aria-label') ?? item.textContent?.trim());
  const GRANDE = pendente(TipoPropostaIaEnum.DESCREVER_DEMANDA, { demandaId: 3, demandaNome: 'Cadastro', descricaoCliente: 'O cliente quer um cadastro.' });

  it('pendente e pequena: uma linha com ✓, lápis e ×, cada um com rótulo de acessibilidade', async () => {
    const montado = await montarCartao();
    expect(montado.elemento.querySelector('.proposta-linha')).not.toBeNull();
    expect(montado.elemento.querySelector('.proposta-cartao')).toBeNull();
    expect(rotulosDosBotoes(montado)).toEqual(['Confirmar', 'Ajustar', 'Recusar', 'Ver detalhes']);
  });

  it('os tipos que não sabem ser ajustados não têm o lápis', async () => {
    const montado = await montarCartao(pendente(TipoPropostaIaEnum.ALTERAR_ATIVIDADE, { atividadeNome: 'Formulário', atividadeId: 4, statusAnterior: 'PLANEJADA', status: 'DESENVOLVENDO' }));
    expect(rotulosDosBotoes(montado)).toEqual(['Confirmar', 'Recusar', 'Ver detalhes']);
  });

  it('a proposta que não cabe numa linha continua no cartão grande, com os botões por extenso', async () => {
    const montado = await montarCartao(GRANDE);
    expect(montado.elemento.querySelector('.proposta-linha')).toBeNull();
    expect(texto(montado)).toContain('Proposta · Descrever demanda');
    expect(texto(montado)).toContain('Aguardando você');
    expect(rotulosDosBotoes(montado)).toContain('Confirmar');
  });

  it('o texto longo manda a proposta para o cartão grande', async () => {
    const montado = await montarCartao(pendente(TipoPropostaIaEnum.PAUSAR_EXECUCAO, { atividadeNome: 'Ajustar', descricao: 'a'.repeat(81) }));
    expect(montado.elemento.querySelector('.proposta-linha')).toBeNull();
    expect(montado.elemento.querySelector('.proposta-cartao')).not.toBeNull();
  });

  it('"Ver detalhes" abre o cartão grande no mesmo lugar e "Resumir" volta para a linha', async () => {
    const montado = await montarCartao();
    botao(montado, 'Ver detalhes')!.click();
    detectar(montado);
    expect(montado.elemento.querySelector('.proposta-linha')).toBeNull();
    expect(texto(montado)).toContain('Proposta · Criar atividade');
    expect(texto(montado)).toContain('Aguardando você');

    botao(montado, 'Resumir')!.click();
    detectar(montado);
    expect(montado.elemento.querySelector('.proposta-linha')).not.toBeNull();
    expect(montado.elemento.querySelector('.proposta-cartao')).toBeNull();
  });

  it('o lápis abre o formulário no cartão grande e Cancelar devolve a linha', async () => {
    const montado = await montarCartao();
    botao(montado, 'Ajustar')!.click();
    detectar(montado);
    expect(montado.elemento.querySelector('form')).not.toBeNull();
    expect(montado.elemento.querySelector('.proposta-linha')).toBeNull();

    botao(montado, 'Cancelar')!.click();
    detectar(montado);
    expect(montado.elemento.querySelector('form')).toBeNull();
    expect(montado.elemento.querySelector('.proposta-linha')).not.toBeNull();
  });

  it('o × recusa e deixa uma linha apagada com a situação e sem botões de ação', async () => {
    const montado = await montarCartao();
    botao(montado, 'Recusar')!.click();
    responderSucesso(
      esperarRequisicao(montado.http, 'POST', `/proposta-ia/${ID}/recusar`),
      proposta(TipoPropostaIaEnum.CRIAR_ATIVIDADE, StatusPropostaIaEnum.EXPIRADA, CRIAR_ATIVIDADE.dados),
    );
    detectar(montado);
    expect(montado.elemento.querySelector('.proposta-linha--encerrada')).not.toBeNull();
    expect(rotulosDosBotoes(montado)).toEqual(['Ver detalhes']);
  });

  it('confirmada, até a proposta grande vira a linha verde de "feito" com Desfazer', async () => {
    const montado = await montarCartao(proposta(TipoPropostaIaEnum.DESCREVER_DEMANDA, StatusPropostaIaEnum.CONFIRMADA, GRANDE.dados));
    expect(montado.elemento.querySelector('.proposta-linha--feita')).not.toBeNull();
    expect(texto(montado)).toContain('Descrever demanda');
    expect(texto(montado)).toContain('Cadastro');
    expect(botao(montado, 'Desfazer')).toBeDefined();
  });

  it('a proposta grande recusada segue no cartão grande, com a situação por extenso', async () => {
    const montado = await montarCartao(proposta(TipoPropostaIaEnum.DESCREVER_DEMANDA, StatusPropostaIaEnum.EXPIRADA, GRANDE.dados));
    expect(montado.elemento.querySelector('.proposta-linha')).toBeNull();
    expect(texto(montado)).toContain('Recusada ou expirada');
  });

  it('o nome que muda aparece como diff por palavra dentro da linha', async () => {
    const montado = await montarCartao(
      pendente(TipoPropostaIaEnum.ALTERAR_ATIVIDADE, { atividadeId: 3, atividadeNome: 'Ajustar filtros', nome: 'Ajustar filtros e ordenação' }),
    );
    expect(Array.from(montado.elemento.querySelectorAll('.proposta-linha ins')).map((item) => item.textContent?.trim())).toEqual(['e ordenação']);
  });

  it('enquanto a chamada está em andamento a linha esmaece e o clique não repete o POST', async () => {
    const montado = await montarCartao();
    botao(montado, 'Confirmar')!.click();
    detectar(montado);
    expect(montado.elemento.querySelector('.proposta-linha--operando')).not.toBeNull();
    montado.http.expectOne((requisicao) => requisicao.url.endsWith('/confirmar'));
  });
});
