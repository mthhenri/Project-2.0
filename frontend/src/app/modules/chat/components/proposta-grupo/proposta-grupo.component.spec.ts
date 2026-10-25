import { describe, it, expect, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PropostaIaGrupoItemDto, PropostaIaGrupoSituacaoEnum, StatusPropostaIaEnum, TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { PropostaGrupoComponent } from './proposta-grupo.component';

// Grupo de propostas da mesma resposta (task 227): Confirmar todas e Recusar todas numa chamada só, o motivo na linha de quem não deu
// certo, "depende da N", tirar uma do grupo e Desfazer todas. Cada linha é o próprio cartão, que já tem teste.

type Montado = ComponenteMontado<PropostaGrupoComponent>;

interface PropostaDeTeste {
  id: number; usuarioId: number; tipo: TipoPropostaIaEnum; status: StatusPropostaIaEnum; dados: Record<string, unknown>;
  resultado: Record<string, unknown> | null; resolucaoData: string | null; aplicadaPelaIa: boolean; createdDate: string;
}

function proposta(id: number, status = StatusPropostaIaEnum.PENDENTE, extras: Record<string, unknown> = {}): PropostaDeTeste {
  return {
    id, usuarioId: 1, tipo: TipoPropostaIaEnum.CRIAR_ATIVIDADE, status, dados: { nome: `Atividade ${id}`, demandaNome: 'Login', prioridade: 'INDEFINIDA' },
    resultado: status === StatusPropostaIaEnum.PENDENTE ? null : { atividadeId: id }, resolucaoData: status === StatusPropostaIaEnum.PENDENTE ? null : new Date().toISOString(),
    aplicadaPelaIa: false, createdDate: '2026-10-25T12:00:00.000Z', ...extras,
  };
}
const feita = (id: number) => proposta(id, StatusPropostaIaEnum.CONFIRMADA);
const item = (propostaId: number, situacao: PropostaIaGrupoSituacaoEnum, propostaDepois: PropostaDeTeste | null, motivo: string | null = null): PropostaIaGrupoItemDto =>
  ({ propostaId, situacao, motivo, proposta: propostaDepois as never });

async function montarGrupo(ids: number[], porId: Record<number, PropostaDeTeste> = {}): Promise<Montado> {
  const montado = await montarComponente(PropostaGrupoComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, entradas: { propostaIds: ids } });
  for (const id of ids) responderSucesso(esperarRequisicao(montado.http, 'GET', `/proposta-ia/${id}`), porId[id] ?? proposta(id));
  for (const pedido of montado.http.match((requisicao) => requisicao.url.endsWith('/atividade-prioridade'))) responderSucesso(pedido, []);
  await montado.atualizar();
  return montado;
}

const texto = (montado: Montado) => montado.elemento.textContent ?? '';
const botao = (montado: Montado, rotulo: string) =>
  Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('button')).find((candidato) => candidato.textContent?.trim() === rotulo || candidato.getAttribute('aria-label') === rotulo);
const cabecalho = (montado: Montado) => montado.elemento.querySelector('.proposta-grupo__cabecalho')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
const linhas = (montado: Montado) => montado.elemento.querySelectorAll('.proposta-grupo__item');
/** Detecta mudanças sem esperar a estabilização: a oferta de desfazer deixa um timer pendente. */
const detectar = (montado: Montado) => montado.fixture.detectChanges();

afterEach(() => TestBed.inject(DesfazerService).dispensarSemEncerrar());

