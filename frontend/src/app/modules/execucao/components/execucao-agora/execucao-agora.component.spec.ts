import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ExecucaoItemDto, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { ExecucaoEncerrarDialogComponent } from '../../../../shared/components/execucao-encerrar-dialog/execucao-encerrar-dialog.component';
import { ExecucaoAgoraComponent } from './execucao-agora.component';

// O cronômetro usa setInterval, que deixaria a zona instável: só os intervalos são falsos (e voltam ao real ao fim de cada teste).
beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }));
afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

function criarAtiva(id: number, sobrescritas: Partial<ExecucaoItemDto> = {}): ExecucaoItemDto {
    return {
        id, atividadeId: 20 + id, nomeAtividade: `Atividade ${id}`, demandaId: 10, nomeDemanda: 'Demanda dez',
        projetoId: 5, nomeProjeto: 'Portal', descricao: `Descrição ${id}`, inicioData: new Date(Date.now() - 600_000), fimData: null,
        duracaoMinutos: null, usuarioId: 1, nomeUsuario: 'Maria Souza', ...sobrescritas,
    };
}

async function montar(entradas: { ativas: ExecucaoItemDto[]; podeIniciar?: boolean; descricaoObrigatoria?: boolean; mostrarUsuario?: boolean }) {
    TestBed.resetTestingModule();
    return montarComponente(ExecucaoAgoraComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, entradas });
}

describe('ExecucaoAgoraComponent', () => {
    it('sem execução mostra o estado vazio e o botão só quando pode iniciar', async () => {
        const semBotao = await montar({ ativas: [] });
        expect(semBotao.elemento.textContent).toContain('Nenhuma execução em andamento.');
        expect(semBotao.elemento.textContent).not.toContain('Iniciar atividade');

        const comBotao = await montar({ ativas: [], podeIniciar: true });
        const iniciar = vi.fn();
        comBotao.componente.iniciar.subscribe(iniciar);
        Array.from(comBotao.elemento.querySelectorAll('button')).find((botao) => botao.textContent?.includes('Iniciar atividade'))!.click();
        expect(iniciar).toHaveBeenCalledTimes(1);
    });

    it('o cartão traz atividade, caminho, descrição, cronômetro e o botão de pausar', async () => {
        const montado = await montar({ ativas: [criarAtiva(1)] });
        const texto = montado.elemento.textContent ?? '';
        expect(texto).toContain('Atividade 1');
        expect(texto).toContain('Portal › Demanda dez');
        expect(texto).toContain('Descrição 1');
        expect(montado.elemento.querySelector('app-execucao-timer')).not.toBeNull();
        expect(montado.elemento.querySelector('button[aria-label="Pausar execução"]')).not.toBeNull();
    });

    it('o nome da atividade é só texto: não há botão que abra a atividade', async () => {
        const montado = await montar({ ativas: [criarAtiva(1)] });
        const nome = montado.elemento.querySelector('.execucao-agora__atividade')!;
        expect(nome.tagName).toBe('SPAN');
        expect(nome.textContent).toContain('Atividade 1');
    });

    it('pausar abre o diálogo "Encerrar execução" com a execução e a descrição atual', async () => {
        const montado = await montar({ ativas: [criarAtiva(1)], descricaoObrigatoria: true });
        const abrir = vi.spyOn(ExecucaoEncerrarDialogComponent.prototype, 'abrir').mockImplementation(() => {});

        (montado.elemento.querySelector('button[aria-label="Pausar execução"]') as HTMLButtonElement).click();

        expect(abrir).toHaveBeenCalledWith({ execucaoId: 1, atividadeId: 21, descricao: 'Descrição 1', descricaoOpcional: false });
    });

    it('a descrição é opcional quando a tela não exige (gestor)', async () => {
        const montado = await montar({ ativas: [criarAtiva(1)], descricaoObrigatoria: false });
        const abrir = vi.spyOn(ExecucaoEncerrarDialogComponent.prototype, 'abrir').mockImplementation(() => {});

        (montado.elemento.querySelector('button[aria-label="Pausar execução"]') as HTMLButtonElement).click();

        expect(abrir).toHaveBeenCalledWith(expect.objectContaining({ descricaoOpcional: true }));
    });
});
