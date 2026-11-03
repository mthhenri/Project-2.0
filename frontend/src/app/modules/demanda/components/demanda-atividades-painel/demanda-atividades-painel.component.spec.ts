import { describe, expect, it, vi } from 'vitest';
import { AtividadeResumoDto, TipoAtividadeStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { ExecucaoIniciarDialogComponent } from '../../../atividade/components/execucao-iniciar-dialog/execucao-iniciar-dialog.component';
import { ExecucaoEncerrarDialogComponent } from '../../../../shared/components/execucao-encerrar-dialog/execucao-encerrar-dialog.component';
import { DemandaAtividadesPainelComponent } from './demanda-atividades-painel.component';

// Task 304: o consumo da demanda por atividade (a atividade não tem horas esperadas), o que está em execução agora, os filtros e os estados.

function atividade(id: number, sobrescrita: Partial<AtividadeResumoDto> = {}): AtividadeResumoDto {
    return {
        id, nome: `Atividade ${id}`, status: TipoAtividadeStatusEnum.PLANEJADA, usuarioId: 99, nomeUsuario: 'Ana Souza', usuarioTipo: TipoUsuarioEnum.DESENVOLVEDOR,
        prioridade: { id: 1, codigo: 'MEDIA', descricao: 'Média', cor: '#3b82f6', ordem: 2 }, totalMinutosExecutados: 0, totalExecucoes: 0, execucaoAtivaId: null, execucaoAtivaDescricao: null,
        tags: [], ...sobrescrita,
    } as unknown as AtividadeResumoDto;
}

async function montar(atividades: AtividadeResumoDto[], carregando = false, usuario = TipoUsuarioEnum.DESENVOLVEDOR) {
    return montarComponente(DemandaAtividadesPainelComponent, { usuario, entradas: { atividades, carregando } });
}

const botao = (elemento: HTMLElement, rotulo: string) => elemento.querySelector<HTMLButtonElement>(`button[aria-label="${rotulo}"]`);

describe('DemandaAtividadesPainelComponent', () => {
    it('carregando: só o indicador, sem cartões', async () => {
        const montado = await montar([], true);
        expect(montado.elemento.querySelector('.pi-spinner')).not.toBeNull();
        expect(montado.elemento.querySelector('.demanda-atividades__item')).toBeNull();
    });

    it('vazio: convida a criar a primeira atividade', async () => {
        const montado = await montar([]);
        expect(montado.elemento.textContent).toContain('Nenhuma atividade nesta demanda');
    });

    it('cheio: total consumido, fatia de cada uma e "sem execução ainda" para a que não executou', async () => {
        const montado = await montar([atividade(1, { totalMinutosExecutados: 180 }), atividade(2, { totalMinutosExecutados: 60 }), atividade(3)]);
        const texto = montado.elemento.textContent ?? '';
        expect(texto).toContain('consumidas pela demanda');
        expect(texto).toContain('75% da demanda');
        expect(texto).toContain('25% da demanda');
        expect(texto).toContain('sem execução ainda');
        expect(montado.elemento.querySelectorAll('.demanda-atividades__item').length).toBe(3);
        expect(montado.elemento.querySelectorAll('.demanda-atividades__trecho').length).toBe(2);
    });

    it('em execução agora: o cartão fica destacado e mostra o selo', async () => {
        const montado = await montar([atividade(1, { status: TipoAtividadeStatusEnum.DESENVOLVENDO, execucaoAtivaId: 7 }), atividade(2)]);
        expect(montado.elemento.querySelectorAll('.demanda-atividades__item--em-execucao').length).toBe(1);
        expect(montado.elemento.querySelector('app-atividade-em-execucao')).not.toBeNull();
        expect(montado.elemento.textContent).toContain('1 em execução');
    });

    it('o selo "Em execução" mostra o cronômetro a partir do início da execução, de quem for', async () => {
        const inicio = new Date(Date.now() - 90_000).toISOString();
        const montado = await montar([atividade(1, { status: TipoAtividadeStatusEnum.DESENVOLVENDO, execucaoAtivaId: 7, execucaoAtivaInicioData: inicio as never })]);
        expect(montado.elemento.querySelector('app-atividade-em-execucao app-execucao-timer')).not.toBeNull();
        expect(montado.elemento.querySelector('app-atividade-em-execucao')?.textContent).toMatch(/00:01:\d\d/);
    });

    it('filtros: "Em aberto" esconde as desenvolvidas e um filtro vazio explica', async () => {
        const montado = await montar([atividade(1, { status: TipoAtividadeStatusEnum.DESENVOLVIDA }), atividade(2)]);
        montado.componente.filtro.set('abertas');
        await montado.atualizar();
        expect(montado.elemento.querySelectorAll('.demanda-atividades__item').length).toBe(1);
        montado.componente.filtro.set('minhas');
        await montado.atualizar();
        expect(montado.elemento.textContent).toContain('Nenhuma atividade neste filtro');
    });

    it('play e pause no cartão: o desenvolvedor só nas atividades dele; gestor em qualquer uma', async () => {
        const atividades = [atividade(1, { usuarioId: 99 }), atividade(2, { usuarioId: 55 })];
        const desenvolvedor = await montar(atividades);
        const idDoUsuario = desenvolvedor.componente['sessao'].id();
        desenvolvedor.fixture.componentRef.setInput('atividades', [atividade(1, { usuarioId: idDoUsuario }), atividade(2, { usuarioId: 55 })]);
        await desenvolvedor.atualizar();
        expect(desenvolvedor.elemento.querySelectorAll('button[aria-label="Iniciar execução"]')).toHaveLength(1);
    });

    it('gestor vê o play em todas as atividades', async () => {
        const montado = await montar([atividade(1, { usuarioId: 55 }), atividade(2, { usuarioId: 56 })], false, TipoUsuarioEnum.GESTOR);
        expect(montado.elemento.querySelectorAll('button[aria-label="Iniciar execução"]')).toHaveLength(2);
    });

    it('o play fica desligado fora de Planejada e Desenvolvendo; o pause vale mesmo assim', async () => {
        const montado = await montar(
            [atividade(1, { status: TipoAtividadeStatusEnum.PENDENTE }), atividade(2, { status: TipoAtividadeStatusEnum.DESENVOLVIDA, execucaoAtivaId: 9 })],
            false,
            TipoUsuarioEnum.GESTOR,
        );
        expect(botao(montado.elemento, 'Iniciar execução')!.disabled).toBe(true);
        expect(botao(montado.elemento, 'Encerrar execução')!.disabled).toBe(false);
    });

    it('iniciar abre o diálogo próprio; encerrar abre o compartilhado com a execução ativa; ambos pedem a recarga ao terminar', async () => {
        const montado = await montar([atividade(1), atividade(2, { status: TipoAtividadeStatusEnum.DESENVOLVENDO, execucaoAtivaId: 9, execucaoAtivaDescricao: 'Em andamento' })], false, TipoUsuarioEnum.GESTOR);
        const abrirIniciar = vi.spyOn(ExecucaoIniciarDialogComponent.prototype, 'abrir').mockImplementation(() => {});
        const abrirEncerrar = vi.spyOn(ExecucaoEncerrarDialogComponent.prototype, 'abrir').mockImplementation(() => {});
        botao(montado.elemento, 'Iniciar execução')!.click();
        expect(abrirIniciar).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
        botao(montado.elemento, 'Encerrar execução')!.click();
        expect(abrirEncerrar).toHaveBeenCalledWith({ execucaoId: 9, atividadeId: 2, descricao: 'Em andamento', descricaoOpcional: false });
        vi.restoreAllMocks();
        let recargas = 0;
        montado.componente.execucaoAlterada.subscribe(() => recargas++);
        const iniciar = montado.fixture.debugElement.query((elemento) => elemento.name === 'app-execucao-iniciar-dialog').componentInstance as ExecucaoIniciarDialogComponent;
        const encerrar = montado.fixture.debugElement.query((elemento) => elemento.name === 'app-execucao-encerrar-dialog').componentInstance as ExecucaoEncerrarDialogComponent;
        iniciar.iniciada.emit();
        encerrar.encerrada.emit({} as never);
        expect(recargas).toBe(2);
    });
});
