import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AutorMensagemDiretaEnum, TipoGrupoEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaEventosService } from '../../services/mensagem-direta-eventos.service';
import { MensagemDiretaSomService } from '../../services/mensagem-direta-som.service';
import { GrupoNaLista } from '../../utils/grupo.util';
import { MensagemDiretaAvisosComponent } from './mensagem-direta-avisos.component';

class EventosFalso {
    readonly conectado = signal(true);
    iniciar(): void {}
    parar(): void {}
}

class SomFalso {
    tocar(): void {}
}

const membro = (usuarioId: number, usuarioNome: string) => ({ usuarioId, usuarioNome, tipo: TipoUsuarioEnum.DESENVOLVEDOR, corAvatar: null, entradaData: new Date(), online: false });

function grupo(parcial: Partial<GrupoNaLista> = {}): GrupoNaLista {
    return {
        grupoId: 7, conversaId: 'G7', nome: 'Time do backend', tipo: TipoGrupoEnum.LIVRE, corAvatar: '#1E3A8A', emojiAvatar: '🚀', criadorUsuarioId: 1,
        membros: [membro(1, 'Eu'), membro(9, 'Camila Duarte')], ultimaMensagem: null, naoLidas: 0, silenciada: false, privado: false, leituraPorSupervisao: false,
        ...parcial,
    };
}

function mensagemDoGrupo(autorUsuarioId: number | null, texto: string, parcial: Record<string, unknown> = {}) {
    return {
        mensagemId: `m-${Math.random().toString(36).slice(2)}`, conversaId: 'G7', autor: autorUsuarioId === null ? AutorMensagemDiretaEnum.SISTEMA : AutorMensagemDiretaEnum.USUARIO,
        autorUsuarioId, texto, contemCodigo: false, mencoes: [] as number[], referencias: [], createdDate: new Date().toISOString() as never, ...parcial,
    };
}

// O aviso de mensagem de um grupo (task 247): o cartão com o avatar do grupo, o nome do grupo no título, o autor na prévia, o clique que abre o grupo e as mesmas
// regras de silêncio e de grupo à vista dos avisos da conversa um a um. O usuário autenticado de teste tem id 1; Camila é a 9.
describe('MensagemDiretaAvisosComponent — grupo', () => {
    let tela: ComponenteMontado<MensagemDiretaAvisosComponent>;
    let estado: MensagemDiretaEstadoService;

    beforeEach(async () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
        tela = await montarComponente(MensagemDiretaAvisosComponent, {
            usuario: TipoUsuarioEnum.DESENVOLVEDOR,
            provedores: [
                { provide: MensagemDiretaEventosService, useClass: EventosFalso },
                { provide: MensagemDiretaSomService, useClass: SomFalso },
            ],
        });
        estado = TestBed.inject(MensagemDiretaEstadoService);
        estado.grupoEstado.grupos.set([grupo()]);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const chegar = async (autorUsuarioId: number | null, texto: string, parcial: Record<string, unknown> = {}) => {
        estado.aplicarEvento({ tipo: 'MENSAGEM', mensagem: mensagemDoGrupo(autorUsuarioId, texto, parcial) as never });
        await vi.advanceTimersByTimeAsync(0);
        await tela.atualizar();
    };
    const cartoes = () => Array.from(tela.elemento.querySelectorAll('.aviso-direto'));

    it('mostra o avatar do grupo (emoji e cor), o nome do grupo e o autor na prévia', async () => {
        await chegar(9, 'bora revisar');
        expect(cartoes()).toHaveLength(1);
        expect(tela.elemento.querySelector('app-avatar-grupo')?.textContent?.trim()).toBe('🚀');
        expect(tela.elemento.querySelector('app-avatar-usuario')).toBeNull();
        expect(tela.elemento.querySelector('.aviso-direto__nome')?.textContent).toContain('Time do backend');
        expect(tela.elemento.querySelector('.aviso-direto__texto')?.textContent).toContain('Camila: bora revisar');
        expect(cartoes()[0].getAttribute('aria-label')).toBe('Mensagem nova de Time do backend');
    });

    it('mensagens seguidas do mesmo grupo atualizam o mesmo cartão', async () => {
        await chegar(9, 'primeira');
        await chegar(9, 'segunda');
        expect(cartoes()).toHaveLength(1);
        expect(tela.elemento.textContent).toContain('2 mensagens novas');
    });

    it('clicar no cartão abre o grupo (e não a conversa com o autor)', async () => {
        await chegar(9, 'oi');
        const abrirGrupo = vi.fn(async () => undefined);
        const abrirConversa = vi.fn(async () => undefined);
        estado.abrirGrupoDoAviso = abrirGrupo;
        estado.abrirConversaDoAviso = abrirConversa;
        tela.elemento.querySelector<HTMLButtonElement>('.aviso-direto__conteudo')!.click();
        expect(abrirGrupo).toHaveBeenCalledWith(7, 'G7');
        expect(abrirConversa).not.toHaveBeenCalled();
    });

    it('a minha mensagem, a do sistema e a de um grupo silenciado não avisam; a menção fura o silêncio do grupo', async () => {
        await chegar(1, 'eu mesmo');
        await chegar(null, 'Davi entrou');
        expect(cartoes()).toHaveLength(0);

        estado.grupoEstado.grupos.set([grupo({ silenciada: true })]);
        await chegar(9, 'sem menção');
        expect(cartoes()).toHaveLength(0);
        await chegar(9, 'oi @você', { mencoes: [1] });
        expect(cartoes()).toHaveLength(1);
        expect(tela.elemento.textContent).toContain('@você');
    });

    it('o grupo aberto à vista não avisa o que o usuário já está vendo', async () => {
        estado.aberto.set(true);
        estado.visao.set('GRUPO');
        estado.grupoEstado.grupoAberto.set({ grupoId: 7, conversaId: 'G7', mensagens: [], proximoCursor: null, carregando: false, carregandoMais: false, erro: false });
        await chegar(9, 'estou vendo');
        expect(cartoes()).toHaveLength(0);
    });

    it('o aviso de pessoa continua com o avatar da pessoa', async () => {
        estado.conversas.set([{ conversaId: '1-9', usuarioId: 9, usuarioNome: 'Camila Duarte', corAvatar: null, ultimaMensagem: null, naoLidas: 0, silenciada: false, online: false }]);
        estado.aplicarEvento({ tipo: 'MENSAGEM', mensagem: { ...mensagemDoGrupo(9, 'oi'), conversaId: '1-9' } as never });
        await vi.advanceTimersByTimeAsync(0);
        await tela.atualizar();
        expect(tela.elemento.querySelector('app-avatar-usuario')).not.toBeNull();
        expect(tela.elemento.querySelector('app-avatar-grupo')).toBeNull();
    });
});
