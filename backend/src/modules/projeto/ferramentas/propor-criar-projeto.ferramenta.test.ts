import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { ProjetoRepository } from '../repositories/projeto.repository';
import { ProjetoService } from '../services/projeto.service';
import { ListarProjetosFerramenta, LIMITE_PROJETOS_DA_FERRAMENTA } from './listar-projetos.ferramenta';
import { ProporCriarProjetoFerramenta } from './propor-criar-projeto.ferramenta';

const GESTOR = { sub: 1, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;

function montar(codigosEmUso: string[] = []) {
  const propostas: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }[] = [];
  const propostaIaService = {
    criar: async (dto: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }) => {
      propostas.push(dto);
      return { id: 40, status: 'PENDENTE' };
    },
  };
  const repositorio = { validarCodigo: async ({ codigo }: { codigo: string }) => codigosEmUso.includes(codigo) };
  const ferramenta = new ProporCriarProjetoFerramenta(propostaIaService as unknown as PropostaIaService, repositorio as unknown as ProjetoRepository);
  return { ferramenta, propostas };
}

test('é uma ferramenta de gestor e só propõe, já com código e cor derivados', async () => {
  const { ferramenta, propostas } = montar();
  assert.equal(ferramenta.permissao, 'GESTOR');
  const resultado = (await ferramenta.executar({ nome: 'Sistema de Gestão' }, GESTOR)) as { propostaId: number };
  assert.equal(resultado.propostaId, 40);
  assert.equal(propostas[0].tipo, TipoPropostaIaEnum.CRIAR_PROJETO);
  assert.equal(propostas[0].dados['codigo'], 'SG');
  assert.match(String(propostas[0].dados['cor']), /^#[0-9a-f]{6}$/);
});

test('código derivado que já existe ganha um número; código informado em uso é recusado', async () => {
  const derivado = montar(['SG']);
  await derivado.ferramenta.executar({ nome: 'Sistema de Gestão' }, GESTOR);
  assert.equal(derivado.propostas[0].dados['codigo'], 'SG2');

  const informado = montar(['XYZ']);
  await assert.rejects(informado.ferramenta.executar({ nome: 'Sistema de Gestão', codigo: 'xyz' }, GESTOR), BusinessException);
  assert.equal(informado.propostas.length, 0);
});

test('previsão de fim anterior ao início é recusada', async () => {
  const { ferramenta, propostas } = montar();
  await assert.rejects(ferramenta.executar({ nome: 'Sistema de Gestão', inicioData: '2026-05-10', previsaoFimData: '2026-05-01' }, GESTOR), BusinessException);
  assert.equal(propostas.length, 0);
});

test('listar projetos usa o usuário do token e limita o que volta', async () => {
  const chamadas: number[] = [];
  const servico = {
    listar: async (_filtros: unknown, usuarioAtivo: { sub: number }) => {
      chamadas.push(usuarioAtivo.sub);
      return { dados: { itens: Array.from({ length: LIMITE_PROJETOS_DA_FERRAMENTA + 3 }, (_, i) => ({ id: i + 1, nome: `P${i}`, codigo: `C${i}`, cor: '#000000', status: 'ATIVO' })) } };
    },
  };
  const resultado = await new ListarProjetosFerramenta(servico as unknown as ProjetoService).executar({}, GESTOR);
  assert.deepEqual(chamadas, [1]);
  assert.equal(resultado.projetos.length, LIMITE_PROJETOS_DA_FERRAMENTA);
  assert.equal(resultado.haMais, true);
  assert.deepEqual(Object.keys(resultado.projetos[0]), ['id', 'nome', 'codigo', 'status']);
});
