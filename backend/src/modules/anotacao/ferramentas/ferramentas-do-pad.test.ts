import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoAnotacaoEnum, TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { AnotacaoService } from '../services/anotacao.service';
import { ConsultarPadFerramenta, LIMITE_CARACTERES_DA_SECAO } from './consultar-pad.ferramenta';
import { ProporAnotarPadFerramenta } from './propor-anotar-pad.ferramenta';

const USUARIO = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const configService = { obter: () => ({ aplicacao: { fusoHorario: 'America/Sao_Paulo' } }) } as unknown as ConfigService;

function servicoDeAnotacao(textos: Partial<Record<TipoAnotacaoEnum, string>>) {
  const pedidos: { usuarioId: number; tipos?: string[] }[] = [];
  const servico = {
    listar: async (dto: { usuarioId: number; tipos?: TipoAnotacaoEnum[] }) => {
      pedidos.push(dto);
      const tipos = dto.tipos ?? Object.values(TipoAnotacaoEnum);
      return { dados: tipos.map((tipo) => ({ id: 1, usuarioId: dto.usuarioId, tipo, texto: textos[tipo] ?? '', updatedDate: new Date() })) };
    },
  };
  return { servico: servico as unknown as AnotacaoService, pedidos };
}

function consultar(textos: Partial<Record<TipoAnotacaoEnum, string>>) {
  const { servico, pedidos } = servicoDeAnotacao(textos);
  const ferramenta = new (class extends ConsultarPadFerramenta {
    protected agora(): Date {
      return new Date('2026-10-18T15:00:00Z'); // 18/10 em São Paulo
    }
  })(servico, configService);
  return { ferramenta, pedidos };
}

test('consultar_pad lê só as seções pedidas, do próprio usuário', async () => {
  const { ferramenta, pedidos } = consultar({ LEMBRETE: 'Reunião às 10h.' });
  const resultado = await ferramenta.executar({ secoes: [TipoAnotacaoEnum.LEMBRETE] }, USUARIO);
  assert.deepEqual(pedidos, [{ usuarioId: 7, tipos: ['LEMBRETE'] }]);
  assert.deepEqual(resultado.secoes.map((secao) => [secao.tipo, secao.rotulo, secao.texto]), [['LEMBRETE', 'Lembretes', 'Reunião às 10h.']]);
  assert.equal(resultado.hoje, '18/10');
});

test('em Feito vem só o bloco do dia (hoje por padrão, ou o pedido)', async () => {
  const feito = '## 18/10\n- Hoje\n\n## 17/10\n- Ontem';
  const { ferramenta } = consultar({ FEITO: feito });
  assert.equal((await ferramenta.executar({ secoes: [TipoAnotacaoEnum.FEITO] }, USUARIO)).secoes[0].texto, '## 18/10\n- Hoje');
  assert.equal((await ferramenta.executar({ secoes: [TipoAnotacaoEnum.FEITO], diaDoFeito: '17/10' }, USUARIO)).secoes[0].texto, '## 17/10\n- Ontem');
  assert.equal((await ferramenta.executar({ secoes: [TipoAnotacaoEnum.FEITO], diaDoFeito: '10/10' }, USUARIO)).secoes[0].texto, '');
});

test('seção grande é cortada e avisada', async () => {
  const { ferramenta } = consultar({ PESSOAL: 'x'.repeat(LIMITE_CARACTERES_DA_SECAO + 50) });
  const [secao] = (await ferramenta.executar({ secoes: [TipoAnotacaoEnum.PESSOAL] }, USUARIO)).secoes;
  assert.equal(secao.truncado, true);
  assert.equal(secao.texto.length, LIMITE_CARACTERES_DA_SECAO);
});

function propor(textos: Partial<Record<TipoAnotacaoEnum, string>>) {
  const propostas: { usuarioId: number; tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }[] = [];
  const propostaIaService = {
    criarComAutonomia: async (dto: { usuarioId: number; tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }) => {
      propostas.push(dto);
      return { id: 5, status: 'PENDENTE' };
    },
  };
  const { servico } = servicoDeAnotacao(textos);
  return { ferramenta: new ProporAnotarPadFerramenta(propostaIaService as unknown as PropostaIaService, servico), propostas };
}

test('propor anotar só cria a proposta (anexar em Lembretes)', async () => {
  const { ferramenta, propostas } = propor({});
  const resultado = (await ferramenta.executar({ secao: TipoAnotacaoEnum.LEMBRETE, operacao: 'ANEXAR', texto: 'Homologação reinicia às 18h.' }, USUARIO)) as { propostaId: number };
  assert.equal(resultado.propostaId, 5);
  assert.equal(propostas[0].tipo, TipoPropostaIaEnum.ANOTAR_PAD);
  assert.equal(propostas[0].usuarioId, 7);
});

test('propor anotar em Pessoal exige pedido explícito', async () => {
  const { ferramenta, propostas } = propor({});
  await assert.rejects(ferramenta.executar({ secao: TipoAnotacaoEnum.PESSOAL, operacao: 'ANEXAR', texto: 'npm run dev' }, USUARIO), BusinessException);
  assert.equal(propostas.length, 0);
  await ferramenta.executar({ secao: TipoAnotacaoEnum.PESSOAL, operacao: 'ANEXAR', texto: 'npm run dev', pedidoExplicito: true }, USUARIO);
  assert.equal(propostas.length, 1);
});

test('propor trocar confere o trecho contra a seção de agora: ausente e ambíguo não geram cartão', async () => {
  const { ferramenta, propostas } = propor({ EM_ANDAMENTO: 'Validar e-mail.\nValidar senha.\nValidar e-mail de novo.' });
  await assert.rejects(ferramenta.executar({ secao: TipoAnotacaoEnum.EM_ANDAMENTO, operacao: 'TROCAR', trechoAntigo: 'Outra coisa', trechoNovo: 'x' }, USUARIO), BusinessException);
  await assert.rejects(ferramenta.executar({ secao: TipoAnotacaoEnum.EM_ANDAMENTO, operacao: 'TROCAR', trechoAntigo: 'Validar e-mail', trechoNovo: 'x' }, USUARIO), BusinessException);
  assert.equal(propostas.length, 0);
  await ferramenta.executar({ secao: TipoAnotacaoEnum.EM_ANDAMENTO, operacao: 'TROCAR', trechoAntigo: 'Validar senha.', trechoNovo: 'Senha validada.' }, USUARIO);
  assert.equal(propostas.length, 1);
});
