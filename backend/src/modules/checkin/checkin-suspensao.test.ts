import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { ConfigService } from '../../config/config.service';
import { BusinessException } from '../../core/exceptions/business.exception';
import { ConfiguracaoIaService } from '../configuracao-ia/services/configuracao-ia.service';
import { FerramentaIaRegistro } from '../ferramenta-ia/services/ferramenta-ia.registro';
import { PropostaIaService } from '../proposta-ia/services/proposta-ia.service';
import { SuspenderCheckinExecutor } from './executores/suspender-checkin.executor';
import { ProporRetomarCheckinFerramenta, ProporSuspenderCheckinFerramenta } from './ferramentas/propor-checkin.ferramentas';
import { CheckinSuspensaoService } from './services/checkin-suspensao.service';

const USUARIO = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const configService = { obter: () => ({ aplicacao: { fusoHorario: 'America/Sao_Paulo' } }) } as unknown as ConfigService;

/** O serviço com o relógio na mão do teste. */
function criarServico(instanteInicial = '2026-10-19T13:00:00Z') {
  let agora = new Date(instanteInicial);
  const servico = new (class extends CheckinSuspensaoService {
    protected agora(): Date {
      return agora;
    }
  })(configService);
  return { servico, passarPara: (instante: string) => (agora = new Date(instante)) };
}

test('suspende por usuário e consulta; os outros usuários não são afetados', () => {
  const { servico } = criarServico();
  servico.suspender(7, '  reunião de planejamento ');
  assert.deepEqual(servico.consultar(7), { suspenso: true, desde: new Date('2026-10-19T13:00:00Z'), motivo: 'reunião de planejamento' });
  assert.equal(servico.consultar(8).suspenso, false);
});

test('retomar encerra a suspensão e devolve a que acabou (ou null)', () => {
  const { servico } = criarServico();
  servico.suspender(7, 'reunião');
  assert.equal(servico.retomar(7)?.motivo, 'reunião');
  assert.equal(servico.consultar(7).suspenso, false);
  assert.equal(servico.retomar(7), null);
});

test('a suspensão acaba sozinha na meia-noite do fuso do sistema', () => {
  const { servico, passarPara } = criarServico('2026-10-19T13:00:00Z');
  servico.suspender(7, null);
  passarPara('2026-10-20T02:59:00Z'); // ainda 19/10 em São Paulo
  assert.equal(servico.consultar(7).suspenso, true);
  passarPara('2026-10-20T03:00:00Z'); // virou 20/10
  assert.equal(servico.consultar(7).suspenso, false);
});

test('o executor suspende e retoma só o usuário do token, e desfaz uma e outra', async () => {
  const { servico } = criarServico();
  const executor = new SuspenderCheckinExecutor(servico);

  const suspendeu = await executor.executar({ acao: 'SUSPENDER', motivo: 'reunião' }, USUARIO);
  assert.equal(servico.consultar(7).suspenso, true);
  assert.equal(servico.consultar(8).suspenso, false);
  await executor.desfazer(suspendeu, USUARIO);
  assert.equal(servico.consultar(7).suspenso, false);

  servico.suspender(7, 'reunião longa');
  const retomou = await executor.executar({ acao: 'RETOMAR' }, USUARIO);
  assert.equal(servico.consultar(7).suspenso, false);
  await executor.desfazer(retomou, USUARIO);
  assert.equal(servico.consultar(7).motivo, 'reunião longa');
});

test('o executor recusa retomar o que não estava suspenso e valida os dados', async () => {
  const { servico } = criarServico();
  const executor = new SuspenderCheckinExecutor(servico);
  await assert.rejects(executor.executar({ acao: 'RETOMAR' }, USUARIO), BusinessException);
  assert.throws(() => executor.validar({ acao: 'PAUSAR' }), BusinessException);
  assert.throws(() => executor.validar({ acao: 'SUSPENDER', usuarioId: 2 }), BusinessException);
  assert.doesNotThrow(() => executor.validar({ acao: 'SUSPENDER', motivo: 'reunião' }));
});

function montarFerramentas(checkinInteligente: boolean | null) {
  const propostas: { usuarioId: number; tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }[] = [];
  const propostaIaService = {
    criarComAutonomia: async (dto: { usuarioId: number; tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }) => {
      propostas.push(dto);
      return { id: 3, status: 'PENDENTE' };
    },
  };
  const configuracaoIaService = { obterAtivaEmCache: () => (checkinInteligente === null ? null : { checkinInteligente }) };
  const { servico } = criarServico();
  const suspender = new ProporSuspenderCheckinFerramenta(propostaIaService as unknown as PropostaIaService, servico, configuracaoIaService as unknown as ConfiguracaoIaService);
  const retomar = new ProporRetomarCheckinFerramenta(propostaIaService as unknown as PropostaIaService, servico, configuracaoIaService as unknown as ConfiguracaoIaService);
  return { suspender, retomar, propostas, servico };
}

test('propor suspender só cria a proposta; propor retomar exige estar suspenso', async () => {
  const { suspender, retomar, propostas, servico } = montarFerramentas(true);
  await assert.rejects(retomar.executar({}, USUARIO), BusinessException);
  await suspender.executar({ motivo: 'reunião de planejamento' }, USUARIO);
  assert.deepEqual(propostas[0].dados, { acao: 'SUSPENDER', motivo: 'reunião de planejamento' });
  assert.equal(propostas[0].tipo, TipoPropostaIaEnum.SUSPENDER_CHECKIN);
  assert.equal(servico.consultar(7).suspenso, false);

  servico.suspender(7, null);
  await assert.rejects(suspender.executar({}, USUARIO), BusinessException);
  await retomar.executar({}, USUARIO);
  assert.deepEqual(propostas[1].dados, { acao: 'RETOMAR' });
});

test('com o check-in inteligente desligado, as ferramentas somem da lista e são recusadas se chamadas', async () => {
  for (const [flag, aparecem] of [[true, true], [false, false], [null, true]] as const) {
    const { suspender, retomar } = montarFerramentas(flag);
    const registro = new FerramentaIaRegistro();
    registro.registrar(suspender);
    registro.registrar(retomar);
    const nomes = registro.listarParaUsuario(USUARIO).map((ferramenta) => ferramenta.nome);
    assert.deepEqual(nomes, aparecem ? ['propor_suspender_checkin', 'propor_retomar_checkin'] : []);
    if (!aparecem) {
      const resultado = await registro.executar('propor_suspender_checkin', { motivo: 'reunião' }, USUARIO);
      assert.equal(resultado.erro, true);
      assert.match(resultado.conteudo, /desabilitada/);
    }
  }
});
