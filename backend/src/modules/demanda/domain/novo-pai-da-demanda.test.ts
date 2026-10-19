import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { validarNovoPaiDaDemanda } from './novo-pai-da-demanda';

// Mover uma demanda para dentro de outra: a service só confere o projeto; estas três regras (mais o pai estrutural) valem na ferramenta e no executor da IA.

const PAI = { id: 5, nome: 'Estrutura', projetoId: 7, isEstrutural: true };
const BASE = { demandaId: 10, demandaProjetoId: 7, novoPai: PAI, idsDaSubarvore: [10, 11, 12] };

const mensagem = (erro: unknown) => ((erro as BusinessException).getResponse() as { mensagem: string }).mensagem;

test('pai estrutural do mesmo projeto, fora da própria subárvore, é aceito', () => {
  assert.doesNotThrow(() => validarNovoPaiDaDemanda(BASE));
});

test('uma demanda não pode ser pai de si mesma', () => {
  assert.throws(() => validarNovoPaiDaDemanda({ ...BASE, novoPai: { ...PAI, id: 10 } }), (erro) => {
    assert.ok(erro instanceof BusinessException);
    assert.match(mensagem(erro), /si mesma/);
    return true;
  });
});

test('mover para dentro de uma descendente é recusado: criaria um ciclo na árvore', () => {
  for (const idDaSubarvore of [11, 12]) {
    assert.throws(() => validarNovoPaiDaDemanda({ ...BASE, novoPai: { ...PAI, id: idDaSubarvore } }), (erro) => {
      assert.ok(erro instanceof BusinessException);
      assert.match(mensagem(erro), /ciclo/);
      return true;
    }, String(idDaSubarvore));
  }
});

test('o novo pai precisa ser do mesmo projeto da demanda', () => {
  assert.throws(() => validarNovoPaiDaDemanda({ ...BASE, novoPai: { ...PAI, projetoId: 8 } }), (erro) => {
    assert.match(mensagem(erro), /mesmo projeto/);
    return true;
  });
});

test('só demanda estrutural agrupa outras: pai não estrutural é recusado', () => {
  assert.throws(() => validarNovoPaiDaDemanda({ ...BASE, novoPai: { ...PAI, isEstrutural: false } }), (erro) => {
    assert.match(mensagem(erro), /estrutural/);
    return true;
  });
});

test('a ordem das regras: a própria demanda vence a subárvore, e a subárvore vence projeto e estrutura', () => {
  const comTudoErrado = { ...PAI, id: 10, projetoId: 99, isEstrutural: false };
  assert.match(mensagem((() => { try { validarNovoPaiDaDemanda({ ...BASE, novoPai: comTudoErrado }); } catch (erro) { return erro; } })()), /si mesma/);
  const naSubarvoreEOutroProjeto = { ...PAI, id: 11, projetoId: 99, isEstrutural: false };
  assert.match(mensagem((() => { try { validarNovoPaiDaDemanda({ ...BASE, novoPai: naSubarvoreEOutroProjeto }); } catch (erro) { return erro; } })()), /ciclo/);
});
