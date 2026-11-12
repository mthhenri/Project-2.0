import { describe, expect, it } from 'vitest';
import { AutorMensagemDiretaEnum, GrupoResumoDto, TipoGrupoEnum, TipoUsuarioEnum } from '@project20/shared';
import {
    GrupoNaLista,
    MembroNoGrupo,
    aplicarMensagemNosGrupos,
    autorDaPreviaDoGrupo,
    coresDosMembros,
    filtrarGruposPorNome,
    grupoIdDaConversa,
    montarItensDaLista,
    nomeDoAutorNoGrupo,
    normalizarGrupo,
    pessoasParaAdicionar,
    rotuloDosMembros,
    totalNaoLidasDosGrupos,
    zerarNaoLidasDoGrupo,
} from './grupo.util';
import { ConversaNaLista, MensagemNaConversa } from './mensagem-direta.util';

const membro = (usuarioId: number, usuarioNome: string, corAvatar: string | null = null): MembroNoGrupo => ({
    usuarioId, usuarioNome, tipo: TipoUsuarioEnum.DESENVOLVEDOR, corAvatar, entradaData: new Date('2026-11-01T10:00:00.000Z'), online: false,
});

function mensagem(parcial: Partial<MensagemNaConversa> = {}): MensagemNaConversa {
    return {
        mensagemId: 'm1', conversaId: 'G7', autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId: 9, texto: 'oi', contemCodigo: false, mencoes: [], referencias: [],
        respondeA: null, createdDate: new Date('2026-11-02T10:00:00.000Z'), editadaDate: null, reacoes: [], chamadaPorUsuarioId: null, propostaIds: [], situacao: 'ENVIADA',
        ...parcial,
    };
}

function grupo(grupoId: number, parcial: Partial<GrupoNaLista> = {}): GrupoNaLista {
    return {
        grupoId, conversaId: `G${grupoId}`, nome: `Grupo ${grupoId}`, tipo: TipoGrupoEnum.LIVRE, corAvatar: null, emojiAvatar: null, criadorUsuarioId: 1,
        membros: [membro(1, 'Eu'), membro(9, 'Camila Duarte')], ultimaMensagem: null, naoLidas: 0, silenciada: false, privado: false, leituraPorSupervisao: false,
        ...parcial,
    };
}

function conversa(usuarioId: number, instante: string | null, parcial: Partial<ConversaNaLista> = {}): ConversaNaLista {
    return {
        conversaId: `1-${usuarioId}`, usuarioId, usuarioNome: `Pessoa ${usuarioId}`, corAvatar: null, naoLidas: 0, silenciada: false, online: false,
        ultimaMensagem: instante ? { ...mensagem({ conversaId: `1-${usuarioId}`, createdDate: new Date(instante) }), situacao: undefined as never } : null,
        ...parcial,
    } as ConversaNaLista;
}

const comUltima = (instante: string) => ({ ultimaMensagem: { ...mensagem({ createdDate: new Date(instante) }) } as GrupoNaLista['ultimaMensagem'] });

describe('normalizarGrupo', () => {
    it('as datas do servidor viram Date e os campos novos da mensagem têm valor padrão', () => {
        const resumo = {
            grupoId: 7, conversaId: 'G7', nome: 'Backend', tipo: TipoGrupoEnum.LIVRE, corAvatar: '#112233', emojiAvatar: '🚀', criadorUsuarioId: 1,
            membros: [{ usuarioId: 1, usuarioNome: 'Eu', tipo: TipoUsuarioEnum.DESENVOLVEDOR, corAvatar: null, entradaData: '2026-11-01T10:00:00.000Z', online: true }],
            ultimaMensagem: { mensagemId: 'm', conversaId: 'G7', autor: AutorMensagemDiretaEnum.SISTEMA, autorUsuarioId: null, texto: 'criou', contemCodigo: false, mencoes: [], referencias: [], respondeA: null, createdDate: '2026-11-01T10:00:00.000Z', editadaDate: null },
            naoLidas: 0, silenciada: false, privado: false, leituraPorSupervisao: false,
        } as unknown as GrupoResumoDto;
        const normalizado = normalizarGrupo(resumo);
        expect(normalizado.membros[0].entradaData).toBeInstanceOf(Date);
        expect(normalizado.ultimaMensagem?.createdDate).toBeInstanceOf(Date);
        expect(normalizado.ultimaMensagem?.reacoes).toEqual([]);
        expect(normalizado.ultimaMensagem?.propostaIds).toEqual([]);
        expect(normalizarGrupo({ ...resumo, ultimaMensagem: null }).ultimaMensagem).toBeNull();
    });
});

