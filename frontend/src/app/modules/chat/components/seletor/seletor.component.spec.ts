import { describe, it, expect } from 'vitest';
import { AutorChatEnum, ContextoChatEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderSucesso } from '../../../../../testes/http-teste';
import { ModoDoChatEnum } from '../../utils/plano.util';
import { MensagemDoSeletor, SeletorComponent } from './seletor.component';

// Seletor do topo do chat (task 233), no lugar do histórico: o botão diz o que está aberto; o painel tem a busca e as listas "Planos" e
// "Conversas do dia" (`GET /chat/conversas`, `GET /plano`, `GET /chat/busca?texto=`; renomear é `PUT /chat/conversa/:data/titulo`).

type Montado = ComponenteMontado<SeletorComponent>;

const HOJE = '2026-10-19';

function conversa(data: string, sobrescrita: Record<string, unknown> = {}) {
  return {
    conversaId: `1-${data}`, data, titulo: `Chat do dia ${data}`, tituloEditado: false, primeiraMensagem: 'Primeira fala do dia', quantidadeDeMensagens: 4,
    ultimaMensagemDate: `${data}T18:00:00.000Z`, ...sobrescrita,
  };
}

function plano(id: number, sobrescrita: Record<string, unknown> = {}) {
  return {
    id, titulo: `Plano ${id}`, projetoId: 10, projetoNome: 'Projeto Demo', demandaId: null, demandaNome: null, criadorId: 1, criadorNome: 'Eu',
    isSolo: false, isArquivado: false, updatedDate: '2026-10-18T12:00:00.000Z', ...sobrescrita,
  };
}

function resultadoDeBusca(id: string) {
  return {
    id, conversaId: '1-2026-10-17', usuarioId: 1, contexto: ContextoChatEnum.CHAT, autor: AutorChatEnum.USUARIO, texto: 'combinei o prazo com o cliente',
    nivel: null, modelo: null, tokensEntrada: null, tokensSaida: null, assunto: null, tokensCache: null, propostaIds: [], execucaoId: null,
    atividadeId: null, demandaId: null, createdDate: '2026-10-17T15:00:00.000Z',
  };
}

const CONVERSAS = [conversa(HOJE, { titulo: 'Planejando a semana' }), conversa('2026-10-18')];
const PLANOS = [plano(1, { titulo: 'Relatório mensal', demandaNome: 'Exportação em PDF' }), plano(2, { titulo: 'Ideias soltas', projetoId: null, projetoNome: null, isSolo: true })];

async function montar(entradas: Record<string, unknown> = {}, conversas: unknown[] = CONVERSAS, planos: unknown[] = PLANOS): Promise<Montado> {
  const montado = await montarComponente(SeletorComponent, {
    usuario: TipoUsuarioEnum.DESENVOLVEDOR,
    entradas: { diaAtual: HOJE, hoje: HOJE, ...entradas },
  });
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/conversas'), { conversas });
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/plano'), planos);
  await montado.atualizar();
  return montado;
}

/** O painel abre num overlay no `body`. */
async function abrir(montado: Montado): Promise<HTMLElement> {
  montado.elemento.querySelector<HTMLButtonElement>('[aria-label="Abrir conversas e planos"]')!.click();
  await montado.atualizar();
  return document.body.querySelector<HTMLElement>('.chat-seletor__painel')!;
}

const itensDe = (painel: HTMLElement, secao: string) =>
  Array.from(painel.querySelectorAll<HTMLButtonElement>(`section[aria-label="${secao}"] .chat-seletor__item`));
const botaoPorRotulo = (raiz: ParentNode, rotulo: string) =>
  Array.from(raiz.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.textContent?.includes(rotulo));

