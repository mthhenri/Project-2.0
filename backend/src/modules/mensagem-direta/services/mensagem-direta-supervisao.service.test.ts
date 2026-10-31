import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AutorMensagemDiretaEnum, MensagemDiretaResumoDto, TipoUsuarioEnum } from '@project20/shared';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { MensagemDiretaSupervisaoService } from './mensagem-direta-supervisao.service';

// A supervisão do chat (task 214) com dublês: elegibilidade pelo tipo atual, 403 em cada caso, auditoria em toda abertura, aviso uma vez por dia e
// falha do aviso que não derruba a leitura. O SQL da auditoria e do dia no fuso é provado no teste de integração do repository.

const GESTOR = { sub: 1, login: 'carla', tipo: TipoUsuarioEnum.GESTOR } as never;
const DESENVOLVEDOR = { sub: 4, login: 'ana', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

const ANA = { id: 4, nomeCompleto: 'Ana', tipo: TipoUsuarioEnum.DESENVOLVEDOR };
const BRUNO = { id: 9, nomeCompleto: 'Bruno', tipo: TipoUsuarioEnum.DESENVOLVEDOR };
const CARLA = { id: 1, nomeCompleto: 'Carla', tipo: TipoUsuarioEnum.GESTOR };

function mensagem(parcial: Partial<MensagemDiretaResumoDto> = {}): MensagemDiretaResumoDto {
  return {
    mensagemId: 'a1b2c3d4-0000-4000-8000-000000000001',
    conversaId: '4-9',
    autor: AutorMensagemDiretaEnum.USUARIO,
    autorUsuarioId: 4,
    texto: 'oi',
    contemCodigo: false,
    mencoes: [],
    referencias: [],
    respondeA: null,
    createdDate: new Date('2026-10-31T14:00:00.000Z'),
    ...parcial,
  };
}

interface Cenario {
  service: MensagemDiretaSupervisaoService;
  chamadas: { auditorias: unknown[]; avisosMarcados: unknown[]; gravadas: unknown[]; publicadas: unknown[]; consultasDeLista: unknown[] };
}

function montar(opcoes: {
  usuarios?: { id: number; nomeCompleto: string; tipo: TipoUsuarioEnum }[];
  avisoDoDia?: boolean;
  falhaAoGravar?: boolean;
  falhaAoPublicar?: boolean;
  idsDeGestor?: number[];
} = {}): Cenario {
  const usuarios = opcoes.usuarios ?? [ANA, BRUNO, CARLA];
  const chamadas: Cenario['chamadas'] = { auditorias: [], avisosMarcados: [], gravadas: [], publicadas: [], consultasDeLista: [] };
  const armazenamento = {
    listarConversa: async () => ({ mensagens: [mensagem()], proximoCursor: null }),
    listarTodasConversas: async (consulta: unknown) => {
      chamadas.consultasDeLista.push(consulta);
      return { conversas: [{ conversaId: '4-9', participantes: [4, 9], totalMensagens: 3, ultimaMensagem: mensagem() }], total: 1 };
    },
    gravar: async (nova: { texto: string }) => {
      if (opcoes.falhaAoGravar) throw new Error('armazenamento fora do ar');
      chamadas.gravadas.push(nova);
      return { mensagem: mensagem({ ...nova, autor: AutorMensagemDiretaEnum.SISTEMA, autorUsuarioId: null } as never), jaExistia: false };
    },
  };
  const supervisaoRepositorio = {
    registrarLeitura: async (dto: unknown) => { chamadas.auditorias.push(dto); return { id: 77 }; },
    marcarAvisoDado: async (dto: unknown) => { chamadas.avisosMarcados.push(dto); },
    existeAvisoDoDia: async () => opcoes.avisoDoDia ?? false,
  };
  const usuarioRepositorio = {
    listarIdsComPermissaoDeGestor: async () => opcoes.idsDeGestor ?? [1],
    listarTiposPorIds: async ({ usuarioIds }: { usuarioIds: number[] }) => usuarios.filter((usuario) => usuarioIds.includes(usuario.id)),
  };
  const eventosService = {
    publicarParaUsuarios: async (dto: unknown) => {
      if (opcoes.falhaAoPublicar) throw new Error('barramento fora do ar');
      chamadas.publicadas.push(dto);
    },
  };
  const service = new MensagemDiretaSupervisaoService(armazenamento as never, supervisaoRepositorio as never, usuarioRepositorio as never, eventosService as never);
  return { service, chamadas };
}

test('listar: o desenvolvedor recebe 403 e nada é consultado', async () => {
  const { service, chamadas } = montar();
  await assert.rejects(service.listarConversasSupervisionadas({}, DESENVOLVEDOR), UnauthorizedAccessException);
  assert.equal(chamadas.consultasDeLista.length, 0);
});

test('listar: exclui gestores e administradores, usa os padrões de página e devolve os nomes', async () => {
  const { service, chamadas } = montar({ idsDeGestor: [1, 2] });
  const resposta = await service.listarConversasSupervisionadas({ texto: '  bug ', somenteCodigo: true }, GESTOR);

  assert.deepEqual(chamadas.consultasDeLista[0], {
    usuarioIdsExcluidos: [1, 2],
    texto: 'bug',
    inicio: undefined,
    fim: undefined,
    somenteCodigo: true,
    pagina: 1,
    porPagina: 20,
  });
  assert.equal(resposta.dados.total, 1);
  assert.deepEqual(resposta.dados.conversas[0].participantes.map((participante) => participante.usuarioNome), ['Ana', 'Bruno']);
});

test('ler: o desenvolvedor recebe 403 e nada é gravado', async () => {
  const { service, chamadas } = montar();
  await assert.rejects(service.lerConversaSupervisionada({ conversaId: '4-9' }, DESENVOLVEDOR), UnauthorizedAccessException);
  assert.equal(chamadas.auditorias.length, 0);
});

test('ler: conversa inválida ou com usuário inexistente é "não encontrada"', async () => {
  const { service } = montar();
  await assert.rejects(service.lerConversaSupervisionada({ conversaId: 'abc' }, GESTOR), ResourceNotFoundException);
  await assert.rejects(service.lerConversaSupervisionada({ conversaId: '4-999' }, GESTOR), ResourceNotFoundException);
});

test('ler: conversa em que o gestor é participante segue o caminho normal (403, sem auditoria nem aviso)', async () => {
  const { service, chamadas } = montar();
  await assert.rejects(service.lerConversaSupervisionada({ conversaId: '1-4' }, GESTOR), UnauthorizedAccessException);
  assert.equal(chamadas.auditorias.length, 0);
  assert.equal(chamadas.gravadas.length, 0);
});

test('ler: conversa com gestor ou administrador é privada (403), mesmo sendo o outro um desenvolvedor', async () => {
  const outroGestor = { id: 2, nomeCompleto: 'Davi', tipo: TipoUsuarioEnum.ADMINISTRADOR };
  const { service, chamadas } = montar({ usuarios: [ANA, BRUNO, CARLA, outroGestor] });
  await assert.rejects(service.lerConversaSupervisionada({ conversaId: '2-4' }, GESTOR), UnauthorizedAccessException);
  assert.equal(chamadas.auditorias.length, 0);
});

test('ler: a elegibilidade é do tipo de agora (um desenvolvedor promovido torna a conversa privada)', async () => {
  const brunoPromovido = { ...BRUNO, tipo: TipoUsuarioEnum.GESTOR };
  const { service } = montar({ usuarios: [ANA, brunoPromovido, CARLA] });
  await assert.rejects(service.lerConversaSupervisionada({ conversaId: '4-9' }, GESTOR), UnauthorizedAccessException);
});

test('ler: grava a auditoria, avisa os dois participantes e devolve a conversa', async () => {
  const { service, chamadas } = montar();
  const resposta = await service.lerConversaSupervisionada({ conversaId: '4-9' }, GESTOR);

  assert.deepEqual(chamadas.auditorias, [{ leitorUsuarioId: 1, conversaId: '4-9', usuarioMenorId: 4, usuarioMaiorId: 9 }]);
  assert.equal(chamadas.gravadas.length, 1);
  assert.deepEqual(chamadas.gravadas[0], {
    mensagemId: (chamadas.gravadas[0] as { mensagemId: string }).mensagemId,
    conversaId: '4-9',
    autor: AutorMensagemDiretaEnum.SISTEMA,
    autorUsuarioId: null,
    texto: 'Carla, gestor, leu esta conversa',
    contemCodigo: false,
    mencoes: [],
    referencias: [],
  });
  assert.deepEqual(chamadas.avisosMarcados, [{ supervisaoId: 77 }]);
  assert.deepEqual((chamadas.publicadas[0] as { usuarioIds: number[] }).usuarioIds, [4, 9]);
  assert.equal(resposta.dados.participantesAvisados, true);
  assert.deepEqual(resposta.dados.participantes.map((participante) => participante.usuarioId), [4, 9]);
});

test('ler: já avisou hoje, a auditoria é gravada mas não há novo aviso', async () => {
  const { service, chamadas } = montar({ avisoDoDia: true });
  const resposta = await service.lerConversaSupervisionada({ conversaId: '4-9' }, GESTOR);

  assert.equal(chamadas.auditorias.length, 1);
  assert.equal(chamadas.gravadas.length, 0);
  assert.equal(chamadas.publicadas.length, 0);
  assert.equal(resposta.dados.participantesAvisados, false);
});

test('ler: se a mensagem do sistema não é gravada, a leitura segue e a abertura não conta como avisada', async () => {
  const { service, chamadas } = montar({ falhaAoGravar: true });
  const resposta = await service.lerConversaSupervisionada({ conversaId: '4-9' }, GESTOR);

  assert.equal(chamadas.auditorias.length, 1);
  assert.equal(chamadas.avisosMarcados.length, 0);
  assert.equal(resposta.dados.participantesAvisados, false);
  assert.equal(resposta.dados.mensagens.length, 1);
});

test('ler: falha em publicar o aviso não falha a leitura', async () => {
  const { service } = montar({ falhaAoPublicar: true });
  const resposta = await service.lerConversaSupervisionada({ conversaId: '4-9' }, GESTOR);
  assert.equal(resposta.sucesso, true);
});

test('ler: a página mais antiga (com cursor) continua a mesma abertura: sem nova auditoria nem aviso', async () => {
  const { service, chamadas } = montar();
  const resposta = await service.lerConversaSupervisionada({ conversaId: '4-9', cursor: 'opaco' }, GESTOR);

  assert.equal(chamadas.auditorias.length, 0);
  assert.equal(chamadas.gravadas.length, 0);
  assert.equal(resposta.dados.participantesAvisados, false);
});
