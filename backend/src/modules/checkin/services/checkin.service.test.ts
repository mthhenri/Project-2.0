import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ChatEventoDto, ChatMensagemEnviarDto, ContextoChatEnum, TipoUsuarioEnum } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { ConflictException } from '../../../core/exceptions/conflict.exception';
import { ChatService, OpcoesDeConversa } from '../../chat/services/chat.service';
import { ConfiguracaoIaService } from '../../configuracao-ia/services/configuracao-ia.service';
import { ExecucaoService } from '../../execucao/services/execucao.service';
import { CheckinSuspensaoService } from './checkin-suspensao.service';
import { CheckinService } from './checkin.service';

const USUARIO = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const configService = { obter: () => ({ aplicacao: { fusoHorario: 'America/Sao_Paulo' } }) } as unknown as ConfigService;
const AGORA = new Date('2026-10-19T14:00:00Z');

const CONFIGURACAO = { checkinMinimoMinutos: 30, checkinMaximoMinutos: 80, duracaoRecomendadaMinutos: 90, rigorProporcional: true };

function montar(opcoes: { inicioDaExecucao?: string | null; rigor?: boolean } = {}) {
  const inicio = opcoes.inicioDaExecucao === undefined ? '2026-10-19T11:20:00Z' : opcoes.inicioDaExecucao;
  const execucaoService = {
    recuperarAtiva: async () => ({ dados: inicio ? { id: 5, atividadeId: 9, descricao: 'Validar e-mail', inicioData: new Date(inicio) } : null }),
    listar: async () => ({ dados: { itens: [{ id: 5, nomeAtividade: 'Ajustar login', nomeDemanda: 'Autenticação', nomeProjeto: 'Loja' }] } }),
  };
  const configuracaoIaService = { obterAtiva: async () => ({ ...CONFIGURACAO, rigorProporcional: opcoes.rigor ?? true }) };
  const suspensao = new CheckinSuspensaoService(configService);
  const chamadasAoChat: { dto: ChatMensagemEnviarDto; opcoes: OpcoesDeConversa }[] = [];
  const chatService = {
    enviarMensagem: async (_usuario: unknown, dto: ChatMensagemEnviarDto, _emitir: (evento: ChatEventoDto) => void, opcoesDeConversa: OpcoesDeConversa) => {
      chamadasAoChat.push({ dto, opcoes: opcoesDeConversa });
    },
  };
  const servico = new (class extends CheckinService {
    protected agora(): Date {
      return AGORA;
    }
  })(
    execucaoService as unknown as ExecucaoService,
    configuracaoIaService as unknown as ConfiguracaoIaService,
    suspensao,
    chatService as unknown as ChatService,
    configService,
  );
  return { servico, suspensao, chamadasAoChat };
}

test('sem execução em andamento não há check-in, mas a configuração e a suspensão vêm', async () => {
  const { servico, suspensao } = montar({ inicioDaExecucao: null });
  suspensao.suspender(7, 'reunião');
  const { dados } = await servico.consultarSituacao(USUARIO);
  assert.equal(dados?.haCheckin, false);
  assert.equal(dados?.execucao, null);
  assert.equal(dados?.acimaDoRecomendado, false);
  assert.equal(dados?.suspensao.suspenso, true);
  assert.deepEqual([dados?.checkinMinimoMinutos, dados?.checkinMaximoMinutos, dados?.duracaoRecomendadaMinutos], [30, 80, 90]);
});

test('com execução em andamento devolve atividade, demanda, tempo e o selo de rigor acima do recomendado', async () => {
  const { servico } = montar(); // 11:20Z até 14:00Z = 2h40
  const { dados } = await servico.consultarSituacao(USUARIO);
  assert.equal(dados?.haCheckin, true);
  assert.equal(dados?.execucao?.atividade, 'Ajustar login');
  assert.equal(dados?.execucao?.demanda, 'Autenticação');
  assert.equal(dados?.execucao?.minutos, 160);
  assert.equal(dados?.acimaDoRecomendado, true);
  assert.equal(dados?.suspensao.suspenso, false);
});

test('dentro do recomendado, o selo de rigor não acende', async () => {
  const { servico } = montar({ inicioDaExecucao: '2026-10-19T13:00:00Z' }); // 1h
  assert.equal((await servico.consultarSituacao(USUARIO)).dados?.acimaDoRecomendado, false);
});

test('a mensagem do check-in vai ao chat com o contexto CHECKIN e o rigor calculado no backend', async () => {
  const { servico, chamadasAoChat } = montar();
  await servico.enviarMensagem(USUARIO, { texto: 'Mexi no e-mail duplicado' }, () => undefined);
  assert.equal(chamadasAoChat.length, 1);
  assert.equal(chamadasAoChat[0].opcoes.contexto, ContextoChatEnum.CHECKIN);
  assert.match(String(chamadasAoChat[0].opcoes.instrucoesExtras), /há 2h40/);
  assert.match(String(chamadasAoChat[0].opcoes.instrucoesExtras), /foram 2h40, teve mais alguma coisa\?/);
});

test('com o rigor desligado, o contexto não pede mais detalhe', async () => {
  const { servico, chamadasAoChat } = montar({ rigor: false });
  await servico.enviarMensagem(USUARIO, { texto: 'Mexi no e-mail' }, () => undefined);
  assert.doesNotMatch(String(chamadasAoChat[0].opcoes.instrucoesExtras), /teve mais alguma coisa/);
});

test('sem execução em andamento a mensagem é recusada (409) e o chat nem é chamado', async () => {
  const { servico, chamadasAoChat } = montar({ inicioDaExecucao: null });
  await assert.rejects(servico.enviarMensagem(USUARIO, { texto: 'oi' }, () => undefined), ConflictException);
  assert.equal(chamadasAoChat.length, 0);
});
