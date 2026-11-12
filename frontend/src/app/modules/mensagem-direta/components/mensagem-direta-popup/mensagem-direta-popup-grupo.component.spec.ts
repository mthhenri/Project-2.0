import { describe, it, expect, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AutorMensagemDiretaEnum, TipoGrupoEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { digitarNaMensagem, esperarCampoDeMensagem, teclarNaMensagem } from '../../../../../testes/campo-mensagem';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaEventosService, OuvintesDoStream } from '../../services/mensagem-direta-eventos.service';
import { MensagemDiretaPopupComponent } from './mensagem-direta-popup.component';

// Os grupos no popup do chat entre colaboradores (task 247), com a API e o stream em dublê: lista mista, conversa de grupo, criar, detalhes, eventos e
// avisos. O usuário autenticado de teste tem id 1; Camila é a 9 e Davi a 12 (grupo `G7`).

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

function mensagemDoGrupo(mensagemId: string, texto: string, autorUsuarioId: number | null, data = '2026-10-21T14:00:00.000Z', grupoId = 7) {
    return {
        mensagemId, conversaId: `G${grupoId}`, autor: autorUsuarioId === null ? AutorMensagemDiretaEnum.SISTEMA : AutorMensagemDiretaEnum.USUARIO, autorUsuarioId, texto,
        contemCodigo: false, mencoes: [], referencias: [], respondeA: null, createdDate: data, editadaDate: null,
    };
}

function membro(usuarioId: number, usuarioNome: string, corAvatar: string | null = null) {
    return { usuarioId, usuarioNome, tipo: TipoUsuarioEnum.DESENVOLVEDOR, corAvatar, entradaData: '2026-10-20T10:00:00.000Z', online: false };
}

function grupoDaLista(grupoId: number, nome: string, extra: Record<string, unknown> = {}) {
    return {
        grupoId, conversaId: `G${grupoId}`, nome, tipo: TipoGrupoEnum.LIVRE, corAvatar: null, emojiAvatar: null, criadorUsuarioId: 1,
        membros: [membro(1, 'Usuário DESENVOLVEDOR'), membro(9, 'Camila Duarte', '#2563EB'), membro(12, 'Davi Rocha')],
        ultimaMensagem: mensagemDoGrupo(`u${grupoId}`, 'bora revisar', 9, '2026-10-21T14:00:00.000Z', grupoId), naoLidas: 0, silenciada: false, privado: false,
        ...extra,
    };
}

function conversaDaLista(usuarioId: number, nome: string, data: string, texto = 'oi') {
    return {
        conversaId: `1-${usuarioId}`, usuarioId, usuarioNome: nome, naoLidas: 0, silenciada: false, online: false, corAvatar: null,
        ultimaMensagem: { mensagemId: `c${usuarioId}`, conversaId: `1-${usuarioId}`, autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId: usuarioId, texto, contemCodigo: false, mencoes: [], referencias: [], createdDate: data },
    };
}

async function montarPopup(): Promise<ComponenteMontado<MensagemDiretaPopupComponent>> {
    TestBed.configureTestingModule({ imports: [MensagemDiretaPopupComponent] });
    await TestBed.compileComponents();
    return montarComponente(MensagemDiretaPopupComponent, {
        usuario: TipoUsuarioEnum.DESENVOLVEDOR,
        provedores: [{ provide: MensagemDiretaEventosService, useClass: EventosFalso }],
    });
}

