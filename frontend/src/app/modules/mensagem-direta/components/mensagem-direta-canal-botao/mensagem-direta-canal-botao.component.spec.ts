import { describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GrupoResumoDto, TipoGrupoEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaEventosService, OuvintesDoStream } from '../../services/mensagem-direta-eventos.service';
import { MensagemDiretaCanalBotaoComponent } from './mensagem-direta-canal-botao.component';

// O botão "Criar chat" / "Abrir chat" das telas da demanda e do projeto (tasks 248, 360 e 405): o rótulo e a permissão vêm da tela (do detalhe), sem
// nenhuma requisição ao aparecer; o servidor só é chamado no clique.

class EventosFalso {
    readonly conectado = signal(true);
    iniciar(_ouvintes: OuvintesDoStream): void {}
    parar(): void {}
}

const CANAL = {
    grupoId: 21, conversaId: 'G21', nome: 'Cadastro de clientes', tipo: TipoGrupoEnum.DEMANDA, corAvatar: null, emojiAvatar: null, criadorUsuarioId: 1,
    membros: [], ultimaMensagem: null, naoLidas: 0, silenciada: false, privado: false, leituraPorSupervisao: false,
} as GrupoResumoDto;

async function montar(opcoes: { tipo?: TipoGrupoEnum.DEMANDA | TipoGrupoEnum.PROJETO; alvoId?: number; canalExiste?: boolean; podeAbrir?: boolean } = {}) {
    const { tipo = TipoGrupoEnum.DEMANDA, alvoId = 12, canalExiste = false, podeAbrir = true } = opcoes;
    const tela = await montarComponente(MensagemDiretaCanalBotaoComponent, {
        usuario: TipoUsuarioEnum.DESENVOLVEDOR,
        entradas: { tipo, alvoId, canalExiste, podeAbrir },
        provedores: [{ provide: MensagemDiretaEventosService, useClass: EventosFalso }],
    });
    const caminho = `/mensagem-direta/canal/${tipo === TipoGrupoEnum.DEMANDA ? 'demanda' : 'projeto'}/${alvoId}`;
    return { tela, caminho };
}

const botao = (elemento: HTMLElement) => elemento.querySelector<HTMLButtonElement>('button');

describe('MensagemDiretaCanalBotaoComponent', () => {
    it('ao aparecer não faz nenhuma requisição: o rótulo vem da tela', async () => {
        const { tela } = await montar();
        tela.http.expectNone(() => true);
        expect(botao(tela.elemento)?.textContent).toContain('Criar chat');
        expect(botao(tela.elemento)?.disabled).toBe(false);
    });

    it('quem não pode abrir o chat (ex.: auxiliar que não é membro da demanda) não vê o botão e nada é pedido', async () => {
        const { tela } = await montar({ podeAbrir: false, canalExiste: true });
        expect(botao(tela.elemento)).toBeNull();
        tela.http.expectNone(() => true);
    });

    it('sem chat oferece "Criar chat"; clicar cria o chat e abre o popup nele', async () => {
        const { tela, caminho } = await montar();
        expect(botao(tela.elemento)?.textContent).toContain('Criar chat');

        const abrir = vi.spyOn(TestBed.inject(MensagemDiretaEstadoService), 'abrirCanal').mockResolvedValue();
        botao(tela.elemento)!.click();
        responderSucesso(esperarRequisicao(tela.http, 'POST', caminho), { grupo: CANAL, jaExistia: false });
        await tela.atualizar();

        expect(abrir).toHaveBeenCalledWith(CANAL);
        expect(botao(tela.elemento)?.textContent).toContain('Abrir chat');
    });

    it('com chat oferece "Abrir chat"; clicar busca o chat existente e abre, sem criar nada', async () => {
        const { tela, caminho } = await montar({ tipo: TipoGrupoEnum.PROJETO, alvoId: 3, canalExiste: true });
        expect(botao(tela.elemento)?.textContent).toContain('Abrir chat');
        tela.http.expectNone(() => true);

        const abrir = vi.spyOn(TestBed.inject(MensagemDiretaEstadoService), 'abrirCanal').mockResolvedValue();
        botao(tela.elemento)!.click();
        responderSucesso(esperarRequisicao(tela.http, 'GET', caminho), { grupo: { ...CANAL, tipo: TipoGrupoEnum.PROJETO } });
        await tela.atualizar();

        expect(abrir).toHaveBeenCalledTimes(1);
        tela.http.expectNone((requisicao) => requisicao.method === 'POST');
    });

    it('criar que falha no servidor mostra "Chat indisponível", sem abrir o popup, e clicar tenta de novo', async () => {
        const { tela, caminho } = await montar();
        const abrir = vi.spyOn(TestBed.inject(MensagemDiretaEstadoService), 'abrirCanal').mockResolvedValue();

        botao(tela.elemento)!.click();
        responderErro(esperarRequisicao(tela.http, 'POST', caminho), 500, 'Erro interno');
        await tela.atualizar();
        expect(abrir).not.toHaveBeenCalled();
        expect(botao(tela.elemento)?.textContent).toContain('Chat indisponível');

        botao(tela.elemento)!.click();
        responderSucesso(esperarRequisicao(tela.http, 'POST', caminho), { grupo: CANAL, jaExistia: false });
        await tela.atualizar();
        expect(abrir).toHaveBeenCalledWith(CANAL);
    });

    it('o canal é pedido pela rota da demanda ou pela do projeto, conforme o tipo', async () => {
        const demanda = await montar({ tipo: TipoGrupoEnum.DEMANDA, alvoId: 12 });
        expect(demanda.caminho).toBe('/mensagem-direta/canal/demanda/12');
    });
});
