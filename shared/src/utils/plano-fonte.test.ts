import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoPlanoFonteOrigemEnum as Origem } from '../enums/tipo-plano-fonte-origem.enum';
import {
  LIMITE_CONTEUDO_DA_FONTE_DO_PLANO,
  LIMITE_TITULO_DA_FONTE_DO_PLANO,
  pareceConteudoBinario,
  temExtensaoAceitaDeFonte,
  validarFonteDoPlano,
} from './plano-fonte';

test('aceita .txt e .md em qualquer caixa e recusa as outras extensões', () => {
  assert.equal(temExtensaoAceitaDeFonte('email.txt'), true);
  assert.equal(temExtensaoAceitaDeFonte('LEIAME.MD'), true);
  assert.equal(temExtensaoAceitaDeFonte('contrato.pdf'), false);
  assert.equal(temExtensaoAceitaDeFonte('imagem.png'), false);
  assert.equal(temExtensaoAceitaDeFonte('txt'), false);
});

test('reconhece conteúdo binário e deixa passar texto com tab, quebra de linha e acentos', () => {
  assert.equal(pareceConteudoBinario('PK\u0003\u0004\u0000abc'), true);
  assert.equal(pareceConteudoBinario('texto com � quebrado'), true);
  assert.equal(pareceConteudoBinario('Olá,\tmundo\r\nlinha dois\n'), false);
});

test('validarFonteDoPlano: texto colado válido passa; em branco e acima do limite não', () => {
  const colado = { titulo: 'E-mail do cliente', conteudo: 'Precisamos exportar.', origem: Origem.COLADO };
  assert.equal(validarFonteDoPlano(colado), null);
  assert.match(validarFonteDoPlano({ ...colado, titulo: '  ' }) ?? '', /título/);
  assert.match(validarFonteDoPlano({ ...colado, titulo: 'a'.repeat(LIMITE_TITULO_DA_FONTE_DO_PLANO + 1) }) ?? '', /título/);
  assert.match(validarFonteDoPlano({ ...colado, conteudo: '   ' }) ?? '', /vazio/);
  assert.equal(validarFonteDoPlano({ ...colado, conteudo: 'a'.repeat(LIMITE_CONTEUDO_DA_FONTE_DO_PLANO) }), null);
  assert.match(validarFonteDoPlano({ ...colado, conteudo: 'a'.repeat(LIMITE_CONTEUDO_DA_FONTE_DO_PLANO + 1) }) ?? '', /no máximo/);
});

test('validarFonteDoPlano: arquivo exige extensão de texto e conteúdo legível', () => {
  const arquivo = { titulo: 'briefing.md', conteudo: '# Briefing', origem: Origem.ARQUIVO };
  assert.equal(validarFonteDoPlano(arquivo), null);
  assert.match(validarFonteDoPlano({ ...arquivo, titulo: 'briefing.pdf' }) ?? '', /arquivos de texto/);
  assert.match(validarFonteDoPlano({ ...arquivo, conteudo: 'PK\u0000\u0001' }) ?? '', /legível/);
  // Texto colado não passa pela regra da extensão.
  assert.equal(validarFonteDoPlano({ ...arquivo, titulo: 'qualquer coisa', origem: Origem.COLADO }), null);
});
