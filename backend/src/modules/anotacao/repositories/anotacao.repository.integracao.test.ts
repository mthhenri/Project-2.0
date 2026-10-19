import * as assert from 'node:assert/strict';
import { TipoAnotacaoEnum, TipoUsuarioEnum } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ConflictException } from '../../../core/exceptions/conflict.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { ConexaoTeste, testarComBanco } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarDesenvolvedor, DATA_BASE_TESTE } from '../../../testes/fabricas';
import { AnotacaoService } from '../services/anotacao.service';
import { AnotacaoRepository } from './anotacao.repository';

// SYSTEM.SPEC.md §12 (anotacao): cinco seções por usuário, conflito por updatedDate, mover atômico, ordem de exibição.
// A service entra com o repository real onde a regra (409, mover) depende do SQL.

const ORDEM = [
  TipoAnotacaoEnum.EM_ANDAMENTO,
  TipoAnotacaoEnum.FEITO,
  TipoAnotacaoEnum.PENDENCIA,
  TipoAnotacaoEnum.LEMBRETE,
  TipoAnotacaoEnum.PESSOAL,
];

const configService = { obter: () => ({ aplicacao: { fusoHorario: 'America/Sao_Paulo' } }) } as unknown as ConfigService;
const GESTOR = { sub: 999, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;

/** O cadastro do usuário cria o pad (usuario.repository); a fábrica de usuário não, então as cinco seções entram aqui. */
async function criarPad(conexao: ConexaoTeste, textos: Partial<Record<TipoAnotacaoEnum, string>> = {}) {
  const usuario = await criarDesenvolvedor(conexao);
  await conexao.raw(
    `INSERT INTO anotacao (usuario_id, tipo_anotacao_id, texto, created_date, updated_date, is_deleted)
     SELECT :usuarioId, tipo_anotacao.id, COALESCE((:textos::jsonb) ->> tipo_anotacao.codigo, ''),
            :dataBase::timestamptz, :dataBase::timestamptz, false
     FROM tipo_anotacao WHERE tipo_anotacao.is_deleted = false`,
    { usuarioId: usuario.id, textos: JSON.stringify(textos), dataBase: DATA_BASE_TESTE },
  );
  return usuario;
}

function criarServico(conexao: ConexaoTeste) {
  const repositorio = criarRepositorio(AnotacaoRepository, conexao);
  return { repositorio, servico: new AnotacaoService(repositorio, configService) };
}

const secaoDe = async (repositorio: AnotacaoRepository, usuarioId: number, tipo: TipoAnotacaoEnum) =>
  (await repositorio.listar({ usuarioId, tipos: [tipo] }))[0];
const textoDe = async (repositorio: AnotacaoRepository, usuarioId: number, tipo: TipoAnotacaoEnum) =>
  (await secaoDe(repositorio, usuarioId, tipo)).texto;

testarComBanco('listar devolve as cinco seções na ordem de exibição', async (conexao) => {
  const { repositorio } = criarServico(conexao);
  const usuario = await criarPad(conexao);
  assert.deepEqual((await repositorio.listar({ usuarioId: usuario.id })).map((secao) => secao.tipo), ORDEM);
});

testarComBanco('listar com tipos devolve só as pedidas, ainda na ordem de exibição', async (conexao) => {
  const { repositorio } = criarServico(conexao);
  const usuario = await criarPad(conexao, { LEMBRETE: 'avisar' });
  const secoes = await repositorio.listar({ usuarioId: usuario.id, tipos: [TipoAnotacaoEnum.PESSOAL, TipoAnotacaoEnum.LEMBRETE] });
  assert.deepEqual(secoes.map((secao) => secao.tipo), [TipoAnotacaoEnum.LEMBRETE, TipoAnotacaoEnum.PESSOAL]);
  assert.equal(secoes[0].texto, 'avisar');
});

testarComBanco('listar não mistura o pad de outro usuário e ignora seção excluída', async (conexao) => {
  const { repositorio } = criarServico(conexao);
  const dono = await criarPad(conexao, { PESSOAL: 'meu' });
  const outro = await criarPad(conexao, { PESSOAL: 'dele' });
  await conexao.raw(
    `UPDATE anotacao SET is_deleted = true FROM tipo_anotacao
     WHERE tipo_anotacao.id = anotacao.tipo_anotacao_id AND tipo_anotacao.codigo = 'FEITO' AND anotacao.usuario_id = :usuarioId`,
    { usuarioId: dono.id });

  const secoes = await repositorio.listar({ usuarioId: dono.id });
  assert.equal(secoes.length, 4);
  assert.ok(!secoes.some((secao) => secao.tipo === TipoAnotacaoEnum.FEITO));
  assert.ok(secoes.every((secao) => secao.usuarioId === dono.id));
  assert.equal((await repositorio.listar({ usuarioId: outro.id })).length, 5);
});

testarComBanco('usuário sem pad (criado por SQL ou script): listar cria as cinco seções vazias e as devolve, sem 404', async (conexao) => {
  const { repositorio, servico } = criarServico(conexao);
  const semPad = await criarDesenvolvedor(conexao);
  const secoes = (await servico.listar({ usuarioId: semPad.id }, GESTOR)).dados!;
  assert.deepEqual(secoes.map((secao) => secao.tipo), ORDEM);
  assert.ok(secoes.every((secao) => secao.texto === '' && secao.usuarioId === semPad.id));
  const gravadas = await conexao.raw('SELECT COUNT(*)::int AS total FROM anotacao WHERE usuario_id = :usuarioId AND is_deleted = false', { usuarioId: semPad.id });
  assert.equal(gravadas.rows[0].total, 5);
  assert.equal((await repositorio.listar({ usuarioId: semPad.id })).length, 5, 'a segunda leitura não cria de novo');
});

testarComBanco('listar com tipos num usuário sem pad cria o pad inteiro e devolve só os pedidos', async (conexao) => {
  const { repositorio } = criarServico(conexao);
  const semPad = await criarDesenvolvedor(conexao);
  const secoes = await repositorio.listar({ usuarioId: semPad.id, tipos: [TipoAnotacaoEnum.PESSOAL] });
  assert.deepEqual(secoes.map((secao) => secao.tipo), [TipoAnotacaoEnum.PESSOAL]);
  assert.equal((await repositorio.listar({ usuarioId: semPad.id })).length, 5);
});

testarComBanco('anotar num usuário sem pad também funciona (a IA e o PUT não dependem de abrir o pad antes)', async (conexao) => {
  const { repositorio, servico } = criarServico(conexao);
  const semPad = await criarDesenvolvedor(conexao);
  const gravada = await servico.anexarTexto({ usuarioId: semPad.id, tipo: TipoAnotacaoEnum.LEMBRETE, texto: 'ligar para o cliente' }, GESTOR);
  assert.match(gravada.dados!.texto, /ligar para o cliente/);
  assert.equal((await repositorio.listar({ usuarioId: semPad.id })).length, 5);
});

testarComBanco('criarSecoesFaltantes: usuário inexistente ou excluído não ganha seção, e o pad segue 404 para a service', async (conexao) => {
  const { repositorio, servico } = criarServico(conexao);
  const excluido = await criarDesenvolvedor(conexao);
  await conexao.raw('UPDATE usuario SET is_deleted = true WHERE id = :usuarioId', { usuarioId: excluido.id });
  assert.equal(await repositorio.criarSecoesFaltantes({ usuarioId: excluido.id }), 0);
  assert.equal(await repositorio.criarSecoesFaltantes({ usuarioId: 2_000_000_000 }), 0);
  await assert.rejects(servico.listar({ usuarioId: excluido.id }, GESTOR), ResourceNotFoundException);
});

testarComBanco('criarSecoesFaltantes é idempotente: repetir a chamada (mesmo disparada junto) não duplica seção', async (conexao) => {
  const { repositorio } = criarServico(conexao);
  const semPad = await criarDesenvolvedor(conexao);
  const criadas = await Promise.all([repositorio.criarSecoesFaltantes({ usuarioId: semPad.id }), repositorio.criarSecoesFaltantes({ usuarioId: semPad.id })]);
  assert.equal(criadas[0] + criadas[1], 5);
  assert.equal(await repositorio.criarSecoesFaltantes({ usuarioId: semPad.id }), 0);
  const total = await conexao.raw('SELECT COUNT(*)::int AS total FROM anotacao WHERE usuario_id = :usuarioId AND is_deleted = false', { usuarioId: semPad.id });
  assert.equal(total.rows[0].total, 5);
});

testarComBanco('alterar com a versão lida grava; com versão velha não grava (409)', async (conexao) => {
  const { repositorio, servico } = criarServico(conexao);
  const usuario = await criarPad(conexao, { PESSOAL: 'original' });
  const lida = await secaoDe(repositorio, usuario.id, TipoAnotacaoEnum.PESSOAL);

  const gravada = await servico.alterar(
    { usuarioId: usuario.id, tipo: TipoAnotacaoEnum.PESSOAL, texto: 'primeira', updatedDateLido: lida.updatedDate }, GESTOR);
  assert.equal(gravada.dados?.texto, 'primeira');
  assert.notEqual(new Date(gravada.dados!.updatedDate).getTime(), new Date(lida.updatedDate).getTime(), 'a versão avança');

  await assert.rejects(
    servico.alterar({ usuarioId: usuario.id, tipo: TipoAnotacaoEnum.PESSOAL, texto: 'segunda', updatedDateLido: lida.updatedDate }, GESTOR),
    ConflictException);
  assert.equal(await textoDe(repositorio, usuario.id, TipoAnotacaoEnum.PESSOAL), 'primeira');
});

testarComBanco('alterar só mexe na seção pedida e no pad do usuário certo', async (conexao) => {
  const { repositorio, servico } = criarServico(conexao);
  const usuario = await criarPad(conexao, { LEMBRETE: 'fica' });
  const outro = await criarPad(conexao, { PESSOAL: 'dele' });
  const lida = await secaoDe(repositorio, usuario.id, TipoAnotacaoEnum.PESSOAL);
  await servico.alterar({ usuarioId: usuario.id, tipo: TipoAnotacaoEnum.PESSOAL, texto: 'novo', updatedDateLido: lida.updatedDate }, GESTOR);

  assert.equal(await textoDe(repositorio, usuario.id, TipoAnotacaoEnum.LEMBRETE), 'fica');
  assert.equal(await textoDe(repositorio, outro.id, TipoAnotacaoEnum.PESSOAL), 'dele');
});

testarComBanco('mover tira o trecho da origem e o põe no fim do destino, nas duas seções', async (conexao) => {
  const { repositorio, servico } = criarServico(conexao);
  const usuario = await criarPad(conexao, { EM_ANDAMENTO: 'Validar e-mail.\nValidar senha.', PENDENCIA: 'Falta revisar.' });
  const origem = await secaoDe(repositorio, usuario.id, TipoAnotacaoEnum.EM_ANDAMENTO);
  const destino = await secaoDe(repositorio, usuario.id, TipoAnotacaoEnum.PENDENCIA);

  const movido = await servico.moverTrecho({
    usuarioId: usuario.id, tipoOrigem: TipoAnotacaoEnum.EM_ANDAMENTO, tipoDestino: TipoAnotacaoEnum.PENDENCIA,
    trecho: 'Validar senha.', updatedDateOrigemLido: origem.updatedDate, updatedDateDestinoLido: destino.updatedDate,
  }, GESTOR);

  assert.equal(movido.dados?.origem.tipo, TipoAnotacaoEnum.EM_ANDAMENTO);
  assert.equal(movido.dados?.destino.tipo, TipoAnotacaoEnum.PENDENCIA);
  assert.ok(!(await textoDe(repositorio, usuario.id, TipoAnotacaoEnum.EM_ANDAMENTO)).includes('Validar senha.'));
  assert.ok((await textoDe(repositorio, usuario.id, TipoAnotacaoEnum.PENDENCIA)).endsWith('Validar senha.'));
});

testarComBanco('mover com a versão velha de uma das seções não grava nenhuma (409)', async (conexao) => {
  const { repositorio, servico } = criarServico(conexao);
  const usuario = await criarPad(conexao, { EM_ANDAMENTO: 'Tarefa A', PENDENCIA: 'Pendente' });
  const origem = await secaoDe(repositorio, usuario.id, TipoAnotacaoEnum.EM_ANDAMENTO);
  const destino = await secaoDe(repositorio, usuario.id, TipoAnotacaoEnum.PENDENCIA);
  // O destino é alterado "em outro lugar" depois que a tela leu.
  await servico.alterar({ usuarioId: usuario.id, tipo: TipoAnotacaoEnum.PENDENCIA, texto: 'Pendente 2', updatedDateLido: destino.updatedDate }, GESTOR);

  await assert.rejects(servico.moverTrecho({
    usuarioId: usuario.id, tipoOrigem: TipoAnotacaoEnum.EM_ANDAMENTO, tipoDestino: TipoAnotacaoEnum.PENDENCIA,
    trecho: 'Tarefa A', updatedDateOrigemLido: origem.updatedDate, updatedDateDestinoLido: destino.updatedDate,
  }, GESTOR), ConflictException);

  assert.equal(await textoDe(repositorio, usuario.id, TipoAnotacaoEnum.EM_ANDAMENTO), 'Tarefa A');
  assert.equal(await textoDe(repositorio, usuario.id, TipoAnotacaoEnum.PENDENCIA), 'Pendente 2');
});

testarComBanco('mover trecho ausente ou repetido recusa e não grava', async (conexao) => {
  const { repositorio, servico } = criarServico(conexao);
  const usuario = await criarPad(conexao, { EM_ANDAMENTO: 'igual\nigual', LEMBRETE: 'x' });
  const origem = await secaoDe(repositorio, usuario.id, TipoAnotacaoEnum.EM_ANDAMENTO);
  const destino = await secaoDe(repositorio, usuario.id, TipoAnotacaoEnum.LEMBRETE);
  const base = {
    usuarioId: usuario.id, tipoOrigem: TipoAnotacaoEnum.EM_ANDAMENTO, tipoDestino: TipoAnotacaoEnum.LEMBRETE,
    updatedDateOrigemLido: origem.updatedDate, updatedDateDestinoLido: destino.updatedDate,
  };

  await assert.rejects(servico.moverTrecho({ ...base, trecho: 'inexistente' }, GESTOR), BusinessException);
  await assert.rejects(servico.moverTrecho({ ...base, trecho: 'igual' }, GESTOR), BusinessException);
  assert.equal(await textoDe(repositorio, usuario.id, TipoAnotacaoEnum.EM_ANDAMENTO), 'igual\nigual');
  assert.equal(await textoDe(repositorio, usuario.id, TipoAnotacaoEnum.LEMBRETE), 'x');
});

testarComBanco('modificarSecoes é atômico: se a segunda gravação falha, a primeira também some', async (conexao) => {
  const { repositorio } = criarServico(conexao);
  const usuario = await criarPad(conexao, { EM_ANDAMENTO: 'origem', PENDENCIA: 'destino' });

  await assert.rejects(repositorio.modificarSecoes(
    { usuarioId: usuario.id, tipos: [TipoAnotacaoEnum.EM_ANDAMENTO, TipoAnotacaoEnum.PENDENCIA] },
    () => [
      { tipo: TipoAnotacaoEnum.EM_ANDAMENTO, texto: 'gravada e desfeita' },
      { tipo: TipoAnotacaoEnum.PENDENCIA, texto: null as unknown as string }, // viola NOT NULL
    ]));

  assert.equal(await textoDe(repositorio, usuario.id, TipoAnotacaoEnum.EM_ANDAMENTO), 'origem');
  assert.equal(await textoDe(repositorio, usuario.id, TipoAnotacaoEnum.PENDENCIA), 'destino');
});

testarComBanco('modificarSecoes: se o modificador lança, nada é gravado; as seções chegam na ordem de exibição', async (conexao) => {
  const { repositorio } = criarServico(conexao);
  const usuario = await criarPad(conexao, { PESSOAL: 'p', FEITO: 'f' });
  let recebidas: string[] = [];

  await assert.rejects(repositorio.modificarSecoes(
    { usuarioId: usuario.id, tipos: [TipoAnotacaoEnum.PESSOAL, TipoAnotacaoEnum.FEITO] },
    (atuais) => {
      recebidas = atuais.map((secao) => secao.tipo);
      throw new Error('recusou');
    }), /recusou/);

  assert.deepEqual(recebidas, [TipoAnotacaoEnum.FEITO, TipoAnotacaoEnum.PESSOAL]);
  assert.equal(await textoDe(repositorio, usuario.id, TipoAnotacaoEnum.PESSOAL), 'p');
  assert.equal(await textoDe(repositorio, usuario.id, TipoAnotacaoEnum.FEITO), 'f');
});
