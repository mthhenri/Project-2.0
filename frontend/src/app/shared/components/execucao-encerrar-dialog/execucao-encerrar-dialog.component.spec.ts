import { afterEach, describe, it, expect } from 'vitest';
import { TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../testes/montar-componente';
import { esperarRequisicao, responderSucesso } from '../../../../testes/http-teste';
import { ExecucaoEncerrarDialogComponent } from './execucao-encerrar-dialog.component';

// Diálogo "Encerrar execução" compartilhado (chip da barra superior, Atividades e "Em andamento agora"): o rodapé com
// Cancelar e Encerrar precisa existir em todos eles (P-070: a extração para componente o tinha deixado para trás).

type Montado = ComponenteMontado<ExecucaoEncerrarDialogComponent>;

const INICIO = new Date('2026-11-03T12:00:00.000Z');

async function abrirDialogo(): Promise<Montado> {
    const montado = await montarComponente(ExecucaoEncerrarDialogComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    montado.componente.abrir({ execucaoId: 9, atividadeId: 3, descricao: 'Montando o formulário', descricaoOpcional: false });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/execucao'), { itens: [], total: 0 });
    await montado.atualizar();
    return montado;
}

function botaoDoRodape(rotulo: string): HTMLButtonElement | undefined {
    return Array.from(document.body.querySelectorAll<HTMLButtonElement>('.p-dialog-footer button')).find((botao) => botao.textContent?.includes(rotulo));
}

afterEach(() => {
    document.body.querySelectorAll('.p-dialog-mask').forEach((mascara) => mascara.remove());
});

describe('ExecucaoEncerrarDialogComponent — rodapé', () => {
    it('mostra Cancelar e Encerrar', async () => {
        await abrirDialogo();
        expect(botaoDoRodape('Cancelar')).toBeDefined();
        expect(botaoDoRodape('Encerrar')).toBeDefined();
    });

    it('Encerrar envia a descrição e avisa quem abriu', async () => {
        const montado = await abrirDialogo();
        const encerradas: number[] = [];
        montado.componente.encerrada.subscribe((resposta) => encerradas.push(resposta.id));

        botaoDoRodape('Encerrar')!.click();
        const requisicao = esperarRequisicao(montado.http, 'PATCH', '/execucao/9/encerrar');
        expect(requisicao.request.body).toEqual({ descricao: 'Montando o formulário' });
        responderSucesso(requisicao, { id: 9, atividadeId: 3, descricao: 'Montando o formulário', inicioData: INICIO, fimData: INICIO, duracaoMinutos: 30 });
        await montado.atualizar();

        expect(encerradas).toEqual([9]);
        expect(montado.componente.visivel()).toBe(false);
    });

    it('Cancelar fecha sem encerrar', async () => {
        const montado = await abrirDialogo();
        botaoDoRodape('Cancelar')!.click();
        await montado.atualizar();

        expect(montado.componente.visivel()).toBe(false);
        montado.http.expectNone((requisicao) => requisicao.url.endsWith('/encerrar'));
    });
});
