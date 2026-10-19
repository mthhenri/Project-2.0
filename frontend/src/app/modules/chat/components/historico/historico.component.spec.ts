import { describe, it, expect } from 'vitest';
import { AutorChatEnum, ContextoChatEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { HistoricoComponent, MensagemDoHistorico } from './historico.component';

// Histórico do chat (SYSTEM.SPEC.md §12 "chat": `GET /chat/conversas` uma por dia, da mais recente para a mais antiga; título dado
// pela IA ou, sem ele, o trecho da primeira mensagem; `GET /chat/busca?texto=` só do próprio usuário).

type Montado = ComponenteMontado<HistoricoComponent>;

const HOJE = '2026-10-19';

function conversa(data: string, sobrescrita: Record<string, unknown> = {}) {
  return {
    conversaId: `1-${data}`, data, titulo: null, primeiraMensagem: 'Primeira fala do dia', quantidadeDeMensagens: 4,
    ultimaMensagemDate: `${data}T18:00:00.000Z`, ...sobrescrita,
  };
}

function resultadoDeBusca(id: string, sobrescrita: Record<string, unknown> = {}) {
  return {
    id, conversaId: '1-2026-10-17', usuarioId: 1, contexto: ContextoChatEnum.CHAT, autor: AutorChatEnum.USUARIO, texto: 'combinei o prazo com o cliente',
    nivel: null, modelo: null, tokensEntrada: null, tokensSaida: null, tokensCache: null, propostaId: null, execucaoId: null,
    atividadeId: null, demandaId: null, createdDate: '2026-10-17T15:00:00.000Z', ...sobrescrita,
  };
}

const CONVERSAS = [
  conversa(HOJE, { titulo: 'Planejando a semana', quantidadeDeMensagens: 6 }),
  conversa('2026-10-18', { primeiraMensagem: '**Bom dia**, vou começar o login' }),
  conversa('2026-10-15'),
];

async function montarHistorico(): Promise<Montado> {
  return montarComponente(HistoricoComponent, {
    usuario: TipoUsuarioEnum.DESENVOLVEDOR,
    entradas: { diaAtual: HOJE, hoje: HOJE },
  });
}

async function montarComLista(conversas = CONVERSAS): Promise<Montado> {
  const montado = await montarHistorico();
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/conversas'), { conversas });
  await montado.atualizar();
  return montado;
}

const texto = (montado: Montado) => montado.elemento.textContent ?? '';
const itens = (montado: Montado) => Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('ul button'));
const campoBusca = (montado: Montado) => montado.elemento.querySelector<HTMLInputElement>('[aria-label="Buscar nas minhas conversas"]')!;

async function buscar(montado: Montado, termo: string) {
  const campo = campoBusca(montado);
  campo.value = termo;
  campo.dispatchEvent(new Event('input'));
  campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  await montado.atualizar();
}

