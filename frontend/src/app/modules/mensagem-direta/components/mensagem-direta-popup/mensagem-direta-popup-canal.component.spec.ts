import { describe, it, expect, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AutorMensagemDiretaEnum, GrupoResumoDto, TipoGrupoEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderSucesso } from '../../../../../testes/http-teste';
import { esperarCampoDeMensagem } from '../../../../../testes/campo-mensagem';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaEventosService, OuvintesDoStream } from '../../services/mensagem-direta-eventos.service';
import { MensagemDiretaPopupComponent } from './mensagem-direta-popup.component';

// Os canais de demanda e de projeto no popup do chat (task 248), com a API e o stream em dublê: o ícone no lugar das iniciais, o cabeçalho que diz de quem é o
// chat, os detalhes só de leitura, a ausência de "Sair" e a leitura por tipo do gestor (que não está na lista e não pode ser fechada por ela).

class EventosFalso {
    readonly conectado = signal(true);
    ouvintes: OuvintesDoStream | null = null;
    iniciar(ouvintes: OuvintesDoStream): void {
        this.ouvintes = ouvintes;
    }
    parar(): void {
        this.ouvintes = null;
    }
}

function mensagemDoCanal(mensagemId: string, texto: string, autorUsuarioId: number | null, grupoId = 21) {
    return {
        mensagemId, conversaId: `G${grupoId}`, autor: autorUsuarioId === null ? AutorMensagemDiretaEnum.SISTEMA : AutorMensagemDiretaEnum.USUARIO, autorUsuarioId, texto,
        contemCodigo: false, mencoes: [], referencias: [], respondeA: null, createdDate: '2026-10-21T14:00:00.000Z', editadaDate: null,
    };
}

function membro(usuarioId: number, usuarioNome: string, tipo = TipoUsuarioEnum.DESENVOLVEDOR) {
    return { usuarioId, usuarioNome, tipo, corAvatar: null, entradaData: new Date('2026-10-20T10:00:00.000Z'), online: false };
}

function canal(extra: Partial<GrupoResumoDto> = {}): GrupoResumoDto {
    return {
        grupoId: 21, conversaId: 'G21', nome: 'Cadastro de clientes', tipo: TipoGrupoEnum.DEMANDA, corAvatar: null, emojiAvatar: null, criadorUsuarioId: 1,
        membros: [membro(1, 'Usuário DESENVOLVEDOR'), membro(9, 'Camila Duarte'), membro(12, 'Davi Rocha')],
        ultimaMensagem: mensagemDoCanal('u21', 'Subi o PR', 9) as never, naoLidas: 0, silenciada: false, privado: false, leituraPorSupervisao: false,
        ...extra,
    };
}

async function montarPopup(usuario: TipoUsuarioEnum): Promise<ComponenteMontado<MensagemDiretaPopupComponent>> {
    TestBed.configureTestingModule({ imports: [MensagemDiretaPopupComponent] });
    await TestBed.compileComponents();
    return montarComponente(MensagemDiretaPopupComponent, { usuario, provedores: [{ provide: MensagemDiretaEventosService, useClass: EventosFalso }] });
}

