import { describe, it, expect, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TipoGrupoEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaEventosService } from '../../services/mensagem-direta-eventos.service';
import { GrupoNaLista } from '../../utils/grupo.util';
import { ConversaNaLista } from '../../utils/mensagem-direta.util';
import { MensagemDiretaBarraComponent } from './mensagem-direta-barra.component';

class EventosFalso {
    readonly conectado = signal(true);
    iniciar(): void {}
    parar(): void {}
}

const conversa = (usuarioId: number, usuarioNome: string, naoLidas = 0): ConversaNaLista => ({
    conversaId: `1-${usuarioId}`, usuarioId, usuarioNome, corAvatar: null, ultimaMensagem: null, naoLidas, silenciada: false, online: false,
});

const grupo = (grupoId: number, nome: string, naoLidas = 0): GrupoNaLista => ({
    grupoId, conversaId: `G${grupoId}`, nome, tipo: TipoGrupoEnum.LIVRE, corAvatar: null, emojiAvatar: '🚀', criadorUsuarioId: 1,
    membros: [{ usuarioId: 1, usuarioNome: 'Eu', tipo: TipoUsuarioEnum.DESENVOLVEDOR, corAvatar: '#2563EB', entradaData: new Date(), online: false }],
    ultimaMensagem: null, naoLidas, silenciada: false, privado: false, leituraPorSupervisao: false,
});

// A barra de bolinhas ao lado da conversa aberta (task 318) também leva os grupos (task 247): a mesma ordem da lista e o clique abre o grupo.
describe('MensagemDiretaBarraComponent — grupos', () => {
    let tela: ComponenteMontado<MensagemDiretaBarraComponent>;
    let estado: MensagemDiretaEstadoService;
    const bolinhas = () => Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('.barra-direta__bolinha'));

    beforeEach(async () => {
        tela = await montarComponente(MensagemDiretaBarraComponent, {
            usuario: TipoUsuarioEnum.DESENVOLVEDOR,
            provedores: [{ provide: MensagemDiretaEventosService, useClass: EventosFalso }],
        });
        estado = TestBed.inject(MensagemDiretaEstadoService);
        estado.conversas.set([conversa(9, 'Camila Duarte', 1)]);
        estado.grupoEstado.grupos.set([grupo(7, 'Time do backend', 4)]);
    });

    it('mostra uma bolinha para cada grupo junto das conversas, com o avatar do grupo e o contador', async () => {
        await tela.atualizar();
        expect(bolinhas().map((botao) => botao.getAttribute('aria-label'))).toEqual(['Camila Duarte, 1 não lida', 'Time do backend, 4 não lidas']);
        expect(bolinhas()[1].querySelector('app-avatar-grupo')?.textContent?.trim()).toBe('🚀');
        expect(bolinhas()[0].querySelector('app-avatar-grupo')).toBeNull();
        expect(bolinhas()[1].querySelector('.barra-direta__contador')?.textContent?.trim()).toBe('4');
    });

    it('o grupo aberto fica marcado e clicar nele não faz nada; clicar no outro grupo o abre', async () => {
        estado.grupoEstado.grupos.update((lista) => [...lista, grupo(8, 'Front', 0)]);
        estado.grupoEstado.grupoAberto.set({ grupoId: 7, conversaId: 'G7', mensagens: [], proximoCursor: null, carregando: false, carregandoMais: false, erro: false });
        await tela.atualizar();
        const ativas = bolinhas().filter((botao) => botao.classList.contains('barra-direta__bolinha--ativa'));
        expect(ativas.map((botao) => botao.getAttribute('aria-label'))).toEqual(['Time do backend, 4 não lidas']);
        let aberto: number | null = null;
        estado.abrirGrupo = async (grupoId: number) => { aberto = grupoId; };
        ativas[0].click();
        expect(aberto).toBeNull();
        bolinhas().find((botao) => botao.getAttribute('aria-label') === 'Front')!.click();
        expect(aberto).toBe(8);
    });
});
