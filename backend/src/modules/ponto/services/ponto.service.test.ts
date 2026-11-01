import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoDiaNaoUtilEnum, TipoUsuarioEnum, ExecucaoItemDto } from '@project20/shared';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { PontoService } from './ponto.service';

// Helpers puros do PontoService, exercitados sem banco: as dependências nunca são tocadas.
const servico = new PontoService(null as never, null as never, null as never, null as never, null as never);
const privado = servico as unknown as {
    mapearTipoParaMotivo(tipo: TipoDiaNaoUtilEnum | null, descricao: string | null): string;
    formatarDataIso(ano: number, mes: number, dia: number): string;
    ordenarPorInicio(execucoes: ExecucaoItemDto[]): ExecucaoItemDto[];
    calcularIntervalos(execucoes: ExecucaoItemDto[], minimo: number): { duracaoMinutos: number }[];
};

const execucao = (inicio: string, fim: string | null) =>
    ({ inicioData: new Date(inicio), fimData: fim ? new Date(fim) : null }) as unknown as ExecucaoItemDto;

test('motivo do dia não útil: "<rótulo> - <descrição>" ou só o rótulo', () => {
    assert.equal(privado.mapearTipoParaMotivo(TipoDiaNaoUtilEnum.FERIADO, 'Dia do Trabalho'), 'Feriado - Dia do Trabalho');
    assert.equal(privado.mapearTipoParaMotivo(TipoDiaNaoUtilEnum.RECESSO, '  Fim de ano  '), 'Recesso - Fim de ano');
    assert.equal(privado.mapearTipoParaMotivo(TipoDiaNaoUtilEnum.PONTO_FACULTATIVO, null), 'Ponto facultativo');
    assert.equal(privado.mapearTipoParaMotivo(TipoDiaNaoUtilEnum.FERIADO, '   '), 'Feriado');
    assert.equal(privado.mapearTipoParaMotivo(null, null), 'Dia não útil');
});

test('formatarDataIso completa mês e dia com zero à esquerda', () => {
    assert.equal(privado.formatarDataIso(2026, 3, 7), '2026-03-07');
    assert.equal(privado.formatarDataIso(2026, 12, 31), '2026-12-31');
});

test('ordenarPorInicio ordena sem alterar o array original', () => {
    const original = [execucao('2026-03-02T14:00:00Z', null), execucao('2026-03-02T09:00:00Z', null)];
    const ordenadas = privado.ordenarPorInicio(original);
    assert.equal(ordenadas[0].inicioData.toISOString(), '2026-03-02T09:00:00.000Z');
    assert.equal(original[0].inicioData.toISOString(), '2026-03-02T14:00:00.000Z');
});

test('calcularIntervalos mantém só os gaps >= mínimo; a execução aberta fecha o intervalo anterior e não abre outro', () => {
    const execucoes = [
        execucao('2026-03-02T09:00:00Z', '2026-03-02T10:00:00Z'),
        execucao('2026-03-02T10:10:00Z', '2026-03-02T12:00:00Z'), // gap de 10 min
        execucao('2026-03-02T13:00:00Z', '2026-03-02T14:00:00Z'), // gap de 60 min
        execucao('2026-03-02T14:05:00Z', null),                   // aberta: gap de 5 min antes dela, abaixo do mínimo
    ];
    assert.deepEqual(privado.calcularIntervalos(execucoes, 15).map((intervalo) => intervalo.duracaoMinutos), [60]);
    assert.deepEqual(privado.calcularIntervalos(execucoes, 10).map((intervalo) => intervalo.duracaoMinutos), [10, 60]);
    assert.deepEqual(privado.calcularIntervalos([], 15), []);
});

test('calcularIntervalos conta o gap até a execução em andamento (P-063)', () => {
    const execucoes = [
        execucao('2026-03-02T07:40:00Z', '2026-03-02T10:00:00Z'),
        execucao('2026-03-02T11:10:00Z', null),
    ];
    assert.deepEqual(privado.calcularIntervalos(execucoes, 15).map((intervalo) => intervalo.duracaoMinutos), [70]);
    assert.deepEqual(privado.calcularIntervalos([execucao('2026-03-02T11:10:00Z', null)], 15), [], 'só a aberta: nada a comparar');
});

test('ponto de outra pessoa: desenvolvedor é recusado; auxiliar chega a consultar (diário e mensal)', async () => {
    const usuarioRepositorio = { recuperar: async () => null };
    const servicoComDublê = new PontoService(null as never, null as never, usuarioRepositorio as never, null as never, null as never);
    const desenvolvedor = { sub: 3, login: 'd', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
    const auxiliar = { sub: 6, login: 'x', tipo: TipoUsuarioEnum.AUXILIAR } as never;
    await assert.rejects(() => servicoComDublê.consultarDiario({ usuarioId: 9, data: '2026-03-02' } as never, desenvolvedor), UnauthorizedAccessException);
    await assert.rejects(() => servicoComDublê.consultarMensal({ usuarioId: 9, ano: 2026, mes: 3 } as never, desenvolvedor), UnauthorizedAccessException);
    // O auxiliar passa pela guarda e só então esbarra no usuário inexistente do dublê (404), não na recusa de permissão.
    await assert.rejects(() => servicoComDublê.consultarDiario({ usuarioId: 9, data: '2026-03-02' } as never, auxiliar), (erro: Error) => !(erro instanceof UnauthorizedAccessException));
    await assert.rejects(() => servicoComDublê.consultarMensal({ usuarioId: 9, ano: 2026, mes: 3 } as never, auxiliar), (erro: Error) => !(erro instanceof UnauthorizedAccessException));
});
