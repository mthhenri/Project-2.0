import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  AutorMensagemDiretaEnum,
  LIMITE_PADRAO_DA_CONVERSA_DIRETA,
  MensagemDiretaResumoDto,
  PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA,
  ReferenciaMensagemDiretaEnum,
  TipoUsuarioEnum,
  TipoUsuarioStatusEnum,
} from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { MarcadorDeLeituraRegistrado } from '../repositories/mensagem-direta-leitura.repository';
import { MensagemDiretaService } from './mensagem-direta.service';

// A service do chat entre colaboradores (task 208) com dublês: a regra e a permissão (remetente sempre do token, destinatário ativo, menções e
// referências, leitura que não passa do agora, busca restrita a quem busca). O SQL é provado nos testes de integração.

const ANA = { sub: 4, login: 'ana', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const GESTOR = { sub: 1, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;
const BRUNO_ID = 9;
const UUID = '7F0C2B9E-4C1A-4E6A-9D55-2F6C0D1B8A10';

function mensagem(parcial: Partial<MensagemDiretaResumoDto> = {}): MensagemDiretaResumoDto {
  return {
    mensagemId: UUID.toLowerCase(),
    conversaId: '4-9',
    autor: AutorMensagemDiretaEnum.USUARIO,
    autorUsuarioId: 4,
    texto: 'oi',
    contemCodigo: false,
    mencoes: [],
    referencias: [],
    createdDate: new Date('2026-10-21T14:00:00.000Z'),
    ...parcial,
  };
}

interface Cenario {
  usuarios?: Record<number, { status?: TipoUsuarioStatusEnum; nomeCompleto?: string }>;
  /** Ids de pessoas excluídas: não são recuperadas, mas ainda existem (o histórico continua). */
  excluidos?: number[];
  demandaVisivel?: boolean;
  atividadeDemandaId?: number | null;
  atividadeComAcesso?: boolean;
  jaExistia?: boolean;
  marcadores?: MarcadorDeLeituraRegistrado[];
  marcadorDoOutro?: MarcadorDeLeituraRegistrado | null;
  conversas?: { conversaId: string; participantes: number[]; totalMensagens: number; ultimaMensagem: MensagemDiretaResumoDto }[];
  naoLidas?: Record<string, number>;
  preferencia?: unknown;
  online?: number[];
  ativos?: { id: number; nome: string; tipo?: TipoUsuarioEnum }[];
}

function montar(cenario: Cenario = {}) {
  const chamadas: Record<string, unknown[]> = {};
  const registrar = (nome: string, argumento: unknown) => { (chamadas[nome] ??= []).push(argumento); };
  const usuarios = cenario.usuarios ?? { [BRUNO_ID]: {} };

  const armazenamento = {
    gravar: async (nova: { mensagemId: string }) => { registrar('gravar', nova); return { mensagem: mensagem({ mensagemId: nova.mensagemId }), jaExistia: cenario.jaExistia ?? false }; },
    listarConversa: async (consulta: unknown) => { registrar('listarConversa', consulta); return { mensagens: [mensagem()], proximoCursor: 'abc' }; },
    listarConversasDoUsuario: async (consulta: unknown) => { registrar('listarConversasDoUsuario', consulta); return cenario.conversas ?? []; },
    contarNaoLidas: async (consulta: unknown) => { registrar('contarNaoLidas', consulta); return cenario.naoLidas ?? {}; },
    buscar: async (consulta: unknown) => { registrar('buscar', consulta); return [mensagem()]; },
  };
  const leitura = {
    listarMarcadores: async () => cenario.marcadores ?? [],
    recuperarMarcador: async (dto: unknown) => { registrar('recuperarMarcador', dto); return cenario.marcadorDoOutro ?? null; },
    alterarLeitura: async (dto: { lidaAteDate: Date; conversaId: string; outroUsuarioId: number }) => {
      registrar('alterarLeitura', dto);
      return { conversaId: dto.conversaId, outroUsuarioId: dto.outroUsuarioId, lidaAteDate: dto.lidaAteDate, silenciada: false };
    },
    alterarSilencio: async (dto: { conversaId: string; outroUsuarioId: number; silenciada: boolean }) => {
      registrar('alterarSilencio', dto);
      return { conversaId: dto.conversaId, outroUsuarioId: dto.outroUsuarioId, lidaAteDate: null, silenciada: dto.silenciada };
    },
  };
  const preferencia = {
    recuperar: async () => cenario.preferencia ?? null,
    alterar: async (dto: unknown) => { registrar('alterarPreferencia', dto); return dto; },
  };
  const usuario = {
    validarExistenciaIncluindoExcluido: async ({ id }: { id: number }) => id in usuarios || (cenario.excluidos ?? []).includes(id),
    recuperar: async ({ id }: { id: number }) => {
      const encontrado = usuarios[id];
      return encontrado ? { id, status: encontrado.status ?? TipoUsuarioStatusEnum.ATIVO, nomeCompleto: encontrado.nomeCompleto ?? `Pessoa ${id}` } : null;
    },
    listarAtivos: async () => (cenario.ativos ?? []).map((a) => ({ id: a.id, nomeCompleto: a.nome, tipo: a.tipo ?? TipoUsuarioEnum.DESENVOLVEDOR })),
    listarNomesPorIds: async ({ usuarioIds }: { usuarioIds: number[] }) =>
      usuarioIds.filter((id) => usuarios[id]).map((id) => ({ id, nomeCompleto: usuarios[id].nomeCompleto ?? `Pessoa ${id}` })),
  };
  const demanda = {
    recuperar: async (dto: unknown, filtro: unknown) => { registrar('demanda', { dto, filtro }); return cenario.demandaVisivel === false ? null : { id: 1 }; },
  };
  const atividade = {
    recuperar: async () => (cenario.atividadeDemandaId === null ? null : { demandaId: cenario.atividadeDemandaId ?? 77 }),
    validarAcessoDemanda: async (dto: unknown) => { registrar('acessoDemanda', dto); return cenario.atividadeComAcesso ?? true; },
  };

  const eventos = {
    publicarParaUsuarios: async (dto: unknown) => { registrar('publicar', dto); },
    listarUsuariosOnline: () => new Set(cenario.online ?? []),
  };

  const service = new MensagemDiretaService(
    armazenamento as never, leitura as never, preferencia as never, usuario as never, demanda as never, atividade as never, eventos as never,
  );
  return { service, chamadas };
}

/** A recusa é uma `BusinessException` cuja mensagem (no corpo da resposta) casa com o padrão. */
const recusaComMensagem = (promessa: Promise<unknown>, padrao: RegExp) =>
  assert.rejects(promessa, (erro: unknown) => erro instanceof BusinessException && padrao.test(JSON.stringify(erro.getResponse())));

const envio = (parcial: Record<string, unknown> = {}) => ({ destinatarioId: BRUNO_ID, mensagemId: UUID, texto: 'oi', ...parcial }) as never;

// --- enviar ----------------------------------------------------------------

test('enviarMensagem: o remetente e a conversa vêm do token e do par; o mensagemId é gravado em minúsculas', async () => {
  const { service, chamadas } = montar();
  const resposta = await service.enviarMensagem(envio(), ANA);

  assert.equal(resposta.sucesso, true);
  assert.equal(resposta.dados!.jaExistia, false);
  assert.deepEqual(chamadas.gravar[0], {
    mensagemId: UUID.toLowerCase(),
    conversaId: '4-9',
    autor: AutorMensagemDiretaEnum.USUARIO,
    autorUsuarioId: 4,
    texto: 'oi',
    contemCodigo: false,
    mencoes: [],
    referencias: [],
  });
});

test('enviarMensagem: contemCodigo vem do Markdown, nunca do cliente', async () => {
  const { service, chamadas } = montar();
  await service.enviarMensagem(envio({ texto: 'veja\n\n```ts\nconst a = 1;\n```', contemCodigo: false }), ANA);
  await service.enviarMensagem(envio({ texto: 'só `inline` aqui', contemCodigo: true }), ANA);
  assert.equal((chamadas.gravar[0] as { contemCodigo: boolean }).contemCodigo, true);
  assert.equal((chamadas.gravar[1] as { contemCodigo: boolean }).contemCodigo, false);
});

test('enviarMensagem: reenviar devolve jaExistia com a mensagem já gravada', async () => {
  const { service } = montar({ jaExistia: true });
  const resposta = await service.enviarMensagem(envio(), ANA);
  assert.equal(resposta.dados!.jaExistia, true);
  assert.equal(resposta.mensagem, 'Mensagem já enviada');
});

test('enviarMensagem: recusa enviar para si mesmo, para quem não existe e para usuário inativo — e não grava', async () => {
  const proprio = montar();
  await assert.rejects(proprio.service.enviarMensagem(envio({ destinatarioId: 4 }), ANA), BusinessException);
  assert.equal(proprio.chamadas.gravar, undefined);

  const inexistente = montar({ usuarios: {} });
  await assert.rejects(inexistente.service.enviarMensagem(envio(), ANA), ResourceNotFoundException);

  const inativo = montar({ usuarios: { [BRUNO_ID]: { status: TipoUsuarioStatusEnum.INATIVO } } });
  await recusaComMensagem(inativo.service.enviarMensagem(envio(), ANA), /inativo/);
  assert.equal(inativo.chamadas.gravar, undefined);
});

test('enviarMensagem: menção só aos dois participantes, sem repetição', async () => {
  const boa = montar();
  await boa.service.enviarMensagem(envio({ mencoes: [9, 9, 4] }), ANA);
  assert.deepEqual((boa.chamadas.gravar[0] as { mencoes: number[] }).mencoes, [9, 4]);

  const ruim = montar();
  await assert.rejects(ruim.service.enviarMensagem(envio({ mencoes: [12] }), ANA), BusinessException);
  assert.equal(ruim.chamadas.gravar, undefined);
});

test('enviarMensagem: o desenvolvedor só referencia a demanda e a atividade que ele vê; gestor vê tudo', async () => {
  const demanda = { tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: 212 };
  const atividade = { tipo: ReferenciaMensagemDiretaEnum.ATIVIDADE, id: 57 };

  const semDemanda = montar({ demandaVisivel: false });
  await recusaComMensagem(semDemanda.service.enviarMensagem(envio({ referencias: [demanda] }), ANA), /demanda 212/);

  const semAtividade = montar({ atividadeDemandaId: null });
  await recusaComMensagem(semAtividade.service.enviarMensagem(envio({ referencias: [atividade] }), ANA), /atividade 57/);

  const semAcesso = montar({ atividadeComAcesso: false });
  await recusaComMensagem(semAcesso.service.enviarMensagem(envio({ referencias: [atividade] }), ANA), /atividade 57/);
  assert.deepEqual(semAcesso.chamadas.acessoDemanda[0], { demandaId: 77, usuarioId: 4 });

  const dev = montar();
  await dev.service.enviarMensagem(envio({ referencias: [demanda, atividade, demanda] }), ANA);
  assert.deepEqual((dev.chamadas.demanda[0] as { filtro: unknown }).filtro, { usuarioId: 4 });
  assert.deepEqual((dev.chamadas.gravar[0] as { referencias: unknown[] }).referencias, [demanda, atividade]);

  const gestor = montar({ demandaVisivel: true, atividadeComAcesso: false });
  await gestor.service.enviarMensagem(envio({ referencias: [demanda, atividade] }), GESTOR);
  assert.equal((gestor.chamadas.demanda[0] as { filtro: unknown }).filtro, undefined);
  assert.equal(gestor.chamadas.acessoDemanda, undefined);
});

// --- ler -------------------------------------------------------------------

test('listarConversa: usa o limite padrão, repassa o cursor e traz até onde o OUTRO leu', async () => {
  const lidaAteDate = new Date('2026-10-21T13:00:00.000Z');
  const { service, chamadas } = montar({ marcadorDoOutro: { conversaId: '4-9', outroUsuarioId: 4, lidaAteDate, silenciada: false } });
  const resposta = await service.listarConversa({ usuarioId: BRUNO_ID, cursor: 'c1' }, ANA);

  assert.deepEqual(chamadas.listarConversa[0], { conversaId: '4-9', cursor: 'c1', limite: LIMITE_PADRAO_DA_CONVERSA_DIRETA });
  assert.deepEqual(chamadas.recuperarMarcador[0], { conversaId: '4-9', usuarioId: BRUNO_ID });
  assert.equal(resposta.dados!.proximoCursor, 'abc');
  assert.equal(resposta.dados!.lidaAteDate, lidaAteDate);
});

test('listarConversa: sem marcador do outro o "Lida" é nulo; consigo mesmo ou com quem não existe, recusa', async () => {
  const { service } = montar();
  assert.equal((await service.listarConversa({ usuarioId: BRUNO_ID, limite: 5 }, ANA)).dados!.lidaAteDate, null);
  await assert.rejects(service.listarConversa({ usuarioId: 4 }, ANA), BusinessException);
  await assert.rejects(montar({ usuarios: {} }).service.listarConversa({ usuarioId: BRUNO_ID }, ANA), ResourceNotFoundException);
});

test('listarConversas: nome, não lidas e silêncio por conversa; pessoa removida vira "Usuário removido"; sem conversa não consulta nada', async () => {
  const vazio = montar();
  assert.deepEqual((await vazio.service.listarConversas(ANA)).dados, { conversas: [] });
  assert.equal(vazio.chamadas.contarNaoLidas, undefined);

  const lidaAteDate = new Date('2026-10-21T10:00:00.000Z');
  const { service, chamadas } = montar({
    usuarios: { [BRUNO_ID]: { nomeCompleto: 'Bruno' } },
    conversas: [
      { conversaId: '4-9', participantes: [4, 9], totalMensagens: 3, ultimaMensagem: mensagem() },
      { conversaId: '4-15', participantes: [4, 15], totalMensagens: 1, ultimaMensagem: mensagem({ conversaId: '4-15' }) },
    ],
    marcadores: [{ conversaId: '4-9', outroUsuarioId: 9, lidaAteDate, silenciada: true }],
    naoLidas: { '4-9': 2, '4-15': 1 },
  });
  const { conversas } = (await service.listarConversas(ANA)).dados!;

  assert.deepEqual(chamadas.contarNaoLidas[0], {
    usuarioId: 4,
    marcadores: [{ conversaId: '4-9', lidaAteDate }, { conversaId: '4-15', lidaAteDate: null }],
  });
  assert.deepEqual(conversas.map((c) => [c.usuarioId, c.usuarioNome, c.naoLidas, c.silenciada]), [[9, 'Bruno', 2, true], [15, 'Usuário removido', 1, false]]);
});

test('buscar: sempre como a pessoa do token, com o período convertido e o filtro de código', async () => {
  const { service, chamadas } = montar();
  await service.buscar({ texto: 'cadastro', inicio: '2026-10-01T00:00:00.000Z', somenteCodigo: true }, ANA);
  const consulta = chamadas.buscar[0] as { usuarioId: number; inicio: Date; fim?: Date; somenteCodigo: boolean };
  assert.equal(consulta.usuarioId, 4);
  assert.equal(consulta.inicio.toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal(consulta.fim, undefined);
  assert.equal(consulta.somenteCodigo, true);
  await assert.rejects(service.buscar({ texto: 'x', inicio: '2026-11-01T00:00:00.000Z', fim: '2026-10-01T00:00:00.000Z' }, ANA), BusinessException);
});

// --- leitura, silêncio e preferências -----------------------------------------

test('alterarLeitura: grava para a pessoa do token na conversa do par e limita a data ao agora', async () => {
  const { service, chamadas } = montar();
  const resposta = await service.alterarLeitura({ usuarioId: BRUNO_ID, lidaAteDate: '2999-01-01T00:00:00.000Z' }, ANA);
  const gravada = chamadas.alterarLeitura[0] as { conversaId: string; usuarioId: number; outroUsuarioId: number; lidaAteDate: Date };

  assert.equal(gravada.conversaId, '4-9');
  assert.equal(gravada.usuarioId, 4);
  assert.equal(gravada.outroUsuarioId, BRUNO_ID);
  assert.ok(gravada.lidaAteDate.getTime() <= Date.now());
  assert.equal(resposta.dados!.conversaId, '4-9');
  await assert.rejects(service.alterarLeitura({ usuarioId: 4, lidaAteDate: '2026-10-21T10:00:00.000Z' }, ANA), BusinessException);
});

test('alterarLeitura: pessoa inativa ainda pode ter a conversa lida (o histórico continua dos dois)', async () => {
  const { service } = montar({ usuarios: { [BRUNO_ID]: { status: TipoUsuarioStatusEnum.INATIVO } } });
  const resposta = await service.alterarLeitura({ usuarioId: BRUNO_ID, lidaAteDate: '2026-10-21T10:00:00.000Z' }, ANA);
  assert.equal(resposta.sucesso, true);
});

test('alterarSilencio: silencia e reativa a conversa do próprio usuário', async () => {
  const { service, chamadas } = montar();
  assert.deepEqual((await service.alterarSilencio({ usuarioId: BRUNO_ID, silenciada: true }, ANA)).dados, { conversaId: '4-9', silenciada: true });
  assert.deepEqual((await service.alterarSilencio({ usuarioId: BRUNO_ID, silenciada: false }, ANA)).dados, { conversaId: '4-9', silenciada: false });
  assert.equal((chamadas.alterarSilencio[0] as { usuarioId: number }).usuarioId, 4);
});

test('recuperarPreferencia: sem linha gravada vale o padrão do shared (uma cópia, não o objeto compartilhado)', async () => {
  const { service } = montar();
  const { dados } = await service.recuperarPreferencia(ANA);
  assert.deepEqual(dados, PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA);
  assert.notEqual(dados, PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA);

  const gravada = { avisosAtivos: false, avisoDesktopAtivo: false, somAtivo: true, silenciadoAteDate: null, atalhoGlobal: 'Alt+F1' };
  assert.deepEqual((await montar({ preferencia: gravada }).service.recuperarPreferencia(ANA)).dados, gravada);
});

test('alterarPreferencia: grava para a pessoa do token, convertendo o fim do silêncio; data inválida é recusada', async () => {
  const { service, chamadas } = montar();
  const dto = { avisosAtivos: true, avisoDesktopAtivo: false, somAtivo: true, silenciadoAteDate: '2026-10-21T16:00:00.000Z', atalhoGlobal: 'Alt+F1' };
  await service.alterarPreferencia(dto, ANA);
  const gravada = chamadas.alterarPreferencia[0] as { usuarioId: number; silenciadoAteDate: Date };
  assert.equal(gravada.usuarioId, 4);
  assert.equal(gravada.silenciadoAteDate.toISOString(), '2026-10-21T16:00:00.000Z');

  await service.alterarPreferencia({ ...dto, silenciadoAteDate: null }, ANA);
  assert.equal((chamadas.alterarPreferencia[1] as { silenciadoAteDate: Date | null }).silenciadoAteDate, null);
  await assert.rejects(service.alterarPreferencia({ ...dto, silenciadoAteDate: 'amanhã' }, ANA), BusinessException);
});

test('pessoa excluída: a conversa continua abrindo, lendo e silenciando; só enviar é recusado', async () => {
  const { service, chamadas } = montar({ usuarios: {}, excluidos: [BRUNO_ID] });

  assert.equal((await service.listarConversa({ usuarioId: BRUNO_ID }, ANA)).sucesso, true);
  assert.equal((await service.alterarLeitura({ usuarioId: BRUNO_ID, lidaAteDate: '2026-10-21T10:00:00.000Z' }, ANA)).sucesso, true);
  assert.equal((await service.alterarSilencio({ usuarioId: BRUNO_ID, silenciada: true }, ANA)).sucesso, true);
  await assert.rejects(service.enviarMensagem(envio(), ANA), ResourceNotFoundException);
  assert.equal(chamadas.gravar, undefined);
});

// --- tempo real (task 209) -----------------------------------------------------

test('enviarMensagem: avisa o remetente e o destinatário com a mensagem gravada, uma vez', async () => {
  const { service, chamadas } = montar();
  const resposta = await service.enviarMensagem(envio(), ANA);

  assert.equal(chamadas.publicar.length, 1);
  assert.deepEqual(chamadas.publicar[0], { usuarioIds: [4, BRUNO_ID], evento: { tipo: 'MENSAGEM', mensagem: resposta.dados!.mensagem } });
});

test('enviarMensagem: o reenvio de uma mensagem que já estava gravada não avisa de novo', async () => {
  const { service, chamadas } = montar({ jaExistia: true });
  await service.enviarMensagem(envio(), ANA);
  assert.equal(chamadas.publicar, undefined);
});

test('enviarMensagem recusada não avisa ninguém', async () => {
  const { service, chamadas } = montar({ usuarios: {} });
  await assert.rejects(service.enviarMensagem(envio(), ANA));
  assert.equal(chamadas.publicar, undefined);
});

test('alterarLeitura: avisa as duas pontas com quem leu e até quando ficou gravado', async () => {
  const { service, chamadas } = montar();
  const resposta = await service.alterarLeitura({ usuarioId: BRUNO_ID, lidaAteDate: '2026-10-21T10:00:00.000Z' }, ANA);

  assert.deepEqual(chamadas.publicar[0], {
    usuarioIds: [4, BRUNO_ID],
    evento: { tipo: 'LEITURA', conversaId: '4-9', usuarioId: 4, lidaAteDate: resposta.dados!.lidaAteDate },
  });
});

test('listarConversas: online vem da presença global', async () => {
  const { service } = montar({
    online: [BRUNO_ID],
    usuarios: { [BRUNO_ID]: {}, 15: {} },
    conversas: [
      { conversaId: '4-9', participantes: [4, 9], totalMensagens: 1, ultimaMensagem: mensagem() },
      { conversaId: '4-15', participantes: [4, 15], totalMensagens: 1, ultimaMensagem: mensagem({ conversaId: '4-15' }) },
    ],
  });
  const { conversas } = (await service.listarConversas(ANA)).dados!;
  assert.deepEqual(conversas.map((c) => [c.usuarioId, c.online]), [[9, true], [15, false]]);
});

test('listarPessoas: as ativas, menos quem pergunta, com tipo e presença — para qualquer tipo de usuário', async () => {
  const { service } = montar({
    online: [9],
    ativos: [{ id: 4, nome: 'Ana' }, { id: 9, nome: 'Bruno' }, { id: 15, nome: 'Carla', tipo: TipoUsuarioEnum.GESTOR }],
  });
  for (const quem of [ANA, GESTOR]) {
    const { pessoas } = (await service.listarPessoas(quem)).dados!;
    assert.equal(pessoas.some((pessoa) => pessoa.usuarioId === (quem as { sub: number }).sub), false);
  }
  const { pessoas } = (await service.listarPessoas(ANA)).dados!;
  assert.deepEqual(pessoas, [
    { usuarioId: 9, usuarioNome: 'Bruno', tipo: TipoUsuarioEnum.DESENVOLVEDOR, online: true },
    { usuarioId: 15, usuarioNome: 'Carla', tipo: TipoUsuarioEnum.GESTOR, online: false },
  ]);
});