describe('MensagemDiretaPopupComponent — canais', () => {
    let tela: ComponenteMontado<MensagemDiretaPopupComponent>;
    let estado: MensagemDiretaEstadoService;

    const texto = () => tela.elemento.textContent ?? '';
    const statusDoCabecalho = () => tela.elemento.querySelector('.conversa-direta__status')?.textContent?.trim();
    const botao = (rotulo: string) => Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('button')).find((candidato) => candidato.textContent?.includes(rotulo) || candidato.getAttribute('aria-label') === rotulo);

    async function montar(grupos: GrupoResumoDto[], usuario = TipoUsuarioEnum.DESENVOLVEDOR) {
        tela = await montarPopup(usuario);
        estado = TestBed.inject(MensagemDiretaEstadoService);
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversas'), { conversas: [], grupos });
        estado.abrir();
        await tela.atualizar();
    }

    async function responderAsMensagens(mensagens = [mensagemDoCanal('m1', 'Subi o PR', 9)]) {
        await tela.atualizar();
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/grupo/21/mensagens'), { grupoId: 21, mensagens, proximoCursor: null });
        await tela.atualizar();
        await esperarCampoDeMensagem(tela.fixture, () => tela.atualizar());
    }

    beforeEach(() => localStorage.clear());

    it('o canal aparece na lista com ícone no lugar das iniciais e o nome da demanda; o do projeto usa outro ícone', async () => {
        await montar([canal(), canal({ grupoId: 22, conversaId: 'G22', nome: 'Portal do cliente', tipo: TipoGrupoEnum.PROJETO, ultimaMensagem: mensagemDoCanal('u22', 'Bom dia', 9, 22) as never })]);

        expect(texto()).toContain('Cadastro de clientes');
        expect(texto()).toContain('Portal do cliente');
        const avatares = Array.from(tela.elemento.querySelectorAll('app-avatar-grupo .avatar-grupo'));
        expect(avatares).toHaveLength(2);
        expect(avatares.every((avatar) => avatar.classList.contains('avatar-grupo--icone'))).toBe(true);
        expect(tela.elemento.querySelector('app-avatar-grupo .pi-hashtag')).not.toBeNull();
        expect(tela.elemento.querySelector('app-avatar-grupo .pi-folder')).not.toBeNull();
    });

    it('abrir o canal mostra o ícone do canal e o número de membros no cabeçalho, sem faixa de leitura', async () => {
        await montar([canal()]);
        void estado.abrirGrupo(21);
        await responderAsMensagens();

        expect(statusDoCabecalho()).toBe('3 membros');
        expect(tela.elemento.querySelector('.conversa-direta__faixa')).toBeNull();
        expect(botao('Silenciar os avisos deste grupo')).toBeDefined();
        expect(tela.elemento.querySelector('app-avatar-grupo .pi-hashtag')).not.toBeNull();
    });

    it('os detalhes do canal só mostram os membros: sem nome, cor, adicionar pessoas nem saída, e explicam a regra', async () => {
        await montar([canal()]);
        void estado.abrirGrupo(21);
        await responderAsMensagens();

        estado.abrirDetalhesDoGrupo();
        await tela.atualizar();

        expect(texto()).toContain('Membros do chat');
        expect(texto()).toContain('Camila Duarte');
        expect(texto()).toContain('Davi Rocha');
        expect(texto()).toContain('pessoas atribuídas à demanda');
        expect(botao('Salvar alterações')).toBeUndefined();
        expect(botao('Sair do grupo')).toBeUndefined();
        expect(texto()).not.toContain('Adicionar pessoas');
    });

    it('o canal de projeto explica que os membros vêm de qualquer demanda do projeto', async () => {
        await montar([canal({ tipo: TipoGrupoEnum.PROJETO, nome: 'Portal do cliente' })]);
        void estado.abrirGrupo(21);
        await responderAsMensagens();
        expect(statusDoCabecalho()).toBe('3 membros');
        expect(tela.elemento.querySelector('.conversa-direta__cabecalho .pi-folder')).not.toBeNull();

        estado.abrirDetalhesDoGrupo();
        await tela.atualizar();
        expect(texto()).toContain('qualquer demanda do projeto');
    });

    it('abrirCanal de quem é membro e ainda não tem o canal na lista relê a lista antes de abrir', async () => {
        await montar([]);

        void estado.abrirCanal(canal());
        await tela.atualizar();
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversas'), { conversas: [], grupos: [canal()] });
        await tela.atualizar();
        await responderAsMensagens();

        expect(estado.grupoEstado.grupoAberto()?.grupoId).toBe(21);
        expect(statusDoCabecalho()).toBe('3 membros');
    });

    it('o gestor que lê o canal por tipo vê a faixa, não tem silêncio nem saída, e a releitura da lista não fecha o canal', async () => {
        await montar([], TipoUsuarioEnum.GESTOR);

        void estado.abrirCanal(canal({ leituraPorSupervisao: true, membros: [membro(9, 'Camila Duarte'), membro(12, 'Davi Rocha')] }));
        await responderAsMensagens();

        expect(texto()).toContain('Você lê este chat como gestor: os membros são avisados. Ao escrever, você entra nele.');
        expect(statusDoCabecalho()).toBe('2 membros');
        expect(botao('Silenciar os avisos deste grupo')).toBeUndefined();

        void estado.carregarConversas();
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversas'), { conversas: [], grupos: [] });
        await tela.atualizar();
        expect(estado.grupoEstado.grupoAberto()?.grupoId).toBe(21);
        expect(texto()).toContain('Você lê este chat como gestor');
    });

    it('quando o gestor escreve e vira membro, a lista passa a trazer o canal e a faixa some', async () => {
        await montar([], TipoUsuarioEnum.GESTOR);
        void estado.abrirCanal(canal({ leituraPorSupervisao: true }));
        await responderAsMensagens();
        expect(texto()).toContain('Você lê este chat como');

        void estado.carregarConversas();
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversas'), { conversas: [], grupos: [canal({ leituraPorSupervisao: false })] });
        await tela.atualizar();

        expect(estado.grupoEstado.canalPorTipo()).toBeNull();
        expect(texto()).not.toContain('Você lê este chat como');
        expect(botao('Silenciar os avisos deste grupo')).toBeDefined();
    });

    it('o canal aberto que sumiu da lista (saí da demanda) fecha e volta à lista', async () => {
        await montar([canal()]);
        void estado.abrirGrupo(21);
        await responderAsMensagens();

        void estado.carregarConversas();
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversas'), { conversas: [], grupos: [] });
        await tela.atualizar();

        expect(estado.grupoEstado.grupoAberto()).toBeNull();
    });
});
