import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { validarDadosDaProposta } from './validar-dados-da-proposta';

// Os dados de uma proposta valem pela mesma classe do `shared` que valida a entrada da ferramenta; o cartão "Ajustar" não
// grava nada que o executor não conheça.

class DadosFicticios {
  @IsInt() @Min(1)
  atividadeId: number;

  @IsOptional() @IsString()
  descricao?: string;
}

const mensagemDe = (erro: unknown) => JSON.stringify((erro as BusinessException).getResponse());

test('dados válidos voltam como instância da classe, com os valores convertidos', () => {
  const instancia = validarDadosDaProposta(DadosFicticios, { atividadeId: 4, descricao: 'ok' });
  assert.ok(instancia instanceof DadosFicticios);
  assert.equal(instancia.atividadeId, 4);
  assert.equal(instancia.descricao, 'ok');
});

test('campo opcional pode faltar', () => {
  assert.equal(validarDadosDaProposta(DadosFicticios, { atividadeId: 4 }).descricao, undefined);
});

test('campo obrigatório faltando ou com tipo errado é recusado com o motivo', () => {
  assert.throws(() => validarDadosDaProposta(DadosFicticios, {}), (erro: unknown) => erro instanceof BusinessException && /Dados da proposta inválidos/.test(mensagemDe(erro)));
  assert.throws(() => validarDadosDaProposta(DadosFicticios, { atividadeId: 'quatro' }), BusinessException);
  assert.throws(() => validarDadosDaProposta(DadosFicticios, { atividadeId: 0 }), BusinessException);
});

test('campo desconhecido é recusado (o ajuste não grava o que o executor não conhece)', () => {
  assert.throws(() => validarDadosDaProposta(DadosFicticios, { atividadeId: 4, usuarioId: 99 }), BusinessException);
});