describe('SeletorComponent — botão', () => {
  it('no modo Perguntas mostra o nome da conversa aberta', async () => {
    const montado = await montar();
    expect(montado.elemento.querySelector('.chat-seletor__gatilho-texto')?.textContent).toBe('Planejando a semana');
  });

  it('no modo Planejamento mostra o plano aberto', async () => {
    const montado = await montar({ modo: ModoDoChatEnum.PLANEJAMENTO, planoAbertoId: 1, planoAbertoTitulo: 'Relatório mensal' });
    expect(montado.elemento.querySelector('.chat-seletor__gatilho-texto')?.textContent).toBe('Relatório mensal');
  });

  it('no Planejamento sem plano aberto convida a escolher um', async () => {
    const montado = await montar({ modo: ModoDoChatEnum.PLANEJAMENTO });
    expect(montado.elemento.querySelector('.chat-seletor__gatilho-texto')?.textContent).toBe('Escolher um plano');
  });

  it('"Novo plano" fica sempre à vista e avisa a página', async () => {
    const montado = await montar();
    let pediu = false;
    montado.componente.novoPlano.subscribe(() => (pediu = true));

    botaoPorRotulo(montado.elemento, 'Novo plano')!.click();
    await montado.atualizar();

    expect(pediu).toBe(true);
  });
});

describe('SeletorComponent — listas', () => {
  it('mostra os planos (projeto, demanda, solo) e as conversas do dia com o rótulo do dia', async () => {
    const painel = await abrir(await montar());

    const planos = itensDe(painel, 'Planos').map((item) => item.textContent?.replace(/\s+/g, ' ').trim());
    expect(planos[0]).toContain('Relatório mensal');
    expect(planos[0]).toContain('Projeto Demo › Exportação em PDF');
    expect(planos[1]).toContain('Pessoal · solo');

    const dias = itensDe(painel, 'Conversas do dia').map((item) => item.textContent?.replace(/\s+/g, ' ').trim());
    expect(dias[0]).toContain('Planejando a semana');
    expect(dias[0]).toContain('Hoje');
    expect(dias[1]).toContain('Chat do dia 2026-10-18');
  });

  it('sem planos e sem conversas mostra os estados vazios', async () => {
    const painel = await abrir(await montar({}, [], []));

    expect(painel.textContent).toContain('Nenhum plano ainda.');
    expect(painel.textContent).toContain('Nenhuma conversa ainda.');
  });

  it('marca como atual o dia aberto no modo Perguntas e o plano aberto no Planejamento', async () => {
    const perguntas = await abrir(await montar());
    expect(itensDe(perguntas, 'Conversas do dia')[0].getAttribute('aria-current')).toBe('true');
    expect(itensDe(perguntas, 'Planos')[0].getAttribute('aria-current')).toBeNull();
  });

  it('escolher um plano ou um dia avisa a página e fecha o painel', async () => {
    const montado = await montar();
    const escolhas: string[] = [];
    montado.componente.planoEscolhido.subscribe((id) => escolhas.push(`plano ${id}`));
    montado.componente.diaEscolhido.subscribe((dia) => escolhas.push(`dia ${dia}`));
    const painel = await abrir(montado);

    itensDe(painel, 'Planos')[1].click();
    await montado.atualizar();
    const reaberto = await abrir(montado);
    itensDe(reaberto, 'Conversas do dia')[1].click();
    await montado.atualizar();

    expect(escolhas).toEqual(['plano 2', 'dia 2026-10-18']);
  });

  it('falha ao carregar mostra o aviso e tentar de novo relê as duas listas', async () => {
    const montado = await montarComponente(SeletorComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, entradas: { diaAtual: HOJE, hoje: HOJE } });
    esperarRequisicao(montado.http, 'GET', '/chat/conversas').flush({ mensagem: 'falhou' }, { status: 500, statusText: 'Erro' });
    esperarRequisicao(montado.http, 'GET', '/plano').flush({ mensagem: 'falhou' }, { status: 500, statusText: 'Erro' });
    await montado.atualizar();
    const painel = await abrir(montado);
    expect(painel.textContent).toContain('Não foi possível carregar as conversas e os planos.');

    botaoPorRotulo(painel, 'Tentar de novo')!.click();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/conversas'), { conversas: CONVERSAS });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/plano'), PLANOS);
    await montado.atualizar();

    expect(itensDe(painel, 'Planos')).toHaveLength(2);
  });
});