describe('grupoIdDaConversa', () => {
    it('só a conversa G<id> é de grupo', () => {
        expect(grupoIdDaConversa('G7')).toBe(7);
        for (const conversaId of ['1-9', 'G0', 'g7', '', null, undefined]) expect(grupoIdDaConversa(conversaId)).toBeNull();
    });
});

describe('montarItensDaLista', () => {
    it('intercala conversas e grupos pela mensagem mais recente e preserva a ordem de cada lista', () => {
        const itens = montarItensDaLista(
            [conversa(9, '2026-11-03T10:00:00.000Z'), conversa(15, '2026-11-01T10:00:00.000Z')],
            [grupo(7, comUltima('2026-11-02T10:00:00.000Z')), grupo(8, comUltima('2026-11-04T10:00:00.000Z'))],
        );
        expect(itens.map((item) => item.chave)).toEqual(['G8', '1-9', 'G7', '1-15']);
    });

    it('no empate a conversa vem antes do grupo, e o grupo sem mensagem vai por último', () => {
        const itens = montarItensDaLista([conversa(9, '2026-11-03T10:00:00.000Z')], [grupo(7, comUltima('2026-11-03T10:00:00.000Z')), grupo(8)]);
        expect(itens.map((item) => item.chave)).toEqual(['1-9', 'G7', 'G8']);
    });

    it('as conversas fora de ordem mantêm a ordem recebida (a lista do servidor é a verdade)', () => {
        const itens = montarItensDaLista([conversa(9, '2026-11-01T10:00:00.000Z'), conversa(15, '2026-11-03T10:00:00.000Z')], []);
        expect(itens.map((item) => item.chave)).toEqual(['1-9', '1-15']);
    });

    it('listas vazias dão lista vazia', () => {
        expect(montarItensDaLista([], [])).toEqual([]);
    });
});

describe('não lidas dos grupos', () => {
    it('o total soma só os grupos que não estão silenciados', () => {
        expect(totalNaoLidasDosGrupos([grupo(1, { naoLidas: 3 }), grupo(2, { naoLidas: 5, silenciada: true }), grupo(3, { naoLidas: 2 })])).toBe(5);
    });

    it('zerar mexe só no grupo pedido e só se havia não lidas', () => {
        const lista = [grupo(1, { naoLidas: 3 }), grupo(2, { naoLidas: 4 })];
        const depois = zerarNaoLidasDoGrupo(lista, 'G1');
        expect(depois.map((item) => item.naoLidas)).toEqual([0, 4]);
        expect(zerarNaoLidasDoGrupo(depois, 'G1')[1]).toBe(depois[1]);
    });
});

