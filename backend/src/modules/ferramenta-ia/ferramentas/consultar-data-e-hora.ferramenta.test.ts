import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { FerramentaIaRegistro } from '../services/ferramenta-ia.registro';
import { ConsultarDataEHoraFerramenta } from './consultar-data-e-hora.ferramenta';

const USUARIO = { sub: 1, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

function criar(instante: string, fusoHorario: string) {
  const configService = { obter: () => ({ aplicacao: { fusoHorario } }) } as unknown as ConfigService;
  return new (class extends ConsultarDataEHoraFerramenta {
    protected agora(): Date {
      return new Date(instante);
    }
  })(configService);
}

test('devolve data, hora e dia da semana no fuso do sistema', async () => {
  // 02:30 UTC de domingo, 18/10, ainda é sábado, 17/10, 23:30 em São Paulo.
  const resultado = await criar('2026-10-18T02:30:00Z', 'America/Sao_Paulo').executar();
  assert.equal(resultado.data, '2026-10-17');
  assert.equal(resultado.hora, '23:30');
  assert.equal(resultado.diaDaSemana, 'sábado');
  assert.equal(resultado.fusoHorario, 'America/Sao_Paulo');
});

test('a virada de dia segue o fuso, não o servidor', async () => {
  const resultado = await criar('2026-10-18T03:00:00Z', 'America/Sao_Paulo').executar();
  assert.equal(resultado.data, '2026-10-18');
  assert.equal(resultado.hora, '00:00');
  assert.equal(resultado.diaDaSemana, 'domingo');
});

test('é de leitura, para qualquer usuário, sem campos de entrada, e passa pelo registro', async () => {
  const ferramenta = criar('2026-10-17T15:00:00Z', 'America/Sao_Paulo');
  assert.equal(ferramenta.tipo, 'LEITURA');
  assert.equal(ferramenta.permissao, 'QUALQUER');
  const registro = new FerramentaIaRegistro();
  registro.registrar(ferramenta);
  assert.deepEqual(registro.listarParaUsuario(USUARIO).map((item) => item.nome), ['consultar_data_e_hora']);
  const resultado = await registro.executar('consultar_data_e_hora', {}, USUARIO);
  assert.equal(resultado.erro, false);
  assert.equal(JSON.parse(resultado.conteudo).data, '2026-10-17');
});
