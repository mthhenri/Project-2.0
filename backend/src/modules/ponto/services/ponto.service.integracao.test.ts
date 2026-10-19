import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '@project20/shared';
import { testarComBanco, ConexaoTeste } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import {
  criarAtividade, criarDesenvolvedor, criarDiaNaoUtil, criarExecucao, criarGestor, criarPontoJustificativa,
} from '../../../testes/fabricas';
import { CalendarioRepository } from '../../calendario/repositories/calendario.repository';
import { ExecucaoRepository } from '../../execucao/repositories/execucao.repository';
import { PontoJustificativaRepository } from '../../ponto-justificativa/repositories/ponto-justificativa.repository';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import { PontoService } from './ponto.service';

// O ponto de ponta a ponta com os repositories reais (SYSTEM.SPEC.md §12 `ponto`, §14 "Dias Não Úteis"): o que a service
// só consegue provar com o SQL do calendário, das execuções e das justificativas. Usa 2031 (março: segunda-feira dia 3,
// 21 dias úteis), um ano que nenhum outro dado do banco de teste ocupa; o feriado recorrente é cadastrado em 2020.

const servicoDe = (conexao: ConexaoTeste) => new PontoService(
  criarRepositorio(ExecucaoRepository, conexao),
  criarRepositorio(CalendarioRepository, conexao),
  criarRepositorio(UsuarioRepository, conexao),
  criarRepositorio(PontoJustificativaRepository, conexao),
  { obter: () => ({ negocio: { intervaloMinimoMinutos: 15 } }) } as never,
);

const comoDesenvolvedor = (usuario: { id: number }) => ({ sub: usuario.id, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR }) as never;
const comoGestor = (usuario: { id: number }) => ({ sub: usuario.id, login: 'ges', tipo: TipoUsuarioEnum.GESTOR }) as never;

/** Desenvolvedor com atividade própria, para registrar execuções. */
async function desenvolvedorComAtividade(conexao: ConexaoTeste, horas = 8) {
  const usuario = await criarDesenvolvedor(conexao, { horasDiariasNecessarias: horas });
  const atividade = await criarAtividade(conexao, { usuarioId: usuario.id });
  return { usuario, atividade };
}

const SEGUNDA = '2031-03-03';

testarComBanco('feriado recorrente cadastrado em outro ano vale na data, no diário e no mensal', async (conexao) => {
  await criarDiaNaoUtil(conexao, { diaData: '2020-03-03', recorrente: true, descricao: 'Aniversário da cidade' });
  const { usuario, atividade } = await desenvolvedorComAtividade(conexao);
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: `${SEGUNDA}T09:00:00-03:00`, fimData: `${SEGUNDA}T11:00:00-03:00` });

  const diario = await servicoDe(conexao).consultarDiario({ data: SEGUNDA }, comoDesenvolvedor(usuario));
  assert.equal(diario.ehDiaUtil, false);
  assert.equal(diario.motivoNaoUtil, 'Feriado - Aniversário da cidade');
  assert.equal(diario.minutosTrabalhadosExtra, 120);

  const mensal = await servicoDe(conexao).consultarMensal({ ano: 2031, mes: 3 }, comoDesenvolvedor(usuario));
  const dia = mensal.dias.find((item) => item.data === SEGUNDA)!;
  assert.deepEqual([dia.ehDiaUtil, dia.metaMinutos], [false, 0]);
  assert.equal(mensal.diasUteisMes, 20);
});

testarComBanco('feriado NÃO recorrente vale só no ano cadastrado', async (conexao) => {
  await criarDiaNaoUtil(conexao, { diaData: '2030-03-04', recorrente: false });
  const { usuario } = await desenvolvedorComAtividade(conexao);
  const diario = await servicoDe(conexao).consultarDiario({ data: '2031-03-04' }, comoDesenvolvedor(usuario));
  assert.equal(diario.ehDiaUtil, true);
});

testarComBanco('meio período no SQL real: a meta cai à metade e o excedente vira extra', async (conexao) => {
  await criarDiaNaoUtil(conexao, { diaData: SEGUNDA, duracaoCodigo: 'MEIO_PERIODO', tipoCodigo: 'PONTO_FACULTATIVO', descricao: 'Jogo' });
  const { usuario, atividade } = await desenvolvedorComAtividade(conexao);
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: `${SEGUNDA}T08:00:00-03:00`, fimData: `${SEGUNDA}T13:00:00-03:00` });

  const diario = await servicoDe(conexao).consultarDiario({ data: SEGUNDA }, comoDesenvolvedor(usuario));
  assert.deepEqual([diario.metaMinutos, diario.minutosTrabalhadosDiaUtil, diario.minutosTrabalhadosExtra, diario.saldoMinutos], [240, 240, 60, 0]);
  const mensal = await servicoDe(conexao).consultarMensal({ ano: 2031, mes: 3 }, comoDesenvolvedor(usuario));
  assert.equal(mensal.diasUteisMes, 21 - 0.5);
});