describe('MensagemDiretaPopupComponent — grupos', () => {
    let tela: ComponenteMontado<MensagemDiretaPopupComponent>;
    let estado: MensagemDiretaEstadoService;
    let eventos: EventosFalso;

    const texto = () => tela.elemento.textContent ?? '';
    const botao = (rotulo: string) => Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('button')).find((candidato) => candidato.textContent?.includes(rotulo) || candidato.getAttribute('aria-label') === rotulo);
    const clicar = async (rotulo: string) => {
        const encontrado = botao(rotulo);
        if (!encontrado) throw new Error(`Botão "${rotulo}" não está na tela`);
        encontrado.click();
        await tela.atualizar();
    };

    async function montar(grupos = [grupoDaLista(7, 'Time do backend', { naoLidas: 2 })], conversas = [conversaDaLista(9, 'Camila Duarte', '2026-10-21T13:00:00.000Z', 'rodei a migration')]) {
        tela = await montarPopup();
        estado = TestBed.inject(MensagemDiretaEstadoService);
        eventos = TestBed.inject(MensagemDiretaEventosService) as unknown as EventosFalso;
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversas'), { conversas, grupos });
        estado.abrir();
        await tela.atualizar();
    }

    async function abrirOGrupo(mensagens = [mensagemDoGrupo('m2', 'Já subi o PR', 9, '2026-10-21T14:07:00.000Z'), mensagemDoGrupo('m1', 'Davi entrou no grupo', null, '2026-10-21T14:00:00.000Z')]) {
        void estado.abrirGrupo(7);
        await tela.atualizar();
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/grupo/7/mensagens'), { grupoId: 7, mensagens, proximoCursor: null });
        await tela.atualizar();
        await esperarCampoDeMensagem(tela.fixture, () => tela.atualizar());
    }

    beforeEach(() => localStorage.clear());

    // --- lista -------------------------------------------------------------------------------

    it('a lista mistura conversa e grupo pela mensagem mais recente, com o autor na prévia, o contador e o silêncio', async () => {
        await montar([grupoDaLista(7, 'Time do backend', { naoLidas: 2 }), grupoDaLista(8, 'Quietos', { silenciada: true })]);
        const linhas = Array.from(tela.elemento.querySelectorAll('.lista-direta__linha')).map((linha) => linha.textContent ?? '');
        expect(linhas[0]).toContain('Time do backend');
        expect(linhas[0]).toContain('Camila: bora revisar');
        expect(tela.elemento.querySelector('[aria-label="2 mensagens não lidas"]')).not.toBeNull();
        expect(linhas.some((linha) => linha.includes('Camila Duarte') && linha.includes('rodei a migration'))).toBe(true);
        expect(tela.elemento.querySelector('[aria-label="Silenciado"]')).not.toBeNull();
        expect(tela.elemento.querySelectorAll('app-avatar-grupo')).toHaveLength(2);
    });

    it('o contador do topbar soma as não lidas dos grupos que não estão silenciados', async () => {
        await montar([grupoDaLista(7, 'A', { naoLidas: 3 }), grupoDaLista(8, 'B', { naoLidas: 5, silenciada: true })], [{ ...conversaDaLista(9, 'Camila Duarte', '2026-10-21T13:00:00.000Z'), naoLidas: 2 }]);
        expect(estado.naoLidas()).toBe(5);
    });

    it('sem conversa nem grupo, o estado vazio oferece nova conversa e novo grupo', async () => {
        await montar([], []);
        expect(texto()).toContain('Nenhuma conversa ainda');
        expect(botao('Nova conversa')).toBeDefined();
        expect(Array.from(tela.elemento.querySelectorAll('button')).some((candidato) => candidato.textContent?.trim() === 'Novo grupo')).toBe(true);
    });

    it('só grupo na lista já não é estado vazio', async () => {
        await montar([grupoDaLista(7, 'Time do backend')], []);
        expect(texto()).not.toContain('Nenhuma conversa ainda');
        expect(texto()).toContain('Time do backend');
    });

    it('a busca acha o grupo pelo nome, sem acento', async () => {
        await montar([grupoDaLista(7, 'Revisão de código')]);
        const campo = tela.elemento.querySelector<HTMLInputElement>('input[aria-label="Buscar pessoa, grupo ou mensagem"]')!;
        campo.value = 'revisao';
        campo.dispatchEvent(new Event('input'));
        await new Promise((resolver) => setTimeout(resolver, 400));
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/busca'), { mensagens: [] });
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/pessoas'), { pessoas: [] });
        await tela.atualizar();
        expect(texto()).toContain('Grupos · 1');
        expect(texto()).toContain('Revisão de código');
    });

    it('a nova conversa lista os grupos junto das pessoas, e escolher o grupo o abre', async () => {
        await montar([grupoDaLista(7, 'Time do backend')]);
        await clicar('Nova conversa');
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/pessoas'), { pessoas: [{ usuarioId: 9, usuarioNome: 'Camila Duarte', tipo: TipoUsuarioEnum.DESENVOLVEDOR, online: false, corAvatar: null }] });
        await tela.atualizar();
        expect(texto()).toContain('Grupos');
        expect(texto()).toContain('3 membros');
        tela.elemento.querySelector<HTMLButtonElement>('.nova-direta__linha')!.click();
        await tela.atualizar();
        esperarRequisicao(tela.http, 'GET', '/mensagem-direta/grupo/7/mensagens');
        expect(estado.visao()).toBe('GRUPO');
    });

    // --- conversa do grupo -------------------------------------------------------------------

    it('abrir o grupo lê a página, mostra o nome do autor e a linha do sistema, e marca como lido até a última de outra pessoa', async () => {
        await montar();
        await abrirOGrupo();
        expect(estado.visao()).toBe('GRUPO');
        expect(texto()).toContain('3 membros');
        expect(texto()).toContain('Camila Duarte');
        expect(texto()).toContain('Já subi o PR');
        expect(tela.elemento.querySelector('.conversa-direta__sistema')?.textContent).toContain('Davi entrou no grupo');
        expect(tela.elemento.querySelector('.conversa-direta__autor')?.textContent?.trim()).toBe('Camila Duarte');
        const leitura = esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/grupo/7/leitura');
        expect(leitura.request.body).toEqual({ lidaAteData: '2026-10-21T14:07:00.000Z' });
        responderSucesso(leitura, { grupoId: 7, conversaId: 'G7', lidaAteData: '2026-10-21T14:07:00.000Z' });
        await tela.atualizar();
        expect(estado.grupoEstado.grupos()[0].naoLidas).toBe(0);
        expect(estado.naoLidas()).toBe(0);
    });

    it('no grupo não há "Lida" por pessoa nem edição e reação', async () => {
        await montar();
        await abrirOGrupo([mensagemDoGrupo('m2', 'Minha mensagem', 1, '2026-10-21T14:07:00.000Z')]);
        expect(texto()).not.toContain('Lida');
        expect(tela.elemento.querySelector('app-mensagem-direta-reacoes')).toBeNull();
        expect(tela.elemento.querySelector('button[aria-label="Reagir"]')).toBeNull();
    });

    it('a mensagem de outro grupo em evento não entra no grupo aberto e some do "digitando" quando chega', async () => {
        await montar();
        await abrirOGrupo();
        eventos.ouvintes!.aoEvento({ tipo: 'DIGITANDO', conversaId: 'G7', usuarioId: 9 });
        await tela.atualizar();
        expect(tela.elemento.querySelector('.conversa-direta__status')?.textContent).toContain('Camila digitando');
        eventos.ouvintes!.aoEvento({ tipo: 'MENSAGEM', mensagem: mensagemDoGrupo('m3', 'agora vai', 9, '2026-10-21T14:10:00.000Z') } as never);
        await tela.atualizar();
        expect(texto()).toContain('agora vai');
        expect(tela.elemento.querySelector('.conversa-direta__status')?.textContent).toContain('3 membros');
        eventos.ouvintes!.aoEvento({ tipo: 'MENSAGEM', mensagem: mensagemDoGrupo('o1', 'de outro grupo', 9, '2026-10-21T14:11:00.000Z', 8) } as never);
        await tela.atualizar();
        expect(texto()).not.toContain('de outro grupo');
    });

    it('enviar ao grupo põe a mensagem na hora e a confirma com a resposta; @todos manda mencionaTodos', async () => {
        await montar();
        await abrirOGrupo();
        responderSucesso(esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/grupo/7/leitura'), { grupoId: 7, conversaId: 'G7', lidaAteData: '2026-10-21T14:07:00.000Z' });
        digitarNaMensagem(tela.fixture, 'Atenção @todos, deploy às 18h');
        teclarNaMensagem(tela.fixture, 'Enter');
        await tela.atualizar();
        expect(texto()).toContain('Enviando…');
        const envio = esperarRequisicao(tela.http, 'POST', '/mensagem-direta/grupo/7/mensagem');
        expect(envio.request.body).toMatchObject({ texto: 'Atenção @todos, deploy às 18h', mencionaTodos: true, mencoes: [], referencias: [] });
        responderSucesso(envio, { mensagem: mensagemDoGrupo(envio.request.body.mensagemId, 'Atenção @todos, deploy às 18h', 1, '2026-10-21T14:12:00.000Z'), jaExistia: false }, 201);
        await tela.atualizar();
        expect(texto()).not.toContain('Enviando…');
        expect(texto()).toContain('Enviada');
        expect(estado.grupoEstado.grupos()[0].ultimaMensagem?.texto).toBe('Atenção @todos, deploy às 18h');
    });

    it('sem @todos o envio não manda mencionaTodos', async () => {
        await montar();
        await abrirOGrupo();
        responderSucesso(esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/grupo/7/leitura'), { grupoId: 7, conversaId: 'G7', lidaAteData: '2026-10-21T14:07:00.000Z' });
        digitarNaMensagem(tela.fixture, 'Oi, time');
        teclarNaMensagem(tela.fixture, 'Enter');
        await tela.atualizar();
        const envio = esperarRequisicao(tela.http, 'POST', '/mensagem-direta/grupo/7/mensagem');
        expect('mencionaTodos' in envio.request.body && envio.request.body.mencionaTodos === true).toBe(false);
        responderErro(envio, 500, 'falhou');
        await tela.atualizar();
        expect(texto()).toContain('Não enviada');
    });

    it('erro ao carregar o grupo mostra o aviso e "Tentar de novo" relê', async () => {
        await montar();
        void estado.abrirGrupo(7);
        await tela.atualizar();
        responderErro(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/grupo/7/mensagens'), 500, 'falhou');
        await tela.atualizar();
        expect(texto()).toContain('Não foi possível carregar o grupo.');
        await clicar('Tentar de novo');
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/grupo/7/mensagens'), { grupoId: 7, mensagens: [mensagemDoGrupo('m1', 'voltou', 9)], proximoCursor: null });
        await tela.atualizar();
        expect(texto()).toContain('voltou');
    });

    it('sem conexão mostra a faixa na conversa do grupo', async () => {
        await montar();
        await abrirOGrupo();
        (estado as unknown as { _semConexao: { set(valor: boolean): void } })._semConexao.set(true);
        await tela.atualizar();
        expect(texto()).toContain('Sem conexão com o servidor');
    });

    // --- eventos na lista ----------------------------------------------------------------------

    it('a mensagem de um grupo que não está aberto sobe a não lida na lista e vira cartão de aviso com o nome do grupo', async () => {
        await montar([grupoDaLista(7, 'Time do backend')]);
        eventos.ouvintes!.aoEvento({ tipo: 'MENSAGEM', mensagem: { ...mensagemDoGrupo('n1', 'olha isso', 9, '2026-10-21T15:00:00.000Z'), mencoes: [1] } } as never);
        await tela.atualizar();
        expect(estado.grupoEstado.grupos()[0].naoLidas).toBe(1);
        expect(estado.naoLidas()).toBe(1);
        const avisos = estado.grupoEstado.grupos().length;
        expect(avisos).toBe(1);
    });

    it('SINCRONIZAR de um grupo relê a lista e o grupo aberto', async () => {
        await montar();
        await abrirOGrupo();
        responderSucesso(esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/grupo/7/leitura'), { grupoId: 7, conversaId: 'G7', lidaAteData: '2026-10-21T14:07:00.000Z' });
        eventos.ouvintes!.aoEvento({ tipo: 'SINCRONIZAR', conversaId: 'G7' });
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversas'), { conversas: [], grupos: [grupoDaLista(7, 'Time renomeado')] });
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/grupo/7/mensagens'), { grupoId: 7, mensagens: [mensagemDoGrupo('m9', 'depois do sincronizar', 9)], proximoCursor: null });
        await tela.atualizar();
        expect(texto()).toContain('Time renomeado');
        expect(texto()).toContain('depois do sincronizar');
    });

    it('o grupo aberto que sumiu da lista (saí dele em outra aba) fecha e volta à lista', async () => {
        await montar();
        await abrirOGrupo();
        responderSucesso(esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/grupo/7/leitura'), { grupoId: 7, conversaId: 'G7', lidaAteData: '2026-10-21T14:07:00.000Z' });
        eventos.ouvintes!.aoEvento({ tipo: 'SINCRONIZAR', conversaId: 'G7' });
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversas'), { conversas: [], grupos: [] });
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/grupo/7/mensagens'), { grupoId: 7, mensagens: [], proximoCursor: null });
        await tela.atualizar();
        expect(estado.visao()).toBe('LISTA');
        expect(estado.grupoEstado.grupoAberto()).toBeNull();
    });

    // --- criar -----------------------------------------------------------------------------------

    it('criar grupo manda nome, cor, emoji e pessoas e abre o grupo criado', async () => {
        await montar([], []);
        await clicar('Novo grupo');
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/pessoas'), {
            pessoas: [
                { usuarioId: 9, usuarioNome: 'Camila Duarte', tipo: TipoUsuarioEnum.DESENVOLVEDOR, online: false, corAvatar: '#2563EB' },
                { usuarioId: 12, usuarioNome: 'Davi Rocha', tipo: TipoUsuarioEnum.DESENVOLVEDOR, online: true, corAvatar: null },
            ],
        });
        await tela.atualizar();
        expect(texto()).toContain('Novo grupo');
        expect(botao('Criar grupo')?.disabled).toBe(true);

        const campo = tela.elemento.querySelector<HTMLInputElement>('input[aria-label="Nome do grupo"]')!;
        campo.value = '  Time do backend ';
        campo.dispatchEvent(new Event('input'));
        await tela.atualizar();
        await clicar('Cor #2563EB');
        await clicar('Emoji 🚀');
        tela.elemento.querySelectorAll<HTMLButtonElement>('.pessoas-grupo__linha')[0].click();
        await tela.atualizar();
        expect(texto()).toContain('1 escolhida');
        expect(botao('Criar grupo')?.disabled).toBe(false);
        await clicar('Criar grupo');

        const criacao = esperarRequisicao(tela.http, 'POST', '/mensagem-direta/grupo');
        expect(criacao.request.body).toEqual({ nome: 'Time do backend', corAvatar: '#2563EB', emojiAvatar: '🚀', membroUsuarioIds: [9] });
        responderSucesso(criacao, { grupo: grupoDaLista(7, 'Time do backend', { corAvatar: '#2563EB', emojiAvatar: '🚀', naoLidas: 0 }) }, 201);
        await tela.atualizar();
        esperarRequisicao(tela.http, 'GET', '/mensagem-direta/grupo/7/mensagens');
        expect(estado.visao()).toBe('GRUPO');
        expect(estado.grupoEstado.grupos().map((grupo) => grupo.nome)).toEqual(['Time do backend']);
    });

    it('o servidor recusar a criação mostra o motivo e o formulário continua', async () => {
        await montar([], []);
        await clicar('Novo grupo');
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/pessoas'), { pessoas: [] });
        await tela.atualizar();
        const campo = tela.elemento.querySelector<HTMLInputElement>('input[aria-label="Nome do grupo"]')!;
        campo.value = 'Time';
        campo.dispatchEvent(new Event('input'));
        await tela.atualizar();
        await clicar('Criar grupo');
        responderErro(esperarRequisicao(tela.http, 'POST', '/mensagem-direta/grupo'), 400, 'Há pessoas que não existem ou estão inativas');
        await tela.atualizar();
        expect(texto()).toContain('Há pessoas que não existem ou estão inativas');
        expect(estado.visao()).toBe('GRUPO_NOVO');
    });

    it('as pessoas da criação mostram carregando, erro com "Tentar de novo" e o estado sem ninguém', async () => {
        await montar([], []);
        await clicar('Novo grupo');
        await tela.atualizar();
        expect(tela.elemento.querySelector('.pessoas-grupo [aria-busy="true"]')).not.toBeNull();
        responderErro(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/pessoas'), 500, 'falhou');
        await tela.atualizar();
        expect(texto()).toContain('Não foi possível carregar as pessoas.');
        await clicar('Tentar de novo');
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/pessoas'), { pessoas: [] });
        await tela.atualizar();
        expect(texto()).toContain('Não há outras pessoas para escolher.');
    });

    // --- detalhes ---------------------------------------------------------------------------------

    async function abrirDetalhes() {
        await montar();
        await abrirOGrupo();
        responderSucesso(esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/grupo/7/leitura'), { grupoId: 7, conversaId: 'G7', lidaAteData: '2026-10-21T14:07:00.000Z' });
        estado.abrirDetalhesDoGrupo();
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/pessoas'), {
            pessoas: [
                { usuarioId: 9, usuarioNome: 'Camila Duarte', tipo: TipoUsuarioEnum.DESENVOLVEDOR, online: false, corAvatar: '#2563EB' },
                { usuarioId: 12, usuarioNome: 'Davi Rocha', tipo: TipoUsuarioEnum.DESENVOLVEDOR, online: false, corAvatar: null },
                { usuarioId: 15, usuarioNome: 'Elisa Prado', tipo: TipoUsuarioEnum.DESENVOLVEDOR, online: false, corAvatar: null },
            ],
        });
        await tela.atualizar();
    }

    it('os detalhes mostram só os membros atuais e quem ainda pode entrar', async () => {
        await abrirDetalhes();
        expect(texto()).toContain('Detalhes do grupo');
        expect(texto()).toContain('3 membros');
        expect(texto()).toContain('(você)');
        const candidatas = Array.from(tela.elemento.querySelectorAll('.pessoas-grupo__linha')).map((linha) => linha.textContent ?? '');
        expect(candidatas).toHaveLength(1);
        expect(candidatas[0]).toContain('Elisa Prado');
    });

    it('renomear manda só o que mudou, e o nome novo aparece no cabeçalho', async () => {
        await abrirDetalhes();
        expect(botao('Salvar alterações')?.disabled).toBe(true);
        const campo = tela.elemento.querySelector<HTMLInputElement>('input[aria-label="Nome do grupo"]')!;
        campo.value = 'Backend & amigos';
        campo.dispatchEvent(new Event('input'));
        await tela.atualizar();
        expect(botao('Salvar alterações')?.disabled).toBe(false);
        await clicar('Salvar alterações');
        const alteracao = esperarRequisicao(tela.http, 'PATCH', '/mensagem-direta/grupo/7');
        expect(alteracao.request.body).toEqual({ nome: 'Backend & amigos' });
        responderSucesso(alteracao, { grupo: grupoDaLista(7, 'Backend & amigos') });
        await tela.atualizar();
        expect(estado.grupoEstado.grupos()[0].nome).toBe('Backend & amigos');
        expect(botao('Salvar alterações')?.disabled).toBe(true);
    });

    it('trocar para a cor automática e tirar o emoji manda null', async () => {
        await montar([grupoDaLista(7, 'Time', { corAvatar: '#2563EB', emojiAvatar: '🚀' })]);
        await abrirOGrupo();
        responderSucesso(esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/grupo/7/leitura'), { grupoId: 7, conversaId: 'G7', lidaAteData: '2026-10-21T14:07:00.000Z' });
        estado.abrirDetalhesDoGrupo();
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/pessoas'), { pessoas: [] });
        await tela.atualizar();
        await clicar('Automática');
        await clicar('Aa');
        await clicar('Salvar alterações');
        const alteracao = esperarRequisicao(tela.http, 'PATCH', '/mensagem-direta/grupo/7');
        expect(alteracao.request.body).toEqual({ corAvatar: null, emojiAvatar: null });
        responderSucesso(alteracao, { grupo: grupoDaLista(7, 'Time') });
    });

    it('adicionar pessoas manda as escolhidas e atualiza a lista de membros', async () => {
        await abrirDetalhes();
        tela.elemento.querySelector<HTMLButtonElement>('.pessoas-grupo__linha')!.click();
        await tela.atualizar();
        await clicar('Adicionar pessoa');
        const adicao = esperarRequisicao(tela.http, 'POST', '/mensagem-direta/grupo/7/membros');
        expect(adicao.request.body).toEqual({ usuarioIds: [15] });
        responderSucesso(adicao, { grupo: grupoDaLista(7, 'Time do backend', { membros: [membro(1, 'Eu'), membro(9, 'Camila Duarte'), membro(12, 'Davi Rocha'), membro(15, 'Elisa Prado')] }), adicionadosUsuarioIds: [15] }, 201);
        await tela.atualizar();
        expect(texto()).toContain('4 membros');
        expect(tela.elemento.querySelectorAll('.pessoas-grupo__linha')).toHaveLength(0);
    });

    it('sair pede confirmação e o último membro é avisado de que o grupo fecha', async () => {
        await montar([grupoDaLista(7, 'Time do backend', { membros: [membro(1, 'Eu')] })]);
        await abrirOGrupo();
        responderSucesso(esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/grupo/7/leitura'), { grupoId: 7, conversaId: 'G7', lidaAteData: '2026-10-21T14:07:00.000Z' });
        estado.abrirDetalhesDoGrupo(true);
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/pessoas'), { pessoas: [] });
        await tela.atualizar();
        expect(tela.elemento.querySelector('.detalhes-grupo__confirmacao')?.textContent).toContain('ele é encerrado');
        await tela.atualizar();
        tela.http.expectNone((requisicao) => requisicao.method === 'DELETE');
        const confirmar = Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('.detalhes-grupo__confirmacao button')).find((candidato) => candidato.textContent?.includes('Sair do grupo'))!;
        confirmar.click();
        await tela.atualizar();
        const saida = esperarRequisicao(tela.http, 'DELETE', '/mensagem-direta/grupo/7/membro');
        responderSucesso(saida, { grupoId: 7, grupoEncerrado: true });
        await tela.atualizar();
        expect(estado.visao()).toBe('LISTA');
        expect(estado.grupoEstado.grupos()).toHaveLength(0);
    });

    it('o item Sair do menu abre os detalhes já com a confirmação; cancelar fecha só a confirmação', async () => {
        await abrirDetalhes();
        expect(tela.elemento.querySelector('.detalhes-grupo__confirmacao')).toBeNull();
        await clicar('Sair do grupo');
        expect(tela.elemento.querySelector('.detalhes-grupo__confirmacao')?.textContent).toContain('Sair de “Time do backend”?');
        await clicar('Cancelar');
        expect(tela.elemento.querySelector('.detalhes-grupo__confirmacao')).toBeNull();
        expect(estado.visao()).toBe('GRUPO_DETALHES');
    });

    it('silenciar o grupo muda na hora e volta se o servidor recusar', async () => {
        await montar();
        await abrirOGrupo();
        responderSucesso(esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/grupo/7/leitura'), { grupoId: 7, conversaId: 'G7', lidaAteData: '2026-10-21T14:07:00.000Z' });
        await clicar('Silenciar os avisos deste grupo');
        expect(estado.grupoEstado.grupos()[0].silenciada).toBe(true);
        const silencio = esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/grupo/7/silencio');
        expect(silencio.request.body).toEqual({ silenciada: true });
        responderErro(silencio, 500, 'falhou');
        await tela.atualizar();
        expect(estado.grupoEstado.grupos()[0].silenciada).toBe(false);
    });
});
