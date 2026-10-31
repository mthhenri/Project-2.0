import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { MensagemDiretaEventoDto } from '@project20/shared';
import { PublicadorEmMemoria } from '../publicadores/publicador-em-memoria';
import { MensagemDoBarramento } from '../domain/mensagem-direta-barramento';
import { OuvinteDoBarramento, PublicadorDeEventosDiretos } from '../publicadores/publicador-de-eventos-diretos';
import { MensagemDiretaEventosService } from './mensagem-direta-eventos.service';

// O tempo real do chat (task 209) com o barramento em memória compartilhado por DUAS instâncias do serviço: é como duas instâncias da API
// enxergam uma à outra (no banco, o mesmo papel é do LISTEN/NOTIFY, provado no teste de integração).

function cliente() {
  const recebidos: MensagemDiretaEventoDto[] = [];
  let encerrado = false;
  return {
    recebidos,
    get encerrado() { return encerrado; },
    enviar: (evento: MensagemDiretaEventoDto) => { recebidos.push(evento); },
    encerrar: () => { encerrado = true; },
    tipos: () => recebidos.map((evento) => evento.tipo),
  };
}

function duasInstancias() {
  const barramento = new PublicadorEmMemoria();
  const primeira = new MensagemDiretaEventosService(barramento, USUARIOS_ATIVOS);
  const segunda = new MensagemDiretaEventosService(barramento, USUARIOS_ATIVOS);
  primeira.onModuleInit();
  segunda.onModuleInit();
  return { barramento, primeira, segunda, parar: async () => { await primeira.onModuleDestroy(); await segunda.onModuleDestroy(); } };
}

/** O repositório de usuários que só devolve usuários ativos (o stream não fecha ninguém). */
const USUARIOS_ATIVOS = { recuperar: async ({ id }: { id: number }) => ({ id, status: 'ATIVO' }) } as never;

const como = (id: number) => ({ sub: id, login: `u${id}`, tipo: 'DESENVOLVEDOR' }) as never;

const MENSAGEM_NOVA: MensagemDiretaEventoDto = {
  tipo: 'MENSAGEM',
  mensagem: { mensagemId: 'm1', conversaId: '4-9', autor: 'USUARIO' as never, autorUsuarioId: 4, texto: 'oi', contemCodigo: false, mencoes: [], referencias: [], respondeA: null, createdDate: new Date() },
};

test('a mensagem publicada numa instância chega ao destinatário conectado na OUTRA', async () => {
  const { primeira, segunda, parar } = duasInstancias();
  const ana = cliente();
  const bruno = cliente();
  primeira.abrir(como(4), ana);
  segunda.abrir(como(9), bruno);

  await primeira.publicarParaUsuarios({ usuarioIds: [4, 9], evento: MENSAGEM_NOVA });

  assert.ok(bruno.tipos().includes('MENSAGEM'), 'Bruno, na segunda instância, recebe');
  assert.ok(ana.tipos().includes('MENSAGEM'), 'Ana, na primeira, recebe (as outras abas do remetente)');
  await parar();
});

test('quem não é destinatário não recebe, e o stream abre sempre com ABERTURA', async () => {
  const { primeira, segunda, parar } = duasInstancias();
  const carla = cliente();
  const bruno = cliente();
  primeira.abrir(como(4), cliente());
  segunda.abrir(como(7), carla);
  segunda.abrir(como(9), bruno);

  await primeira.publicarParaUsuarios({ usuarioIds: [4, 9], evento: MENSAGEM_NOVA });

  assert.equal(carla.tipos().includes('MENSAGEM'), false);
  assert.equal(carla.tipos()[0], 'ABERTURA');
  assert.equal(bruno.tipos()[0], 'ABERTURA');
  await parar();
});

test('ABERTURA traz quem está online em qualquer instância, inclusive quem abre', async () => {
  const { primeira, segunda, parar } = duasInstancias();
  primeira.abrir(como(4), cliente());
  const bruno = cliente();
  segunda.abrir(como(9), bruno);

  assert.deepEqual(bruno.recebidos[0], { tipo: 'ABERTURA', onlineUsuarioIds: [4, 9] });
  await parar();
});

