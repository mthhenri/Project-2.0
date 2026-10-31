import { TestBed } from '@angular/core/testing';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { EstadoIaEnum, ExecucaoAtivaDto, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderSucesso } from '../../../../../testes/http-teste';
import { ExecucaoAtivaService } from '../../../../core/services/execucao-ativa.service';
import { IaDisponibilidadeService } from '../../../../core/services/ia-disponibilidade.service';
import { ExecucaoEncerrarDialogComponent } from '../../../components/execucao-encerrar-dialog/execucao-encerrar-dialog.component';
import { ChipExecucaoAtivaComponent } from './chip-execucao-ativa.component';

// Chip global da execução ativa (task 95): aparece em todas as telas enquanto há execução (descrição + cronômetro ao vivo) e some ao
// encerrar; sem execução vira "Sem execução ativa" apontando para onde se inicia uma. Pausar abre o diálogo "Encerrar execução"
// compartilhado (SYSTEM.SPEC.md §14); o chip só reage ao encerramento concluído.

type Montado = ComponenteMontado<ChipExecucaoAtivaComponent>;

const INICIO = new Date('2026-10-19T12:00:00.000Z');

function execucao(parcial: Partial<ExecucaoAtivaDto> = {}): ExecucaoAtivaDto {
    return { id: 9, atividadeId: 3, descricao: 'Montando o formulário', inicioData: new Date(INICIO.getTime() - (5 * 60 + 3) * 1000), ...parcial };
}

/** O relógio do chip é um `setInterval` de 1 s (tarefa pendente do zone.js): temporizadores e `Date` simulados desde o início. */
async function montarChip(usuario = TipoUsuarioEnum.DESENVOLVEDOR): Promise<Montado> {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    vi.setSystemTime(INICIO);
    return montarComponente(ChipExecucaoAtivaComponent, { usuario, rotas: [{ path: '**', children: [] }] });
}

/** Carrega a execução ativa pelo serviço, como a topbar faz ao abrir. */
async function carregarAtiva(montado: Montado, ativa: ExecucaoAtivaDto | null): Promise<void> {
    TestBed.inject(ExecucaoAtivaService).carregar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/execucao/ativa'), ativa);
    await montado.atualizar();
}

const texto = (montado: Montado) => (montado.elemento.textContent ?? '').replace(/\s+/g, ' ');
const cronometro = (montado: Montado) => montado.elemento.querySelector('[role="timer"]')?.textContent?.trim();
const botaoPausar = (montado: Montado) => montado.elemento.querySelector<HTMLElement>('[aria-label="Pausar execução"]');

