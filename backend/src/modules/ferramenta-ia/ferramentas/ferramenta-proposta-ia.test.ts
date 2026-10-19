import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { StatusPropostaIaEnum, TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
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
    criar: async (dto: Record<string, unknown>) => { criadas.push(dto); return { id: 55, status: StatusPropostaIaEnum.PENDENTE }; },
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
  assert.match(String(resultado.mensagem), /Nada foi feito ainda/);
});

test('a ferramenta pode montar dados próprios (com os nomes para o cartão)', async () => {
  const { servico, criadas } = criarServicoDeProposta();
  await new FerramentaComDadosPropios(servico).executar({ atividadeId: 3 }, USUARIO);
  assert.deepEqual(criadas[0].dados, { atividadeId: 3, nomeAtividade: 'Atividade X' });
});

test('se a criação da proposta falha, a falha sobe (o registro a devolve ao modelo) e nada mais é chamado', async () => {
  const falha = new Error('tipo recusado');
  const ferramenta = new FerramentaFicticia({ criar: async () => { throw falha; } } as unknown as PropostaIaService);
  await assert.rejects(() => ferramenta.executar({ atividadeId: 3 }, USUARIO), falha);
});