test('presença: entrar e sair viram PRESENCA nas duas instâncias; a segunda aba não repete o online', async () => {
  const { primeira, segunda, parar } = duasInstancias();
  const ana = cliente();
  primeira.abrir(como(4), ana);

  const fecharBruno = segunda.abrir(como(9), cliente());
  assert.deepEqual(ana.recebidos.filter((e) => e.tipo === 'PRESENCA' && e.usuarioId === 9), [{ tipo: 'PRESENCA', usuarioId: 9, online: true }]);
  assert.equal(primeira.listarUsuariosOnline().has(9), true);

  const fecharOutraAba = segunda.abrir(como(9), cliente());
  assert.equal(ana.recebidos.filter((e) => e.tipo === 'PRESENCA' && e.usuarioId === 9).length, 1, 'a segunda aba do Bruno não muda nada');

  fecharBruno();
  assert.equal(primeira.listarUsuariosOnline().has(9), true, 'ainda há uma aba aberta');
  fecharOutraAba();
  assert.equal(primeira.listarUsuariosOnline().has(9), false);
  assert.deepEqual(ana.recebidos.filter((e) => e.tipo === 'PRESENCA' && e.usuarioId === 9).at(-1), { tipo: 'PRESENCA', usuarioId: 9, online: false });
  await parar();
});

test('a parada avisa ENCERRANDO, fecha os streams e tira a instância da presença das outras', async () => {
  const { primeira, segunda } = duasInstancias();
  const ana = cliente();
  const bruno = cliente();
  primeira.abrir(como(4), ana);
  segunda.abrir(como(9), bruno);
  assert.equal(segunda.listarUsuariosOnline().has(4), true);

  await primeira.onModuleDestroy();

  assert.ok(ana.tipos().includes('ENCERRANDO'));
  assert.equal(ana.encerrado, true);
  assert.equal(segunda.listarUsuariosOnline().has(4), false, 'Ana saiu de online na outra instância sem esperar a validade');
  assert.ok(bruno.recebidos.some((e) => e.tipo === 'PRESENCA' && e.usuarioId === 4 && !e.online));
  await segunda.onModuleDestroy();
});

test('depois da parada a instância não entrega mais nada', async () => {
  const barramento = new PublicadorEmMemoria();
  const instancia = new MensagemDiretaEventosService(barramento, USUARIOS_ATIVOS);
  instancia.onModuleInit();
  const ana = cliente();
  instancia.abrir(como(4), ana);
  await instancia.onModuleDestroy();
  const antes = ana.recebidos.length;
  await barramento.publicar({ tipo: 'ENTREGA', usuarioIds: [4], evento: { tipo: 'BATIMENTO' } });
  assert.equal(ana.recebidos.length, antes);
});

test('reconexão da escuta manda todos os clientes relerem tudo', async () => {
  let ouvinte: OuvinteDoBarramento | undefined;
  const publicador: PublicadorDeEventosDiretos = {
    publicar: async () => undefined,
    assinar: (novo) => { ouvinte = novo; return () => undefined; },
  };
  const instancia = new MensagemDiretaEventosService(publicador, USUARIOS_ATIVOS);
  instancia.onModuleInit();
  const ana = cliente();
  instancia.abrir(como(4), ana);

  ouvinte!.aoReconectar();

  assert.deepEqual(ana.recebidos.at(-1), { tipo: 'SINCRONIZAR', conversaId: null });
  await instancia.onModuleDestroy();
});

test('publicar com o barramento fora do ar não falha: a mensagem já está gravada e o cliente recupera ao reconectar', async () => {
  const publicador: PublicadorDeEventosDiretos = {
    publicar: async (mensagem: MensagemDoBarramento) => { throw new Error(`banco fora do ar (${mensagem.tipo})`); },
    assinar: () => () => undefined,
  };
  const instancia = new MensagemDiretaEventosService(publicador, USUARIOS_ATIVOS);
  instancia.onModuleInit();
  await assert.doesNotReject(instancia.publicarParaUsuarios({ usuarioIds: [4, 9], evento: { tipo: 'BATIMENTO' } }));
  instancia.abrir(como(4), cliente()); // nem a presença derruba
  await instancia.onModuleDestroy();
});