describe('HistoricoComponent — lista de conversas', () => {
  it('mostra o esqueleto enquanto a lista carrega', async () => {
    const montado = await montarHistorico();

    expect(montado.elemento.querySelector('[aria-busy="true"]')).not.toBeNull();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/conversas'), { conversas: [] });
    await montado.atualizar();
    expect(montado.elemento.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('lista um item por dia: título da IA ou, sem ele, o trecho da primeira mensagem sem marcação Markdown', async () => {
    const montado = await montarComLista();

    expect(itens(montado)).toHaveLength(3);
    expect(texto(montado)).toContain('Planejando a semana');
    expect(texto(montado)).toContain('Bom dia, vou começar o login');
    expect(texto(montado)).not.toContain('**');
    expect(texto(montado)).toContain('Primeira fala do dia');
  });

  it('rotula Hoje e Ontem e mostra a quantidade de mensagens de cada dia', async () => {
    const montado = await montarComLista();

    expect(texto(montado)).toContain('Hoje · 6 msg');
    expect(texto(montado)).toContain('Ontem · 4 msg');
    expect(texto(montado)).toMatch(/15\/10\/2026 · 4 msg/);
  });

  it('marca como atual o dia que está na tela', async () => {
    const montado = await montarComLista();

    const atuais = itens(montado).filter((item) => item.getAttribute('aria-current') === 'true');
    expect(atuais).toHaveLength(1);
    expect(atuais[0].textContent).toContain('Planejando a semana');
  });

  it('escolher um dia anterior avisa o dia escolhido', async () => {
    const montado = await montarComLista();
    const escolhidos: string[] = [];
    montado.componente.diaEscolhido.subscribe((dia) => escolhidos.push(dia));

    itens(montado)[1].click();

    expect(escolhidos).toEqual(['2026-10-18']);
  });

  it('sem conversas, avisa que ainda não há nenhuma', async () => {
    const montado = await montarComLista([]);

    expect(texto(montado)).toContain('Nenhuma conversa ainda.');
    expect(itens(montado)).toHaveLength(0);
  });

  it('falha ao carregar mostra o erro e "Tentar de novo" pede a lista outra vez', async () => {
    const montado = await montarHistorico();
    responderErro(esperarRequisicao(montado.http, 'GET', '/chat/conversas'), 500, 'Falhou');
    await montado.atualizar();

    expect(texto(montado)).toContain('Não foi possível carregar o histórico.');
    const tentar = Array.from(montado.elemento.querySelectorAll('button')).find((botao) => botao.textContent?.includes('Tentar de novo'))!;
    tentar.click();
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/conversas'), { conversas: CONVERSAS });
    await montado.atualizar();

    expect(itens(montado)).toHaveLength(3);
  });

  it('recolher o painel lembra a escolha nesta máquina; começa aberto sem escolha guardada', async () => {
    const montado = await montarComLista();
    expect(montado.componente.aberto()).toBe(true);

    montado.elemento.querySelector<HTMLButtonElement>('[aria-label="Recolher histórico"]')!.click();
    await montado.atualizar();

    expect(montado.componente.aberto()).toBe(false);
    expect(localStorage.getItem('chat.historico.aberto')).toBe('false');
    expect(montado.elemento.querySelector('[aria-label="Abrir histórico"]')).not.toBeNull();
  });
});

describe('HistoricoComponent — painel recolhido de antes', () => {
  it('abre recolhido quando a escolha guardada foi recolher', async () => {
    const montado = await montarComponente(HistoricoComponent, {
      usuario: TipoUsuarioEnum.DESENVOLVEDOR,
      armazenamento: { 'chat.historico.aberto': 'false' },
      entradas: { diaAtual: HOJE, hoje: HOJE },
    });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/conversas'), { conversas: [] });
    await montado.atualizar();

    expect(montado.componente.aberto()).toBe(false);
  });
});

describe('HistoricoComponent — busca', () => {
  it('Enter pede a busca com o texto digitado e mostra o total e os resultados no lugar da lista', async () => {
    const montado = await montarComLista();

    await buscar(montado, '  prazo ');
    const pedido = esperarRequisicao(montado.http, 'GET', '/chat/busca');
    expect(pedido.request.params.get('texto')).toBe('prazo');
    responderSucesso(pedido, { mensagens: [resultadoDeBusca('m-1'), resultadoDeBusca('m-2', { autor: AutorChatEnum.IA, texto: 'o prazo é sexta' })] });
    await montado.atualizar();

    expect(texto(montado)).toContain('2 resultados');
    expect(texto(montado)).toContain('combinei o prazo com o cliente');
    expect(texto(montado)).toContain('Você ·');
    expect(texto(montado)).toContain('IA ·');
    expect(texto(montado)).not.toContain('Planejando a semana');
  });

  it('um único resultado fica no singular', async () => {
    const montado = await montarComLista();

    await buscar(montado, 'prazo');
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/busca'), { mensagens: [resultadoDeBusca('m-1')] });
    await montado.atualizar();

    expect(texto(montado)).toContain('1 resultado');
    expect(texto(montado)).not.toContain('1 resultados');
  });

  it('sem resultados, avisa que nada foi encontrado', async () => {
    const montado = await montarComLista();

    await buscar(montado, 'inexistente');
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/busca'), { mensagens: [] });
    await montado.atualizar();

    expect(texto(montado)).toContain('Nenhuma mensagem encontrada.');
  });

  it('busca em branco não chama a API e volta à lista', async () => {
    const montado = await montarComLista();

    await buscar(montado, '   ');

    montado.http.expectNone((requisicao) => requisicao.url.endsWith('/chat/busca'));
    expect(montado.componente.resultados()).toBeNull();
    expect(itens(montado)).toHaveLength(3);
  });

  it('Limpar descarta os resultados, esvazia o campo e devolve a lista de conversas', async () => {
    const montado = await montarComLista();
    await buscar(montado, 'prazo');
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/busca'), { mensagens: [resultadoDeBusca('m-1')] });
    await montado.atualizar();

    Array.from(montado.elemento.querySelectorAll('button')).find((botao) => botao.textContent?.includes('Limpar'))!.click();
    await montado.atualizar();

    expect(campoBusca(montado).value).toBe('');
    expect(texto(montado)).toContain('Planejando a semana');
  });

  it('Esc limpa a busca', async () => {
    const montado = await montarComLista();
    await buscar(montado, 'prazo');
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/busca'), { mensagens: [resultadoDeBusca('m-1')] });
    await montado.atualizar();

    campoBusca(montado).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await montado.atualizar();

    expect(montado.componente.resultados()).toBeNull();
    expect(campoBusca(montado).value).toBe('');
  });

  it('escolher um resultado avisa o dia da conversa e a mensagem, e limpa a busca', async () => {
    const montado = await montarComLista();
    const escolhidas: MensagemDoHistorico[] = [];
    montado.componente.mensagemEscolhida.subscribe((escolhida) => escolhidas.push(escolhida));
    await buscar(montado, 'prazo');
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/busca'), { mensagens: [resultadoDeBusca('m-9')] });
    await montado.atualizar();

    itens(montado)[0].click();
    await montado.atualizar();

    expect(escolhidas).toEqual([{ data: '2026-10-17', mensagemId: 'm-9' }]);
    expect(montado.componente.resultados()).toBeNull();
    expect(texto(montado)).toContain('Planejando a semana');
  });

  it('falha na busca encerra o "buscando" e mantém a lista de conversas', async () => {
    const montado = await montarComLista();

    await buscar(montado, 'prazo');
    responderErro(esperarRequisicao(montado.http, 'GET', '/chat/busca'), 500, 'Falhou');
    await montado.atualizar();

    expect(montado.componente.buscando()).toBe(false);
    expect(montado.componente.resultados()).toBeNull();
    expect(itens(montado)).toHaveLength(3);
  });
});