testarComBanco('mensal: execuções do mês, intervalo e justificativa vêm dos repositories reais', async (conexao) => {
  const { usuario, atividade } = await desenvolvedorComAtividade(conexao);
  const gestor = await criarGestor(conexao);
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: `${SEGUNDA}T09:00:00-03:00`, fimData: `${SEGUNDA}T12:00:00-03:00` });
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: `${SEGUNDA}T13:00:00-03:00`, fimData: `${SEGUNDA}T15:00:00-03:00` });
  await criarPontoJustificativa(conexao, { usuarioId: usuario.id, gestorId: gestor.id, diaData: SEGUNDA, nome: 'Consulta médica', horasCobertas: 3 });

  const mensal = await servicoDe(conexao).consultarMensal({ ano: 2031, mes: 3 }, comoDesenvolvedor(usuario));
  const dia = mensal.dias.find((item) => item.data === SEGUNDA)!;
  assert.equal(dia.totalMinutosTrabalhados, 300);
  assert.equal(dia.metaMinutos, 300);
  assert.equal(dia.saldoMinutos, 0);
  assert.equal(dia.justificativaNome, 'Consulta médica');
  assert.deepEqual(dia.intervalos.map((intervalo) => intervalo.duracaoMinutos), [60]);
  assert.equal(mensal.metaMinutosMes, 21 * 480 - 180);
  assert.equal(mensal.totalMinutosTrabalhadosMes, 300);
});

testarComBanco('justificativa excluída não desconta da meta', async (conexao) => {
  const { usuario } = await desenvolvedorComAtividade(conexao);
  const gestor = await criarGestor(conexao);
  const justificativa = await criarPontoJustificativa(conexao, { usuarioId: usuario.id, gestorId: gestor.id, diaData: SEGUNDA, horasCobertas: 4 });
  await criarRepositorio(PontoJustificativaRepository, conexao).excluir({ id: justificativa.id });

  const diario = await servicoDe(conexao).consultarDiario({ data: SEGUNDA }, comoDesenvolvedor(usuario));
  assert.equal(diario.metaMinutos, 480);
});

testarComBanco('todos: inclui cada usuário ativo com as próprias execuções, sem misturar donos', async (conexao) => {
  const { usuario: ana, atividade: atividadeAna } = await desenvolvedorComAtividade(conexao);
  const { usuario: beto, atividade: atividadeBeto } = await desenvolvedorComAtividade(conexao, 6);
  const gestor = await criarGestor(conexao);
  await criarExecucao(conexao, { atividadeId: atividadeAna.id, inicioData: `${SEGUNDA}T09:00:00-03:00`, fimData: `${SEGUNDA}T10:00:00-03:00` });
  await criarExecucao(conexao, { atividadeId: atividadeBeto.id, inicioData: `${SEGUNDA}T09:00:00-03:00`, fimData: `${SEGUNDA}T11:00:00-03:00` });

  const pontos = await servicoDe(conexao).consultarTodos({ data: SEGUNDA }, comoGestor(gestor));
  const deAna = pontos.find((ponto) => ponto.usuarioId === ana.id)!;
  const deBeto = pontos.find((ponto) => ponto.usuarioId === beto.id)!;
  assert.deepEqual([deAna.totalMinutosTrabalhados, deAna.metaMinutos], [60, 480]);
  assert.deepEqual([deBeto.totalMinutosTrabalhados, deBeto.metaMinutos], [120, 360]);
});

testarComBanco('execução de atividade de outro usuário não entra no ponto', async (conexao) => {
  const { usuario, atividade } = await desenvolvedorComAtividade(conexao);
  const { atividade: atividadeAlheia } = await desenvolvedorComAtividade(conexao);
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: `${SEGUNDA}T09:00:00-03:00`, fimData: `${SEGUNDA}T10:00:00-03:00` });
  await criarExecucao(conexao, { atividadeId: atividadeAlheia.id, inicioData: `${SEGUNDA}T09:00:00-03:00`, fimData: `${SEGUNDA}T17:00:00-03:00` });

  const mensal = await servicoDe(conexao).consultarMensal({ ano: 2031, mes: 3 }, comoDesenvolvedor(usuario));
  assert.equal(mensal.totalMinutosTrabalhadosMes, 60);
});