test('durante a parada não se aceita stream novo: o cliente que reconecta recebe ENCERRANDO e a conexão é fechada, sem entrar na presença', async () => {
  const barramento = new PublicadorEmMemoria();
  const instancia = new MensagemDiretaEventosService(barramento, USUARIOS_ATIVOS);
  instancia.onModuleInit();
  instancia.onModuleDestroy();

  const retardatario = cliente();
  instancia.abrir(como(4), retardatario);

  assert.deepEqual(retardatario.tipos(), ['ENCERRANDO']);
  assert.equal(retardatario.encerrado, true);
  assert.equal(instancia.listarUsuariosOnline().has(4), false);
});

test('a parada não espera a publicação da saída da presença (banco fora do ar não segura o desligamento)', () => {
  const publicador: PublicadorDeEventosDiretos = {
    publicar: () => new Promise<void>(() => undefined), // nunca resolve
    assinar: () => () => undefined,
  };
  const instancia = new MensagemDiretaEventosService(publicador, USUARIOS_ATIVOS);
  instancia.onModuleInit();
  assert.equal(instancia.onModuleDestroy(), undefined, 'retorna na hora');
});

function usuariosComSituacao(situacao: Map<number, 'ATIVO' | 'INATIVO' | 'EXCLUIDO' | 'ERRO'>) {
  return {
    recuperar: async ({ id }: { id: number }) => {
      const atual = situacao.get(id) ?? 'ATIVO';
      if (atual === 'ERRO') throw new Error('banco fora do ar');
      if (atual === 'EXCLUIDO') return null;
      return { id, status: atual };
    },
  } as never;
}

test('P-061: quem foi desativado ou excluído tem o stream fechado no próximo batimento, e a presença cai', async () => {
  const barramento = new PublicadorEmMemoria();
  const situacao = new Map<number, 'ATIVO' | 'INATIVO' | 'EXCLUIDO' | 'ERRO'>();
  const instancia = new MensagemDiretaEventosService(barramento, usuariosComSituacao(situacao));
  instancia.onModuleInit();
  const ana = cliente();
  const bruno = cliente();
  const carla = cliente();
  instancia.abrir(como(4), ana);
  instancia.abrir(como(9), bruno);
  instancia.abrir(como(7), carla);

  situacao.set(4, 'INATIVO');
  situacao.set(7, 'EXCLUIDO');
  await instancia.fecharStreamsDeUsuariosInativos();

  assert.equal(ana.encerrado, true, 'a desativada tem o stream fechado');
  assert.equal(carla.encerrado, true, 'a excluída também');
  assert.equal(bruno.encerrado, false, 'quem segue ativo não é tocado');
  assert.deepEqual([...instancia.listarUsuariosOnline()].sort(), [9]);
  assert.ok(bruno.recebidos.some((e) => e.tipo === 'PRESENCA' && e.usuarioId === 4 && !e.online), 'os outros veem a saída');

  await instancia.onModuleDestroy();
});

test('P-061: se a conferência falha (banco fora do ar), o stream segue aberto', async () => {
  const barramento = new PublicadorEmMemoria();
  const situacao = new Map<number, 'ATIVO' | 'INATIVO' | 'EXCLUIDO' | 'ERRO'>([[4, 'ERRO']]);
  const instancia = new MensagemDiretaEventosService(barramento, usuariosComSituacao(situacao));
  instancia.onModuleInit();
  const ana = cliente();
  instancia.abrir(como(4), ana);

  await instancia.fecharStreamsDeUsuariosInativos();

  assert.equal(ana.encerrado, false);
  assert.deepEqual([...instancia.listarUsuariosOnline()], [4]);
  await instancia.onModuleDestroy();
});

test('P-061: o mesmo usuário com duas abas tem as duas fechadas', async () => {
  const barramento = new PublicadorEmMemoria();
  const situacao = new Map<number, 'ATIVO' | 'INATIVO' | 'EXCLUIDO' | 'ERRO'>([[4, 'INATIVO']]);
  const instancia = new MensagemDiretaEventosService(barramento, usuariosComSituacao(situacao));
  instancia.onModuleInit();
  const aba1 = cliente();
  const aba2 = cliente();
  instancia.abrir(como(4), aba1);
  instancia.abrir(como(4), aba2);

  await instancia.fecharStreamsDeUsuariosInativos();

  assert.equal(aba1.encerrado, true);
  assert.equal(aba2.encerrado, true);
  await instancia.onModuleDestroy();
});
