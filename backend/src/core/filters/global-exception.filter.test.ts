import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { BadRequestException, ForbiddenException, HttpException, ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import { BusinessException } from '../exceptions/business.exception';
import { ResourceNotFoundException } from '../exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../exceptions/unauthorized-access.exception';
import { ConflictException } from '../exceptions/conflict.exception';

function capturar(excecao: unknown): { status: number; corpo: any } {
  let status = 0;
  let corpo: any;
  const resposta = {
    status(codigo: number) { status = codigo; return this; },
    json(conteudo: unknown) { corpo = conteudo; return this; },
  };
  const host = { switchToHttp: () => ({ getResponse: () => resposta }) } as unknown as ArgumentsHost;
  new GlobalExceptionFilter().catch(excecao, host);
  return { status, corpo };
}

const FORMATO_DE_ERRO = ['sucesso', 'dados', 'mensagem', 'erros'];

test('BusinessException vira 400 no formato de erro padrão', () => {
  const { status, corpo } = capturar(new BusinessException('Regra violada'));
  assert.equal(status, 400);
  assert.deepEqual(corpo, { sucesso: false, mensagem: 'Regra violada', dados: null, erros: [] });
});

test('ResourceNotFoundException vira 404 com o nome da entidade', () => {
  const { status, corpo } = capturar(new ResourceNotFoundException('Tag'));
  assert.equal(status, 404);
  assert.equal(corpo.mensagem, 'Tag não encontrado');
  assert.equal(corpo.sucesso, false);
});

test('UnauthorizedAccessException vira 403', () => {
  const { status, corpo } = capturar(new UnauthorizedAccessException());
  assert.equal(status, 403);
  assert.equal(corpo.mensagem, 'Acesso não autorizado');
});

test('ConflictException vira 409', () => {
  const { status, corpo } = capturar(new ConflictException());
  assert.equal(status, 409);
  assert.equal(corpo.sucesso, false);
});

test('erro de validação do class-validator (400 com lista de mensagens) vira "Dados inválidos" com os erros', () => {
  const { status, corpo } = capturar(new BadRequestException(['nome should not be empty', 'cor must be a string']));
  assert.equal(status, 400);
  assert.equal(corpo.sucesso, false);
  assert.equal(corpo.dados, null);
  assert.equal(corpo.mensagem, 'Dados inválidos');
  assert.deepEqual(corpo.erros, ['nome should not be empty', 'cor must be a string']);
});

test('HttpException do Nest com mensagem única mantém o status e vira lista de um erro', () => {
  const { status, corpo } = capturar(new ForbiddenException('Sem permissão'));
  assert.equal(status, 403);
  assert.deepEqual(corpo.erros, ['Sem permissão']);
  assert.deepEqual(Object.keys(corpo).sort(), [...FORMATO_DE_ERRO].sort());
});

test('HttpException com status customizado preserva o status', () => {
  const { status } = capturar(new HttpException('Muitas requisições', 429));
  assert.equal(status, 429);
});

test('erro desconhecido vira 500 genérico sem vazar mensagem interna nem stack', () => {
  const erro = new Error('connection refused to 10.0.0.5:5432 password=segredo');
  const { status, corpo } = capturar(erro);
  assert.equal(status, 500);
  assert.deepEqual(corpo, { sucesso: false, dados: null, mensagem: 'Erro interno do servidor', erros: [] });
  const texto = JSON.stringify(corpo);
  assert.ok(!texto.includes('segredo') && !texto.includes('10.0.0.5') && !texto.includes('at '));
});

test('valor lançado que não é Error (string, null) também vira 500 genérico', () => {
  for (const lancado of ['falhou', null, undefined, 42]) {
    const { status, corpo } = capturar(lancado);
    assert.equal(status, 500);
    assert.equal(corpo.mensagem, 'Erro interno do servidor');
  }
});
