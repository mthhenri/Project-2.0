import { describe, expect, it } from 'vitest';
import { AutorMensagemDiretaEnum } from '@project20/shared';
import { extrairEventos } from '../../chat/utils/chat.util';
import {
  ConversaNaLista,
  MensagemNaConversa,
  agruparPorDia,
  aplicarMensagemNaLista,
  dataDaUltimaDoOutro,
  devePublicarDigitacao,
  ESPERA_ENTRE_AVISOS_DE_DIGITACAO_MS,
  VALIDADE_DO_DIGITANDO_MS,
  esperaDaReconexao,
  filtrarPessoasPorNome,
  gerarMensagemId,
  idDaUltimaLidaPelaOutraPessoa,
  iniciais,
  mesclarMensagens,
  normalizarConversa,
  normalizarMensagem,
  previaDaMensagem,
  rotuloDaLista,
  rotuloDoDia,
  semSinalHaMuito,
  totalNaoLidas,
  trechosComRealce,
  zerarNaoLidas,
} from './mensagem-direta.util';

const EU = 4;
const OUTRO = 9;

function mensagem(id: string, minutos: number, autor = OUTRO, parcial: Partial<MensagemNaConversa> = {}): MensagemNaConversa {
  return {
    mensagemId: id,
    conversaId: '4-9',
    autor: AutorMensagemDiretaEnum.USUARIO,
    autorUsuarioId: autor,
    texto: `texto ${id}`,
    contemCodigo: false,
    mencoes: [],
    referencias: [],
    respondeA: null,
    createdDate: new Date(2026, 9, 21, 14, minutos),
    situacao: 'ENVIADA',
    ...parcial,
  };
}

function conversa(id: string, naoLidas = 0): ConversaNaLista {
  return {
    conversaId: `4-${id}`, usuarioId: Number(id), usuarioNome: `Pessoa ${id}`, naoLidas, silenciada: false, online: false,
    ultimaMensagem: { ...mensagem(`u${id}`, 0), conversaId: `4-${id}` },
  };
}

describe('gerarMensagemId', () => {
  const REGEX_UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it('gera um UUID v4 diferente a cada chamada', () => {
    const ids = new Set(Array.from({ length: 50 }, () => gerarMensagemId()));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(REGEX_UUID_V4);
  });

  it('sem crypto.randomUUID (contexto inseguro) usa getRandomValues e continua gerando UUID v4', () => {
    const original = globalThis.crypto.randomUUID;
    Object.defineProperty(globalThis.crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      for (let i = 0; i < 20; i++) expect(gerarMensagemId()).toMatch(REGEX_UUID_V4);
    } finally {
      Object.defineProperty(globalThis.crypto, 'randomUUID', { value: original, configurable: true });
    }
  });
});

describe('esperaDaReconexao', () => {
  it('dobra a cada tentativa até o teto de 30 s, com sorteio entre metade e o total', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 10].map((tentativa) => esperaDaReconexao(tentativa, () => 1))).toEqual([1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000, 30_000]);
    expect(esperaDaReconexao(2, () => 0)).toBe(2_000);
    expect(esperaDaReconexao(0, () => 0.5)).toBe(750);
  });

  it('tentativa negativa vale a primeira', () => {
    expect(esperaDaReconexao(-3, () => 1)).toBe(1_000);
  });
});

describe('semSinalHaMuito', () => {
  it('passa de 70 s sem dado, a conexão é considerada meio aberta', () => {
    expect(semSinalHaMuito(1_000, 1_000 + 70_000)).toBe(false);
    expect(semSinalHaMuito(1_000, 1_000 + 70_001)).toBe(true);
  });
});

describe('leitura do stream (extrairEventos generalizado)', () => {
  it('lê os eventos completos, devolve o resto cortado e ignora o malformado', () => {
    const { eventos, resto } = extrairEventos<{ tipo: string }>('data: {"tipo":"ABERTURA"}\n\ndata: {nada\n\ndata: {"tipo":"BATIMENTO"}\n\ndata: {"tip');
    expect(eventos).toEqual([{ tipo: 'ABERTURA' }, { tipo: 'BATIMENTO' }]);
    expect(resto).toBe('data: {"tip');
  });
});

