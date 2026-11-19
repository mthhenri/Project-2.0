import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ChatEventoDto, NivelIaEnum, ContextoChatEnum, TipoUsuarioEnum } from '@project20/shared';
import { LacoDeFerramentas, TurnoComFerramentasPedido } from './laco-de-ferramentas';

// O laço da conversa do plano (task 398): a ferramenta com `planoId` de outro plano é recusada com uma mensagem ao modelo, sem ser executada, e a do plano
// da conversa segue funcionando. Fora da conversa de um plano (sem `planoDaConversa`) nada muda.

const USUARIO = { sub: 1, login: 'g', tipo: TipoUsuarioEnum.GESTOR } as never;

function montar(entradasPedidas: Array<Record<string, unknown>>) {
    const executadas: Array<{ nome: string; entrada: unknown }> = [];
    const ferramentaIaRegistro = {
        executar: async (nome: string, entrada: unknown) => {
            executadas.push({ nome, entrada });
            return { conteudo: '{"ok":true}', erro: false };
        },
    };
    let chamadasAoModelo = 0;
    const vistoPeloModelo: unknown[] = [];
    const iaService = {
        transmitir: async (solicitacao: { mensagens: unknown[] }) => {
            vistoPeloModelo.push(JSON.parse(JSON.stringify(solicitacao.mensagens)));
            chamadasAoModelo++;
            if (chamadasAoModelo > 1) return { texto: 'pronto', blocos: [{ tipo: 'texto', texto: 'pronto' }], motivoParada: 'fim' };
            return {
                texto: '',
                blocos: entradasPedidas.map((entrada, indice) => ({ tipo: 'uso_ferramenta', id: `uso-${indice}`, nome: 'consultar_plano', entrada })),
                motivoParada: 'uso_ferramenta',
            };
        },
    };
    const eventos: ChatEventoDto[] = [];
    const laco = new LacoDeFerramentas(iaService as never, ferramentaIaRegistro as never);
    const pedido = (extra: Partial<TurnoComFerramentasPedido> = {}): TurnoComFerramentasPedido => ({
        usuarioAtivo: USUARIO, nivel: NivelIaEnum.RAPIDO, instrucoes: 'x', mensagens: [{ papel: 'usuario', conteudo: 'oi' }], trocasIniciais: [], ferramentas: [],
        maximoTokens: 100, pesquisaWeb: false, origem: { contexto: ContextoChatEnum.PLANEJAMENTO, escopo: 'PLANEJAMENTO' }, propostasDoTurno: [], emitir: (evento) => eventos.push(evento), ...extra,
    });
    return { laco, pedido, executadas, vistoPeloModelo, eventos };
}

const resultadosVistos = (visto: unknown[]) => {
    const ultimas = visto[1] as Array<{ papel: string; conteudo: Array<{ tipo: string; conteudo: string; erro: boolean }> }>;
    return ultimas[ultimas.length - 1].conteudo;
};

test('ferramenta com planoId de outro plano é recusada sem executar, e o modelo recebe a mensagem com o plano certo', async () => {
    const { laco, pedido, executadas, vistoPeloModelo, eventos } = montar([{ planoId: 12 }]);

    await laco.conduzirTurno(pedido({ planoDaConversa: 7 }));

    assert.equal(executadas.length, 0, 'a ferramenta nem roda');
    const [resultado] = resultadosVistos(vistoPeloModelo);
    assert.equal(resultado.erro, true);
    assert.match(resultado.conteudo, /plano 7/);
    assert.match(resultado.conteudo, /plano 12/);
    assert.deepEqual(eventos.filter((evento) => evento.tipo === 'ferramenta').map((evento) => (evento as { situacao: string }).situacao), ['EXECUTANDO', 'ERRO']);
});

test('ferramenta com o planoId da conversa continua funcionando', async () => {
    const { laco, pedido, executadas } = montar([{ planoId: 7 }]);
    await laco.conduzirTurno(pedido({ planoDaConversa: 7 }));
    assert.deepEqual(executadas, [{ nome: 'consultar_plano', entrada: { planoId: 7 } }]);
});

test('numa volta com duas chamadas só a de outro plano é recusada', async () => {
    const { laco, pedido, executadas, vistoPeloModelo } = montar([{ planoId: 12 }, { planoId: 7 }]);
    await laco.conduzirTurno(pedido({ planoDaConversa: 7 }));
    assert.deepEqual(executadas.map((item) => item.entrada), [{ planoId: 7 }]);
    const resultados = resultadosVistos(vistoPeloModelo);
    assert.deepEqual(resultados.map((item) => item.erro), [true, false]);
});

test('fora da conversa de um plano (sem planoDaConversa) o laço não confere o planoId', async () => {
    const { laco, pedido, executadas } = montar([{ planoId: 12 }]);
    await laco.conduzirTurno(pedido({ origem: { contexto: ContextoChatEnum.PLANEJAMENTO, escopo: 'CHAT' } }));
    assert.equal(executadas.length, 1);
});
