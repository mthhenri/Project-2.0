import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '@project20/shared';
import { BuscaWeb } from '../domain/busca-web';
import { gerarEsquemaDeClasse } from '../domain/esquema-da-classe';
import { FerramentaIaRegistro } from '../services/ferramenta-ia.registro';
import { PesquisarNaInternetFerramenta } from './pesquisar-na-internet.ferramenta';

const USUARIO = { sub: 1, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

function criar(disponivel: boolean, chamadas: Array<[string, number]> = []) {
  const busca = new (class extends BuscaWeb {
    disponivel() {
      return disponivel;
    }
    async buscar(consulta: string, quantidade: number) {
      chamadas.push([consulta, quantidade]);
      return [{ titulo: 'Doc', url: 'https://exemplo.dev', trecho: 'trecho' }];
    }
  })();
  return new PesquisarNaInternetFerramenta(busca);
}

test('é de leitura, de qualquer usuário, e some da lista sem a chave da busca', () => {
  const registro = new FerramentaIaRegistro();
  registro.registrar(criar(false));
  assert.equal(registro.listarParaUsuario(USUARIO).length, 0);

  const comChave = new FerramentaIaRegistro();
  comChave.registrar(criar(true));
  assert.deepEqual(comChave.listarParaUsuario(USUARIO).map((ferramenta) => ferramenta.nome), ['pesquisar_na_internet']);
});

test('desabilitada, a chamada é recusada em vez de buscar', async () => {
  const chamadas: Array<[string, number]> = [];
  const registro = new FerramentaIaRegistro();
  registro.registrar(criar(false, chamadas));
  const resultado = await registro.executar('pesquisar_na_internet', { consulta: 'react signals' }, USUARIO);
  assert.equal(resultado.erro, true);
  assert.equal(chamadas.length, 0);
});

test('busca com a consulta aparada, pede 5 resultados e devolve o aviso de conteúdo de terceiros', async () => {
  const chamadas: Array<[string, number]> = [];
  const registro = new FerramentaIaRegistro();
  registro.registrar(criar(true, chamadas));
  const resultado = await registro.executar('pesquisar_na_internet', { consulta: '  nestjs guards order  ' }, USUARIO);

  assert.equal(resultado.erro, false);
  assert.deepEqual(chamadas, [['nestjs guards order', 5]]);
  const dados = JSON.parse(resultado.conteudo);
  assert.equal(dados.resultados[0].url, 'https://exemplo.dev');
  assert.match(dados.aviso, /terceiros/);
});

test('o esquema exige a consulta, entre 3 e 200 caracteres', async () => {
  const esquema = gerarEsquemaDeClasse(criar(true).classeDeEntrada);
  assert.deepEqual(esquema.required, ['consulta']);
  const registro = new FerramentaIaRegistro();
  registro.registrar(criar(true));
  assert.equal((await registro.executar('pesquisar_na_internet', { consulta: 'ab' }, USUARIO)).erro, true);
  assert.equal((await registro.executar('pesquisar_na_internet', {}, USUARIO)).erro, true);
});
