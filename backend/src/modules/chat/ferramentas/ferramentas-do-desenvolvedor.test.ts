import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '@project20/shared';
import { FerramentaIaRegistro } from '../../ferramenta-ia/services/ferramenta-ia.registro';
import { FRASE_DA_FERRAMENTA } from '../domain/sugestoes';
import { BuscarNasConversasDoDesenvolvedorFerramenta } from './buscar-nas-conversas-do-desenvolvedor.ferramenta';
import { ConsultarConversaDoDesenvolvedorFerramenta } from './consultar-conversa-do-desenvolvedor.ferramenta';
import { ListarConversasDoDesenvolvedorFerramenta } from './listar-conversas-do-desenvolvedor.ferramenta';

const GESTOR = { sub: 1, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;
const DESENVOLVEDOR = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

test('as ferramentas das conversas dos desenvolvedores são só do gestor e têm frase nas sugestões', () => {
  const servico = {} as never;
  const registro = new FerramentaIaRegistro();
  const ferramentas = [
    new ListarConversasDoDesenvolvedorFerramenta(servico),
    new ConsultarConversaDoDesenvolvedorFerramenta(servico),
    new BuscarNasConversasDoDesenvolvedorFerramenta(servico),
  ];
  ferramentas.forEach((ferramenta) => registro.registrar(ferramenta));
  assert.deepEqual(registro.listarParaUsuario(DESENVOLVEDOR), []);
  assert.deepEqual(registro.listarParaUsuario(GESTOR).map((item) => item.nome).sort(), [
    'buscar_nas_conversas_do_desenvolvedor',
    'consultar_conversa_do_desenvolvedor',
    'listar_conversas_do_desenvolvedor',
  ]);
  for (const ferramenta of ferramentas) {
    assert.equal(ferramenta.tipo, 'LEITURA');
    assert.ok(FRASE_DA_FERRAMENTA[ferramenta.nome], `${ferramenta.nome} sem frase de sugestão`);
  }
});

test('cada ferramenta repassa a entrada e o usuário do token à service', async () => {
  const chamadas: unknown[][] = [];
  const servico = {
    listarConversas: async (...argumentos: unknown[]) => chamadas.push(['listar', ...argumentos]),
    consultarConversa: async (...argumentos: unknown[]) => chamadas.push(['consultar', ...argumentos]),
    buscarMensagens: async (...argumentos: unknown[]) => chamadas.push(['buscar', ...argumentos]),
  } as never;
  await new ListarConversasDoDesenvolvedorFerramenta(servico).executar({ usuarioId: 7 }, GESTOR);
  await new ConsultarConversaDoDesenvolvedorFerramenta(servico).executar({ usuarioId: 7, data: '2026-10-19' }, GESTOR);
  await new BuscarNasConversasDoDesenvolvedorFerramenta(servico).executar({ usuarioId: 7, texto: 'deploy' }, GESTOR);
  assert.deepEqual(chamadas.map((chamada) => [chamada[0], chamada[2]]), [['listar', GESTOR], ['consultar', GESTOR], ['buscar', GESTOR]]);
});
