import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PosicaoBarraChatEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { MensagemDiretaAvisosService } from '../../services/mensagem-direta-avisos.service';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaEventosService } from '../../services/mensagem-direta-eventos.service';
import { ConversaNaLista } from '../../utils/mensagem-direta.util';
import { MensagemDiretaBarraComponent } from './mensagem-direta-barra.component';

class EventosFalso {
    readonly conectado = signal(true);
    iniciar(): void {}
    parar(): void {}
}

const conversa = (usuarioId: number, usuarioNome: string, naoLidas = 0, silenciada = false): ConversaNaLista => ({
    conversaId: `1-${usuarioId}`, usuarioId, usuarioNome, corAvatar: null, ultimaMensagem: null, naoLidas, silenciada, online: false,
});

describe('MensagemDiretaBarraComponent', () => {
    let tela: ComponenteMontado<MensagemDiretaBarraComponent>;
    let estado: MensagemDiretaEstadoService;
    const bolinhas = () => Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('.barra-direta__bolinha'));

    beforeEach(async () => {
        tela = await montarComponente(MensagemDiretaBarraComponent, {
            usuario: TipoUsuarioEnum.DESENVOLVEDOR,
            provedores: [{ provide: MensagemDiretaEventosService, useClass: EventosFalso }],
        });
        estado = TestBed.inject(MensagemDiretaEstadoService);
        estado.conversas.set([conversa(9, 'Camila Duarte', 3), conversa(15, 'Rafael Moura', 0, true)]);
        estado.conversaAberta.set({ usuarioId: 15, usuarioNome: 'Rafael Moura', conversaId: '1-15', mensagens: [], lidaPeloOutroAte: null, proximoCursor: null, carregando: false, carregandoMais: false, erro: false });
        await tela.atualizar();
    });

    it('mostra uma bolinha por conversa, na ordem da lista, com a aberta marcada e o contador das não lidas', () => {
        expect(bolinhas().map((botao) => botao.getAttribute('aria-label'))).toEqual(['Camila Duarte, 3 não lidas', 'Rafael Moura']);
        expect(bolinhas()[1].classList.contains('barra-direta__bolinha--ativa')).toBe(true);
        expect(bolinhas()[1].getAttribute('aria-current')).toBe('true');
        expect(bolinhas()[0].querySelector('.barra-direta__contador')?.textContent?.trim()).toBe('3');
    });

    it('a bolinha usa a cor que a pessoa escolheu e a cor padrão quando ela não escolheu', async () => {
        estado.conversas.update((lista) => lista.map((item) => (item.usuarioId === 9 ? { ...item, corAvatar: '#1E3A8A' } : item)));
        await tela.atualizar();
        const fundo = (indice: number) => bolinhas()[indice].querySelector<HTMLElement>('.avatar-direto')!.style.background;
        expect(fundo(0)).toBe('rgb(30, 58, 138)');
        expect(fundo(1)).toBe('');
        expect(estado.corDe(9)).toBe('#1E3A8A');
        expect(estado.corDe(15)).toBeNull();
        expect(estado.corDe(404)).toBeNull();
    });

    it('clicar numa bolinha abre aquela conversa; clicar na aberta não faz nada', async () => {
        const abrir = vi.spyOn(estado, 'abrirConversa').mockResolvedValue();
        bolinhas()[1].click();
        expect(abrir).not.toHaveBeenCalled();
        bolinhas()[0].click();
        expect(abrir).toHaveBeenCalledWith(9, 'Camila Duarte');
    });

    it('a conversa aberta que a lista ainda não traz (sem mensagem) entra na barra', async () => {
        estado.conversaAberta.update((aberta) => ({ ...aberta!, usuarioId: 33, usuarioNome: 'Nova Pessoa', conversaId: '1-33' }));
        await tela.atualizar();
        expect(bolinhas().map((botao) => botao.getAttribute('aria-label'))).toEqual(['Nova Pessoa', 'Camila Duarte, 3 não lidas', 'Rafael Moura']);
        expect(bolinhas()[0].classList.contains('barra-direta__bolinha--ativa')).toBe(true);
    });

    // Task 318: a posição vem da preferência da conta e a engrenagem fica no fim da barra.
    it('a barra segue a posição da preferência: esquerda (padrão), direita, acima e abaixo', async () => {
        const barra = () => tela.elemento.querySelector<HTMLElement>('nav.barra-direta')!;
        expect(barra().classList.contains('barra-direta--esquerda')).toBe(true);
        for (const posicao of [PosicaoBarraChatEnum.DIREITA, PosicaoBarraChatEnum.ACIMA, PosicaoBarraChatEnum.ABAIXO]) {
            TestBed.inject(MensagemDiretaAvisosService).preferencia.update((atual) => ({ ...atual, posicaoBarra: posicao }));
            await tela.atualizar();
            expect(barra().classList.contains(`barra-direta--${posicao.toLowerCase()}`)).toBe(true);
            expect(barra().classList.contains('barra-direta--esquerda')).toBe(false);
        }
    });

    it('a engrenagem fica depois das bolinhas, fora da área que rola, e abre a tela de configurações do chat', async () => {
        const engrenagem = tela.elemento.querySelector<HTMLButtonElement>('button[aria-label="Configurações do chat"]');
        expect(engrenagem).not.toBeNull();
        expect(tela.elemento.querySelector('.barra-direta__bolinhas')!.contains(engrenagem)).toBe(false);
        const nav = tela.elemento.querySelector('nav.barra-direta')!;
        expect(nav.lastElementChild!.contains(engrenagem)).toBe(true);
        engrenagem!.click();
        await tela.atualizar();
        expect(TestBed.inject(MensagemDiretaEstadoService).visao()).toBe('CONFIGURACOES');
    });
});
