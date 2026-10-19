import { describe, it, expect } from 'vitest';
import { By } from '@angular/platform-browser';
import { Tooltip } from 'primeng/tooltip';
import { AutorChatEnum, ContextoChatEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { HistoricoComponent, MensagemDoHistorico } from './historico.component';

// Histórico do chat (SYSTEM.SPEC.md §12 "chat": `GET /chat/conversas` uma por dia, da mais recente para a mais antiga; nome =
// o dado pelo usuário, o dado pela IA ou o padrão "Chat do dia ..." (sempre `titulo`; renomear é `PUT /chat/conversa/:data/titulo`); `GET /chat/busca?texto=` só do próprio usuário).

type Montado = ComponenteMontado<HistoricoComponent>;

const HOJE = '2026-10-19';

function conversa(data: string, sobrescrita: Record<string, unknown> = {}) {
  return {
    conversaId: `1-${data}`, data, titulo: `Chat do dia ${data}`, tituloEditado: false, primeiraMensagem: 'Primeira fala do dia', quantidadeDeMensagens: 4,
    ultimaMensagemDate: `${data}T18:00:00.000Z`, ...sobrescrita,
  };
}

function resultadoDeBusca(id: string, sobrescrita: Record<string, unknown> = {}) {
  return {
    id, conversaId: '1-2026-10-17', usuarioId: 1, contexto: ContextoChatEnum.CHAT, autor: AutorChatEnum.USUARIO, texto: 'combinei o prazo com o cliente',
    nivel: null, modelo: null, tokensEntrada: null, tokensSaida: null, assunto: null, tokensCache: null, propostaId: null, execucaoId: null,
    atividadeId: null, demandaId: null, createdDate: '2026-10-17T15:00:00.000Z', ...sobrescrita,
  };
}

const CONVERSAS = [
  conversa(HOJE, { titulo: 'Planejando a semana', quantidadeDeMensagens: 6 }),
  conversa('2026-10-18', { titulo: 'Chat do dia 18 de outubro de 2026' }),
  conversa('2026-10-15', { titulo: 'Chat do dia 15 de outubro de 2026' }),
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
const itens = (montado: Montado) => Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('.chat-historico__item'));
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

  it('lista um item por dia com o nome (`titulo`), nunca o trecho da primeira mensagem', async () => {
    const montado = await montarComLista();

    expect(itens(montado)).toHaveLength(3);
    expect(texto(montado)).toContain('Planejando a semana');
    expect(texto(montado)).toContain('Chat do dia 18 de outubro de 2026');
    expect(texto(montado)).toContain('Chat do dia 15 de outubro de 2026');
    expect(texto(montado)).not.toContain('Primeira fala do dia');
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

const NOME_LONGO = 'Um nome de conversa bem comprido que o painel estreito do histórico corta com reticências na linha';

const lapis = (montado: Montado) => Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('[aria-label="Renomear conversa"]'));
const campoNome = (montado: Montado) => montado.elemento.querySelector<HTMLInputElement>('[aria-label="Nome da conversa"]');
const avisosDe = (montado: Montado) => {
  const avisos: { severity?: string; detail?: string }[] = [];
  montado.mensagens.messageObserver.subscribe((recebido) => avisos.push(...[recebido].flat()));
  return avisos;
};

async function editar(montado: Montado, indice: number, digitado?: string): Promise<HTMLInputElement> {
  lapis(montado)[indice].click();
  await montado.atualizar();
  const campo = campoNome(montado)!;
  if (digitado !== undefined) {
    campo.value = digitado;
    campo.dispatchEvent(new Event('input'));
  }
  return campo;
}

const tecla = (campo: HTMLInputElement, key: string) => campo.dispatchEvent(new KeyboardEvent('keydown', { key }));

describe('HistoricoComponent — renomear a conversa', () => {
  it('o botão do item leva o nome completo no tooltip, mesmo cortado na linha', async () => {
    const montado = await montarComLista([conversa(HOJE, { titulo: NOME_LONGO })]);

    const botaoDoItem = montado.fixture.debugElement.query(By.css('.chat-historico__item'));
    expect(botaoDoItem.injector.get(Tooltip).content).toBe(NOME_LONGO);
  });

  it('cada linha tem o lápis "Renomear conversa" além do botão do item', async () => {
    const montado = await montarComLista();

    expect(lapis(montado)).toHaveLength(3);
    expect(itens(montado)).toHaveLength(3);
  });

  it('o lápis troca o item por um campo "Nome da conversa" com o nome atual e limite de 120 caracteres', async () => {
    const montado = await montarComLista();

    const campo = await editar(montado, 0);

    expect(campo.value).toBe('Planejando a semana');
    expect(campo.getAttribute('maxlength')).toBe('120');
    expect(itens(montado)).toHaveLength(2);
    expect(lapis(montado)).toHaveLength(2);
  });

  it('Enter salva (PUT com o título no corpo) e atualiza o nome da linha sem recarregar a lista', async () => {
    const montado = await montarComLista();
    const campo = await editar(montado, 0, '  Semana nova ');

    tecla(campo, 'Enter');
    const pedido = esperarRequisicao(montado.http, 'PUT', '/chat/conversa/2026-10-19/titulo');
    expect(pedido.request.body).toEqual({ titulo: 'Semana nova' });
    responderSucesso(pedido, { conversaId: `1-${HOJE}`, titulo: 'Semana nova', tituloEditado: true });
    await montado.atualizar();

    expect(campoNome(montado)).toBeNull();
    expect(texto(montado)).toContain('Semana nova');
    expect(texto(montado)).not.toContain('Planejando a semana');
    expect(montado.componente.conversas()[0].tituloEditado).toBe(true);
    montado.http.expectNone((requisicao) => requisicao.url.endsWith('/chat/conversas'));
  });

  it('perder o foco também salva', async () => {
    const montado = await montarComLista();
    const campo = await editar(montado, 1, 'Outro nome');

    campo.dispatchEvent(new Event('blur'));
    const pedido = esperarRequisicao(montado.http, 'PUT', '/chat/conversa/2026-10-18/titulo');
    expect(pedido.request.body).toEqual({ titulo: 'Outro nome' });
    responderSucesso(pedido, { conversaId: '1-2026-10-18', titulo: 'Outro nome', tituloEditado: true });
    await montado.atualizar();

    expect(texto(montado)).toContain('Outro nome');
  });

  it('Enter seguido do blur salva uma única vez', async () => {
    const montado = await montarComLista();
    const campo = await editar(montado, 0, 'Semana nova');

    tecla(campo, 'Enter');
    campo.dispatchEvent(new Event('blur'));

    const pedido = esperarRequisicao(montado.http, 'PUT', '/chat/conversa/2026-10-19/titulo');
    responderSucesso(pedido, { conversaId: `1-${HOJE}`, titulo: 'Semana nova', tituloEditado: true });
    await montado.atualizar();
    montado.http.expectNone((requisicao) => requisicao.method === 'PUT');
  });

  it('Esc cancela sem chamar a API e mantém o nome', async () => {
    const montado = await montarComLista();
    const campo = await editar(montado, 0, 'Descartado');

    tecla(campo, 'Escape');
    await montado.atualizar();

    expect(campoNome(montado)).toBeNull();
    expect(texto(montado)).toContain('Planejando a semana');
    montado.http.expectNone((requisicao) => requisicao.method === 'PUT');
  });

  it('texto igual ao nome atual só fecha o campo, sem chamar a API', async () => {
    const montado = await montarComLista();
    const campo = await editar(montado, 0, '  Planejando a semana ');

    tecla(campo, 'Enter');
    await montado.atualizar();

    expect(campoNome(montado)).toBeNull();
    montado.http.expectNone((requisicao) => requisicao.method === 'PUT');
  });

  it('em branco manda titulo vazio e a linha passa a mostrar o padrão devolvido', async () => {
    const montado = await montarComLista();
    const campo = await editar(montado, 0, '   ');

    tecla(campo, 'Enter');
    const pedido = esperarRequisicao(montado.http, 'PUT', '/chat/conversa/2026-10-19/titulo');
    expect(pedido.request.body).toEqual({ titulo: '' });
    responderSucesso(pedido, { conversaId: `1-${HOJE}`, titulo: 'Chat do dia 19 de outubro de 2026', tituloEditado: false });
    await montado.atualizar();

    expect(texto(montado)).toContain('Chat do dia 19 de outubro de 2026');
    expect(texto(montado)).not.toContain('Planejando a semana');
    expect(montado.componente.conversas()[0].tituloEditado).toBe(false);
  });

  it('erro da API mantém o campo aberto, avisa com toast de atenção e permite tentar de novo', async () => {
    const montado = await montarComLista();
    const avisos = avisosDe(montado);
    const campo = await editar(montado, 0, 'Semana nova');

    tecla(campo, 'Enter');
    responderErro(esperarRequisicao(montado.http, 'PUT', '/chat/conversa/2026-10-19/titulo'), 500, 'Falhou');
    await montado.atualizar();

    expect(campoNome(montado)).not.toBeNull();
    expect(avisos.filter((aviso) => aviso.severity === 'warn')).toHaveLength(1);
    expect(montado.componente.salvandoNome()).toBe(false);
    expect(texto(montado)).not.toContain('Semana nova');

    tecla(campoNome(montado)!, 'Enter');
    esperarRequisicao(montado.http, 'PUT', '/chat/conversa/2026-10-19/titulo');
  });
});