describe('PropostaGrupoComponent', () => {
  it('lê cada proposta uma vez e mostra o grupo: título, quantas esperam, uma linha numerada por proposta e as ações em grupo', async () => {
    const montado = await montarGrupo([11, 12, 13]);
    expect(cabecalho(montado)).toContain('3 propostas');
    expect(cabecalho(montado)).toContain('3 esperando você');
    expect(linhas(montado)).toHaveLength(3);
    expect(Array.from(montado.elemento.querySelectorAll('.proposta-grupo__numero')).map((numero) => numero.textContent?.trim())).toEqual(['1', '2', '3']);
    expect(montado.elemento.querySelectorAll('app-chat-proposta-cartao')).toHaveLength(3);
    expect(botao(montado, 'Confirmar todas')).toBeDefined();
    expect(botao(montado, 'Recusar todas')).toBeDefined();
    // Os cartões usam a leitura do grupo: nenhuma proposta é lida de novo.
    montado.http.expectNone((requisicao) => requisicao.url.includes('/proposta-ia/') && requisicao.method === 'GET');
  });

  it('enquanto as propostas não chegam o cabeçalho espera e não oferece as ações', async () => {
    const montado = await montarComponente(PropostaGrupoComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, entradas: { propostaIds: [11, 12] } });
    expect(cabecalho(montado)).toContain('Carregando…');
    expect(botao(montado, 'Confirmar todas')).toBeUndefined();
    expect(texto(montado)).toContain('Carregando proposta…');
    for (const id of [11, 12]) responderSucesso(esperarRequisicao(montado.http, 'GET', `/proposta-ia/${id}`), proposta(id));
    for (const pedido of montado.http.match((requisicao) => requisicao.url.endsWith('/atividade-prioridade'))) responderSucesso(pedido, []);
    await montado.atualizar();
    expect(botao(montado, 'Confirmar todas')).toBeDefined();
  });

  it('a proposta que referencia outra do grupo mostra "depende da N"', async () => {
    const demanda = { ...proposta(21), tipo: TipoPropostaIaEnum.CRIAR_DEMANDA, dados: { nome: 'Estrutura', projetoNome: 'Portal' } };
    const filha = { ...proposta(22), tipo: TipoPropostaIaEnum.CRIAR_DEMANDA, dados: { nome: 'Filha', projetoNome: 'Portal', demandaPaiPropostaId: 21 } };
    const montado = await montarGrupo([21, 22, 23], { 21: demanda, 22: filha });
    const dependencias = Array.from(montado.elemento.querySelectorAll('.proposta-grupo__depende')).map((nota) => nota.textContent?.trim());
    expect(dependencias).toEqual(['depende da 1']);
  });

  it('Confirmar todas faz uma chamada só com os ids, atualiza as linhas, resume o grupo e oferece desfazer tudo', async () => {
    const montado = await montarGrupo([11, 12, 13]);
    const resolvidas: number[] = [];
    montado.componente.resolvida.subscribe((resolvida) => resolvidas.push(resolvida.id));

    botao(montado, 'Confirmar todas')!.click();
    const pedido = esperarRequisicao(montado.http, 'POST', '/proposta-ia/grupo/confirmar');
    expect(pedido.request.body).toEqual({ propostaIds: [11, 12, 13] });
    responderSucesso(pedido, { itens: [11, 12, 13].map((id) => item(id, PropostaIaGrupoSituacaoEnum.RESOLVIDA, feita(id))) });
    detectar(montado);

    expect(cabecalho(montado)).toContain('3 feitas');
    expect(botao(montado, 'Desfazer todas')).toBeDefined();
    expect(botao(montado, 'Confirmar todas')).toBeUndefined();
    expect(resolvidas).toEqual([11, 12, 13]);
    expect(TestBed.inject(DesfazerService).oferta()?.mensagem).toBe('3 propostas confirmadas');
    // Tudo feito: a lista fecha e "Ver" a abre de novo.
    expect(linhas(montado)).toHaveLength(0);
    botao(montado, 'Ver')!.click();
    detectar(montado);
    expect(linhas(montado)).toHaveLength(3);
    expect(montado.elemento.querySelectorAll('.proposta-linha--feita')).toHaveLength(3);
    expect(botao(montado, 'Ocultar')).toBeDefined();
  });

  it('falha no meio: a que falhou e as que dependem dela ficam pendentes com o motivo na linha, e as demais são feitas', async () => {
    const montado = await montarGrupo([11, 12, 13]);
    botao(montado, 'Confirmar todas')!.click();
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/proposta-ia/grupo/confirmar'), {
      itens: [
        item(11, PropostaIaGrupoSituacaoEnum.RESOLVIDA, feita(11)),
        item(12, PropostaIaGrupoSituacaoEnum.FALHOU, proposta(12), 'Já existe uma execução ativa'),
        item(13, PropostaIaGrupoSituacaoEnum.BLOQUEADA, proposta(13), 'Depende de uma proposta do grupo que não foi confirmada'),
      ],
    });
    detectar(montado);

    expect(cabecalho(montado)).toContain('1 feita · 2 esperando você');
    expect(Array.from(montado.elemento.querySelectorAll('.proposta-grupo__motivo')).map((motivo) => motivo.textContent?.trim())).toEqual([
      'Já existe uma execução ativa',
      'Depende de uma proposta do grupo que não foi confirmada',
    ]);
    // A lista continua aberta (há o que decidir) e os botões do grupo valem para o que sobrou.
    expect(linhas(montado)).toHaveLength(3);
    expect(botao(montado, 'Confirmar todas')).toBeDefined();
    expect(TestBed.inject(DesfazerService).oferta()?.mensagem).toBe('Proposta confirmada');
  });

  it('o motivo some da linha quando ela é resolvida depois, sozinha', async () => {
    const montado = await montarGrupo([11, 12]);
    botao(montado, 'Confirmar todas')!.click();
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/proposta-ia/grupo/confirmar'), {
      itens: [item(11, PropostaIaGrupoSituacaoEnum.FALHOU, proposta(11), 'Falhou'), item(12, PropostaIaGrupoSituacaoEnum.RESOLVIDA, feita(12))],
    });
    detectar(montado);
    expect(montado.elemento.querySelectorAll('.proposta-grupo__motivo')).toHaveLength(1);

    botao(montado, 'Recusar')!.click();
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/proposta-ia/11/recusar'), proposta(11, StatusPropostaIaEnum.EXPIRADA));
    detectar(montado);
    expect(montado.elemento.querySelectorAll('.proposta-grupo__motivo')).toHaveLength(0);
    expect(cabecalho(montado)).toContain('1 feita · 1 recusada');
  });

  it('tirar uma do grupo a deixa fora da chamada, e "Voltar para o grupo" a devolve', async () => {
    const montado = await montarGrupo([11, 12, 13]);
    botao(montado, 'Tirar do grupo')!.click();
    detectar(montado);
    expect(cabecalho(montado)).toContain('2 esperando você · 1 fora do grupo');
    expect(botao(montado, 'Confirmar 2')).toBeDefined();
    expect(botao(montado, 'Voltar para o grupo')).toBeDefined();

    botao(montado, 'Confirmar 2')!.click();
    const pedido = esperarRequisicao(montado.http, 'POST', '/proposta-ia/grupo/confirmar');
    expect(pedido.request.body).toEqual({ propostaIds: [12, 13] });
    responderSucesso(pedido, { itens: [12, 13].map((id) => item(id, PropostaIaGrupoSituacaoEnum.RESOLVIDA, feita(id))) });
    detectar(montado);
    // A tirada segue pendente e visível: a lista não fecha por cima dela.
    expect(linhas(montado).length).toBeGreaterThan(0);
    expect(cabecalho(montado)).toContain('2 feitas · 1 fora do grupo');

    botao(montado, 'Voltar para o grupo')!.click();
    detectar(montado);
    expect(botao(montado, 'Confirmar todas')).toBeDefined();
  });

  it('Recusar todas faz uma chamada só e deixa as propostas recusadas', async () => {
    const montado = await montarGrupo([11, 12]);
    botao(montado, 'Recusar todas')!.click();
    const pedido = esperarRequisicao(montado.http, 'POST', '/proposta-ia/grupo/recusar');
    expect(pedido.request.body).toEqual({ propostaIds: [11, 12] });
    responderSucesso(pedido, { itens: [11, 12].map((id) => item(id, PropostaIaGrupoSituacaoEnum.RESOLVIDA, proposta(id, StatusPropostaIaEnum.EXPIRADA))) });
    detectar(montado);
    expect(cabecalho(montado)).toContain('2 recusadas');
    expect(botao(montado, 'Confirmar todas')).toBeUndefined();
    expect(TestBed.inject(DesfazerService).oferta()).toBeNull();
  });

  it('Desfazer todas manda só as feitas dentro do prazo e deixa as propostas desfeitas', async () => {
    const velha = { ...feita(13), resolucaoData: new Date(Date.now() - 60 * 60_000).toISOString() };
    const montado = await montarGrupo([11, 12, 13], { 11: feita(11), 12: feita(12), 13: velha });
    expect(cabecalho(montado)).toContain('3 feitas');
    botao(montado, 'Desfazer todas')!.click();
    const pedido = esperarRequisicao(montado.http, 'POST', '/proposta-ia/grupo/desfazer');
    expect(pedido.request.body).toEqual({ propostaIds: [11, 12] });
    responderSucesso(pedido, { itens: [12, 11].map((id) => item(id, PropostaIaGrupoSituacaoEnum.RESOLVIDA, proposta(id, StatusPropostaIaEnum.DESFEITA))) });
    detectar(montado);
    expect(cabecalho(montado)).toContain('1 feita · 2 desfeitas');
  });

  it('o "Desfazer" do toast desfaz o grupo inteiro que acabou de ser confirmado', async () => {
    const montado = await montarGrupo([11, 12]);
    botao(montado, 'Confirmar todas')!.click();
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/proposta-ia/grupo/confirmar'), { itens: [11, 12].map((id) => item(id, PropostaIaGrupoSituacaoEnum.RESOLVIDA, feita(id))) });
    detectar(montado);

    TestBed.inject(DesfazerService).executar();
    const pedido = esperarRequisicao(montado.http, 'POST', '/proposta-ia/grupo/desfazer');
    expect(pedido.request.body).toEqual({ propostaIds: [11, 12] });
    responderSucesso(pedido, { itens: [12, 11].map((id) => item(id, PropostaIaGrupoSituacaoEnum.RESOLVIDA, proposta(id, StatusPropostaIaEnum.DESFEITA))) });
    detectar(montado);
    expect(cabecalho(montado)).toContain('2 desfeitas');
  });

  it('desfazer que para na primeira que recusa mostra o motivo nas que sobraram', async () => {
    const montado = await montarGrupo([11, 12], { 11: feita(11), 12: feita(12) });
    botao(montado, 'Desfazer todas')!.click();
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/proposta-ia/grupo/desfazer'), {
      itens: [
        item(12, PropostaIaGrupoSituacaoEnum.FALHOU, feita(12), 'A atividade já foi alterada'),
        item(11, PropostaIaGrupoSituacaoEnum.BLOQUEADA, feita(11), 'Não foi desfeita: A atividade já foi alterada'),
      ],
    });
    detectar(montado);
    expect(cabecalho(montado)).toContain('2 feitas');
    expect(Array.from(montado.elemento.querySelectorAll('.proposta-grupo__motivo')).map((motivo) => motivo.textContent?.trim())).toEqual([
      'Não foi desfeita: A atividade já foi alterada',
      'A atividade já foi alterada',
    ]);
  });

  it('resolver uma linha sozinha atualiza o cabeçalho do grupo', async () => {
    const montado = await montarGrupo([11, 12]);
    const confirmar = Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('.proposta-grupo__item button[aria-label="Confirmar"]'))[0];
    confirmar.click();
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/proposta-ia/11/confirmar'), feita(11));
    detectar(montado);
    expect(cabecalho(montado)).toContain('1 feita · 1 esperando você');
    expect(botao(montado, 'Confirmar todas')).toBeDefined();
  });

  it('erro do servidor na ação em grupo mostra o aviso e deixa tudo como estava', async () => {
    const montado = await montarGrupo([11, 12]);
    const avisos: { detail?: string }[] = [];
    montado.mensagens.messageObserver.subscribe((mensagem) => avisos.push(...[mensagem].flat()));
    botao(montado, 'Confirmar todas')!.click();
    responderErro(esperarRequisicao(montado.http, 'POST', '/proposta-ia/grupo/confirmar'), 403, 'Esta proposta é de outro usuário');
    detectar(montado);
    expect(avisos.map((aviso) => aviso.detail)).toContain('Esta proposta é de outro usuário');
    expect(cabecalho(montado)).toContain('2 esperando você');
    expect(botao(montado, 'Confirmar todas')).toBeDefined();
  });

  it('a proposta que o grupo não conseguiu ler é lida pelo próprio cartão, sem travar o cabeçalho das outras', async () => {
    const montado = await montarComponente(PropostaGrupoComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, entradas: { propostaIds: [11, 12] } });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/proposta-ia/11'), proposta(11));
    responderErro(esperarRequisicao(montado.http, 'GET', '/proposta-ia/12'), 500, 'Falhou');
    await montado.atualizar();
    // O cartão da 12 tenta sozinho; o cabeçalho já trata a 11.
    esperarRequisicao(montado.http, 'GET', '/proposta-ia/12');
    for (const pedido of montado.http.match((requisicao) => requisicao.url.endsWith('/atividade-prioridade'))) responderSucesso(pedido, []);
    expect(cabecalho(montado)).toContain('1 esperando você');
  });

  it('um clique a mais enquanto a chamada está em andamento não repete o POST', async () => {
    const montado = await montarGrupo([11, 12]);
    botao(montado, 'Confirmar todas')!.click();
    botao(montado, 'Confirmar todas')!.click();
    expect(montado.http.match((requisicao) => requisicao.url.endsWith('/grupo/confirmar'))).toHaveLength(1);
  });

  describe('a IA já fez parte (task 228)', () => {
    const feitaPelaIa = (id: number) => proposta(id, StatusPropostaIaEnum.CONFIRMADA, { aplicadaPelaIa: true });
    const avisoDaIa = (montado: Montado) => montado.elemento.querySelector('.proposta-grupo__aviso');

    it('grupo misto: a linha azul vem em cima, o cabeçalho trata só do que espera o usuário e a lista mostra tudo', async () => {
      const montado = await montarGrupo([11, 12, 13], { 11: feitaPelaIa(11) });
      expect(avisoDaIa(montado)?.textContent?.replace(/\s+/g, ' ')).toContain('A IA já fez 1 de 3');
      expect(cabecalho(montado)).toContain('2 esperando você');
      expect(cabecalho(montado)).not.toContain('feita');
      // "Todas" seria mentira: uma já foi feita, o botão diz quantas ainda esperam.
      expect(botao(montado, 'Confirmar 2')).toBeDefined();
      expect(botao(montado, 'Recusar 2')).toBeDefined();
      expect(botao(montado, 'Confirmar todas')).toBeUndefined();
      expect(linhas(montado)).toHaveLength(3);
      expect(montado.elemento.querySelectorAll('.proposta-linha--ia')).toHaveLength(1);
      expect(texto(montado)).toContain('Feito pela IA');
    });

    it('Confirmar, no grupo misto, leva só as pendentes: o que a IA fez não entra de novo', async () => {
      const montado = await montarGrupo([11, 12, 13], { 11: feitaPelaIa(11) });
      botao(montado, 'Confirmar 2')!.click();
      const pedido = esperarRequisicao(montado.http, 'POST', '/proposta-ia/grupo/confirmar');
      expect(pedido.request.body).toEqual({ propostaIds: [12, 13] });
      responderSucesso(pedido, { itens: [12, 13].map((id) => item(id, PropostaIaGrupoSituacaoEnum.RESOLVIDA, feita(id))) });
      detectar(montado);
      expect(avisoDaIa(montado)).toBeNull();
      expect(cabecalho(montado)).toContain('3 feitas');
    });

    it('sem nada feito pela IA não há linha azul', async () => {
      const montado = await montarGrupo([11, 12]);
      expect(avisoDaIa(montado)).toBeNull();
    });

    it('tudo feito pela IA não é misto: sem linha azul, o cabeçalho resume como feito pela IA', async () => {
      const montado = await montarGrupo([11, 12], { 11: feitaPelaIa(11), 12: feitaPelaIa(12) });
      expect(avisoDaIa(montado)).toBeNull();
      expect(cabecalho(montado)).toContain('2 feitas pela IA');
      expect(botao(montado, 'Desfazer todas')).toBeDefined();
    });

    it('Desfazer, na linha azul, desfaz só o que a IA fez e deixa a pendente como está', async () => {
      const montado = await montarGrupo([11, 12, 13], { 11: feitaPelaIa(11), 12: feitaPelaIa(12) });
      botao(montado, 'Desfazer')!.click();
      const pedido = esperarRequisicao(montado.http, 'POST', '/proposta-ia/grupo/desfazer');
      expect(pedido.request.body).toEqual({ propostaIds: [11, 12] });
      responderSucesso(pedido, { itens: [11, 12].map((id) => item(id, PropostaIaGrupoSituacaoEnum.RESOLVIDA, proposta(id, StatusPropostaIaEnum.DESFEITA, { aplicadaPelaIa: true }))) });
      detectar(montado);
      expect(avisoDaIa(montado)).toBeNull();
      expect(cabecalho(montado)).toContain('1 esperando você');
      expect(cabecalho(montado)).toContain('2 desfeitas');
    });

    it('Desfazer some da linha azul quando passou o prazo da que a IA fez', async () => {
      const velha = proposta(11, StatusPropostaIaEnum.CONFIRMADA, { aplicadaPelaIa: true, resolucaoData: new Date(Date.now() - 45 * 60_000).toISOString() });
      const montado = await montarGrupo([11, 12], { 11: velha });
      expect(avisoDaIa(montado)).not.toBeNull();
      expect(avisoDaIa(montado)?.querySelector('button')).toBeNull();
    });
  });
});
