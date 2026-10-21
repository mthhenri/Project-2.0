import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AutorMensagemDiretaEnum, ReferenciaMensagemDiretaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { MensagemDiretaFonte, MensagemDiretaNova, deFonteDireta, paraFonteDireta, validarMensagemDiretaNova } from './mensagem-direta.documento';

const UUID = '7f0c2b9e-4c1a-4e6a-9d55-2f6c0d1b8a10';

const NOVA: MensagemDiretaNova = {
  mensagemId: UUID,
  conversaId: '4-9',
  autor: AutorMensagemDiretaEnum.USUARIO,
  autorUsuarioId: 9,
  texto: 'Vi isso ontem.\n\n```ts\nthis.filtro.set(\'\');\n```',
  contemCodigo: true,
  mencoes: [4],
  referencias: [{ tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: 212 }],
};

const mensagemDe = (erro: unknown): string => ((erro as BusinessException).getResponse() as { mensagem: string }).mensagem;
const recusa = (mensagem: MensagemDiretaNova, trecho: RegExp) =>
  assert.throws(() => validarMensagemDiretaNova(mensagem), (erro) => erro instanceof BusinessException && trecho.test(mensagemDe(erro)));

test('uma mensagem coerente passa na validação, de qualquer um dos dois participantes', () => {
  assert.doesNotThrow(() => validarMensagemDiretaNova(NOVA));
  assert.doesNotThrow(() => validarMensagemDiretaNova({ ...NOVA, autorUsuarioId: 4 }));
});

test('a mensagem do sistema é aceita sem autor', () => {
  assert.doesNotThrow(() => validarMensagemDiretaNova({ ...NOVA, autor: AutorMensagemDiretaEnum.SISTEMA, autorUsuarioId: null }));
});

test('recusa conversa que não é direta, na ordem errada ou de uma pessoa só', () => {
  for (const conversaId of ['', '9-4', '4-4', '4', 'a-b', '7-2026-10-17']) {
    recusa({ ...NOVA, conversaId }, /Conversa direta inválida/);
  }
});

test('recusa identificador que não é UUID e texto vazio', () => {
  recusa({ ...NOVA, mensagemId: 'abc' }, /UUID/);
  recusa({ ...NOVA, mensagemId: '' }, /UUID/);
  recusa({ ...NOVA, texto: '' }, /vazia/);
  recusa({ ...NOVA, texto: '  \n\t ' }, /vazia/);
});

test('recusa autor que não participa da conversa e autor na mensagem do sistema', () => {
  recusa({ ...NOVA, autorUsuarioId: 5 }, /participar/);
  recusa({ ...NOVA, autorUsuarioId: null }, /participar/);
  recusa({ ...NOVA, autor: AutorMensagemDiretaEnum.SISTEMA, autorUsuarioId: 9 }, /não tem autor/);
});

test('o documento leva os dois participantes em ordem, as referências em texto e a data do servidor', () => {
  const fonte = paraFonteDireta(NOVA, new Date('2026-10-21T14:05:11.482Z'));
  assert.deepEqual(fonte, {
    mensagem_id: UUID,
    conversa_id: '4-9',
    participantes: [4, 9],
    autor_usuario_id: 9,
    autor: 'USUARIO',
    texto: NOVA.texto,
    contem_codigo: true,
    mencoes: [4],
    referencias: ['DEMANDA:212'],
    created_date: '2026-10-21T14:05:11.482Z',
  });
});

test('ler o documento devolve o resumo, com as referências de volta como objeto', () => {
  const resumo = deFonteDireta(paraFonteDireta(NOVA, new Date('2026-10-21T14:05:11.482Z')));
  assert.deepEqual(resumo, {
    mensagemId: UUID,
    conversaId: '4-9',
    autor: AutorMensagemDiretaEnum.USUARIO,
    autorUsuarioId: 9,
    texto: NOVA.texto,
    contemCodigo: true,
    mencoes: [4],
    referencias: [{ tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: 212 }],
    createdDate: new Date('2026-10-21T14:05:11.482Z'),
  });
});

test('ler tolera documento sem autor, sem menções e com referência que não se entende', () => {
  const fonte = {
    mensagem_id: UUID,
    conversa_id: '4-9',
    participantes: [4, 9],
    autor: 'SISTEMA',
    texto: 'Fulano leu esta conversa',
    contem_codigo: false,
    created_date: '2026-10-21T14:05:11.482Z',
    referencias: ['PROJETO:1', 'lixo', 'ATIVIDADE:57'],
  } as unknown as MensagemDiretaFonte;
  const resumo = deFonteDireta(fonte);
  assert.equal(resumo.autorUsuarioId, null);
  assert.deepEqual(resumo.mencoes, []);
  assert.deepEqual(resumo.referencias, [{ tipo: ReferenciaMensagemDiretaEnum.ATIVIDADE, id: 57 }]);
});
