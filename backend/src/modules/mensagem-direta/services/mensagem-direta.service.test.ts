import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
    AutorMensagemDiretaEnum,
    LIMITE_PADRAO_DA_CONVERSA_DIRETA,
    MensagemDiretaResumoDto,
    PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA,
    PosicaoBarraChatEnum,
    PosicaoPopupChatEnum,
    ReferenciaMensagemDiretaEnum,
    TipoUsuarioEnum,
} from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { MarcadorDeLeituraRegistrado } from '../repositories/mensagem-direta-leitura.repository';
import { MensagemDiretaService } from './mensagem-direta.service';

// A service do chat entre colaboradores (task 208) com dublês: a regra e a permissão (remetente sempre do token, destinatário ativo, menções e
// referências, leitura que não passa do agora, busca restrita a quem busca). O SQL é provado nos testes de integração.

const ANA = { sub: 4, login: 'ana', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const GESTOR = { sub: 1, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;
const BRUNO_ID = 9;
const UUID = '7F0C2B9E-4C1A-4E6A-9D55-2F6C0D1B8A10';

function mensagem(parcial: Partial<MensagemDiretaResumoDto> = {}): MensagemDiretaResumoDto {
    return {
        mensagemId: UUID.toLowerCase(),
        conversaId: '4-9',
        autor: AutorMensagemDiretaEnum.USUARIO,
        autorUsuarioId: 4,
        texto: 'oi',
        contemCodigo: false,
        mencoes: [],
        referencias: [],
        respondeA: null,
        createdDate: new Date('2026-10-21T14:00:00.000Z'),
        editadaDate: null, reacoes: [], chamadaPorUsuarioId: null, propostaIds: [],
        ...parcial,
    };
}

interface Cenario {
    usuarios?: Record<number, { ativo?: boolean; nomeCompleto?: string; corAvatar?: string | null }>;
    /** Ids de pessoas excluídas: não são recuperadas, mas ainda existem (o histórico continua). */
    excluidos?: number[];
    demandaVisivel?: boolean;
    atividadeDemandaId?: number | null;
    atividadeComAcesso?: boolean;
    jaExistia?: boolean;
    /** As mensagens que `recuperarMensagem` encontra, por id (cada uma já com a conversa dela). */
    originais?: MensagemDiretaResumoDto[];
    /** `alterarMensagem` não acha a mensagem (outra conversa, outro autor ou sumiu entre a leitura e a gravação). */
    edicaoNaoAchada?: boolean;
    /** As reações já gravadas na tabela (o dublê guarda as mudanças nela, como o banco: uma por pessoa por mensagem). */
    reacoes?: { mensagemId: string; usuarioId: number; reacao: string }[];
    marcadores?: MarcadorDeLeituraRegistrado[];
    marcadorDoOutro?: MarcadorDeLeituraRegistrado | null;
    conversas?: { conversaId: string; participantes: number[]; totalMensagens: number; ultimaMensagem: MensagemDiretaResumoDto }[];
    naoLidas?: Record<string, number>;
    preferencia?: unknown;
    online?: number[];
    ativos?: { id: number; nome: string; tipo?: TipoUsuarioEnum; corAvatar?: string | null }[];
    demandasAchadas?: { id: number; projetoId: number; nome: string; status: string }[];
    atividadesAchadas?: { id: number; nome: string; status: string; demandaId: number; nomeDemanda: string; projetoId: number }[];
    /** As mensagens do Chat IA do remetente (task 329), lidas pelo armazenamento do chat. */
    chatMensagens?: { id: string; conversaId: string; autor: string; texto: string }[];
    /** Os grupos da pessoa (task 246): a service da lista só os repassa. */
    grupos?: { grupoId: number; nome: string }[];
}

function montar(cenario: Cenario = {}) {
    const chamadas: Record<string, unknown[]> = {};
    const registrar = (nome: string, argumento: unknown) => { (chamadas[nome] ??= []).push(argumento); };
    const usuarios = cenario.usuarios ?? { [BRUNO_ID]: {} };

    const armazenamento = {
        gravar: async (nova: { mensagemId: string }) => { registrar('gravar', nova); return { mensagem: mensagem({ mensagemId: nova.mensagemId }), jaExistia: cenario.jaExistia ?? false }; },
        recuperarMensagem: async (consulta: { conversaId: string; mensagemId: string }) => {
            registrar('recuperarMensagem', consulta);
            return (cenario.originais ?? []).find((original) => original.mensagemId === consulta.mensagemId && original.conversaId === consulta.conversaId) ?? null;
        },
        alterarMensagem: async (alteracao: { mensagemId: string; texto: string }) => {
            registrar('alterarMensagem', alteracao);
            const original = (cenario.originais ?? []).find((item) => item.mensagemId === alteracao.mensagemId);
            return cenario.edicaoNaoAchada ? null : mensagem({ ...original, texto: alteracao.texto, editadaDate: new Date('2026-10-21T14:20:00.000Z') });
        },
        listarConversa: async (consulta: unknown) => { registrar('listarConversa', consulta); return { mensagens: [mensagem()], proximoCursor: 'abc' }; },
        listarConversasDoUsuario: async (consulta: unknown) => { registrar('listarConversasDoUsuario', consulta); return cenario.conversas ?? []; },
        contarNaoLidas: async (consulta: unknown) => { registrar('contarNaoLidas', consulta); return cenario.naoLidas ?? {}; },
        buscar: async (consulta: unknown) => { registrar('buscar', consulta); return [mensagem()]; },
    };
    const leitura = {
        listarMarcadores: async () => cenario.marcadores ?? [],
        recuperarMarcador: async (dto: unknown) => { registrar('recuperarMarcador', dto); return cenario.marcadorDoOutro ?? null; },
        alterarLeitura: async (dto: { lidaAteDate: Date; conversaId: string; outroUsuarioId: number }) => {
            registrar('alterarLeitura', dto);
            return { conversaId: dto.conversaId, outroUsuarioId: dto.outroUsuarioId, lidaAteDate: dto.lidaAteDate, silenciada: false };
        },
        alterarSilencio: async (dto: { conversaId: string; outroUsuarioId: number; silenciada: boolean }) => {
            registrar('alterarSilencio', dto);
            return { conversaId: dto.conversaId, outroUsuarioId: dto.outroUsuarioId, lidaAteDate: null, silenciada: dto.silenciada };
        },
    };
    const preferencia = {
        recuperar: async () => cenario.preferencia ?? null,
        alterar: async (dto: unknown) => { registrar('alterarPreferencia', dto); return dto; },
    };
    const reacoesGravadas = [...(cenario.reacoes ?? [])];
    const reacao = {
        listarPorMensagens: async (dto: { mensagemIds: string[] }) => { registrar('listarReacoes', dto); return reacoesGravadas.filter((item) => dto.mensagemIds.includes(item.mensagemId)); },
        definir: async (dto: { mensagemId: string; usuarioId: number; reacao: string }) => {
            registrar('definirReacao', dto);
            const indice = reacoesGravadas.findIndex((item) => item.mensagemId === dto.mensagemId && item.usuarioId === dto.usuarioId);
            if (indice >= 0) reacoesGravadas[indice] = { mensagemId: dto.mensagemId, usuarioId: dto.usuarioId, reacao: dto.reacao };
            else reacoesGravadas.push({ mensagemId: dto.mensagemId, usuarioId: dto.usuarioId, reacao: dto.reacao });
            return { mensagemId: dto.mensagemId, usuarioId: dto.usuarioId, reacao: dto.reacao };
        },
        remover: async (dto: { mensagemId: string; usuarioId: number }) => {
            registrar('removerReacao', dto);
            const indice = reacoesGravadas.findIndex((item) => item.mensagemId === dto.mensagemId && item.usuarioId === dto.usuarioId);
            if (indice >= 0) reacoesGravadas.splice(indice, 1);
        },
    };
    const usuario = {
        validarExistenciaIncluindoExcluido: async ({ id }: { id: number }) => id in usuarios || (cenario.excluidos ?? []).includes(id),
        recuperar: async ({ id }: { id: number }) => {
            const encontrado = usuarios[id];
            return encontrado ? { id, ativo: encontrado.ativo ?? true, nomeCompleto: encontrado.nomeCompleto ?? `Pessoa ${id}` } : null;
        },
        listarAtivos: async () => (cenario.ativos ?? []).map((item) => ({ id: item.id, nomeCompleto: item.nome, tipo: item.tipo ?? TipoUsuarioEnum.DESENVOLVEDOR, corAvatar: item.corAvatar ?? null })),
        listarNomesPorIds: async ({ usuarioIds }: { usuarioIds: number[] }) =>
            usuarioIds.filter((id) => usuarios[id]).map((id) => ({ id, nomeCompleto: usuarios[id].nomeCompleto ?? `Pessoa ${id}`, corAvatar: usuarios[id].corAvatar ?? null })),
    };
    const demanda = {
        recuperar: async (dto: unknown, filtro: unknown) => { registrar('demanda', { dto, filtro }); return cenario.demandaVisivel === false ? null : { id: 1, nome: 'Corrigir filtro', status: 'DESENVOLVENDO', projetoId: 5 }; },
        buscarPorNome: async (consulta: unknown) => { registrar('buscaDemanda', consulta); return cenario.demandasAchadas ?? []; },
    };
    const atividade = {
        recuperar: async () => (cenario.atividadeDemandaId === null ? null : { demandaId: cenario.atividadeDemandaId ?? 77, nome: 'Tela de login', status: 'PENDENTE', projetoId: 5, nomeDemanda: 'Autenticação' }),
        buscarPorNome: async (consulta: unknown) => { registrar('buscaAtividade', consulta); return cenario.atividadesAchadas ?? []; },
        validarAcessoDemanda: async (dto: unknown) => { registrar('acessoDemanda', dto); return cenario.atividadeComAcesso ?? true; },
    };

    const eventos = {
        publicarParaUsuarios: async (dto: unknown) => { registrar('publicar', dto); },
        listarUsuariosOnline: () => new Set(cenario.online ?? []),
    };

    const iaChatDireto = {
        atenderSeChamada: async (dto: unknown) => { registrar('ia', dto); },
    };

    const propostaIa = {
        recuperarParaParticipante: async (dto: { id: number; chamadaPorUsuarioId: number }, usuarioAtivo: { sub: number }) => {
            registrar('proposta', { dto, usuarioAtivo });
            return { propostaId: dto.id, acessivel: true, podeResolver: usuarioAtivo.sub === dto.chamadaPorUsuarioId, proposta: { id: dto.id } };
        },
    };

    const service = new MensagemDiretaService(
        armazenamento as never, leitura as never, preferencia as never, reacao as never, usuario as never, demanda as never, atividade as never, eventos as never, iaChatDireto as never,
        propostaIa as never,
        {
            listarResumos: async () => (cenario.grupos ?? []),
            listarGrupoIdsDoUsuario: async () => (cenario.grupos ?? []).map((grupo) => grupo.grupoId),
            enviarRespostaDaIa: async (dto: unknown) => { registrar('grupoRespostaIa', dto); return { sucesso: true, dados: { mensagem: mensagem(), jaExistia: false }, mensagem: 'ok' }; },
        } as never,
        {
            listarConversa: async (consulta: { conversaId: string; usuarioId: number }) => {
                registrar('listarChat', consulta);
                return (cenario.chatMensagens ?? []).filter((item) => item.conversaId === consulta.conversaId);
            },
        } as never,
    );
    return { service, chamadas };
}

/** A recusa é uma `BusinessException` cuja mensagem (no corpo da resposta) casa com o padrão. */
const recusaComMensagem = (promessa: Promise<unknown>, padrao: RegExp) =>
    assert.rejects(promessa, (erro: unknown) => erro instanceof BusinessException && padrao.test(JSON.stringify(erro.getResponse())));

const envio = (parcial: Record<string, unknown> = {}) => ({ destinatarioId: BRUNO_ID, mensagemId: UUID, texto: 'oi', ...parcial }) as never;

// --- enviar ----------------------------------------------------------------

test('enviarMensagem: o remetente e a conversa vêm do token e do par; o mensagemId é gravado em minúsculas', async () => {
    const { service, chamadas } = montar();
    const resposta = await service.enviarMensagem(envio(), ANA);

    assert.equal(resposta.sucesso, true);
    assert.equal(resposta.dados!.jaExistia, false);
    assert.deepEqual(chamadas.gravar[0], {
        mensagemId: UUID.toLowerCase(),
        conversaId: '4-9',
        autor: AutorMensagemDiretaEnum.USUARIO,
        autorUsuarioId: 4,
        texto: 'oi',
        contemCodigo: false,
        mencoes: [],
        referencias: [],
        respondeA: null,
    });
});

test('enviarMensagem: contemCodigo vem do Markdown, nunca do cliente', async () => {
    const { service, chamadas } = montar();
    await service.enviarMensagem(envio({ texto: 'veja\n\n```ts\nconst a = 1;\n```', contemCodigo: false }), ANA);
    await service.enviarMensagem(envio({ texto: 'só `inline` aqui', contemCodigo: true }), ANA);
    assert.equal((chamadas.gravar[0] as { contemCodigo: boolean }).contemCodigo, true);
    assert.equal((chamadas.gravar[1] as { contemCodigo: boolean }).contemCodigo, false);
});

const ORIGINAL_ID = '11111111-2222-4333-8444-555555555555';
const doBruno = (parcial: Partial<MensagemDiretaResumoDto> = {}) =>
    mensagem({ mensagemId: ORIGINAL_ID, autorUsuarioId: BRUNO_ID, texto: 'Subi o **ajuste** do cadastro', ...parcial });

test('enviarMensagem: a resposta monta a citação no servidor, com o autor e o trecho da original', async () => {
    const { service, chamadas } = montar({ originais: [doBruno()] });
    await service.enviarMensagem(envio({ respondeAMensagemId: ORIGINAL_ID.toUpperCase() }), ANA);
    assert.deepEqual(chamadas.recuperarMensagem[0], { conversaId: '4-9', mensagemId: ORIGINAL_ID.toUpperCase() });
    assert.deepEqual((chamadas.gravar[0] as { respondeA: unknown }).respondeA, {
        mensagemId: ORIGINAL_ID,
        autorUsuarioId: BRUNO_ID,
        trecho: 'Subi o ajuste do cadastro',
    });
});

test('enviarMensagem: o cliente não consegue impor autor nem trecho da citação', async () => {
    const { service, chamadas } = montar({ originais: [doBruno()] });
    await service.enviarMensagem(envio({ respondeAMensagemId: ORIGINAL_ID, respondeA: { mensagemId: ORIGINAL_ID, autorUsuarioId: 1, trecho: 'inventado' } }), ANA);
    const gravada = chamadas.gravar[0] as { respondeA: { autorUsuarioId: number; trecho: string } };
    assert.equal(gravada.respondeA.autorUsuarioId, BRUNO_ID);
    assert.notEqual(gravada.respondeA.trecho, 'inventado');
});

test('enviarMensagem: recusa responder a mensagem inexistente, de outra conversa ou do sistema — e não grava', async () => {
    const inexistente = montar();
    await recusaComMensagem(inexistente.service.enviarMensagem(envio({ respondeAMensagemId: ORIGINAL_ID }), ANA), /não existe nesta conversa/);
    assert.equal(inexistente.chamadas.gravar, undefined);

    const deOutraConversa = montar({ originais: [doBruno({ conversaId: '4-12' })] });
    await recusaComMensagem(deOutraConversa.service.enviarMensagem(envio({ respondeAMensagemId: ORIGINAL_ID }), ANA), /não existe nesta conversa/);
    assert.equal(deOutraConversa.chamadas.gravar, undefined);

    const doSistema = montar({ originais: [doBruno({ autor: AutorMensagemDiretaEnum.SISTEMA, autorUsuarioId: null })] });
    await recusaComMensagem(doSistema.service.enviarMensagem(envio({ respondeAMensagemId: ORIGINAL_ID }), ANA), /não existe nesta conversa/);
    assert.equal(doSistema.chamadas.gravar, undefined);
});

test('enviarMensagem: sem respondeAMensagemId não consulta a original', async () => {
    const { service, chamadas } = montar();
    await service.enviarMensagem(envio(), ANA);
    assert.equal(chamadas.recuperarMensagem, undefined);
});

test('enviarMensagem: a mensagem nova vai ao @IA (task 315) com quem a escreveu; o reenvio não', async () => {
    const { service, chamadas } = montar();
    await service.enviarMensagem(envio({ texto: '@IA cria a atividade' }), ANA);
    assert.equal(chamadas.ia?.length, 1);
    const avaliada = chamadas.ia![0] as { mensagem: MensagemDiretaResumoDto; usuarioAtivo: unknown };
    assert.equal(avaliada.usuarioAtivo, ANA);
    assert.equal(avaliada.mensagem.autorUsuarioId, 4);

    const reenvio = montar({ jaExistia: true });
    await reenvio.service.enviarMensagem(envio(), ANA);
    assert.equal(reenvio.chamadas.ia, undefined);
});

test('recuperarProposta: lê a proposta da resposta da IA desta conversa, com o dono sendo quem chamou', async () => {
    const daIa = mensagem({ autor: AutorMensagemDiretaEnum.IA, autorUsuarioId: null, chamadaPorUsuarioId: BRUNO_ID, propostaIds: [31, 32] });
    const { service, chamadas } = montar({ originais: [daIa] });
    const resposta = await service.recuperarProposta({ usuarioId: BRUNO_ID, mensagemId: daIa.mensagemId, propostaId: 32 }, ANA);
    assert.deepEqual(chamadas.proposta, [{ dto: { id: 32, chamadaPorUsuarioId: BRUNO_ID }, usuarioAtivo: ANA }]);
    assert.equal(resposta.dados!.podeResolver, false, 'Ana não chamou a IA');
});

test('recuperarProposta: 404 quando a proposta não está na mensagem, a mensagem não é da IA ou não é desta conversa', async () => {
    const daIa = mensagem({ autor: AutorMensagemDiretaEnum.IA, autorUsuarioId: null, chamadaPorUsuarioId: 4, propostaIds: [31] });
    const daPessoa = mensagem({ mensagemId: '11111111-2222-4333-8444-555555555555', propostaIds: [31] });
    const deOutraConversa = mensagem({ mensagemId: '22222222-2222-4333-8444-555555555555', conversaId: '4-12', autor: AutorMensagemDiretaEnum.IA, autorUsuarioId: null, chamadaPorUsuarioId: 4, propostaIds: [31] });
    const { service, chamadas } = montar({ originais: [daIa, daPessoa, deOutraConversa] });
    await assert.rejects(service.recuperarProposta({ usuarioId: BRUNO_ID, mensagemId: daIa.mensagemId, propostaId: 99 }, ANA), ResourceNotFoundException);
    await assert.rejects(service.recuperarProposta({ usuarioId: BRUNO_ID, mensagemId: daPessoa.mensagemId, propostaId: 31 }, ANA), ResourceNotFoundException);
    await assert.rejects(service.recuperarProposta({ usuarioId: BRUNO_ID, mensagemId: deOutraConversa.mensagemId, propostaId: 31 }, ANA), ResourceNotFoundException);
    assert.equal(chamadas.proposta, undefined, 'nenhuma proposta foi lida');
});

test('enviarMensagem: reenviar devolve jaExistia com a mensagem já gravada', async () => {
    const { service } = montar({ jaExistia: true });
    const resposta = await service.enviarMensagem(envio(), ANA);
    assert.equal(resposta.dados!.jaExistia, true);
    assert.equal(resposta.mensagem, 'Mensagem já enviada');
});

test('enviarMensagem: recusa enviar para si mesmo, para quem não existe e para usuário inativo — e não grava', async () => {
    const proprio = montar();
    await assert.rejects(proprio.service.enviarMensagem(envio({ destinatarioId: 4 }), ANA), BusinessException);
    assert.equal(proprio.chamadas.gravar, undefined);

    const inexistente = montar({ usuarios: {} });
    await assert.rejects(inexistente.service.enviarMensagem(envio(), ANA), ResourceNotFoundException);

    const inativo = montar({ usuarios: { [BRUNO_ID]: { ativo: false } } });
    await recusaComMensagem(inativo.service.enviarMensagem(envio(), ANA), /inativo/);
    assert.equal(inativo.chamadas.gravar, undefined);
});

test('enviarMensagem: menção só aos dois participantes, sem repetição', async () => {
    const boa = montar();
    await boa.service.enviarMensagem(envio({ mencoes: [9, 9, 4] }), ANA);
    assert.deepEqual((boa.chamadas.gravar[0] as { mencoes: number[] }).mencoes, [9, 4]);

    const ruim = montar();
    await assert.rejects(ruim.service.enviarMensagem(envio({ mencoes: [12] }), ANA), BusinessException);
    assert.equal(ruim.chamadas.gravar, undefined);
});

test('enviarMensagem: o desenvolvedor só referencia a demanda e a atividade que ele vê; gestor vê tudo', async () => {
    const demanda = { tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: 212 };
    const atividade = { tipo: ReferenciaMensagemDiretaEnum.ATIVIDADE, id: 57 };

    const semDemanda = montar({ demandaVisivel: false });
    await recusaComMensagem(semDemanda.service.enviarMensagem(envio({ referencias: [demanda] }), ANA), /demanda 212/);

    const semAtividade = montar({ atividadeDemandaId: null });
    await recusaComMensagem(semAtividade.service.enviarMensagem(envio({ referencias: [atividade] }), ANA), /atividade 57/);

    const semAcesso = montar({ atividadeComAcesso: false });
    await recusaComMensagem(semAcesso.service.enviarMensagem(envio({ referencias: [atividade] }), ANA), /atividade 57/);
    assert.deepEqual(semAcesso.chamadas.acessoDemanda[0], { demandaId: 77, usuarioId: 4 });

    const dev = montar();
    await dev.service.enviarMensagem(envio({ referencias: [demanda, atividade, demanda] }), ANA);
    assert.deepEqual((dev.chamadas.demanda[0] as { filtro: unknown }).filtro, { usuarioId: 4 });
    assert.deepEqual((dev.chamadas.gravar[0] as { referencias: unknown[] }).referencias, [demanda, atividade]);

    const gestor = montar({ demandaVisivel: true, atividadeComAcesso: false });
    await gestor.service.enviarMensagem(envio({ referencias: [demanda, atividade] }), GESTOR);
    assert.equal((gestor.chamadas.demanda[0] as { filtro: unknown }).filtro, undefined);
    assert.equal(gestor.chamadas.acessoDemanda, undefined);
});

// --- ler -------------------------------------------------------------------

test('listarConversa: usa o limite padrão, repassa o cursor e traz até onde o OUTRO leu', async () => {
    const lidaAteDate = new Date('2026-10-21T13:00:00.000Z');
    const { service, chamadas } = montar({ marcadorDoOutro: { conversaId: '4-9', outroUsuarioId: 4, lidaAteDate, silenciada: false } });
    const resposta = await service.listarConversa({ usuarioId: BRUNO_ID, cursor: 'c1' }, ANA);

    assert.deepEqual(chamadas.listarConversa[0], { conversaId: '4-9', cursor: 'c1', limite: LIMITE_PADRAO_DA_CONVERSA_DIRETA });
    assert.deepEqual(chamadas.recuperarMarcador[0], { conversaId: '4-9', usuarioId: BRUNO_ID });
    assert.equal(resposta.dados!.proximoCursor, 'abc');
    assert.equal(resposta.dados!.lidaAteDate, lidaAteDate);
});

test('listarConversa: sem marcador do outro o "Lida" é nulo; consigo mesmo ou com quem não existe, recusa', async () => {
    const { service } = montar();
    assert.equal((await service.listarConversa({ usuarioId: BRUNO_ID, limite: 5 }, ANA)).dados!.lidaAteDate, null);
    await assert.rejects(service.listarConversa({ usuarioId: 4 }, ANA), BusinessException);
    await assert.rejects(montar({ usuarios: {} }).service.listarConversa({ usuarioId: BRUNO_ID }, ANA), ResourceNotFoundException);
});

test('listarConversas: nome, não lidas e silêncio por conversa; pessoa removida vira "Usuário removido"; sem conversa não consulta nada', async () => {
    const vazio = montar();
    assert.deepEqual((await vazio.service.listarConversas(ANA)).dados, { conversas: [], grupos: [] });
    assert.equal(vazio.chamadas.contarNaoLidas, undefined);

    const lidaAteDate = new Date('2026-10-21T10:00:00.000Z');
    const { service, chamadas } = montar({
        usuarios: { [BRUNO_ID]: { nomeCompleto: 'Bruno', corAvatar: '#FDE047' } },
        conversas: [
            { conversaId: '4-9', participantes: [4, 9], totalMensagens: 3, ultimaMensagem: mensagem() },
            { conversaId: '4-15', participantes: [4, 15], totalMensagens: 1, ultimaMensagem: mensagem({ conversaId: '4-15' }) },
        ],
        marcadores: [{ conversaId: '4-9', outroUsuarioId: 9, lidaAteDate, silenciada: true }],
        naoLidas: { '4-9': 2, '4-15': 1 },
    });
    const { conversas } = (await service.listarConversas(ANA)).dados!;

    assert.deepEqual(chamadas.contarNaoLidas[0], {
        usuarioId: 4,
        marcadores: [{ conversaId: '4-9', lidaAteDate }, { conversaId: '4-15', lidaAteDate: null }],
    });
    assert.deepEqual(conversas.map((c) => [c.usuarioId, c.usuarioNome, c.naoLidas, c.silenciada]), [[9, 'Bruno', 2, true], [15, 'Usuário removido', 1, false]]);
    assert.deepEqual(conversas.map((c) => c.corAvatar), ['#FDE047', null]);
});

test('buscar: sempre como a pessoa do token, com o período convertido e o filtro de código', async () => {
    const { service, chamadas } = montar();
    await service.buscar({ texto: 'cadastro', inicio: '2026-10-01T00:00:00.000Z', somenteCodigo: true }, ANA);
    const consulta = chamadas.buscar[0] as { usuarioId: number; inicio: Date; fim?: Date; somenteCodigo: boolean };
    assert.equal(consulta.usuarioId, 4);
    assert.equal(consulta.inicio.toISOString(), '2026-10-01T00:00:00.000Z');
    assert.equal(consulta.fim, undefined);
    assert.equal(consulta.somenteCodigo, true);
    await assert.rejects(service.buscar({ texto: 'x', inicio: '2026-11-01T00:00:00.000Z', fim: '2026-10-01T00:00:00.000Z' }, ANA), BusinessException);
});

// --- leitura, silêncio e preferências -----------------------------------------

test('alterarLeitura: grava para a pessoa do token na conversa do par e limita a data ao agora', async () => {
    const { service, chamadas } = montar();
    const resposta = await service.alterarLeitura({ usuarioId: BRUNO_ID, lidaAteDate: '2999-01-01T00:00:00.000Z' }, ANA);
    const gravada = chamadas.alterarLeitura[0] as { conversaId: string; usuarioId: number; outroUsuarioId: number; lidaAteDate: Date };

    assert.equal(gravada.conversaId, '4-9');
    assert.equal(gravada.usuarioId, 4);
    assert.equal(gravada.outroUsuarioId, BRUNO_ID);
    assert.ok(gravada.lidaAteDate.getTime() <= Date.now());
    assert.equal(resposta.dados!.conversaId, '4-9');
    await assert.rejects(service.alterarLeitura({ usuarioId: 4, lidaAteDate: '2026-10-21T10:00:00.000Z' }, ANA), BusinessException);
});

test('alterarLeitura: pessoa inativa ainda pode ter a conversa lida (o histórico continua dos dois)', async () => {
    const { service } = montar({ usuarios: { [BRUNO_ID]: { ativo: false } } });
    const resposta = await service.alterarLeitura({ usuarioId: BRUNO_ID, lidaAteDate: '2026-10-21T10:00:00.000Z' }, ANA);
    assert.equal(resposta.sucesso, true);
});

test('alterarSilencio: silencia e reativa a conversa do próprio usuário', async () => {
    const { service, chamadas } = montar();
    assert.deepEqual((await service.alterarSilencio({ usuarioId: BRUNO_ID, silenciada: true }, ANA)).dados, { conversaId: '4-9', silenciada: true });
    assert.deepEqual((await service.alterarSilencio({ usuarioId: BRUNO_ID, silenciada: false }, ANA)).dados, { conversaId: '4-9', silenciada: false });
    assert.equal((chamadas.alterarSilencio[0] as { usuarioId: number }).usuarioId, 4);
});

test('recuperarPreferencia: sem linha gravada vale o padrão do shared (uma cópia, não o objeto compartilhado)', async () => {
    const { service } = montar();
    const { dados } = await service.recuperarPreferencia(ANA);
    assert.deepEqual(dados, PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA);
    assert.notEqual(dados, PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA);

    const gravada = { avisosAtivos: false, avisoDesktopAtivo: false, somAtivo: true, silenciadoAteDate: null, atalhoGlobal: 'Alt+F1', posicaoPopup: PosicaoPopupChatEnum.CENTRO, posicaoBarra: PosicaoBarraChatEnum.DIREITA };
    assert.deepEqual((await montar({ preferencia: gravada }).service.recuperarPreferencia(ANA)).dados, gravada);

    // Linha anterior à task 221: a coluna da posição é nula e vale o padrão do shared.
    const antiga = { ...gravada, posicaoPopup: null, posicaoBarra: null };
    const recuperada = (await montar({ preferencia: antiga }).service.recuperarPreferencia(ANA)).dados!;
    assert.equal(recuperada.posicaoPopup, PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA.posicaoPopup);
    assert.equal(recuperada.posicaoBarra, PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA.posicaoBarra, 'linha anterior à task 318: a barra fica à esquerda');
});

test('alterarPreferencia: grava para a pessoa do token, convertendo o fim do silêncio; data inválida é recusada', async () => {
    const { service, chamadas } = montar();
    const dto = { avisosAtivos: true, avisoDesktopAtivo: false, somAtivo: true, silenciadoAteDate: '2026-10-21T16:00:00.000Z', atalhoGlobal: 'Alt+F1', posicaoPopup: PosicaoPopupChatEnum.CANTO_SUPERIOR_ESQUERDO, posicaoBarra: PosicaoBarraChatEnum.ABAIXO };
    await service.alterarPreferencia(dto, ANA);
    const gravada = chamadas.alterarPreferencia[0] as { usuarioId: number; silenciadoAteDate: Date; posicaoPopup: string; posicaoBarra: string };
    assert.equal(gravada.usuarioId, 4);
    assert.equal(gravada.posicaoPopup, PosicaoPopupChatEnum.CANTO_SUPERIOR_ESQUERDO);
    assert.equal(gravada.posicaoBarra, PosicaoBarraChatEnum.ABAIXO);
    assert.equal(gravada.silenciadoAteDate.toISOString(), '2026-10-21T16:00:00.000Z');

    await service.alterarPreferencia({ ...dto, silenciadoAteDate: null }, ANA);
    assert.equal((chamadas.alterarPreferencia[1] as { silenciadoAteDate: Date | null }).silenciadoAteDate, null);
    await assert.rejects(service.alterarPreferencia({ ...dto, silenciadoAteDate: 'amanhã' }, ANA), BusinessException);
});

test('pessoa excluída: a conversa continua abrindo, lendo e silenciando; só enviar é recusado', async () => {
    const { service, chamadas } = montar({ usuarios: {}, excluidos: [BRUNO_ID] });

    assert.equal((await service.listarConversa({ usuarioId: BRUNO_ID }, ANA)).sucesso, true);
    assert.equal((await service.alterarLeitura({ usuarioId: BRUNO_ID, lidaAteDate: '2026-10-21T10:00:00.000Z' }, ANA)).sucesso, true);
    assert.equal((await service.alterarSilencio({ usuarioId: BRUNO_ID, silenciada: true }, ANA)).sucesso, true);
    await assert.rejects(service.enviarMensagem(envio(), ANA), ResourceNotFoundException);
    assert.equal(chamadas.gravar, undefined);
});

// --- tempo real (task 209) -----------------------------------------------------

test('enviarMensagem: avisa o remetente e o destinatário com a mensagem gravada, uma vez', async () => {
    const { service, chamadas } = montar();
    const resposta = await service.enviarMensagem(envio(), ANA);

    assert.equal(chamadas.publicar.length, 1);
    assert.deepEqual(chamadas.publicar[0], { usuarioIds: [4, BRUNO_ID], evento: { tipo: 'MENSAGEM', mensagem: resposta.dados!.mensagem } });
});

test('enviarMensagem: o reenvio de uma mensagem que já estava gravada não avisa de novo', async () => {
    const { service, chamadas } = montar({ jaExistia: true });
    await service.enviarMensagem(envio(), ANA);
    assert.equal(chamadas.publicar, undefined);
});

test('enviarMensagem recusada não avisa ninguém', async () => {
    const { service, chamadas } = montar({ usuarios: {} });
    await assert.rejects(service.enviarMensagem(envio(), ANA));
    assert.equal(chamadas.publicar, undefined);
});

test('alterarLeitura: avisa as duas pontas com quem leu e até quando ficou gravado', async () => {
    const { service, chamadas } = montar();
    const resposta = await service.alterarLeitura({ usuarioId: BRUNO_ID, lidaAteDate: '2026-10-21T10:00:00.000Z' }, ANA);

    assert.deepEqual(chamadas.publicar[0], {
        usuarioIds: [4, BRUNO_ID],
        evento: { tipo: 'LEITURA', conversaId: '4-9', usuarioId: 4, lidaAteDate: resposta.dados!.lidaAteDate },
    });
});

test('avisarDigitacao: só a outra pessoa recebe o aviso, com quem digita e a conversa', async () => {
    const { service, chamadas } = montar();
    const resposta = await service.avisarDigitacao({ usuarioId: BRUNO_ID }, ANA);

    assert.equal(resposta.sucesso, true);
    assert.deepEqual(chamadas.publicar, [{ usuarioIds: [BRUNO_ID], evento: { tipo: 'DIGITANDO', conversaId: '4-9', usuarioId: 4 } }]);
});

test('avisarDigitacao: para si mesmo ou para quem não existe é recusado e não avisa ninguém', async () => {
    const { service, chamadas } = montar({ usuarios: {} });
    await assert.rejects(service.avisarDigitacao({ usuarioId: 4 }, ANA));
    await assert.rejects(service.avisarDigitacao({ usuarioId: 999 }, ANA));
    assert.equal(chamadas.publicar, undefined);
});

test('listarConversas: online vem da presença global', async () => {
    const { service } = montar({
        online: [BRUNO_ID],
        usuarios: { [BRUNO_ID]: {}, 15: {} },
        conversas: [
            { conversaId: '4-9', participantes: [4, 9], totalMensagens: 1, ultimaMensagem: mensagem() },
            { conversaId: '4-15', participantes: [4, 15], totalMensagens: 1, ultimaMensagem: mensagem({ conversaId: '4-15' }) },
        ],
    });
    const { conversas } = (await service.listarConversas(ANA)).dados!;
    assert.deepEqual(conversas.map((c) => [c.usuarioId, c.online]), [[9, true], [15, false]]);
});

test('listarPessoas: as ativas, menos quem pergunta, com tipo e presença — para qualquer tipo de usuário', async () => {
    const { service } = montar({
        online: [9],
        ativos: [{ id: 4, nome: 'Ana' }, { id: 9, nome: 'Bruno', corAvatar: '#1E3A8A' }, { id: 15, nome: 'Carla', tipo: TipoUsuarioEnum.GESTOR }],
    });
    for (const quem of [ANA, GESTOR]) {
        const { pessoas } = (await service.listarPessoas(quem)).dados!;
        assert.equal(pessoas.some((pessoa) => pessoa.usuarioId === (quem as { sub: number }).sub), false);
    }
    const { pessoas } = (await service.listarPessoas(ANA)).dados!;
    assert.deepEqual(pessoas, [
        { usuarioId: 9, usuarioNome: 'Bruno', tipo: TipoUsuarioEnum.DESENVOLVEDOR, online: true, corAvatar: '#1E3A8A' },
        { usuarioId: 15, usuarioNome: 'Carla', tipo: TipoUsuarioEnum.GESTOR, online: false, corAvatar: null },
    ]);
});

// --- referências: sugestões e cartão (task 211) ----------------------------------------------------

test('buscarReferencias: o desenvolvedor busca só no que vê (usuarioId); gestor e administrador, sem restrição; demandas e atividades juntas', async () => {
    const cenario = {
        demandasAchadas: [{ id: 212, projetoId: 5, nome: 'Corrigir filtro', status: 'DESENVOLVENDO' }],
        atividadesAchadas: [{ id: 57, nome: 'Filtro de tags', status: 'PENDENTE', demandaId: 212, nomeDemanda: 'Corrigir filtro', projetoId: 5 }],
    };
    const dev = montar(cenario);
    const resposta = await dev.service.buscarReferencias({ texto: '  filtro ' }, ANA);
    assert.deepEqual(dev.chamadas.buscaDemanda[0], { texto: 'filtro', usuarioId: 4, limite: 8 });
    assert.deepEqual(dev.chamadas.buscaAtividade[0], { texto: 'filtro', usuarioId: 4, limite: 8 });
    assert.deepEqual(resposta.dados!.referencias, [
        { tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: 212, nome: 'Corrigir filtro', situacao: 'DESENVOLVENDO', demandaNome: null },
        { tipo: ReferenciaMensagemDiretaEnum.ATIVIDADE, id: 57, nome: 'Filtro de tags', situacao: 'PENDENTE', demandaNome: 'Corrigir filtro' },
    ]);

    const gestor = montar(cenario);
    await gestor.service.buscarReferencias({ texto: 'filtro' }, GESTOR);
    assert.equal((gestor.chamadas.buscaDemanda[0] as { usuarioId: number | null }).usuarioId, null);
    assert.equal((gestor.chamadas.buscaAtividade[0] as { usuarioId: number | null }).usuarioId, null);
});

test('recuperarReferencia: quem tem acesso recebe o cartão; sem acesso ou inexistente, acessivel=false e NENHUM dado (o título não vaza)', async () => {
    const demanda = await montar().service.recuperarReferencia({ tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: 212 }, ANA);
    assert.deepEqual(demanda.dados, {
        tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: 212, acessivel: true, nome: 'Corrigir filtro', situacao: 'DESENVOLVENDO', projetoId: 5, demandaId: null, demandaNome: null,
    });

    const atividade = await montar().service.recuperarReferencia({ tipo: ReferenciaMensagemDiretaEnum.ATIVIDADE, id: 57 }, ANA);
    assert.deepEqual(atividade.dados, {
        tipo: ReferenciaMensagemDiretaEnum.ATIVIDADE, id: 57, acessivel: true, nome: 'Tela de login', situacao: 'PENDENTE', projetoId: 5, demandaId: 77, demandaNome: 'Autenticação',
    });

    const bloqueada = { acessivel: false, nome: null, situacao: null, projetoId: null, demandaId: null, demandaNome: null };
    assert.deepEqual((await montar({ demandaVisivel: false }).service.recuperarReferencia({ tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: 212 }, ANA)).dados, { tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: 212, ...bloqueada });
    assert.deepEqual((await montar({ atividadeComAcesso: false }).service.recuperarReferencia({ tipo: ReferenciaMensagemDiretaEnum.ATIVIDADE, id: 57 }, ANA)).dados, { tipo: ReferenciaMensagemDiretaEnum.ATIVIDADE, id: 57, ...bloqueada });
    assert.deepEqual((await montar({ atividadeDemandaId: null }).service.recuperarReferencia({ tipo: ReferenciaMensagemDiretaEnum.ATIVIDADE, id: 9 }, ANA)).dados, { tipo: ReferenciaMensagemDiretaEnum.ATIVIDADE, id: 9, ...bloqueada });
});

test('recuperarReferencia: o gestor vê a atividade mesmo sem atribuição à demanda', async () => {
    const { service, chamadas } = montar({ atividadeComAcesso: false });
    const { dados } = await service.recuperarReferencia({ tipo: ReferenciaMensagemDiretaEnum.ATIVIDADE, id: 57 }, GESTOR);
    assert.equal(dados!.acessivel, true);
    assert.equal(chamadas.acessoDemanda, undefined);
});

// --- editar (task 313) -----------------------------------------------------

const edicao = (parcial: Record<string, unknown> = {}) => ({ destinatarioId: BRUNO_ID, mensagemId: UUID.toLowerCase(), texto: 'texto corrigido', ...parcial }) as never;
/** A mensagem da Ana (id 4) para o Bruno, enviada às 14:00 UTC; o relógio dos testes é fixado em torno dela. */
const DA_ANA = () => mensagem({ texto: 'texto original' });

test('alterarMensagem: o autor edita dentro de 1 hora; grava para a conversa do par, avisa as duas pontas e devolve "editada"', async (contexto) => {
    contexto.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-21T14:30:00.000Z') });
    const { service, chamadas } = montar({ originais: [DA_ANA()] });
    const resposta = await service.alterarMensagem(edicao({ texto: 'Veja ```ts\nconst a = 1;\n``` agora' }), ANA);

    assert.equal(resposta.sucesso, true);
    assert.equal(resposta.dados!.mensagem.texto, 'Veja ```ts\nconst a = 1;\n``` agora');
    assert.ok(resposta.dados!.mensagem.editadaDate instanceof Date);
    const gravada = chamadas.alterarMensagem[0] as { conversaId: string; autorUsuarioId: number; contemCodigo: boolean; mensagemId: string };
    assert.equal(gravada.conversaId, '4-9');
    assert.equal(gravada.autorUsuarioId, 4, 'o autor vem do token');
    assert.equal(gravada.contemCodigo, true, 'recalcula o que deriva do texto');
    assert.equal(gravada.mensagemId, UUID.toLowerCase());
    const evento = chamadas.publicar[0] as { usuarioIds: number[]; evento: { tipo: string } };
    assert.deepEqual(evento.usuarioIds, [4, 9]);
    assert.equal(evento.evento.tipo, 'EDICAO');
});

test('alterarMensagem: no limite de 1 hora ainda edita; um instante depois recusa e não grava', async (contexto) => {
    contexto.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-21T15:00:00.000Z') });
    const noLimite = montar({ originais: [DA_ANA()] });
    assert.equal((await noLimite.service.alterarMensagem(edicao(), ANA)).sucesso, true);

    contexto.mock.timers.setTime(new Date('2026-10-21T15:00:00.001Z').getTime());
    const passou = montar({ originais: [DA_ANA()] });
    await recusaComMensagem(passou.service.alterarMensagem(edicao(), ANA), /prazo de 1 hora/i);
    assert.equal(passou.chamadas.alterarMensagem, undefined);
    assert.equal(passou.chamadas.publicar, undefined);
});

test('alterarMensagem: só o autor edita (o outro lado recebe 403) e a mensagem do sistema não se edita', async (contexto) => {
    contexto.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-21T14:10:00.000Z') });
    const doBruno = montar({ originais: [DA_ANA()], usuarios: { 4: {}, 9: {} } });
    const BRUNO_TOKEN = { sub: 9, login: 'bruno', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
    await assert.rejects(doBruno.service.alterarMensagem({ destinatarioId: 4, mensagemId: UUID.toLowerCase(), texto: 'x' } as never, BRUNO_TOKEN), (erro: unknown) => erro instanceof UnauthorizedAccessException);
    assert.equal(doBruno.chamadas.alterarMensagem, undefined);

    const doSistema = montar({ originais: [mensagem({ autor: AutorMensagemDiretaEnum.SISTEMA, autorUsuarioId: null })] });
    await recusaComMensagem(doSistema.service.alterarMensagem(edicao(), ANA), /sistema/i);
});

test('alterarMensagem: mensagem de outra conversa ou inexistente é "não encontrada"; a pessoa de si mesma e a inexistente são recusadas', async (contexto) => {
    contexto.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-21T14:10:00.000Z') });
    const { service, chamadas } = montar({ originais: [mensagem({ conversaId: '4-12' })] });
    await assert.rejects(service.alterarMensagem(edicao(), ANA), (erro: unknown) => erro instanceof ResourceNotFoundException);
    await recusaComMensagem(service.alterarMensagem(edicao({ destinatarioId: 4 }), ANA), /outra pessoa/i);
    await assert.rejects(service.alterarMensagem(edicao({ destinatarioId: 77 }), ANA), (erro: unknown) => erro instanceof ResourceNotFoundException);
    assert.equal(chamadas.alterarMensagem, undefined);
});

test('alterarMensagem: texto igual ao atual não grava nem avisa', async (contexto) => {
    contexto.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-21T14:10:00.000Z') });
    const { service, chamadas } = montar({ originais: [DA_ANA()] });
    const resposta = await service.alterarMensagem(edicao({ texto: 'texto original' }), ANA);
    assert.equal(resposta.sucesso, true);
    assert.equal(resposta.dados!.mensagem.editadaDate, null);
    assert.equal(chamadas.alterarMensagem, undefined);
    assert.equal(chamadas.publicar, undefined);
});

test('alterarMensagem: se a mensagem some entre a leitura e a gravação, é "não encontrada" e ninguém é avisado', async (contexto) => {
    contexto.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-21T14:10:00.000Z') });
    const { service, chamadas } = montar({ originais: [DA_ANA()], edicaoNaoAchada: true });
    await assert.rejects(service.alterarMensagem(edicao(), ANA), (erro: unknown) => erro instanceof ResourceNotFoundException);
    assert.equal(chamadas.publicar, undefined);
});

// --- reagir (task 314) -----------------------------------------------------

const reacao = (parcial: Record<string, unknown> = {}) => ({ destinatarioId: 4, mensagemId: UUID.toLowerCase(), reacao: '👍', ...parcial }) as never;
const AMBOS = { 4: {}, [BRUNO_ID]: {} };
const BRUNO_TOKEN = { sub: BRUNO_ID, login: 'bruno', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

test('reagirMensagem: grava a reação de quem reage, devolve a lista e avisa as duas pontas com o autor e a reação nova', async () => {
    const { service, chamadas } = montar({ usuarios: AMBOS, originais: [DA_ANA()] });
    const resposta = await service.reagirMensagem(reacao({ reacao: '🎉' }), BRUNO_TOKEN);

    assert.deepEqual(chamadas.definirReacao, [{ mensagemId: UUID.toLowerCase(), conversaId: '4-9', usuarioId: BRUNO_ID, reacao: '🎉' }]);
    assert.deepEqual(resposta.dados, { mensagemId: UUID.toLowerCase(), reacoes: [{ usuarioId: BRUNO_ID, reacao: '🎉' }] });
    const publicado = chamadas.publicar[0] as { usuarioIds: number[]; evento: Record<string, unknown> };
    assert.deepEqual(publicado.usuarioIds, [BRUNO_ID, 4]);
    assert.deepEqual(publicado.evento, {
        tipo: 'REACAO', conversaId: '4-9', mensagemId: UUID.toLowerCase(), reacoes: [{ usuarioId: BRUNO_ID, reacao: '🎉' }], reatorUsuarioId: BRUNO_ID, autorUsuarioId: 4, reacao: '🎉',
    });
});

test('reagirMensagem: outro emoji troca a reação; o mesmo de novo (ou null) remove, e a remoção avisa com reacao null', async () => {
    const { service, chamadas } = montar({ usuarios: AMBOS, originais: [DA_ANA()], reacoes: [{ mensagemId: UUID.toLowerCase(), usuarioId: BRUNO_ID, reacao: '👍' }] });

    const troca = await service.reagirMensagem(reacao({ reacao: '❤️' }), BRUNO_TOKEN);
    assert.deepEqual(troca.dados!.reacoes, [{ usuarioId: BRUNO_ID, reacao: '❤️' }]);

    const mesma = await service.reagirMensagem(reacao({ reacao: '❤️' }), BRUNO_TOKEN);
    assert.deepEqual(mesma.dados!.reacoes, []);
    assert.equal(chamadas.removerReacao.length, 1);
    const aviso = (chamadas.publicar[1] as { evento: { reacao: string | null } }).evento;
    assert.equal(aviso.reacao, null, 'remover não avisa o autor: o cliente só avisa quando há reação nova');

    await service.reagirMensagem(reacao({ reacao: '😂' }), BRUNO_TOKEN);
    const semReacao = await service.reagirMensagem(reacao({ reacao: null }), BRUNO_TOKEN);
    assert.deepEqual(semReacao.dados!.reacoes, []);
});

test('reagirMensagem: o autor pode reagir à própria mensagem, e as duas pessoas ficam na lista', async () => {
    const { service } = montar({ usuarios: AMBOS, originais: [DA_ANA()], reacoes: [{ mensagemId: UUID.toLowerCase(), usuarioId: BRUNO_ID, reacao: '👍' }] });
    const resposta = await service.reagirMensagem(reacao({ destinatarioId: BRUNO_ID, reacao: '🙏' }), ANA);
    assert.deepEqual(resposta.dados!.reacoes, [{ usuarioId: BRUNO_ID, reacao: '👍' }, { usuarioId: 4, reacao: '🙏' }]);
});

test('reagirMensagem: recusa o que não é um emoji, a mensagem do sistema, a de outra conversa, a inexistente e a pessoa de si mesma — e não grava nem avisa', async () => {
    const sistema = mensagem({ autor: AutorMensagemDiretaEnum.SISTEMA, autorUsuarioId: null });
    const comEmojiInvalido = montar({ usuarios: AMBOS, originais: [DA_ANA()] });
    await recusaComMensagem(comEmojiInvalido.service.reagirMensagem(reacao({ reacao: 'oi' }), BRUNO_TOKEN), /único emoji/i);
    await recusaComMensagem(comEmojiInvalido.service.reagirMensagem(reacao({ reacao: '👍👍' }), BRUNO_TOKEN), /único emoji/i);
    await recusaComMensagem(comEmojiInvalido.service.reagirMensagem(reacao({ destinatarioId: BRUNO_ID }), BRUNO_TOKEN), /outra pessoa/i);

    const doSistema = montar({ usuarios: AMBOS, originais: [sistema] });
    await recusaComMensagem(doSistema.service.reagirMensagem(reacao(), BRUNO_TOKEN), /sistema/i);

    const deOutraConversa = montar({ usuarios: AMBOS, originais: [mensagem({ conversaId: '4-12' })] });
    await assert.rejects(deOutraConversa.service.reagirMensagem(reacao(), BRUNO_TOKEN), (erro: unknown) => erro instanceof ResourceNotFoundException);
    await assert.rejects(deOutraConversa.service.reagirMensagem(reacao({ destinatarioId: 77 }), BRUNO_TOKEN), (erro: unknown) => erro instanceof ResourceNotFoundException);

    for (const { chamadas } of [comEmojiInvalido, doSistema, deOutraConversa]) {
        assert.equal(chamadas.definirReacao, undefined);
        assert.equal(chamadas.removerReacao, undefined);
        assert.equal(chamadas.publicar, undefined);
    }
});

test('listarConversa: junta as reações às mensagens da página numa consulta só; mensagem sem reação fica com lista vazia', async () => {
    const { service, chamadas } = montar({ reacoes: [{ mensagemId: UUID.toLowerCase(), usuarioId: BRUNO_ID, reacao: '👍' }] });
    const { dados } = await service.listarConversa({ usuarioId: BRUNO_ID } as never, ANA);
    assert.deepEqual(dados!.mensagens[0].reacoes, [{ usuarioId: BRUNO_ID, reacao: '👍' }]);
    assert.equal(chamadas.listarReacoes.length, 1);
    assert.deepEqual((chamadas.listarReacoes[0] as { mensagemIds: string[] }).mensagemIds, [UUID.toLowerCase()]);

    const vazia = montar();
    assert.deepEqual((await vazia.service.listarConversa({ usuarioId: BRUNO_ID } as never, ANA)).dados!.mensagens[0].reacoes, []);
});

test('alterarMensagem: a mensagem editada devolve e avisa com as reações que ela já tem', async (contexto) => {
    contexto.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-21T14:10:00.000Z') });
    const { service, chamadas } = montar({ usuarios: AMBOS, originais: [DA_ANA()], reacoes: [{ mensagemId: UUID.toLowerCase(), usuarioId: BRUNO_ID, reacao: '👍' }] });
    const resposta = await service.alterarMensagem(edicao(), ANA);
    assert.deepEqual(resposta.dados!.mensagem.reacoes, [{ usuarioId: BRUNO_ID, reacao: '👍' }]);
    assert.deepEqual((chamadas.publicar[0] as { evento: { mensagem: { reacoes: unknown } } }).evento.mensagem.reacoes, [{ usuarioId: BRUNO_ID, reacao: '👍' }]);
});

// --- grupos (task 246) -------------------------------------------------------

test('listarConversas: os grupos da pessoa vão na mesma resposta, mesmo sem nenhuma conversa um a um', async () => {
    const { service } = montar({ grupos: [{ grupoId: 7, nome: 'Backend' }, { grupoId: 3, nome: 'Front' }] });
    const dados = (await service.listarConversas(ANA)).dados!;
    assert.deepEqual(dados.conversas, []);
    assert.deepEqual(dados.grupos.map((grupo) => grupo.grupoId), [7, 3]);
});

test('listarConversas: com conversas um a um os grupos continuam na resposta', async () => {
    const { service } = montar({
        grupos: [{ grupoId: 7, nome: 'Backend' }],
        conversas: [{ conversaId: '4-9', participantes: [4, 9], totalMensagens: 1, ultimaMensagem: mensagem() }],
        usuarios: { [BRUNO_ID]: {} },
    });
    const dados = (await service.listarConversas(ANA)).dados!;
    assert.equal(dados.conversas.length, 1);
    assert.deepEqual(dados.grupos.map((grupo) => grupo.grupoId), [7]);
});

test('buscar: manda ao armazenamento os grupos de que a pessoa é membro agora, e só eles', async () => {
    const { service, chamadas } = montar({ grupos: [{ grupoId: 7, nome: 'Backend' }, { grupoId: 3, nome: 'Front' }] });
    await service.buscar({ texto: 'balanço' }, ANA);
    const consulta = chamadas.buscar[0] as { usuarioId: number; grupoIds: number[] };
    assert.equal(consulta.usuarioId, 4);
    assert.deepEqual(consulta.grupoIds, [7, 3]);

    const semGrupos = montar();
    await semGrupos.service.buscar({ texto: 'balanço' }, ANA);
    assert.deepEqual((semGrupos.chamadas.buscar[0] as { grupoIds: number[] }).grupoIds, []);
});

// --- enviar a resposta da IA do Chat IA (task 329) ----------------------------

const CONVERSA_DA_IA = '4-2026-11-13';
const IA_ID = 'chat-ia-1';
const NOTA_UUID = '1A2B3C4D-5E6F-4A8B-9C0D-1E2F3A4B5C6D';
const respostaIa = (parcial: Record<string, unknown> = {}) => ({ conversaId: CONVERSA_DA_IA, chatMensagemId: IA_ID, destinatarioId: BRUNO_ID, mensagemId: UUID, ...parcial }) as never;
const chatComResposta = [{ id: IA_ID, conversaId: CONVERSA_DA_IA, autor: 'IA', texto: 'Use `let`.' }, { id: 'chat-usuario-1', conversaId: CONVERSA_DA_IA, autor: 'USUARIO', texto: 'pergunta' }];

test('enviarRespostaDaIa: grava como IA, chamada pelo remetente, com o texto lido do Chat IA e sem proposta nem menção', async () => {
    const { service, chamadas } = montar({ chatMensagens: chatComResposta });
    const resposta = await service.enviarRespostaDaIa(respostaIa({ texto: 'forjado pelo cliente' }), ANA);

    assert.equal(resposta.sucesso, true);
    assert.deepEqual(chamadas.listarChat[0], { conversaId: CONVERSA_DA_IA, usuarioId: 4 });
    assert.deepEqual(chamadas.gravar[0], {
        mensagemId: UUID.toLowerCase(),
        conversaId: '4-9',
        autor: AutorMensagemDiretaEnum.IA,
        autorUsuarioId: null,
        texto: 'Use `let`.',
        contemCodigo: false,
        mencoes: [],
        referencias: [],
        chamadaPorUsuarioId: 4,
        propostaIds: [],
    });
    assert.deepEqual((chamadas.publicar[0] as { usuarioIds: number[] }).usuarioIds, [4, BRUNO_ID]);
    assert.equal(chamadas.ia, undefined, 'a resposta encaminhada não chama a IA');
});

test('enviarRespostaDaIa: a nota vai antes, como mensagem comum do remetente', async () => {
    const { service, chamadas } = montar({ chatMensagens: chatComResposta });
    await service.enviarRespostaDaIa(respostaIa({ nota: '  olha isso  ', notaMensagemId: NOTA_UUID }), ANA);

    assert.equal(chamadas.gravar.length, 2);
    assert.deepEqual(
        chamadas.gravar.map((item) => (item as { autor: string }).autor),
        [AutorMensagemDiretaEnum.USUARIO, AutorMensagemDiretaEnum.IA],
    );
    assert.equal((chamadas.gravar[0] as { texto: string }).texto, 'olha isso');
    assert.equal((chamadas.gravar[0] as { mensagemId: string }).mensagemId, NOTA_UUID.toLowerCase());
});

test('enviarRespostaDaIa: nota sem identificador, destino duplo ou ausente são recusados antes de gravar', async () => {
    const { service, chamadas } = montar({ chatMensagens: chatComResposta });
    await recusaComMensagem(service.enviarRespostaDaIa(respostaIa({ nota: 'oi' }), ANA), /identificador/);
    await recusaComMensagem(service.enviarRespostaDaIa(respostaIa({ grupoId: 3 }), ANA), /pessoa ou um grupo/);
    await recusaComMensagem(service.enviarRespostaDaIa(respostaIa({ destinatarioId: undefined }), ANA), /pessoa ou um grupo/);
    assert.equal(chamadas.gravar, undefined);
});

test('enviarRespostaDaIa: só a resposta da IA da conversa do próprio remetente; o resto é "não encontrada"', async () => {
    const { service, chamadas } = montar({ chatMensagens: [...chatComResposta, { id: 'outra', conversaId: '9-2026-11-13', autor: 'IA', texto: 'de outro' }] });
    await assert.rejects(service.enviarRespostaDaIa(respostaIa({ chatMensagemId: 'chat-usuario-1' }), ANA), ResourceNotFoundException);
    await assert.rejects(service.enviarRespostaDaIa(respostaIa({ chatMensagemId: 'não existe' }), ANA), ResourceNotFoundException);
    await assert.rejects(service.enviarRespostaDaIa(respostaIa({ conversaId: '9-2026-11-13', chatMensagemId: 'outra' }), ANA), ResourceNotFoundException);
    assert.equal(chamadas.gravar, undefined);
});

test('enviarRespostaDaIa: destinatário inativo é recusado e resposta longa demais não cabe', async () => {
    const inativo = montar({ usuarios: { [BRUNO_ID]: { ativo: false } }, chatMensagens: chatComResposta });
    await recusaComMensagem(inativo.service.enviarRespostaDaIa(respostaIa(), ANA), /inativo/);
    assert.equal(inativo.chamadas.gravar, undefined);

    const longa = montar({ chatMensagens: [{ id: IA_ID, conversaId: CONVERSA_DA_IA, autor: 'IA', texto: 'x'.repeat(10_001) }] });
    await recusaComMensagem(longa.service.enviarRespostaDaIa(respostaIa(), ANA), /não cabe/);
});

test('enviarRespostaDaIa: para um grupo ou canal, a service do grupo recebe o texto lido do servidor', async () => {
    const { service, chamadas } = montar({ chatMensagens: chatComResposta });
    await service.enviarRespostaDaIa(respostaIa({ destinatarioId: undefined, grupoId: 7, nota: 'time', notaMensagemId: NOTA_UUID }), ANA);

    assert.deepEqual(chamadas.grupoRespostaIa[0], { grupoId: 7, mensagemId: UUID, texto: 'Use `let`.', nota: 'time', notaMensagemId: NOTA_UUID });
    assert.equal(chamadas.gravar, undefined);
});