describe('SeletorComponent — busca', () => {
  async function buscar(montado: Montado, texto: string): Promise<HTMLElement> {
    const painel = await abrir(montado);
    const campo = painel.querySelector<HTMLInputElement>('[aria-label="Buscar em conversas e planos"]')!;
    campo.value = texto;
    campo.dispatchEvent(new Event('input'));
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await montado.atualizar();
    return painel;
  }

  it('Enter busca mensagens e planos pelo título (inclusive arquivados) e um resultado abre o dia da mensagem', async () => {
    const montado = await montar();
    const escolhidas: MensagemDoSeletor[] = [];
    montado.componente.mensagemEscolhida.subscribe((escolha) => escolhidas.push(escolha));
    const painel = await buscar(montado, 'prazo');

    const busca = esperarRequisicao(montado.http, 'GET', '/chat/busca');
    expect(busca.request.params.get('texto')).toBe('prazo');
    responderSucesso(busca, { mensagens: [resultadoDeBusca('m-1')] });
    const planos = montado.http.expectOne((requisicao) => requisicao.method === 'GET' && requisicao.url.endsWith('/plano') && requisicao.params.get('busca') === 'prazo');
    responderSucesso(planos, [plano(3, { titulo: 'Prazo do cliente', isArquivado: true })]);
    await montado.atualizar();

    expect(itensDe(painel, 'Planos')[0].textContent).toContain('Prazo do cliente');
    expect(itensDe(painel, 'Planos')[0].textContent).toContain('arquivado');
    expect(painel.querySelector('section[aria-label="Conversas do dia"]')).toBeNull();

    painel.querySelector<HTMLButtonElement>('section[aria-label="Mensagens encontradas"] .chat-seletor__item')!.click();
    await montado.atualizar();
    expect(escolhidas).toEqual([{ data: '2026-10-17', mensagemId: 'm-1' }]);
  });

  it('busca sem resultado diz que nada foi encontrado e limpar volta às listas', async () => {
    const montado = await montar();
    const painel = await buscar(montado, 'inexistente');
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/busca'), { mensagens: [] });
    responderSucesso(montado.http.expectOne((requisicao) => requisicao.url.endsWith('/plano') && requisicao.params.get('busca') === 'inexistente'), []);
    await montado.atualizar();

    expect(painel.textContent).toContain('Nenhuma mensagem encontrada.');
    expect(painel.textContent).toContain('Nenhum plano encontrado.');

    botaoPorRotulo(painel, 'Limpar busca')!.click();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/conversas'), { conversas: CONVERSAS });
    responderSucesso(montado.http.expectOne((requisicao) => requisicao.url.endsWith('/plano') && !requisicao.params.has('busca')), PLANOS);
    await montado.atualizar();

    expect(painel.querySelector('section[aria-label="Conversas do dia"]')).not.toBeNull();
  });
});

describe('SeletorComponent — renomear a conversa', () => {
  async function iniciarEdicao(montado: Montado): Promise<{ painel: HTMLElement; campo: HTMLInputElement }> {
    const painel = await abrir(montado);
    painel.querySelector<HTMLButtonElement>('[aria-label="Renomear conversa"]')!.click();
    await montado.atualizar();
    return { painel, campo: painel.querySelector<HTMLInputElement>('[aria-label="Nome da conversa"]')! };
  }

  it('Enter salva o nome novo e a lista passa a mostrá-lo', async () => {
    const montado = await montar();
    const { painel, campo } = await iniciarEdicao(montado);
    expect(campo.value).toBe('Planejando a semana');

    campo.value = 'Semana do relatório';
    campo.dispatchEvent(new Event('input'));
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    const requisicao = esperarRequisicao(montado.http, 'PUT', `/chat/conversa/${HOJE}/titulo`);
    expect(requisicao.request.body).toEqual({ titulo: 'Semana do relatório' });
    responderSucesso(requisicao, { conversaId: `1-${HOJE}`, titulo: 'Semana do relatório', tituloEditado: true });
    await montado.atualizar();

    expect(itensDe(painel, 'Conversas do dia')[0].textContent).toContain('Semana do relatório');
  });

  it('Esc cancela sem chamar a API', async () => {
    const montado = await montar();
    const { painel, campo } = await iniciarEdicao(montado);

    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await montado.atualizar();

    montado.http.expectNone((requisicao) => requisicao.method === 'PUT');
    expect(painel.querySelector('[aria-label="Nome da conversa"]')).toBeNull();
  });
});
