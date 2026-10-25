import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoPropostaIaEnum, TipoUsuarioEnum, TipoUsuarioStatusEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ProjetoService } from '../../projeto/services/projeto.service';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { UsuarioService } from '../../usuario/services/usuario.service';
import { AtribuirMembroExecutor } from '../executores/atribuir-membro.executor';
import { DemandaService } from '../services/demanda.service';
import { ProporAtribuirMembroFerramenta } from './propor-atribuir-membro.ferramenta';

const GESTOR = { sub: 1, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;
const DESENVOLVEDOR = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

/** Valida que a `BusinessException` traz o texto (a mensagem fica no corpo da resposta HTTP, não em `message`). */
const contem = (texto: string) => (erro: BusinessException) => JSON.stringify(erro.getResponse()).includes(texto);

const USUARIOS: Record<number, { nomeCompleto: string; cargoTitulo: string; tipo: TipoUsuarioEnum; status: TipoUsuarioStatusEnum }> = {
  1: { nomeCompleto: 'Gestor Inicial', cargoTitulo: 'Gestor', tipo: TipoUsuarioEnum.GESTOR, status: TipoUsuarioStatusEnum.ATIVO },
  7: { nomeCompleto: 'Dev de Teste', cargoTitulo: 'Desenvolvedor', tipo: TipoUsuarioEnum.DESENVOLVEDOR, status: TipoUsuarioStatusEnum.ATIVO },
  8: { nomeCompleto: 'Ana Silva', cargoTitulo: 'Desenvolvedora', tipo: TipoUsuarioEnum.DESENVOLVEDOR, status: TipoUsuarioStatusEnum.ATIVO },
  9: { nomeCompleto: 'Beto Gestor', cargoTitulo: 'Gestor', tipo: TipoUsuarioEnum.GESTOR, status: TipoUsuarioStatusEnum.ATIVO },
  10: { nomeCompleto: 'Caio Inativo', cargoTitulo: 'Dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR, status: TipoUsuarioStatusEnum.INATIVO },
};

/** `UsuarioService` que lê a tabela de usuários do teste (o executor confere o tipo e a situação do alvo). */
const usuarioServiceDoTeste = { recuperar: async ({ id }: { id: number }) => ({ dados: USUARIOS[id] ? { id, ...USUARIOS[id] } : { id, nomeCompleto: 'Caio Novo', cargoTitulo: 'Dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR, status: TipoUsuarioStatusEnum.ATIVO } }) } as unknown as UsuarioService;

/** `DemandaService` em memória: a demanda 4 com os membros informados e o registro das chamadas. */
function criarServico(membrosIniciais: number[]) {
  const membros = new Set(membrosIniciais);
  const chamadas: string[] = [];
  const servico = {
    recuperar: async () => ({ dados: { id: 4, projetoId: 1, nome: 'Tela de login' } }),
    listarMembros: async () => ({ dados: [...membros].map((usuarioId) => ({ usuarioId })) }),
    atribuirMembro: async (dto: { demandaId: number; usuarioId: number }) => { chamadas.push(`adicionar:${dto.usuarioId}`); membros.add(dto.usuarioId); return {}; },
    removerMembro: async (dto: { demandaId: number; usuarioId: number }) => { chamadas.push(`remover:${dto.usuarioId}`); membros.delete(dto.usuarioId); return {}; },
  };
  return { servico: servico as unknown as DemandaService, chamadas, membros };
}

function criarFerramenta(membrosIniciais: number[]) {
  const propostas: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }[] = [];
  const propostaIaService = { criarComAutonomia: async (dto: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }) => { propostas.push(dto); return { id: 77, status: 'PENDENTE' }; } };
  const usuarioService = { recuperar: async ({ id }: { id: number }) => ({ dados: { id, ...USUARIOS[id] } }) };
  const projetoService = { recuperar: async () => ({ dados: { id: 1, nome: 'Projeto Demo' } }) };
  const { servico } = criarServico(membrosIniciais);
  const ferramenta = new ProporAtribuirMembroFerramenta(
    propostaIaService as unknown as PropostaIaService, servico, usuarioService as unknown as UsuarioService, projetoService as unknown as ProjetoService,
  );
  return { ferramenta, propostas };
}

test('propor adicionar guarda a ação e os nomes para o cartão', async () => {
  const { ferramenta, propostas } = criarFerramenta([7]);
  await ferramenta.executar({ demandaId: 4, usuarioId: 8, acao: 'ADICIONAR' }, GESTOR);
  assert.equal(propostas[0].tipo, TipoPropostaIaEnum.ATRIBUIR_MEMBRO);
  assert.deepEqual(propostas[0].dados, {
    demandaId: 4, usuarioId: 8, acao: 'ADICIONAR', demandaNome: 'Tela de login', projetoNome: 'Projeto Demo', usuarioNome: 'Ana Silva', usuarioCargo: 'Desenvolvedora',
  });
  assert.equal(ferramenta.permissao, 'QUALQUER');
});

test('propor recusa gestor, usuário inativo, já membro, não membro e o último membro, sem criar proposta', async () => {
  const { ferramenta, propostas } = criarFerramenta([7]);
  await assert.rejects(ferramenta.executar({ demandaId: 4, usuarioId: 9, acao: 'ADICIONAR' }, GESTOR), contem('é gestor'));
  await assert.rejects(ferramenta.executar({ demandaId: 4, usuarioId: 10, acao: 'ADICIONAR' }, GESTOR), BusinessException);
  await assert.rejects(ferramenta.executar({ demandaId: 4, usuarioId: 7, acao: 'ADICIONAR' }, GESTOR), BusinessException);
  await assert.rejects(ferramenta.executar({ demandaId: 4, usuarioId: 8, acao: 'REMOVER' }, GESTOR), BusinessException);
  await assert.rejects(ferramenta.executar({ demandaId: 4, usuarioId: 7, acao: 'REMOVER' }, GESTOR), contem('último membro'));
  assert.equal(propostas.length, 0);
});

test('executar adiciona e remove pela service e desfazer faz a ação inversa', async () => {
  const { servico, chamadas, membros } = criarServico([7, 8]);
  const executor = new AtribuirMembroExecutor(servico, usuarioServiceDoTeste);
  const adicionado = await executor.executar({ demandaId: 4, usuarioId: 11, acao: 'ADICIONAR' }, GESTOR);
  assert.ok(membros.has(11));
  await executor.desfazer(adicionado, GESTOR);
  assert.ok(!membros.has(11));
  const removido = await executor.executar({ demandaId: 4, usuarioId: 8, acao: 'REMOVER' }, GESTOR);
  assert.ok(!membros.has(8));
  await executor.desfazer(removido, GESTOR);
  assert.ok(membros.has(8));
  assert.deepEqual(chamadas, ['adicionar:11', 'remover:11', 'remover:8', 'adicionar:8']);
});

test('desfazer é recusado se o estado mudou depois', async () => {
  const { servico, chamadas, membros } = criarServico([7]);
  const executor = new AtribuirMembroExecutor(servico, usuarioServiceDoTeste);
  const resultado = await executor.executar({ demandaId: 4, usuarioId: 8, acao: 'ADICIONAR' }, GESTOR);
  membros.delete(8);
  chamadas.length = 0;
  await assert.rejects(executor.desfazer(resultado, GESTOR), BusinessException);
  assert.deepEqual(chamadas, []);
});

test('o desenvolvedor participa e sai ele mesmo, sem informar usuarioId; outra pessoa ele não coloca', async () => {
  const entra = criarFerramenta([8]);
  await entra.ferramenta.executar({ demandaId: 4, acao: 'ADICIONAR' }, DESENVOLVEDOR);
  assert.equal(entra.propostas[0].dados['usuarioId'], 7);
  assert.equal(entra.propostas[0].dados['usuarioNome'], 'Dev de Teste');
  const sai = criarFerramenta([7, 8]);
  await sai.ferramenta.executar({ demandaId: 4, acao: 'REMOVER' }, DESENVOLVEDOR);
  assert.equal(sai.propostas[0].dados['acao'], 'REMOVER');
  await assert.rejects(entra.ferramenta.executar({ demandaId: 4, usuarioId: 8, acao: 'REMOVER' }, DESENVOLVEDOR), contem('só entra e sai de uma demanda ele mesmo'));
  await assert.rejects(entra.ferramenta.executar({ demandaId: 4, usuarioId: 9, acao: 'ADICIONAR' }, DESENVOLVEDOR), BusinessException);
  assert.equal(entra.propostas.length, 1);
});

test('o gestor sem informar a pessoa é recusado (ele mesmo é gestor e não entra em demanda)', async () => {
  const { ferramenta, propostas } = criarFerramenta([7]);
  await assert.rejects(ferramenta.executar({ demandaId: 4, acao: 'ADICIONAR' }, GESTOR), contem('é gestor'));
  assert.equal(propostas.length, 0);
});

test('o executor do desenvolvedor usa ele mesmo quando o usuarioId não veio, e a service confere o resto', async () => {
  const { servico, chamadas, membros } = criarServico([8]);
  const executor = new AtribuirMembroExecutor(servico, usuarioServiceDoTeste);
  const resultado = await executor.executar({ demandaId: 4, acao: 'ADICIONAR' }, DESENVOLVEDOR);
  assert.ok(membros.has(7));
  assert.equal(resultado['usuarioId'], 7);
  await executor.desfazer(resultado, DESENVOLVEDOR);
  assert.ok(!membros.has(7));
  assert.deepEqual(chamadas, ['adicionar:7', 'remover:7']);
  assert.equal(await executor.estaObsoleta({ demandaId: 4, acao: 'ADICIONAR' }, DESENVOLVEDOR), false);
});

test('validar confere os dados; obsoleta quando a pessoa já está como a proposta pede', async () => {
  const { servico } = criarServico([7]);
  const executor = new AtribuirMembroExecutor(servico, usuarioServiceDoTeste);
  assert.doesNotThrow(() => executor.validar({ demandaId: 4, usuarioId: 8, acao: 'ADICIONAR', usuarioNome: 'Ana' }));
  assert.throws(() => executor.validar({ demandaId: 4, usuarioId: 8, acao: 'EXCLUIR' }), BusinessException);
  assert.throws(() => executor.validar({ demandaId: 4, usuarioId: 8, acao: 'ADICIONAR', senha: 'x' }), BusinessException);
  assert.equal(await executor.estaObsoleta({ demandaId: 4, usuarioId: 7, acao: 'ADICIONAR' }, GESTOR), true);
  assert.equal(await executor.estaObsoleta({ demandaId: 4, usuarioId: 8, acao: 'ADICIONAR' }, GESTOR), false);
  assert.equal(await executor.estaObsoleta({ demandaId: 4, usuarioId: 8, acao: 'REMOVER' }, GESTOR), true);
});

test('o executor também recusa gestor e inativo como alvo (a rota de ajuste aceita dados alterados e a service não confere o tipo)', async () => {
  const { servico, chamadas, membros } = criarServico([7]);
  const executor = new AtribuirMembroExecutor(servico, usuarioServiceDoTeste);
  await assert.rejects(executor.executar({ demandaId: 4, usuarioId: 9, acao: 'ADICIONAR' }, GESTOR), contem('é gestor'));
  await assert.rejects(executor.executar({ demandaId: 4, usuarioId: 1, acao: 'ADICIONAR' }, GESTOR), contem('é gestor'));
  await assert.rejects(executor.executar({ demandaId: 4, usuarioId: 10, acao: 'ADICIONAR' }, GESTOR), contem('inativo'));
  assert.deepEqual(chamadas, []);
  assert.ok(!membros.has(9) && !membros.has(1) && !membros.has(10));
});