function cliqueNoBotaoPausar(montado: Montado): void {
    const alvo = botaoPausar(montado)!;
    (alvo.tagName === 'BUTTON' ? alvo : alvo.querySelector('button')!).click();
}

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('ChipExecucaoAtivaComponent — presença', () => {
    it('na primeira carga mostra só o esqueleto', async () => {
        const montado = await montarChip();
        TestBed.inject(ExecucaoAtivaService).carregar();
        await montado.atualizar();
        expect(montado.elemento.querySelector('.chip-execucao--esqueleto')).not.toBeNull();
        responderSucesso(esperarRequisicao(montado.http, 'GET', '/execucao/ativa'), null);
    });

    it('sem execução ativa mostra "Sem execução ativa" apontando para Atividades', async () => {
        const montado = await montarChip();
        await carregarAtiva(montado, null);
        const vazio = montado.elemento.querySelector<HTMLAnchorElement>('.chip-execucao--vazio')!;
        expect(vazio.textContent).toContain('Sem execução ativa');
        expect(vazio.getAttribute('href')).toBe('/atividade');
        expect(botaoPausar(montado)).toBeNull();
    });

    it('com a IA no ar o "Sem execução ativa" segue apontando para Atividades', async () => {
        const montado = await montarChip();
        TestBed.inject(IaDisponibilidadeService).estadoReal.set(EstadoIaEnum.NO_AR);
        await carregarAtiva(montado, null);
        expect(montado.elemento.querySelector('.chip-execucao--vazio')?.getAttribute('href')).toBe('/atividade');
    });

    it('com execução ativa mostra a descrição, o cronômetro e o botão de pausar', async () => {
        const montado = await montarChip();
        await carregarAtiva(montado, execucao());
        expect(texto(montado)).toContain('Montando o formulário');
        expect(cronometro(montado)).toBe('00:05:03');
        expect(botaoPausar(montado)).not.toBeNull();
        expect(montado.elemento.querySelector('.chip-execucao--vazio')).toBeNull();
    });

    it('execução sem descrição mostra "Execução em andamento"', async () => {
        const montado = await montarChip();
        await carregarAtiva(montado, execucao({ descricao: '' }));
        expect(texto(montado)).toContain('Execução em andamento');
    });

    it('o cronômetro corre ao vivo, de segundo em segundo', async () => {
        const montado = await montarChip();
        await carregarAtiva(montado, execucao());
        vi.advanceTimersByTime(2000);
        montado.fixture.detectChanges();
        expect(cronometro(montado)).toBe('00:05:05');
    });

    it('o cronômetro passa de uma hora corretamente (hh:mm:ss)', async () => {
        const montado = await montarChip();
        await carregarAtiva(montado, execucao({ inicioData: new Date(INICIO.getTime() - (3600 + 2 * 60 + 7) * 1000) }));
        expect(cronometro(montado)).toBe('01:02:07');
    });

    it('ao encerrar (execução some do serviço) o chip vira "Sem execução ativa"', async () => {
        const montado = await montarChip();
        await carregarAtiva(montado, execucao());
        TestBed.inject(ExecucaoAtivaService).definir(null);
        await montado.atualizar();
        expect(montado.elemento.querySelector('.chip-execucao--ativa')).toBeNull();
        expect(texto(montado)).toContain('Sem execução ativa');
    });

    it('o relógio só corre com execução ativa: sem ela não sobra temporizador', async () => {
        const montado = await montarChip();
        await carregarAtiva(montado, execucao());
        const comRelogio = vi.getTimerCount();
        TestBed.inject(ExecucaoAtivaService).definir(null);
        await montado.atualizar();
        expect(vi.getTimerCount()).toBe(comRelogio - 1);
    });
});

describe('ChipExecucaoAtivaComponent — pausa pelo diálogo compartilhado', () => {
    it('pausar abre o diálogo "Encerrar execução" com a execução e a descrição atual', async () => {
        const montado = await montarChip();
        await carregarAtiva(montado, execucao());
        const abrir = vi.spyOn(ExecucaoEncerrarDialogComponent.prototype, 'abrir').mockImplementation(() => {});

        cliqueNoBotaoPausar(montado);

        expect(abrir).toHaveBeenCalledWith({ execucaoId: 9, atividadeId: 3, descricao: 'Montando o formulário', descricaoOpcional: false });
    });

    it('gestor: o diálogo abre com a descrição opcional', async () => {
        const montado = await montarChip(TipoUsuarioEnum.GESTOR);
        await carregarAtiva(montado, execucao());
        const abrir = vi.spyOn(ExecucaoEncerrarDialogComponent.prototype, 'abrir').mockImplementation(() => {});

        cliqueNoBotaoPausar(montado);

        expect(abrir).toHaveBeenCalledWith(expect.objectContaining({ descricaoOpcional: true }));
    });

    it('ao encerrar com sucesso, o chip some, avisa a tela e confirma a duração', async () => {
        const montado = await montarChip();
        await carregarAtiva(montado, execucao());
        const avisos: { severity?: string; detail?: string }[] = [];
        montado.mensagens.messageObserver.subscribe((mensagem) => avisos.push(...[mensagem].flat()));

        montado.componente.aposEncerrar({ id: 9, atividadeId: 3, descricao: 'Terminei', inicioData: INICIO, fimData: INICIO, duracaoMinutos: 90 });
        await montado.atualizar();

        expect(montado.componente.execucaoAtiva.ativa()).toBeNull();
        expect(texto(montado)).toContain('Sem execução ativa');
        expect(montado.componente.execucaoAtiva.pausasDoChip()).toBe(1);
        expect(avisos.some((aviso) => aviso.severity === 'success' && aviso.detail?.startsWith('Execução pausada'))).toBe(true);
    });
});
