import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { StatusPropostaIaEnum } from '@project20/shared';
import { IaMensagem } from '../../ia/domain/ia.tipos';
import { atualizarPropostasNoContexto, idsDePropostasNoContexto, SituacaoDaProposta } from './propostas-no-contexto';

const PENDENTE = JSON.stringify({ propostaId: 7, situacao: 'PENDENTE', mensagem: 'Proposta criada. Nada foi feito ainda: o usuário precisa confirmar no cartão da conversa.' });

function contexto(): IaMensagem[] {
  return [
    { papel: 'usuario', conteudo: 'cria a atividade Login' },
    { papel: 'ia', conteudo: [{ tipo: 'uso_ferramenta', id: 'u1', nome: 'propor_criar_atividade', entrada: { nome: 'Login' } }] },
    { papel: 'usuario', conteudo: [{ tipo: 'resultado_ferramenta', usoId: 'u1', conteudo: PENDENTE }] },
    { papel: 'ia', conteudo: [{ tipo: 'texto', texto: 'Proposta pronta.' }] },
  ];
}

const situacao = (status: StatusPropostaIaEnum, resultado: Record<string, unknown> | null = null): ReadonlyMap<number, SituacaoDaProposta> => new Map([[7, { status, resultado }]]);
const conteudoDoResultado = (mensagens: IaMensagem[]) => JSON.parse(((mensagens[2].conteudo as { conteudo: string }[])[0]).conteudo) as Record<string, unknown>;

test('ids: acha as propostas devolvidas pelas ferramentas, sem repetir, e ignora resultado que não é proposta ou não é JSON', () => {
  const mensagens: IaMensagem[] = [
    ...contexto(),
    { papel: 'usuario', conteudo: [{ tipo: 'resultado_ferramenta', usoId: 'u2', conteudo: PENDENTE }, { tipo: 'resultado_ferramenta', usoId: 'u3', conteudo: '{"soma":5}' }, { tipo: 'resultado_ferramenta', usoId: 'u4', conteudo: 'erro de texto' }] },
  ];
  assert.deepEqual(idsDePropostasNoContexto(mensagens), [7]);
  assert.deepEqual(idsDePropostasNoContexto([{ papel: 'usuario', conteudo: 'oi' }]), []);
});

test('confirmada: o resultado deixa de dizer "nada foi feito" e traz o resultado da ação', () => {
  const atualizado = atualizarPropostasNoContexto(contexto(), situacao(StatusPropostaIaEnum.CONFIRMADA, { atividadeId: 12 }));
  const lido = conteudoDoResultado(atualizado);
  assert.equal(lido['propostaId'], 7);
  assert.equal(lido['situacao'], 'CONFIRMADA');
  assert.match(String(lido['mensagem']), /JÁ FOI FEITA/);
  assert.doesNotMatch(String(lido['mensagem']), /Nada foi feito ainda/);
  assert.deepEqual(lido['resultado'], { atividadeId: 12 });
});

test('cada situação tem o aviso certo: ajustada, recusada/expirada, desfeita e ainda pendente', () => {
  const aviso = (status: StatusPropostaIaEnum) => String(conteudoDoResultado(atualizarPropostasNoContexto(contexto(), situacao(status)))['mensagem']);
  assert.match(aviso(StatusPropostaIaEnum.AJUSTADA), /AJUSTOU.*JÁ FOI FEITA/);
  assert.match(aviso(StatusPropostaIaEnum.EXPIRADA), /RECUSADA ou EXPIROU: NADA foi feito/);
  assert.match(aviso(StatusPropostaIaEnum.DESFEITA), /DESFEZ.*NÃO vale mais/);
  assert.match(aviso(StatusPropostaIaEnum.PENDENTE), /Nada foi feito ainda/);
});

test('resultado grande da ação não vai ao contexto; o status continua', () => {
  const lido = conteudoDoResultado(atualizarPropostasNoContexto(contexto(), situacao(StatusPropostaIaEnum.CONFIRMADA, { lista: 'x'.repeat(1000) })));
  assert.equal(lido['situacao'], 'CONFIRMADA');
  assert.equal('resultado' in lido, false);
});

test('proposta fora do mapa, texto e chamadas de ferramenta ficam como estavam; as mensagens de entrada não são alteradas', () => {
  const original = contexto();
  const copiaAntes = JSON.stringify(original);
  const semMapa = atualizarPropostasNoContexto(original, new Map());
  assert.deepEqual(semMapa, original);
  const atualizado = atualizarPropostasNoContexto(original, situacao(StatusPropostaIaEnum.CONFIRMADA));
  assert.deepEqual([atualizado[0], atualizado[1], atualizado[3]], [original[0], original[1], original[3]]);
  assert.equal(JSON.stringify(original), copiaAntes);
});
