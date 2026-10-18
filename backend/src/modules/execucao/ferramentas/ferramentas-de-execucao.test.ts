import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ExecucaoListarDto, TipoUsuarioEnum } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { ExecucaoService } from '../services/execucao.service';
import { ConsultarExecucaoAtivaFerramenta } from './consultar-execucao-ativa.ferramenta';
import { ListarMinhasExecucoesDoDiaFerramenta } from './listar-minhas-execucoes-do-dia.ferramenta';

const USUARIO = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

function ativa(instante: string, servico: Record<string, unknown>) {
  return new (class extends ConsultarExecucaoAtivaFerramenta {
    protected agora(): Date {
      return new Date(instante);
    }
  })(servico as unknown as ExecucaoService);
}

test('sem execução em andamento, diz que não há', async () => {
  const ferramenta = ativa('2026-10-18T15:00:00Z', { recuperarAtiva: async () => ({ dados: null }) });
  assert.deepEqual(await ferramenta.executar({}, USUARIO), { ativa: false });
});

test('com execução em andamento, devolve atividade, demanda, descrição provisória e minutos até agora', async () => {
  const ferramenta = ativa('2026-10-18T15:00:00Z', {
    recuperarAtiva: async () => ({ dados: { id: 5, atividadeId: 9, descricao: 'Validando e-mail', inicioData: new Date('2026-10-18T13:20:00Z') } }),
    listar: async () => ({ dados: { itens: [{ id: 4, nomeAtividade: 'Outra' }, { id: 5, nomeAtividade: 'Ajustar login', nomeDemanda: 'Autenticação', nomeProjeto: 'Loja' }] } }),
  });
  const resultado = await ferramenta.executar({}, USUARIO);
  assert.equal(resultado.ativa, true);
  assert.equal(resultado.atividade, 'Ajustar login');
  assert.equal(resultado.descricao, 'Validando e-mail');
  assert.equal(resultado.minutosAteAgora, 100);
  assert.equal(resultado.inicio, '2026-10-18T13:20:00.000Z');
});

test('as execuções do dia são só as do usuário do token, no dia do fuso do sistema', async () => {
  const chamadas: { filtros: ExecucaoListarDto; usuarioId: number }[] = [];
  const servico = {
    listar: async (filtros: ExecucaoListarDto, usuarioAtivo: { sub: number }) => {
      chamadas.push({ filtros, usuarioId: usuarioAtivo.sub });
      return {
        dados: {
          itens: [
            { id: 1, nomeAtividade: 'A', nomeDemanda: 'D', nomeProjeto: 'P', descricao: 'x', inicioData: new Date('2026-10-18T12:00:00Z'), fimData: new Date('2026-10-18T13:00:00Z'), duracaoMinutos: 60 },
            { id: 2, nomeAtividade: 'B', nomeDemanda: 'D', nomeProjeto: 'P', descricao: 'y', inicioData: new Date('2026-10-18T13:00:00Z'), fimData: null, duracaoMinutos: null },
          ],
          totalItens: 2,
          totalMinutosDia: 60,
        },
      };
    },
  };
  const configService = { obter: () => ({ aplicacao: { fusoHorario: 'America/Sao_Paulo' } }) } as unknown as ConfigService;
  const ferramenta = new (class extends ListarMinhasExecucoesDoDiaFerramenta {
    protected agora(): Date {
      return new Date('2026-10-18T02:30:00Z'); // ainda é 17/10 em São Paulo
    }
  })(servico as unknown as ExecucaoService, configService);

  const resultado = await ferramenta.executar({}, USUARIO);
  assert.equal(chamadas[0].usuarioId, 7);
  assert.equal(chamadas[0].filtros.usuarioId, 7);
  assert.equal(chamadas[0].filtros.data, '2026-10-17');
  assert.equal(resultado.data, '2026-10-17');
  assert.deepEqual(resultado.execucoes.map((execucao) => [execucao.id, execucao.fim, execucao.minutos]), [[1, '2026-10-18T13:00:00.000Z', 60], [2, null, null]]);
  assert.equal(resultado.totalMinutos, 60);
  assert.equal(resultado.haMais, false);
});
