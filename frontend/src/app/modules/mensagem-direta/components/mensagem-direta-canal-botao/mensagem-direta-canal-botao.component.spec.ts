import { describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GrupoResumoDto, TipoGrupoEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaEventosService, OuvintesDoStream } from '../../services/mensagem-direta-eventos.service';
import { MensagemDiretaCanalBotaoComponent } from './mensagem-direta-canal-botao.component';

// O botão "Criar chat" / "Abrir chat" das telas da demanda e do projeto (task 248): os cinco estados (carregando, sem acesso, sem chat, com chat, erro) e o
// que cada clique faz.

class EventosFalso {
    readonly conectado = signal(true);
    iniciar(_ouvintes: OuvintesDoStream): void {}
    parar(): void {}
}

const CANAL = {
    grupoId: 21, conversaId: 'G21', nome: 'Cadastro de clientes', tipo: TipoGrupoEnum.DEMANDA, corAvatar: null, emojiAvatar: null, criadorUsuarioId: 1,
    membros: [], ultimaMensagem: null, naoLidas: 0, silenciada: false, privado: false, leituraPorSupervisao: false,
} as GrupoResumoDto;

async function montar(tipo: TipoGrupoEnum.DEMANDA | TipoGrupoEnum.PROJETO = TipoGrupoEnum.DEMANDA, alvoId = 12) {
    const tela = await montarComponente(MensagemDiretaCanalBotaoComponent, {
        usuario: TipoUsuarioEnum.DESENVOLVEDOR,
        entradas: { tipo, alvoId },
        provedores: [{ provide: MensagemDiretaEventosService, useClass: EventosFalso }],
    });
    const caminho = `/mensagem-direta/canal/${tipo === TipoGrupoEnum.DEMANDA ? 'demanda' : 'projeto'}/${alvoId}`;
    return { tela, caminho };
}

const botao = (elemento: HTMLElement) => elemento.querySelector<HTMLButtonElement>('button');

describe('MensagemDiretaCanalBotaoComponent', () => {
    it('enquanto pergunta ao servidor o botão aparece desabilitado e carregando', async () => {
        const { tela } = await montar();
        expect(botao(tela.elemento)?.disabled).toBe(true);
        tela.http.expectOne((requisicao) => requisicao.method === 'GET');
    });

    it('sem chat oferece "Criar chat"; clicar cria o chat e abre o popup nele', async () => {
        const { tela, caminho } = await montar();
        responderSucesso(esperarRequisicao(tela.http, 'GET', caminho), { grupo: null });
        await tela.atualizar();
        expect(botao(tela.elemento)?.textContent).toContain('Criar chat');

        const estado = TestBed.inject(MensagemDiretaEstadoService);
        const abrir = vi.spyOn(estado, 'abrirCanal').mockResolvedValue();
        botao(tela.elemento)!.click();
        responderSucesso(esperarRequisicao(tela.http, 'POST', caminho), { grupo: CANAL, jaExistia: false });
        await tela.atualizar();

        expect(abrir).toHaveBeenCalledWith(CANAL);
        expect(botao(tela.elemento)?.textContent).toContain('Abrir chat');
    });

    it('com chat oferece "Abrir chat" e clicar só abre, sem criar nada', async () => {
        const { tela, caminho } = await montar(TipoGrupoEnum.PROJETO, 3);
        responderSucesso(esperarRequisicao(tela.http, 'GET', caminho), { grupo: { ...CANAL, tipo: TipoGrupoEnum.PROJETO } });
        await tela.atualizar();
        expect(botao(tela.elemento)?.textContent).toContain('Abrir chat');

        const abrir = vi.spyOn(TestBed.inject(MensagemDiretaEstadoService), 'abrirCanal').mockResolvedValue();
        botao(tela.elemento)!.click();
        await tela.atualizar();

        expect(abrir).toHaveBeenCalledTimes(1);
        tela.http.expectNone((requisicao) => requisicao.method === 'POST');
    });

    it('quem não tem acesso (403) não vê o botão', async () => {
        const { tela, caminho } = await montar();
        responderErro(esperarRequisicao(tela.http, 'GET', caminho), 403, 'Você não é membro desta demanda');
        await tela.atualizar();
        expect(botao(tela.elemento)).toBeNull();
    });

    it('na falha mostra o botão de aviso e clicar pergunta de novo', async () => {
        const { tela, caminho } = await montar();
        responderErro(esperarRequisicao(tela.http, 'GET', caminho), 500, 'Erro interno');
        await tela.atualizar();
        expect(botao(tela.elemento)?.textContent).toContain('Chat indisponível');

        botao(tela.elemento)!.click();
        responderSucesso(esperarRequisicao(tela.http, 'GET', caminho), { grupo: null });
        await tela.atualizar();
        expect(botao(tela.elemento)?.textContent).toContain('Criar chat');
    });

    it('criar que falha no servidor volta ao estado de erro, sem abrir o popup', async () => {
        const { tela, caminho } = await montar();
        responderSucesso(esperarRequisicao(tela.http, 'GET', caminho), { grupo: null });
        await tela.atualizar();
        const abrir = vi.spyOn(TestBed.inject(MensagemDiretaEstadoService), 'abrirCanal').mockResolvedValue();

        botao(tela.elemento)!.click();
        responderErro(esperarRequisicao(tela.http, 'POST', caminho), 500, 'Erro interno');
        await tela.atualizar();

        expect(abrir).not.toHaveBeenCalled();
        expect(botao(tela.elemento)?.textContent).toContain('Chat indisponível');
    });

    it('o canal é pedido pela rota da demanda ou pela do projeto, conforme o tipo', async () => {
        const demanda = await montar(TipoGrupoEnum.DEMANDA, 12);
        expect(demanda.caminho).toBe('/mensagem-direta/canal/demanda/12');
        responderSucesso(esperarRequisicao(demanda.tela.http, 'GET', demanda.caminho), { grupo: null });
    });
});
