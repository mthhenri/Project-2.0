import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoPropostaIaEnum, TipoUsuarioEnum, TipoUsuarioStatusEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
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
  7: { nomeCompleto: 'Dev de Teste', cargoTitulo: 'Desenvolvedor', tipo: TipoUsuarioEnum.DESENVOLVEDOR, status: TipoUsuarioStatusEnum.ATIVO },
  8: { nomeCompleto: 'Ana Silva', cargoTitulo: 'Desenvolvedora', tipo: TipoUsuarioEnum.DESENVOLVEDOR, status: TipoUsuarioStatusEnum.ATIVO },
  9: { nomeCompleto: 'Beto Gestor', cargoTitulo: 'Gestor', tipo: TipoUsuarioEnum.GESTOR, status: TipoUsuarioStatusEnum.ATIVO },
  10: { nomeCompleto: 'Caio Inativo', cargoTitulo: 'Dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR, status: TipoUsuarioStatusEnum.INATIVO },
};

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
  const propostaIaService = { criar: async (dto: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }) => { propostas.push(dto); return { id: 77, status: 'PENDENTE' }; } };
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
  assert.equal(ferramenta.permissao, 'GESTOR');
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
  const executor = new AtribuirMembroExecutor(servico);
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

test('desfazer é recusado se o estado mudou depois; só o gestor executa e desfaz', async () => {
  const { servico, chamadas, membros } = criarServico([7]);
  const executor = new AtribuirMembroExecutor(servico);
  const resultado = await executor.executar({ demandaId: 4, usuarioId: 8, acao: 'ADICIONAR' }, GESTOR);
  membros.delete(8);
  chamadas.length = 0;
  await assert.rejects(executor.desfazer(resultado, GESTOR), BusinessException);
  await assert.rejects(executor.executar({ demandaId: 4, usuarioId: 8, acao: 'ADICIONAR' }, DESENVOLVEDOR), UnauthorizedAccessException);
  await assert.rejects(executor.desfazer(resultado, DESENVOLVEDOR), UnauthorizedAccessException);
  assert.deepEqual(chamadas, []);
});

test('validar confere os dados; obsoleta quando a pessoa já está como a proposta pede', async () => {
  const { servico } = criarServico([7]);
  const executor = new AtribuirMembroExecutor(servico);
  assert.doesNotThrow(() => executor.validar({ demandaId: 4, usuarioId: 8, acao: 'ADICIONAR', usuarioNome: 'Ana' }));
  assert.throws(() => executor.validar({ demandaId: 4, usuarioId: 8, acao: 'EXCLUIR' }), BusinessException);
  assert.throws(() => executor.validar({ demandaId: 4, usuarioId: 8, acao: 'ADICIONAR', senha: 'x' }), BusinessException);
  assert.equal(await executor.estaObsoleta({ demandaId: 4, usuarioId: 7, acao: 'ADICIONAR' }, GESTOR), true);
  assert.equal(await executor.estaObsoleta({ demandaId: 4, usuarioId: 8, acao: 'ADICIONAR' }, GESTOR), false);
  assert.equal(await executor.estaObsoleta({ demandaId: 4, usuarioId: 8, acao: 'REMOVER' }, GESTOR), true);
});
