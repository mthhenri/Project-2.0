import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ConfiguracaoIaResumoDto, EsforcoIaEnum, EstadoIaEnum, NivelIaEnum, TipoProvedorIaEnum } from '@project20/shared';
import { ConfiguracaoIaService } from '../../configuracao-ia/services/configuracao-ia.service';
import { IaException } from '../domain/ia.exception';
import { IaProvedor } from '../domain/ia-provedor';
import { IaRespostaProvedor, IaSolicitacaoProvedor } from '../domain/ia.tipos';
import { IaProvedores, IaService } from './ia.service';

function configuracao(parcial: Partial<ConfiguracaoIaResumoDto> = {}): ConfiguracaoIaResumoDto {
  return {
    id: 1, versao: 1, provedor: TipoProvedorIaEnum.ANTHROPIC,
    modeloRapido: 'haiku', modeloPadrao: 'sonnet', modeloAnalitico: 'opus', esforcoAnalitico: EsforcoIaEnum.MEDIO,
    checkinMinimoMinutos: 30, checkinMaximoMinutos: 80, duracaoRecomendadaMinutos: 90,
    checkinInteligente: true, rigorProporcional: true, deteccaoAutomatica: true, iaDesligada: false,
    usuarioId: 1, usuarioNome: 'Admin', createdDate: new Date(),
    ...parcial,
  };
}

function criar(parcial: Partial<ConfiguracaoIaResumoDto> = {}, opcoes: { disponivel?: boolean; falha?: unknown } = {}) {
  const estado = { atual: configuracao(parcial) };
  const chamadas: IaSolicitacaoProvedor[] = [];
  const provedor: IaProvedor = {
    estaDisponivel: () => opcoes.disponivel ?? true,
    async gerar(solicitacao) {
      chamadas.push(solicitacao);
      if (opcoes.falha) throw opcoes.falha;
      return resposta(solicitacao.modelo);
    },
    async transmitir(solicitacao, aoTrecho) {
      chamadas.push(solicitacao);
      aoTrecho('um');
      aoTrecho('dois');
      return resposta(solicitacao.modelo);
    },
  };
  const configuracaoIaService = { obterAtiva: async () => estado.atual } as unknown as ConfiguracaoIaService;
  const provedores: IaProvedores = { [TipoProvedorIaEnum.ANTHROPIC]: provedor };
  return { servico: new IaService(configuracaoIaService, provedores), estado, chamadas };
}

function resposta(modelo: string): IaRespostaProvedor {
  return { texto: 'ok', blocos: [{ tipo: 'texto', texto: 'ok' }], modelo, tokens: { entrada: 1, saida: 1, cache: 0 }, motivoParada: 'fim' };
}

const PEDIDO = { mensagens: [{ papel: 'usuario' as const, conteudo: 'oi' }] };

test('cada nível usa o modelo da configuração; o esforço só vale no analítico', async () => {
  const { servico, chamadas } = criar();
  const rapido = await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO });
  const padrao = await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.PADRAO });
  const analitico = await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.ANALITICO });

  assert.deepEqual(chamadas.map((c) => c.modelo), ['haiku', 'sonnet', 'opus']);
  assert.deepEqual(chamadas.map((c) => c.esforco), [undefined, undefined, EsforcoIaEnum.MEDIO]);
  assert.deepEqual([rapido.nivel, padrao.nivel, analitico.nivel], [NivelIaEnum.RAPIDO, NivelIaEnum.PADRAO, NivelIaEnum.ANALITICO]);
  assert.equal(chamadas[0].maximoTokens, 1024);
});

test('trocar o modelo na configuração vale na chamada seguinte, sem reiniciar', async () => {
  const { servico, estado, chamadas } = criar();
  await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.PADRAO });
  estado.atual = configuracao({ modeloPadrao: 'sonnet-novo', versao: 2 });
  await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.PADRAO });
  assert.deepEqual(chamadas.map((c) => c.modelo), ['sonnet', 'sonnet-novo']);
});

test('IA desligada recusa antes de chamar o provedor', async () => {
  const { servico, chamadas } = criar({ iaDesligada: true });
  await assert.rejects(
    () => servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO }),
    (erro: unknown) => erro instanceof IaException && erro.motivo === 'DESLIGADA',
  );
  await assert.rejects(() => servico.transmitir({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO }, () => undefined), IaException);
  assert.equal(chamadas.length, 0);
  assert.equal(await servico.obterEstado(), EstadoIaEnum.DESLIGADA);
});

test('provedor sem implementação (Google) falha com erro de configuração', async () => {
  const { servico } = criar({ provedor: TipoProvedorIaEnum.GOOGLE });
  await assert.rejects(
    () => servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO }),
    (erro: unknown) => erro instanceof IaException && erro.motivo === 'CONFIGURACAO',
  );
  assert.equal(await servico.obterEstado(), EstadoIaEnum.FORA_DO_AR);
});

test('transmitir entrega os trechos e devolve a resposta com o nível', async () => {
  const { servico } = criar();
  const trechos: string[] = [];
  const resultado = await servico.transmitir({ ...PEDIDO, nivel: NivelIaEnum.PADRAO }, (t) => trechos.push(t));
  assert.deepEqual(trechos, ['um', 'dois']);
  assert.equal(resultado.nivel, NivelIaEnum.PADRAO);
});

test('estado: falha de indisponibilidade põe fora do ar e o próximo sucesso volta ao ar', async () => {
  const falha = { falha: new IaException('INDISPONIVEL', 'caiu') };
  const { servico, estado } = criar();
  assert.equal(await servico.obterEstado(), EstadoIaEnum.NO_AR);

  const comFalha = criar({}, falha);
  await assert.rejects(() => comFalha.servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO }), IaException);
  assert.equal(await comFalha.servico.obterEstado(), EstadoIaEnum.FORA_DO_AR);

  await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO });
  assert.equal(await servico.obterEstado(), EstadoIaEnum.NO_AR);
  void estado;
});

test('estado: provedor sem chave está fora do ar; limite de uso não derruba o estado', async () => {
  assert.equal(await criar({}, { disponivel: false }).servico.obterEstado(), EstadoIaEnum.FORA_DO_AR);

  const limite = criar({}, { falha: new IaException('LIMITE', 'limite') });
  await assert.rejects(() => limite.servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO }), IaException);
  assert.equal(await limite.servico.obterEstado(), EstadoIaEnum.NO_AR);
});
