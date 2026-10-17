import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AnotacaoResumoDto, diaMesNoFuso, TIPOS_ANOTACAO_ORDENADOS, TipoAnotacaoEnum, TipoUsuarioEnum } from '@project20/shared';
import { AnotacaoService } from './anotacao.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ConflictException } from '../../../core/exceptions/conflict.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { AnotacaoSecoesModificarDados, AnotacaoTextoNovo } from '../repositories/anotacao.repository';

const FUSO = 'America/Sao_Paulo';
const DESENVOLVEDOR_DONO = { sub: 7, tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const OUTRO_DESENVOLVEDOR = { sub: 8, tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const GESTOR = { sub: 1, tipo: TipoUsuarioEnum.GESTOR } as never;
const ADMINISTRADOR = { sub: 2, tipo: TipoUsuarioEnum.ADMINISTRADOR } as never;

/** Repositório em memória: a "transação" só grava se o modificador não lançar, como a real. */
function criarRepositorio(textosIniciais: Partial<Record<TipoAnotacaoEnum, string>> = {}, usuarioExiste = true) {
  const secoes = new Map<TipoAnotacaoEnum, AnotacaoResumoDto>();
  let relogio = 1_000;
  for (const tipo of TIPOS_ANOTACAO_ORDENADOS) {
    secoes.set(tipo, { id: secoes.size + 1, usuarioId: 7, tipo, texto: textosIniciais[tipo] ?? '', updatedDate: new Date(relogio) });
  }
  let gravacoes = 0;
  return {
    secoes,
    get gravacoes() { return gravacoes; },
    listar: async (dto: { tipos?: TipoAnotacaoEnum[] }) =>
      usuarioExiste ? TIPOS_ANOTACAO_ORDENADOS.filter((t) => !dto.tipos || dto.tipos.includes(t)).map((t) => ({ ...secoes.get(t)! })) : [],
    modificarSecoes: async (
      dados: AnotacaoSecoesModificarDados,
      modificador: (atuais: AnotacaoResumoDto[]) => AnotacaoTextoNovo[],
    ) => {
      const atuais = usuarioExiste
        ? TIPOS_ANOTACAO_ORDENADOS.filter((t) => dados.tipos.includes(t)).map((t) => ({ ...secoes.get(t)! }))
        : [];
      const novos = modificador(atuais);
      return novos.map((novo) => {
        relogio += 10;
        gravacoes++;
        const gravada = { ...secoes.get(novo.tipo)!, texto: novo.texto, updatedDate: new Date(relogio) };
        secoes.set(novo.tipo, gravada);
        return { ...gravada };
      });
    },
  };
}

function criarServico(repositorio: ReturnType<typeof criarRepositorio>): AnotacaoService {
  const configService = { obter: () => ({ aplicacao: { fusoHorario: FUSO } }) };
  return new AnotacaoService(repositorio as never, configService as never);
}

// --- Permissão ---------------------------------------------------------------------------------

test('o dono lê e altera o próprio pad; gestor e administrador, o de qualquer um', async () => {
  const servico = criarServico(criarRepositorio());
  for (const usuario of [DESENVOLVEDOR_DONO, GESTOR, ADMINISTRADOR]) {
    const resposta = await servico.listar({ usuarioId: 7 }, usuario);
    assert.equal(resposta.dados!.length, 5);
  }
});

test('desenvolvedor não toca no pad de outro (403) em nenhuma operação', async () => {
  const repositorio = criarRepositorio({ FEITO: 'x' });
  const servico = criarServico(repositorio);
  const data = new Date(1_000);
  await assert.rejects(() => servico.listar({ usuarioId: 7 }, OUTRO_DESENVOLVEDOR), UnauthorizedAccessException);
  await assert.rejects(() => servico.alterar({ usuarioId: 7, tipo: TipoAnotacaoEnum.FEITO, texto: 'y', updatedDateLido: data }, OUTRO_DESENVOLVEDOR), UnauthorizedAccessException);
  await assert.rejects(() => servico.trocarTrecho({ usuarioId: 7, tipo: TipoAnotacaoEnum.FEITO, trechoAntigo: 'x', trechoNovo: 'y' }, OUTRO_DESENVOLVEDOR), UnauthorizedAccessException);
  await assert.rejects(() => servico.anexarTexto({ usuarioId: 7, tipo: TipoAnotacaoEnum.FEITO, texto: 'y' }, OUTRO_DESENVOLVEDOR), UnauthorizedAccessException);
  await assert.rejects(() => servico.anexarFeito({ usuarioId: 7, texto: 'y' }, OUTRO_DESENVOLVEDOR), UnauthorizedAccessException);
  await assert.rejects(() => servico.moverTrecho({ usuarioId: 7, tipoOrigem: TipoAnotacaoEnum.FEITO, tipoDestino: TipoAnotacaoEnum.PESSOAL, trecho: 'x', updatedDateOrigemLido: data, updatedDateDestinoLido: data }, OUTRO_DESENVOLVEDOR), UnauthorizedAccessException);
  assert.equal(repositorio.gravacoes, 0);
});

test('usuário sem seções (inexistente) dá 404', async () => {
  const servico = criarServico(criarRepositorio({}, false));
  await assert.rejects(() => servico.listar({ usuarioId: 7 }, GESTOR), ResourceNotFoundException);
  await assert.rejects(
    () => servico.alterar({ usuarioId: 7, tipo: TipoAnotacaoEnum.FEITO, texto: 'x', updatedDateLido: new Date(1_000) }, GESTOR),
    ResourceNotFoundException,
  );
});

test('listar devolve só as seções pedidas, na ordem de exibição', async () => {
  const servico = criarServico(criarRepositorio());
  const resposta = await servico.listar({ usuarioId: 7, tipos: [TipoAnotacaoEnum.PESSOAL, TipoAnotacaoEnum.FEITO] }, GESTOR);
  assert.deepEqual(resposta.dados!.map((s) => s.tipo), [TipoAnotacaoEnum.FEITO, TipoAnotacaoEnum.PESSOAL]);
});

// --- Concorrência ------------------------------------------------------------------------------

test('alterar com a data lida grava; com a data velha dá conflito e não grava', async () => {
  const repositorio = criarRepositorio({ FEITO: 'original' });
  const servico = criarServico(repositorio);
  const lida = repositorio.secoes.get(TipoAnotacaoEnum.FEITO)!.updatedDate;

  const primeira = await servico.alterar({ usuarioId: 7, tipo: TipoAnotacaoEnum.FEITO, texto: 'novo', updatedDateLido: lida }, DESENVOLVEDOR_DONO);
  assert.equal(primeira.dados!.texto, 'novo');

  await assert.rejects(
    () => servico.alterar({ usuarioId: 7, tipo: TipoAnotacaoEnum.FEITO, texto: 'outro', updatedDateLido: lida }, DESENVOLVEDOR_DONO),
    ConflictException,
  );
  assert.equal(repositorio.secoes.get(TipoAnotacaoEnum.FEITO)!.texto, 'novo');
});

// --- Edição pontual ----------------------------------------------------------------------------

test('trocarTrecho troca um trecho único e preserva o resto', async () => {
  const repositorio = criarRepositorio({ EM_ANDAMENTO: '- a\n- b\n- c' });
  const resposta = await criarServico(repositorio).trocarTrecho(
    { usuarioId: 7, tipo: TipoAnotacaoEnum.EM_ANDAMENTO, trechoAntigo: '- b', trechoNovo: '- B' }, DESENVOLVEDOR_DONO,
  );
  assert.equal(resposta.dados!.texto, '- a\n- B\n- c');
});

test('trocarTrecho recusa trecho ausente e ambíguo sem gravar', async () => {
  const repositorio = criarRepositorio({ EM_ANDAMENTO: 'x y x' });
  const servico = criarServico(repositorio);
  await assert.rejects(() => servico.trocarTrecho({ usuarioId: 7, tipo: TipoAnotacaoEnum.EM_ANDAMENTO, trechoAntigo: 'z', trechoNovo: 'a' }, GESTOR), BusinessException);
  await assert.rejects(() => servico.trocarTrecho({ usuarioId: 7, tipo: TipoAnotacaoEnum.EM_ANDAMENTO, trechoAntigo: 'x', trechoNovo: 'a' }, GESTOR), BusinessException);
  assert.equal(repositorio.gravacoes, 0);
});

test('trocarTrecho com a data lida velha dá conflito', async () => {
  const servico = criarServico(criarRepositorio({ EM_ANDAMENTO: 'a' }));
  await assert.rejects(
    () => servico.trocarTrecho({ usuarioId: 7, tipo: TipoAnotacaoEnum.EM_ANDAMENTO, trechoAntigo: 'a', trechoNovo: 'b', updatedDateLido: new Date(1) }, GESTOR),
    ConflictException,
  );
});

// --- Anexar ------------------------------------------------------------------------------------

test('anexarTexto em seção vazia e em seção com conteúdo', async () => {
  const servico = criarServico(criarRepositorio({ LEMBRETE: 'um' }));
  assert.equal((await servico.anexarTexto({ usuarioId: 7, tipo: TipoAnotacaoEnum.PENDENCIA, texto: 'a' }, GESTOR)).dados!.texto, 'a');
  assert.equal((await servico.anexarTexto({ usuarioId: 7, tipo: TipoAnotacaoEnum.LEMBRETE, texto: 'dois' }, GESTOR)).dados!.texto, 'um\n\ndois');
});

test('anexarFeito cria o título do dia uma vez e reaproveita nas chamadas seguintes', async () => {
  const servico = criarServico(criarRepositorio());
  const hoje = diaMesNoFuso(new Date(), FUSO);
  const primeira = await servico.anexarFeito({ usuarioId: 7, texto: 'fiz A' }, DESENVOLVEDOR_DONO);
  assert.equal(primeira.dados!.texto, `## ${hoje}\nfiz A`);
  const segunda = await servico.anexarFeito({ usuarioId: 7, texto: 'fiz B' }, DESENVOLVEDOR_DONO);
  assert.equal(segunda.dados!.texto, `## ${hoje}\nfiz A\nfiz B`);
});

// --- Mover -------------------------------------------------------------------------------------

function dadosDeMover(repositorio: ReturnType<typeof criarRepositorio>, trecho: string) {
  return {
    usuarioId: 7,
    tipoOrigem: TipoAnotacaoEnum.EM_ANDAMENTO,
    tipoDestino: TipoAnotacaoEnum.PENDENCIA,
    trecho,
    updatedDateOrigemLido: repositorio.secoes.get(TipoAnotacaoEnum.EM_ANDAMENTO)!.updatedDate,
    updatedDateDestinoLido: repositorio.secoes.get(TipoAnotacaoEnum.PENDENCIA)!.updatedDate,
  };
}

test('moverTrecho tira da origem e anexa ao fim do destino', async () => {
  const repositorio = criarRepositorio({ EM_ANDAMENTO: 'a\nb\nc', PENDENCIA: 'p' });
  const resposta = await criarServico(repositorio).moverTrecho(dadosDeMover(repositorio, 'b'), DESENVOLVEDOR_DONO);
  assert.equal(resposta.dados!.origem.texto, 'a\nc');
  assert.equal(resposta.dados!.destino.texto, 'p\n\nb');
});

test('moverTrecho: se a origem não tem o trecho, nenhuma das duas muda', async () => {
  const repositorio = criarRepositorio({ EM_ANDAMENTO: 'a', PENDENCIA: 'p' });
  await assert.rejects(() => criarServico(repositorio).moverTrecho(dadosDeMover(repositorio, 'z'), GESTOR), BusinessException);
  assert.equal(repositorio.gravacoes, 0);
  assert.equal(repositorio.secoes.get(TipoAnotacaoEnum.PENDENCIA)!.texto, 'p');
});

test('moverTrecho: versão velha de qualquer uma das duas dá conflito e nada muda', async () => {
  const repositorio = criarRepositorio({ EM_ANDAMENTO: 'a', PENDENCIA: 'p' });
  const servico = criarServico(repositorio);
  await assert.rejects(() => servico.moverTrecho({ ...dadosDeMover(repositorio, 'a'), updatedDateOrigemLido: new Date(1) }, GESTOR), ConflictException);
  await assert.rejects(() => servico.moverTrecho({ ...dadosDeMover(repositorio, 'a'), updatedDateDestinoLido: new Date(1) }, GESTOR), ConflictException);
  assert.equal(repositorio.gravacoes, 0);
});

test('moverTrecho recusa origem igual ao destino e trecho ambíguo', async () => {
  const repositorio = criarRepositorio({ EM_ANDAMENTO: 'x x', PENDENCIA: '' });
  const servico = criarServico(repositorio);
  await assert.rejects(() => servico.moverTrecho({ ...dadosDeMover(repositorio, 'x'), tipoDestino: TipoAnotacaoEnum.EM_ANDAMENTO }, GESTOR), BusinessException);
  await assert.rejects(() => servico.moverTrecho(dadosDeMover(repositorio, 'x'), GESTOR), BusinessException);
  assert.equal(repositorio.gravacoes, 0);
});
