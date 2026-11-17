import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ContextoChatEnum, TipoUsuarioEnum } from '@project20/shared';
import { FerramentaIaRegistro } from '../../ferramenta-ia/services/ferramenta-ia.registro';
import { FRASE_DA_FERRAMENTA } from '../domain/sugestoes';
import { BuscarNasMinhasConversasFerramenta } from './buscar-nas-minhas-conversas.ferramenta';
import { ConsultarMinhaConversaFerramenta } from './consultar-minha-conversa.ferramenta';

const TIPOS = [TipoUsuarioEnum.DESENVOLVEDOR, TipoUsuarioEnum.AUXILIAR, TipoUsuarioEnum.GESTOR, TipoUsuarioEnum.ADMINISTRADOR];
const NOMES = ['buscar_nas_minhas_conversas', 'consultar_minha_conversa'];

function registroComAsFerramentas(servico: unknown = {}): FerramentaIaRegistro {
    const registro = new FerramentaIaRegistro();
    registro.registrar(new BuscarNasMinhasConversasFerramenta(servico as never));
    registro.registrar(new ConsultarMinhaConversaFerramenta(servico as never));
    return registro;
}

test('toda pessoa tem as duas ferramentas no chat da IA, e cada uma tem frase nas sugestões', () => {
    const registro = registroComAsFerramentas();
    for (const tipo of TIPOS) {
        const nomes = registro.listarParaUsuario({ sub: 1, login: 'x', tipo } as never).map((item) => item.nome).sort();
        assert.deepEqual(nomes, [...NOMES].sort(), `tipo ${tipo}`);
    }
    for (const ferramenta of registro.listarTodas()) {
        assert.equal(ferramenta.tipo, 'LEITURA');
        assert.ok(FRASE_DA_FERRAMENTA[ferramenta.nome], `${ferramenta.nome} sem frase de sugestão`);
    }
});

test('privacidade: as duas somem do @IA entre colaboradores e do plano, e a execução vinda de lá é recusada', async () => {
    const chamadas: string[] = [];
    const registro = registroComAsFerramentas({
        buscarMensagens: async () => (chamadas.push('buscar'), { mensagens: [] }),
        consultarConversa: async () => (chamadas.push('consultar'), { mensagens: [] }),
    });
    const usuario = { sub: 1, login: 'x', tipo: TipoUsuarioEnum.GESTOR } as never;
    assert.deepEqual(registro.listarParaUsuario(usuario, 'COLABORADORES'), []);
    assert.deepEqual(registro.listarParaUsuario(usuario, 'PLANEJAMENTO'), []);

    const entradas: Record<string, unknown> = { buscar_nas_minhas_conversas: { texto: 'deploy' }, consultar_minha_conversa: { data: '2026-10-19' } };
    for (const nome of NOMES) {
        for (const origem of [
            { contexto: ContextoChatEnum.CHAT, escopo: 'COLABORADORES' as const },
            { contexto: ContextoChatEnum.PLANEJAMENTO, escopo: 'PLANEJAMENTO' as const },
            { contexto: ContextoChatEnum.PLANEJAMENTO },
        ]) {
            const resultado = await registro.executar(nome, entradas[nome], usuario, origem);
            assert.equal(resultado.erro, true, `${nome} em ${JSON.stringify(origem)}`);
        }
    }
    assert.deepEqual(chamadas, [], 'nada foi lido');

    for (const origem of [undefined, { contexto: ContextoChatEnum.CHAT }, { contexto: ContextoChatEnum.CHAT, escopo: 'CHAT' as const }]) {
        assert.equal((await registro.executar('buscar_nas_minhas_conversas', entradas.buscar_nas_minhas_conversas, usuario, origem)).erro, false);
    }
});

test('cada ferramenta repassa a entrada e o usuário do token à service, e recusa data fora do formato', async () => {
    const chamadas: unknown[][] = [];
    const registro = registroComAsFerramentas({
        buscarMensagens: async (...argumentos: unknown[]) => chamadas.push(['buscar', ...argumentos]),
        consultarConversa: async (...argumentos: unknown[]) => chamadas.push(['consultar', ...argumentos]),
    });
    const usuario = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
    await registro.executar('buscar_nas_minhas_conversas', { texto: 'deploy', inicio: '2026-10-01' }, usuario);
    await registro.executar('consultar_minha_conversa', { data: '2026-10-19' }, usuario);
    assert.deepEqual(chamadas.map((chamada) => [chamada[0], chamada[2]]), [['buscar', usuario], ['consultar', usuario]]);
    assert.equal((await registro.executar('consultar_minha_conversa', { data: '19/10/2026' }, usuario)).erro, true);
    assert.equal((await registro.executar('consultar_minha_conversa', { data: '2026-10-19', usuarioId: 3 }, usuario)).erro, true, 'não há como pedir o dono');
});
