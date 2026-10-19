import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { DescricaoCampoIa, gerarEsquemaDeClasse } from './esquema-da-classe';

// O esquema JSON mostrado ao modelo é gerado dos decoradores da classe validada (SYSTEM.SPEC.md §12 `ferramenta-ia`):
// o modelo nunca vê um campo que a validação recusa.

enum CorEnum { AZUL = 'AZUL', VERDE = 'VERDE' }

class EntradaCompleta {
  @DescricaoCampoIa('Nome do projeto')
  @IsString() @MinLength(2) @MaxLength(40)
  nome: string;

  @IsInt() @Min(1) @Max(12)
  mes: number;

  @IsNumber()
  horas: number;

  @IsBoolean()
  ativo: boolean;

  @IsEnum(CorEnum)
  cor: CorEnum;

  @IsIn(['RAPIDO', 'LENTO'])
  ritmo: string;

  @IsOptional() @IsString()
  observacao?: string;

  @IsArray() @IsInt({ each: true })
  ids: number[];

  @IsArray() @IsEnum(CorEnum, { each: true })
  cores: CorEnum[];
}

class EntradaVazia {}

test('cada tipo de decorador vira o tipo e as restrições do esquema', () => {
  const esquema = gerarEsquemaDeClasse(EntradaCompleta);
  assert.equal(esquema.type, 'object');
  assert.equal(esquema.additionalProperties, false);
  assert.deepEqual(esquema.properties.nome, { type: 'string', minLength: 2, maxLength: 40, description: 'Nome do projeto' });
  assert.deepEqual(esquema.properties.mes, { type: 'integer', minimum: 1, maximum: 12 });
  assert.deepEqual(esquema.properties.horas, { type: 'number' });
  assert.deepEqual(esquema.properties.ativo, { type: 'boolean' });
  assert.deepEqual(esquema.properties.cor, { type: 'string', enum: ['AZUL', 'VERDE'] });
  assert.deepEqual(esquema.properties.ritmo, { enum: ['RAPIDO', 'LENTO'] });
});

test('arrays com `each` descrevem o tipo dos itens', () => {
  const esquema = gerarEsquemaDeClasse(EntradaCompleta);
  assert.deepEqual(esquema.properties.ids, { type: 'array', items: { type: 'integer' } });
  assert.deepEqual(esquema.properties.cores, { type: 'array', items: { type: 'string', enum: ['AZUL', 'VERDE'] } });
});

test('só os campos com @IsOptional ficam de fora de `required`', () => {
  const esquema = gerarEsquemaDeClasse(EntradaCompleta);
  assert.equal(esquema.required.includes('observacao'), false);
  assert.deepEqual(esquema.required.sort(), ['ativo', 'cor', 'cores', 'horas', 'ids', 'mes', 'nome', 'ritmo']);
  assert.ok('observacao' in esquema.properties);
});

test('classe sem campos gera esquema vazio', () => {
  assert.deepEqual(gerarEsquemaDeClasse(EntradaVazia), { type: 'object', properties: {}, required: [], additionalProperties: false });
});

test('a descrição de uma classe não vaza para outra', () => {
  class Outra { @IsString() nome: string; }
  assert.equal('description' in gerarEsquemaDeClasse(Outra).properties.nome, false);
});
