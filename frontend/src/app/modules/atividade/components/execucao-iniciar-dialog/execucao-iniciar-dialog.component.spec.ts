import { describe, expect, it } from 'vitest';
import { TipoUsuarioEnum } from '@project20/shared';
import { esperarRequisicao, responderSucesso } from '../../../../../testes/http-teste';
import { montarComponente } from '../../../../../testes/montar-componente';
import { AtividadeParaIniciar, ExecucaoIniciarDialogComponent } from './execucao-iniciar-dialog.component';

// O diálogo "Iniciar execução" (extraído da listagem de atividades, task 304): descrição obrigatória ou opcional conforme o dono, últimas
// execuções com "Usar", envio da descrição aparada e aviso ao hospedeiro.

const DO_DESENVOLVEDOR: AtividadeParaIniciar = { id: 1, nome: 'Tela de login', nomeProjeto: 'Portal', nomeUsuario: 'Ana Souza', usuarioTipo: TipoUsuarioEnum.DESENVOLVEDOR };
const DO_GESTOR: AtividadeParaIniciar = { ...DO_DESENVOLVEDOR, id: 2, usuarioTipo: TipoUsuarioEnum.GESTOR };

function pagina(itens: unknown[]) {
    return { itens, total: itens.length, pagina: 1, itensPorPagina: 10 };
}

async function montar() {
    return montarComponente(ExecucaoIniciarDialogComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR });
}

describe('ExecucaoIniciarDialogComponent', () => {
    it('a descrição é obrigatória para o dono desenvolvedor e opcional para o dono gestor', async () => {
        const montado = await montar();
        montado.componente.abrir(DO_DESENVOLVEDOR);
        responderSucesso(esperarRequisicao(montado.http, 'GET', '/execucao'), pagina([]));
        expect(montado.componente.visivel()).toBe(true);
        expect(montado.componente.descricaoOpcional()).toBe(false);
        expect(montado.componente.formulario.valid).toBe(false);
        montado.componente.abrir(DO_GESTOR);
        responderSucesso(esperarRequisicao(montado.http, 'GET', '/execucao'), pagina([]));
        expect(montado.componente.descricaoOpcional()).toBe(true);
        expect(montado.componente.formulario.valid).toBe(true);
    });

    it('confirmar sem a descrição obrigatória não chama a API', async () => {
        const montado = await montar();
        montado.componente.abrir(DO_DESENVOLVEDOR);
        responderSucesso(esperarRequisicao(montado.http, 'GET', '/execucao'), pagina([]));
        montado.componente.confirmar();
        montado.http.expectNone((registro) => registro.method === 'POST' && registro.url.endsWith('/execucao'));
        expect(montado.componente.campoInvalido()).toBe(true);
    });

    it('confirmar envia atividade e descrição aparada, fecha o diálogo e avisa o hospedeiro', async () => {
        const montado = await montar();
        let avisos = 0;
        montado.componente.iniciada.subscribe(() => avisos++);
        montado.componente.abrir(DO_DESENVOLVEDOR);
        responderSucesso(esperarRequisicao(montado.http, 'GET', '/execucao'), pagina([]));
        montado.componente.formulario.patchValue({ descricao: '  Ajustar login  ' });
        montado.componente.confirmar();
        const requisicao = esperarRequisicao(montado.http, 'POST', '/execucao');
        expect(requisicao.request.body).toEqual({ atividadeId: 1, descricao: 'Ajustar login' });
        responderSucesso(requisicao, {});
        expect(montado.componente.visivel()).toBe(false);
        expect(avisos).toBe(1);
    });

    it('"Usar" copia a descrição de uma execução anterior para o campo', async () => {
        const montado = await montar();
        montado.componente.abrir(DO_DESENVOLVEDOR);
        responderSucesso(esperarRequisicao(montado.http, 'GET', '/execucao'), pagina([]));
        montado.componente.usarDescricao('Retomar migração');
        expect(montado.componente.formulario.value.descricao).toBe('Retomar migração');
        expect(montado.componente.formulario.controls.descricao.dirty).toBe(true);
    });

    it('lista as últimas execuções da atividade', async () => {
        const montado = await montar();
        montado.componente.abrir(DO_DESENVOLVEDOR);
        responderSucesso(esperarRequisicao(montado.http, 'GET', '/execucao'), pagina([{ id: 5, descricao: 'Primeira etapa', inicioData: '2026-11-01T12:00:00.000Z', fimData: '2026-11-01T13:00:00.000Z', duracaoMinutos: 60 }]));
        expect(montado.componente.execucoes().map((execucao) => execucao.descricao)).toEqual(['Primeira etapa']);
    });
});