describe('aplicarMensagemNosGrupos', () => {
    it('mensagem de outra pessoa soma uma não lida e vira a última', () => {
        const resultado = aplicarMensagemNosGrupos([grupo(7)], mensagem({ mensagemId: 'nova' }), 1, null);
        expect(resultado.grupoDesconhecido).toBe(false);
        expect(resultado.grupos[0].naoLidas).toBe(1);
        expect(resultado.grupos[0].ultimaMensagem?.mensagemId).toBe('nova');
    });

    it('a minha mensagem, a do sistema e a de um grupo aberto à vista não contam', () => {
        const base = [grupo(7)];
        expect(aplicarMensagemNosGrupos(base, mensagem({ autorUsuarioId: 1 }), 1, null).grupos[0].naoLidas).toBe(0);
        expect(aplicarMensagemNosGrupos(base, mensagem({ autor: AutorMensagemDiretaEnum.SISTEMA, autorUsuarioId: null }), 1, null).grupos[0].naoLidas).toBe(0);
        expect(aplicarMensagemNosGrupos(base, mensagem(), 1, 'G7').grupos[0].naoLidas).toBe(0);
    });

    it('a mesma mensagem recebida duas vezes (evento e resposta do envio) conta uma só', () => {
        const primeira = aplicarMensagemNosGrupos([grupo(7)], mensagem(), 1, null);
        const segunda = aplicarMensagemNosGrupos(primeira.grupos, mensagem(), 1, null);
        expect(segunda.grupos[0].naoLidas).toBe(1);
    });

    it('mensagem mais antiga que a última não a troca', () => {
        const base = [grupo(7, comUltima('2026-11-05T10:00:00.000Z'))];
        const resultado = aplicarMensagemNosGrupos(base, mensagem({ mensagemId: 'antiga', createdDate: new Date('2026-11-01T10:00:00.000Z') }), 1, null);
        expect(resultado.grupos[0].ultimaMensagem?.mensagemId).toBe('m1');
    });

    it('mensagem de grupo que a lista não tem pede para reler a lista', () => {
        const resultado = aplicarMensagemNosGrupos([grupo(7)], mensagem({ conversaId: 'G99' }), 1, null);
        expect(resultado.grupoDesconhecido).toBe(true);
        expect(resultado.grupos).toHaveLength(1);
    });
});

describe('nomes e cores dos membros', () => {
    const membros = [membro(1, 'Eu Mesmo'), membro(9, 'Camila Duarte', '#2563EB'), membro(12, 'Davi Rocha')];

    it('o autor aparece como Você, pelo nome ou, se já saiu, como usuário removido', () => {
        expect(nomeDoAutorNoGrupo(membros, 1, 1)).toBe('Você');
        expect(nomeDoAutorNoGrupo(membros, 9, 1)).toBe('Camila Duarte');
        expect(nomeDoAutorNoGrupo(membros, 77, 1)).toBe('Usuário removido');
        expect(nomeDoAutorNoGrupo(membros, null, 1)).toBe('');
    });

    it('as cores do degradê são só as que os membros escolheram, na ordem de entrada', () => {
        expect(coresDosMembros(membros)).toEqual(['#2563EB']);
        expect(coresDosMembros([membro(1, 'A', '#111111'), membro(2, 'B', null), membro(3, 'C', '#333333')])).toEqual(['#111111', '#333333']);
    });

    it('o rótulo de membros concorda com o número', () => {
        expect(rotuloDosMembros(1)).toBe('1 membro');
        expect(rotuloDosMembros(3)).toBe('3 membros');
    });

    it('quem pode entrar são as pessoas que não são membros', () => {
        const pessoas = [{ usuarioId: 9 }, { usuarioId: 20 }, { usuarioId: 21 }];
        expect(pessoasParaAdicionar(pessoas, membros)).toEqual([{ usuarioId: 20 }, { usuarioId: 21 }]);
    });

    it('a prévia do grupo leva o primeiro nome do autor, e a do sistema não leva nome', () => {
        expect(autorDaPreviaDoGrupo({ autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId: 9 }, membros, 1)).toBe('Camila');
        expect(autorDaPreviaDoGrupo({ autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId: 1 }, membros, 1)).toBe('Você');
        expect(autorDaPreviaDoGrupo({ autor: AutorMensagemDiretaEnum.SISTEMA, autorUsuarioId: null }, membros, 1)).toBeNull();
    });
});

describe('filtrarGruposPorNome', () => {
    const grupos = [{ nome: 'Time do backend' }, { nome: 'Revisão de código' }, { nome: 'Front' }];

    it('ignora acento e maiúsculas e exige todas as palavras', () => {
        expect(filtrarGruposPorNome(grupos, 'REVISAO')).toEqual([{ nome: 'Revisão de código' }]);
        expect(filtrarGruposPorNome(grupos, 'time back')).toEqual([{ nome: 'Time do backend' }]);
        expect(filtrarGruposPorNome(grupos, 'time front')).toEqual([]);
    });

    it('sem busca devolve todos', () => {
        expect(filtrarGruposPorNome(grupos, '  ')).toEqual(grupos);
    });
});
