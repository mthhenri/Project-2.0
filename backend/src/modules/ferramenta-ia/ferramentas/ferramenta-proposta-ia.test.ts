import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ContextoChatEnum, StatusPropostaIaEnum, TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { FerramentaPropostaIa } from './ferramenta-proposta-ia';

// SYSTEM.SPEC.md §12 (`ferramenta-ia`): a ferramenta de proposta só enxerga a `PropostaIaService`, cria uma proposta pendente e
// devolve ao modelo que o usuário ainda precisa confirmar; ela nunca chama uma service de domínio.

class EntradaFicticia { atividadeId: number; }

class FerramentaFicticia extends FerramentaPropostaIa<EntradaFicticia> {
  readonly nome = 'propor_ficticia';
  readonly descricao = 'ferramenta de teste';
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = EntradaFicticia;
  readonly tipoProposta = TipoPropostaIaEnum.INICIAR_EXECUCAO;
}

class FerramentaComDadosPropios extends FerramentaFicticia {
  protected montarDados(entrada: EntradaFicticia) {
    return Promise.resolve({ atividadeId: entrada.atividadeId, nomeAtividade: 'Atividade X' });
  }
}

const USUARIO = { sub: 9, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

function criarServicoDeProposta() {
  const criadas: Record<string, unknown>[] = [];
  const servico = {
    criarComAutonomia: async (dto: Record<string, unknown>) => { criadas.push(dto); return { id: 55, status: StatusPropostaIaEnum.PENDENTE }; },
  };
  return { servico: servico as unknown as PropostaIaService, criadas };
}

test('é ferramenta do tipo PROPOSTA', () => {
  assert.equal(new FerramentaFicticia(criarServicoDeProposta().servico).tipo, 'PROPOSTA');
});

test('cria a proposta do tipo da ferramenta, em nome do usuário do token, com a entrada como dados', async () => {
  const { servico, criadas } = criarServicoDeProposta();
  await new FerramentaFicticia(servico).executar({ atividadeId: 3 }, USUARIO);
  assert.deepEqual(criadas, [{ usuarioId: 9, tipo: TipoPropostaIaEnum.INICIAR_EXECUCAO, dados: { atividadeId: 3 } }]);
});

test('devolve ao modelo o id, a situação pendente e o aviso de que nada foi feito ainda', async () => {
  const resultado = (await new FerramentaFicticia(criarServicoDeProposta().servico).executar({ atividadeId: 3 }, USUARIO)) as Record<string, unknown>;
  assert.equal(resultado.propostaId, 55);
  assert.equal(resultado.situacao, StatusPropostaIaEnum.PENDENTE);
  assert.equal('resultado' in resultado, false, 'proposta pendente não tem o que devolver');
  assert.match(String(resultado.mensagem), /Nada foi feito ainda/);
});

test('a ferramenta pode montar dados próprios (com os nomes para o cartão)', async () => {
  const { servico, criadas } = criarServicoDeProposta();
  await new FerramentaComDadosPropios(servico).executar({ atividadeId: 3 }, USUARIO);
  assert.deepEqual(criadas[0].dados, { atividadeId: 3, nomeAtividade: 'Atividade X' });
});

test('se a criação da proposta falha, a falha sobe (o registro a devolve ao modelo) e nada mais é chamado', async () => {
  const falha = new Error('tipo recusado');
  const ferramenta = new FerramentaFicticia({ criarComAutonomia: async () => { throw falha; } } as unknown as PropostaIaService);
  await assert.rejects(() => ferramenta.executar({ atividadeId: 3 }, USUARIO), falha);
});

test('proposta que o serviço já confirmou (nível "Faz e avisa") volta ao modelo como feita, sem pedir confirmação (task 228)', async () => {
  const ferramenta = new FerramentaFicticia({
    criarComAutonomia: async () => ({ id: 56, status: StatusPropostaIaEnum.CONFIRMADA, resultado: { atividadeId: 81 } }),
  } as unknown as PropostaIaService);
  const resultado = (await ferramenta.executar({ atividadeId: 3 }, USUARIO)) as Record<string, unknown>;
  assert.equal(resultado.propostaId, 56);
  assert.deepEqual(resultado.resultado, { atividadeId: 81 }, 'os ids do que foi feito voltam ao modelo para encadear o próximo passo');
  assert.equal(resultado.situacao, StatusPropostaIaEnum.CONFIRMADA);
  assert.match(String(resultado.mensagem), /^Feito/);
  assert.doesNotMatch(String(resultado.mensagem), /Nada foi feito ainda/);
});

test('a ferramenta entrega o usuário do token ao serviço, que decide o nível e confirma em nome dele (task 228)', async () => {
  const recebidos: unknown[][] = [];
  const ferramenta = new FerramentaFicticia({
    criarComAutonomia: async (...argumentos: unknown[]) => { recebidos.push(argumentos); return { id: 57, status: StatusPropostaIaEnum.PENDENTE }; },
  } as unknown as PropostaIaService);
  await ferramenta.executar({ atividadeId: 3 }, USUARIO);
  assert.deepEqual(recebidos[0], [{ usuarioId: 9, tipo: TipoPropostaIaEnum.INICIAR_EXECUCAO, dados: { atividadeId: 3 } }, USUARIO, { noCheckin: false }]);
});

test('dentro do check-in a ferramenta avisa o serviço (P-040); no chat, não', async () => {
  const origens: unknown[] = [];
  const ferramenta = new FerramentaFicticia({
    criarComAutonomia: async (_dto: unknown, _usuario: unknown, origem: unknown) => { origens.push(origem); return { id: 58, status: StatusPropostaIaEnum.PENDENTE }; },
  } as unknown as PropostaIaService);
  await ferramenta.executar({ atividadeId: 3 }, USUARIO, { contexto: ContextoChatEnum.CHECKIN });
  await ferramenta.executar({ atividadeId: 3 }, USUARIO, { contexto: ContextoChatEnum.CHAT });
  assert.deepEqual(origens, [{ noCheckin: true }, { noCheckin: false }]);
});