describe('mensagens', () => {
  it('normalizarMensagem converte a data de texto ISO em Date', () => {
    const lida = normalizarMensagem({ ...mensagem('a', 0), createdDate: '2026-10-21T14:05:11.482Z' as never });
    expect(lida.createdDate).toBeInstanceOf(Date);
    expect(lida.createdDate.toISOString()).toBe('2026-10-21T14:05:11.482Z');
    expect(lida.situacao).toBe('ENVIADA');
  });

  it('mesclarMensagens: ordem cronológica, sem repetir, e a versão que chegou vence a otimista', () => {
    const otimista = mensagem('b', 5, EU, { situacao: 'ENVIANDO' });
    const atuais = [mensagem('a', 1), otimista];
    const chegadas = [mensagem('b', 5, EU, { situacao: 'ENVIADA', texto: 'do servidor' }), mensagem('c', 9)];
    const resultado = mesclarMensagens(atuais, chegadas);
    expect(resultado.map((m) => m.mensagemId)).toEqual(['a', 'b', 'c']);
    expect(resultado[1].situacao).toBe('ENVIADA');
    expect(resultado[1].texto).toBe('do servidor');
  });

  it('mesclar a mesma mensagem duas vezes não duplica, e a mesma data desempata pelo id', () => {
    const duas = [mensagem('b', 5), mensagem('a', 5)];
    expect(mesclarMensagens(duas, duas).map((m) => m.mensagemId)).toEqual(['a', 'b']);
  });

  it('uma página mais antiga entra antes sem reordenar o que já estava', () => {
    const atuais = [mensagem('c', 10), mensagem('d', 11)];
    expect(mesclarMensagens(atuais, [mensagem('a', 1), mensagem('b', 2)]).map((m) => m.mensagemId)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('dias e horas', () => {
  const agora = new Date(2026, 9, 21, 15, 0);

  it('rotuloDoDia: Hoje, Ontem ou a data', () => {
    expect(rotuloDoDia(new Date(2026, 9, 21, 1, 0), agora)).toBe('Hoje');
    expect(rotuloDoDia(new Date(2026, 9, 20, 23, 59), agora)).toBe('Ontem');
    expect(rotuloDoDia(new Date(2026, 9, 5, 12, 0), agora)).toBe('05/10/2026');
  });

  it('agruparPorDia separa as mensagens por dia, em ordem', () => {
    const ontem = mensagem('a', 0, OUTRO, { createdDate: new Date(2026, 9, 20, 10, 0) });
    const grupos = agruparPorDia([ontem, mensagem('b', 1), mensagem('c', 2)], agora);
    expect(grupos.map((g) => [g.rotulo, g.mensagens.length])).toEqual([['Ontem', 1], ['Hoje', 2]]);
  });

  it('rotuloDaLista: hora hoje, Ontem, dia da semana nesta semana, senão a data', () => {
    expect(rotuloDaLista(new Date(2026, 9, 21, 9, 5), agora)).toBe('09:05');
    expect(rotuloDaLista(new Date(2026, 9, 20, 9, 5), agora)).toBe('Ontem');
    expect(rotuloDaLista(new Date(2026, 9, 19, 9, 5), agora)).toBe('Seg');
    expect(rotuloDaLista(new Date(2026, 9, 10, 9, 5), agora)).toBe('10/10/2026');
  });
});

describe('Lida e leitura', () => {
  it('o "Lida" fica só na última mensagem minha que o outro já viu', () => {
    const mensagens = [mensagem('a', 1, EU), mensagem('b', 2, EU), mensagem('c', 3, OUTRO), mensagem('d', 6, EU)];
    expect(idDaUltimaLidaPelaOutraPessoa(mensagens, EU, new Date(2026, 9, 21, 14, 4))).toBe('b');
    expect(idDaUltimaLidaPelaOutraPessoa(mensagens, EU, new Date(2026, 9, 21, 14, 6))).toBe('d');
    expect(idDaUltimaLidaPelaOutraPessoa(mensagens, EU, null)).toBeNull();
    expect(idDaUltimaLidaPelaOutraPessoa(mensagens, EU, new Date(2026, 9, 21, 13, 0))).toBeNull();
  });

  it('mensagem minha ainda não enviada nunca ganha "Lida"', () => {
    expect(idDaUltimaLidaPelaOutraPessoa([mensagem('a', 1, EU, { situacao: 'ENVIANDO' })], EU, new Date(2026, 9, 21, 15, 0))).toBeNull();
  });

  it('dataDaUltimaDoOutro: a mais nova do outro, ignorando as minhas e as locais', () => {
    const mensagens = [mensagem('a', 1, OUTRO), mensagem('b', 5, EU), mensagem('c', 3, OUTRO)];
    expect(dataDaUltimaDoOutro(mensagens, EU)).toEqual(new Date(2026, 9, 21, 14, 3));
    expect(dataDaUltimaDoOutro([mensagem('x', 1, EU)], EU)).toBeNull();
  });
});

describe('lista de conversas', () => {
  it('normalizarConversa converte a data da última mensagem', () => {
    const lida = normalizarConversa({ ...conversa('9'), ultimaMensagem: { ...mensagem('a', 0), createdDate: '2026-10-21T14:05:11.482Z' as never } });
    expect(lida.ultimaMensagem?.createdDate).toBeInstanceOf(Date);
    expect(normalizarConversa({ ...conversa('9'), ultimaMensagem: null }).ultimaMensagem).toBeNull();
  });

  it('iniciais: primeira e última palavra, em maiúsculas', () => {
    expect(iniciais('Camila Duarte')).toBe('CD');
    expect(iniciais('  rafael   de souza lima ')).toBe('RL');
    expect(iniciais('Madonna')).toBe('M');
    expect(iniciais('   ')).toBe('?');
  });

  it('previaDaMensagem: sem marcação, código vira [código], a minha começa com Você:', () => {
    expect(previaDaMensagem('**Oi** tudo bem?', false, false)).toBe('Oi tudo bem?');
    expect(previaDaMensagem('veja\n\n```ts\nconst a = 1;\n```', true, true)).toBe('Você: veja [código]');
    expect(previaDaMensagem('```ts\nx\n```', true, false)).toBe('[código]');
    expect(previaDaMensagem('```ts\nbloco sem fechar', true, false)).toBe('[código]');
  });

  it('aplicarMensagemNaLista: sobe a conversa ao topo e conta uma não lida só se for do outro e a conversa não estiver aberta', () => {
    const lista = [conversa('7', 1), conversa('9', 0)];
    const nova = mensagem('n1', 30, OUTRO);

    const fechada = aplicarMensagemNaLista(lista, nova, EU, null);
    expect(fechada.conversas.map((c) => c.conversaId)).toEqual(['4-9', '4-7']);
    expect(fechada.conversas[0].naoLidas).toBe(1);
    expect(fechada.conversas[0].ultimaMensagem?.mensagemId).toBe('n1');
    expect(totalNaoLidas(fechada.conversas)).toBe(2);

    expect(aplicarMensagemNaLista(lista, nova, EU, '4-9').conversas[0].naoLidas).toBe(0);
    expect(aplicarMensagemNaLista(lista, mensagem('n2', 31, EU), EU, null).conversas[0].naoLidas).toBe(0);
  });

  it('a mesma mensagem recebida duas vezes não conta duas não lidas', () => {
    const nova = mensagem('n1', 30, OUTRO);
    const uma = aplicarMensagemNaLista([conversa('9')], nova, EU, null).conversas;
    const duas = aplicarMensagemNaLista(uma, nova, EU, null).conversas;
    expect(duas[0].naoLidas).toBe(1);
  });

  it('mensagem de conversa que a lista não tem pede para reler a lista, sem alterar nada', () => {
    const lista = [conversa('7')];
    const resultado = aplicarMensagemNaLista(lista, mensagem('x', 1, OUTRO), EU, null);
    expect(resultado.conversaDesconhecida).toBe(true);
    expect(resultado.conversas).toBe(lista);
  });

  it('uma mensagem mais antiga que a última não troca a prévia', () => {
    const lista = [{ ...conversa('9'), ultimaMensagem: { ...mensagem('recente', 50), conversaId: '4-9' } }];
    const resultado = aplicarMensagemNaLista(lista, mensagem('velha', 10, OUTRO), EU, '4-9');
    expect(resultado.conversas[0].ultimaMensagem?.mensagemId).toBe('recente');
  });

  it('zerarNaoLidas zera só a conversa pedida', () => {
    const zerada = zerarNaoLidas([conversa('7', 3), conversa('9', 2)], '4-9');
    expect(zerada.map((c) => c.naoLidas)).toEqual([3, 0]);
  });
});

describe('busca', () => {
  it('trechosComRealce marca as palavras sem acento nem maiúsculas, em texto puro', () => {
    expect(trechosComRealce('A Descrição do filtro', 'descricao FILTRO')).toEqual([
      { texto: 'A ', realce: false },
      { texto: 'Descrição', realce: true },
      { texto: ' do ', realce: false },
      { texto: 'filtro', realce: true },
    ]);
  });

  it('sem busca, sem casamento ou sem texto devolve o texto inteiro sem realce', () => {
    expect(trechosComRealce('nada aqui', '')).toEqual([{ texto: 'nada aqui', realce: false }]);
    expect(trechosComRealce('nada aqui', 'xyz')).toEqual([{ texto: 'nada aqui', realce: false }]);
    expect(trechosComRealce('', 'a')).toEqual([{ texto: '', realce: false }]);
  });

  it('marcação dentro do texto não vira HTML: continua texto', () => {
    expect(trechosComRealce('<b>filtro</b>', 'filtro').map((t) => t.texto).join('')).toBe('<b>filtro</b>');
  });

  it('filtrarPessoasPorNome: todas as palavras, sem acento', () => {
    const pessoas = [{ usuarioNome: 'José Antônio' }, { usuarioNome: 'Camila Duarte' }];
    expect(filtrarPessoasPorNome(pessoas, 'jose ant')).toEqual([pessoas[0]]);
    expect(filtrarPessoasPorNome(pessoas, '')).toBe(pessoas);
    expect(filtrarPessoasPorNome(pessoas, 'zzz')).toEqual([]);
  });
});

describe('devePublicarDigitacao', () => {
  it('avisa na primeira vez e só de novo depois da espera', () => {
    expect(devePublicarDigitacao(null, 1_000)).toBe(true);
    expect(devePublicarDigitacao(1_000, 1_000 + ESPERA_ENTRE_AVISOS_DE_DIGITACAO_MS - 1)).toBe(false);
    expect(devePublicarDigitacao(1_000, 1_000 + ESPERA_ENTRE_AVISOS_DE_DIGITACAO_MS)).toBe(true);
  });

  it('o "digitando…" dura mais que o intervalo entre avisos, para não piscar enquanto a pessoa digita', () => {
    expect(VALIDADE_DO_DIGITANDO_MS).toBeGreaterThan(ESPERA_ENTRE_AVISOS_DE_DIGITACAO_MS);
  });
});
