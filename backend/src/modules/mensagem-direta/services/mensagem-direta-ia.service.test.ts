import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AutorMensagemDiretaEnum, EstadoIaEnum, MensagemDiretaResumoDto, NivelIaEnum, TipoGrupoEnum, TipoUsuarioEnum } from '@project20/shared';
import { IaException } from '../../ia/domain/ia.exception';
import { IaResposta, IaSolicitacao } from '../../ia/domain/ia.tipos';
import { turnoAtual } from '../../ia/domain/turno-ia';
import { MensagemDiretaNova } from '../domain/mensagem-direta.documento';
import { MensagemDiretaIaService } from './mensagem-direta-ia.service';

// O `@IA` do chat entre colaboradores (task 315) com dublês: quem é atendido, com que ferramentas e permissões, o que vai ao modelo, onde fica a
// resposta, o custo e as falhas. O laço de ferramentas é o do chat da IA (os testes dele estão no `ChatService`).

const ANA = { sub: 4, login: 'ana', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const BRUNO_ID = 9;
const CONVERSA = '4-9';

let sequencia = 0;
function mensagem(parcial: Partial<MensagemDiretaResumoDto> = {}): MensagemDiretaResumoDto {
    sequencia++;
    return {
        mensagemId: `00000000-0000-4000-8000-${String(sequencia).padStart(12, '0')}`,
        conversaId: CONVERSA,
        autor: AutorMensagemDiretaEnum.USUARIO,
        autorUsuarioId: 4,
        texto: 'oi',
        contemCodigo: false,
        mencoes: [],
        referencias: [],
        respondeA: null,
        createdDate: new Date(),
        editadaDate: null,
        reacoes: [],
        chamadaPorUsuarioId: null,
        propostaIds: [],
        ...parcial,
    };
}

function resposta(parcial: Partial<IaResposta>): IaResposta {
    const texto = parcial.texto ?? '';
    return {
        texto,
        blocos: parcial.blocos ?? (texto ? [{ tipo: 'texto', texto }] : []),
        nivel: NivelIaEnum.RAPIDO,
        modelo: 'claude-haiku-5-5',
        modeloPlanejado: 'claude-haiku-5-5',
        tokens: { entrada: 100, saida: 20, cache: 3 },
        motivoParada: parcial.motivoParada ?? 'fim',
    };
}

const pedirFerramentas = (...nomes: string[]): IaResposta =>
    resposta({ texto: '', blocos: nomes.map((nome, indice) => ({ tipo: 'uso_ferramenta' as const, id: `uso-${indice}`, nome, entrada: {} })), motivoParada: 'uso_ferramenta' });

interface Cenario {
    /** A conversa antes da mensagem nova, da mais antiga para a mais nova (a nova entra no fim, como o armazenamento a teria). */
    anteriores?: MensagemDiretaResumoDto[];
    estado?: EstadoIaEnum;
    /** As respostas do modelo, uma por volta. */
    respostas?: Array<IaResposta | Error>;
    /** O id da proposta que cada ferramenta cria (sem entrada: a ferramenta é de leitura). */
    propostas?: Record<string, number>;
    /** Segura a primeira chamada ao modelo até o teste soltar. */
    segurar?: Promise<void>;
    /** Os membros do grupo (task 326); padrão: Ana, Bruno e Carla. */
    membros?: number[];
}

function montar(cenario: Cenario = {}) {
    const gravadas: MensagemDiretaNova[] = [];
    const publicados: Array<{ usuarioIds: number[]; evento: { tipo: string } }> = [];
    const solicitacoes: IaSolicitacao[] = [];
    const listasDeFerramentas: unknown[] = [];
    const usos: unknown[] = [];
    const recusadas: number[] = [];
    let conversa: MensagemDiretaResumoDto[] = [...(cenario.anteriores ?? [])];
    let volta = 0;
    const membros = { atuais: cenario.membros ?? [4, BRUNO_ID, 12] };

    const armazenamento = {
        gravar: async (nova: MensagemDiretaNova) => {
            gravadas.push(nova);
            const gravada = mensagem({ ...nova, mensagemId: nova.mensagemId, chamadaPorUsuarioId: nova.chamadaPorUsuarioId ?? null, propostaIds: nova.propostaIds ?? [], respondeA: null });
            conversa = [...conversa, gravada];
            return { mensagem: gravada, jaExistia: false };
        },
        listarConversa: async ({ limite }: { limite: number }) => ({ mensagens: [...conversa].reverse().slice(0, limite), proximoCursor: null }),
    };
    const eventos = { publicarParaUsuarios: async (dto: { usuarioIds: number[]; evento: { tipo: string } }) => { publicados.push(dto); } };
    const usuarios = {
        recuperar: async ({ id }: { id: number }) =>
            id === 4
                ? { id, nomeCompleto: 'Ana Lima', tipo: TipoUsuarioEnum.DESENVOLVEDOR }
                : id === 12
                    ? { id, nomeCompleto: 'Carla Dias', tipo: TipoUsuarioEnum.DESENVOLVEDOR }
                    : { id, nomeCompleto: 'Bruno Reis', tipo: TipoUsuarioEnum.GESTOR },
    };
    const ia = {
        obterEstado: async () => cenario.estado ?? EstadoIaEnum.NO_AR,
        transmitir: async (solicitacao: IaSolicitacao) => {
            solicitacoes.push({ ...solicitacao, mensagens: [...solicitacao.mensagens] });
            if (volta === 0 && cenario.segurar) await cenario.segurar;
            const proxima = (cenario.respostas ?? [resposta({ texto: 'Feito, Ana.' })])[volta++];
            if (proxima instanceof Error) throw proxima;
            turnoAtual()?.registrar(proxima);
            return proxima;
        },
    };
    const ferramentas = {
        listarParaUsuario: (usuario: unknown) => {
            listasDeFerramentas.push(usuario);
            return [{ nome: 'propor_criar_atividade', descricao: 'd', esquemaEntrada: {} }];
        },
        executar: async (nome: string) => {
            const propostaId = cenario.propostas?.[nome];
            return propostaId ? { conteudo: '{}', erro: false, propostaId } : { conteudo: '{}', erro: false };
        },
    };
    const prompts = { obterAtivo: async () => ({ conteudo: 'Você é o assistente.' }) };
    const propostas = { recusar: async (id: number) => { recusadas.push(id); return {}; } };
    const uso = { registrar: async (dto: unknown) => { usos.push(dto); } };

    const service = new MensagemDiretaIaService(
        armazenamento as never, eventos as never, usuarios as never, ia as never, ferramentas as never, prompts as never, propostas as never, uso as never,
    );
    /** Grava a mensagem nova (como a `MensagemDiretaService` já fez) e a entrega ao @IA. */
    const enviar = async (texto: string, autorUsuarioId = 4, extras: Partial<MensagemDiretaResumoDto> = {}) => {
        const nova = mensagem({ texto, autorUsuarioId, ...extras });
        conversa = [...conversa, nova];
        await service.atenderSeChamada({ mensagem: nova, usuarioAtivo: autorUsuarioId === 4 ? ANA : ({ sub: autorUsuarioId, login: 'bruno', tipo: TipoUsuarioEnum.GESTOR } as never) });
    };
    /** Como `enviar`, mas a mensagem é do grupo `G7` (task 326): a service recebe o nome, o tipo e os membros de agora. */
    const enviarNoGrupo = async (texto: string, autorUsuarioId = 4, tipo: TipoGrupoEnum = TipoGrupoEnum.LIVRE, nome = 'Time') => {
        const nova = mensagem({ texto, autorUsuarioId, conversaId: 'G7' });
        conversa = [...conversa, nova];
        await service.atenderSeChamada({
            mensagem: nova,
            usuarioAtivo: autorUsuarioId === 4 ? ANA : ({ sub: autorUsuarioId, login: 'x', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never),
            grupo: { nome, tipo, lerMembrosIds: async () => membros.atuais },
        });
    };
    return { service, enviar, enviarNoGrupo, membros, gravadas, publicados, solicitacoes, listasDeFerramentas, usos, recusadas };
}

test('@IA com pedido: atende quem chamou, com as ferramentas dele, e grava a resposta como mensagem da IA para as duas pontas', async () => {
    const { enviar, gravadas, publicados, solicitacoes, listasDeFerramentas } = montar();
    await enviar('@IA cria uma atividade de revisão');

    assert.equal(solicitacoes.length, 1);
    assert.deepEqual(listasDeFerramentas, [ANA], 'as ferramentas são as de quem chamou');
    assert.equal(solicitacoes[0].nivel, NivelIaEnum.RAPIDO);
    assert.match(solicitacoes[0].instrucoes, /^Você é o assistente\./);
    assert.match(solicitacoes[0].instrucoes, /Quem chamou: Ana Lima \(desenvolvedor\)/);
    assert.match(solicitacoes[0].instrucoes, /Quem mais lê a sua resposta: Bruno Reis \(gestor\)/);
    assert.match(String(solicitacoes[0].mensagens[0].conteudo), /Pedido de Ana Lima:\ncria uma atividade de revisão$/);

    assert.equal(gravadas.length, 1);
    assert.equal(gravadas[0].autor, AutorMensagemDiretaEnum.IA);
    assert.equal(gravadas[0].autorUsuarioId, null);
    assert.equal(gravadas[0].chamadaPorUsuarioId, 4);
    assert.equal(gravadas[0].texto, 'Feito, Ana.');
    assert.deepEqual(gravadas[0].propostaIds, []);

    assert.deepEqual(publicados.map((publicado) => publicado.evento.tipo), ['IA_DIGITANDO', 'MENSAGEM']);
    for (const publicado of publicados) assert.deepEqual(publicado.usuarioIds, [4, BRUNO_ID]);
});

test('o custo vai para quem chamou, com os tokens do turno', async () => {
    const { enviar, usos } = montar({ respostas: [pedirFerramentas('consultar'), resposta({ texto: 'Pronto.' })] });
    await enviar('@IA quanto tempo falta?');
    assert.deepEqual(usos, [{
        usuarioId: 4, descricao: '@IA no chat entre colaboradores', nivel: NivelIaEnum.RAPIDO, modelo: 'claude-haiku-5-5', tokensEntrada: 200, tokensSaida: 40, tokensCache: 6,
    }]);
});

test('várias propostas no mesmo turno vão juntas na resposta', async () => {
    const { enviar, gravadas } = montar({
        respostas: [pedirFerramentas('propor_criar_atividade', 'propor_iniciar_execucao'), resposta({ texto: '' })],
        propostas: { propor_criar_atividade: 31, propor_iniciar_execucao: 32 },
    });
    await enviar('@IA cria a atividade e inicia');
    assert.deepEqual(gravadas[0].propostaIds, [31, 32]);
    assert.equal(gravadas[0].texto, 'Preparei o que você pediu logo abaixo.', 'sem texto do modelo, a resposta nunca fica vazia');
});

test('mensagem sem @IA não chama a IA', async () => {
    const { enviar, solicitacoes, gravadas, publicados } = montar();
    await enviar('bom dia, Bruno');
    assert.equal(solicitacoes.length, 0);
    assert.equal(gravadas.length, 0);
    assert.equal(publicados.length, 0);
});

test('@IA dentro de código não chama a IA', async () => {
    const { enviar, solicitacoes } = montar();
    await enviar('olha o `@IA` no código');
    assert.equal(solicitacoes.length, 0);
});

test('@IA sozinho responde na hora, sem ferramentas, dizendo sobre o que é a mensagem anterior (task 327)', async () => {
    const anterior = mensagem({ texto: 'Dá para criar a atividade de revisão do cadastro?', autorUsuarioId: BRUNO_ID });
    const { enviar, solicitacoes, gravadas, publicados, listasDeFerramentas, usos } = montar({
        anteriores: [anterior],
        respostas: [resposta({ texto: 'Opa, chamou? Sobre a atividade de revisão do cadastro, quer que eu faça isso?' })],
    });
    await enviar('@IA');

    assert.equal(solicitacoes.length, 1);
    assert.deepEqual(solicitacoes[0].ferramentas, [], 'a saudação não usa ferramentas');
    assert.deepEqual(listasDeFerramentas, [], 'nem pede as ferramentas de quem chamou');
    assert.equal(solicitacoes[0].maximoTokens, 300);
    assert.match(solicitacoes[0].instrucoes ?? '', /Chamaram você só com @IA/);
    assert.match(solicitacoes[0].instrucoes ?? '', /Opa, chamou\?/);
    assert.match(String(solicitacoes[0].mensagens[0].conteudo), /Só chamou a IA com @IA, sem escrever o que quer\.\) A mensagem anterior à chamada, de Bruno Reis, é:\nDá para criar a atividade de revisão do cadastro\?$/);
    assert.equal(gravadas.length, 1);
    assert.equal(gravadas[0].autor, AutorMensagemDiretaEnum.IA);
    assert.equal(gravadas[0].chamadaPorUsuarioId, 4);
    assert.match(gravadas[0].texto, /^Opa, chamou\? Sobre a atividade de revisão do cadastro/);
    assert.deepEqual(gravadas[0].propostaIds, []);
    assert.deepEqual(publicados.map((publicado) => publicado.evento.tipo), ['IA_DIGITANDO', 'MENSAGEM']);
    assert.equal(usos.length, 1, 'o custo da saudação vai para quem chamou');
});

test('@IA sozinho numa conversa sem mensagem anterior só pergunta em que pode ajudar', async () => {
    const { enviar, solicitacoes } = montar({ respostas: [resposta({ texto: 'Opa, chamou? Em que posso ajudar?' })] });
    await enviar('@IA');
    assert.match(String(solicitacoes[0].mensagens[0].conteudo), /Não há mensagem anterior de pessoa nesta conversa/);
});

test('a saudação não marca ninguém, mesmo que o modelo escreva @todos', async () => {
    const { enviar, gravadas } = montar({ respostas: [resposta({ texto: 'Opa @todos, chamou? @Bruno Reis' })] });
    await enviar('@IA');
    assert.deepEqual(gravadas[0].mencoes, []);
});

test('depois da saudação, a próxima mensagem de quem chamou é o pedido, mesmo com a da outra pessoa no meio', async () => {
    const { enviar, solicitacoes, gravadas, listasDeFerramentas } = montar({
        respostas: [resposta({ texto: 'Opa, chamou?' }), resposta({ texto: 'Aqui estão as suas atividades.' })],
    });
    await enviar('@IA');
    assert.equal(solicitacoes.length, 1, 'a saudação é a única chamada até aqui');
    await enviar('opa, o que foi?', BRUNO_ID);
    assert.equal(solicitacoes.length, 1, 'a mensagem da outra pessoa não é o pedido');
    await enviar('lista as minhas atividades');
    assert.equal(solicitacoes.length, 2);
    assert.deepEqual(listasDeFerramentas, [ANA], 'o pedido, sim, tem as ferramentas de quem chamou');
    assert.match(String(solicitacoes[1].mensagens[0].conteudo), /\[IA\] Opa, chamou\?/);
    assert.match(String(solicitacoes[1].mensagens[0].conteudo), /Pedido de Ana Lima:\nlista as minhas atividades$/);
    assert.equal(gravadas[1].chamadaPorUsuarioId, 4);
    // Respondido o pedido, a espera acabou: a conversa seguinte é só conversa.
    await enviar('valeu');
    assert.equal(solicitacoes.length, 2);
});

test('@IA sozinho de mais de 10 minutos atrás não espera mais', async () => {
    const antigo = mensagem({ texto: '@IA', createdDate: new Date(Date.now() - 11 * 60_000) });
    const { enviar, solicitacoes } = montar({ anteriores: [antigo] });
    await enviar('lista as minhas atividades');
    assert.equal(solicitacoes.length, 0);
});

test('o contexto leva as 20 mensagens anteriores das duas pessoas e da IA, com nomes, e não as do sistema', async () => {
    const anteriores = [
        ...Array.from({ length: 22 }, (_, indice) => mensagem({ texto: `mensagem ${indice + 1}`, autorUsuarioId: indice % 2 === 0 ? 4 : BRUNO_ID })),
        mensagem({ autor: AutorMensagemDiretaEnum.SISTEMA, autorUsuarioId: null, texto: 'Carla, gestora, leu esta conversa' }),
        mensagem({ autor: AutorMensagemDiretaEnum.IA, autorUsuarioId: null, texto: 'resposta antiga', chamadaPorUsuarioId: BRUNO_ID }),
    ];
    const { enviar, solicitacoes } = montar({ anteriores });
    await enviar('@IA resume');
    const contexto = String(solicitacoes[0].mensagens[0].conteudo);
    assert.doesNotMatch(contexto, /leu esta conversa/);
    assert.match(contexto, /\[IA\] resposta antiga/);
    assert.match(contexto, /\[Bruno Reis\] mensagem 22/);
    assert.match(contexto, /\[Ana Lima\] mensagem 5\n/);
    assert.doesNotMatch(contexto, /mensagem 4\n/, 'só as 20 anteriores (contando as mensagens que o armazenamento devolveu)');
    assert.doesNotMatch(contexto, /\] @IA resume/, 'o pedido não se repete no contexto');
});

test('IA desligada ou fora do ar: grava a mensagem do sistema, sem chamar o modelo nem registrar custo', async () => {
    for (const estado of [EstadoIaEnum.DESLIGADA, EstadoIaEnum.FORA_DO_AR]) {
        const { enviar, gravadas, solicitacoes, usos, publicados } = montar({ estado });
        await enviar('@IA oi');
        assert.equal(solicitacoes.length, 0);
        assert.equal(usos.length, 0);
        assert.equal(gravadas.length, 1);
        assert.equal(gravadas[0].autor, AutorMensagemDiretaEnum.SISTEMA);
        assert.match(gravadas[0].texto, /^A IA não pôde responder: a IA está (desligada|fora do ar)\.$/);
        assert.deepEqual(publicados.map((publicado) => publicado.evento.tipo), ['MENSAGEM']);
    }
});

test('falha no meio do turno: recusa as propostas do turno, grava a mensagem do sistema e registra o que já foi gasto', async () => {
    const { enviar, gravadas, recusadas, usos } = montar({
        respostas: [pedirFerramentas('propor_criar_atividade'), new IaException('LIMITE' as never, 'Limite de uso da IA atingido.')],
        propostas: { propor_criar_atividade: 51 },
    });
    await enviar('@IA cria a atividade');
    assert.deepEqual(recusadas, [51]);
    assert.equal(gravadas.length, 1);
    assert.equal(gravadas[0].autor, AutorMensagemDiretaEnum.SISTEMA);
    assert.equal(gravadas[0].texto, 'A IA não pôde responder: limite de uso da IA atingido.');
    assert.equal(usos.length, 1, 'a primeira volta chegou ao provedor');
});

test('erro desconhecido vira a mensagem genérica e nunca escapa', async () => {
    const { enviar, gravadas } = montar({ respostas: [new Error('conexão recusada')] });
    await enviar('@IA oi');
    assert.equal(gravadas[0].texto, 'A IA não pôde responder: o serviço de IA está temporariamente indisponível.');
});

test('uma chamada de cada vez por conversa: o segundo @IA recebe o aviso do sistema', async () => {
    let soltar!: () => void;
    const segurar = new Promise<void>((resolver) => { soltar = resolver; });
    const { enviar, gravadas, solicitacoes } = montar({ segurar });
    const primeira = enviar('@IA primeira');
    await new Promise((resolver) => setImmediate(resolver));
    await enviar('@IA segunda', BRUNO_ID);
    assert.equal(gravadas.length, 1);
    assert.equal(gravadas[0].autor, AutorMensagemDiretaEnum.SISTEMA);
    assert.match(gravadas[0].texto, /ainda está respondendo/);
    soltar();
    await primeira;
    assert.equal(solicitacoes.length, 1);
    assert.equal(gravadas[1].autor, AutorMensagemDiretaEnum.IA);
    assert.equal(gravadas[1].chamadaPorUsuarioId, 4);
});

test('o pedido que responde a uma mensagem fora da janela leva o trecho citado', async () => {
    const { enviar, solicitacoes } = montar();
    await enviar('@IA explica isto', 4, { respondeA: { mensagemId: '11111111-2222-4333-8444-555555555555', autorUsuarioId: BRUNO_ID, trecho: 'o deploy falhou' } });
    assert.match(String(solicitacoes[0].mensagens[0].conteudo), /responde a esta mensagem de Bruno Reis: "o deploy falhou"/);
});


// --- no grupo e no canal (task 326) ------------------------------------------

test('no grupo: atende quem chamou, orienta sobre os leitores, grava e publica a todos os membros e cobra no uso do grupo', async () => {
    const { enviarNoGrupo, gravadas, publicados, solicitacoes, listasDeFerramentas, usos } = montar();
    await enviarNoGrupo('@IA cria uma atividade de revisão');

    assert.equal(solicitacoes.length, 1);
    assert.deepEqual(listasDeFerramentas, [ANA], 'as ferramentas são as de quem chamou');
    assert.match(solicitacoes[0].instrucoes, /no grupo "Time"/);
    assert.match(solicitacoes[0].instrucoes, /Quem chamou: Ana Lima \(desenvolvedor\)/);
    assert.match(solicitacoes[0].instrucoes, /Quem mais lê a sua resposta: 2 pessoas do grupo \(1 gestor e 1 desenvolvedor\)/);
    assert.equal(gravadas[0].conversaId, 'G7');
    assert.equal(gravadas[0].autor, AutorMensagemDiretaEnum.IA);
    assert.equal(gravadas[0].chamadaPorUsuarioId, 4);
    assert.deepEqual(publicados.map((publicado) => publicado.evento.tipo), ['IA_DIGITANDO', 'MENSAGEM']);
    for (const publicado of publicados) assert.deepEqual(publicado.usuarioIds, [4, BRUNO_ID, 12]);
    assert.equal((usos[0] as { descricao: string; usuarioId: number }).descricao, '@IA no grupo');
    assert.equal((usos[0] as { usuarioId: number }).usuarioId, 4);
});

test('no grupo o contexto leva as 30 mensagens anteriores, de todos os membros, com nomes', async () => {
    const anteriores = Array.from({ length: 35 }, (_, indice) => mensagem({ texto: `mensagem ${indice + 1}`, conversaId: 'G7', autorUsuarioId: [4, BRUNO_ID, 12][indice % 3] }));
    const { enviarNoGrupo, solicitacoes } = montar({ anteriores });
    await enviarNoGrupo('@IA resume');
    const contexto = String(solicitacoes[0].mensagens[0].conteudo);
    assert.match(contexto, /\[Carla Dias\] mensagem 33\n/);
    assert.match(contexto, /mensagem 6\n/);
    assert.doesNotMatch(contexto, /mensagem 5\n/, 'só as 30 anteriores');
    assert.doesNotMatch(contexto, /\] @IA resume/, 'o pedido não se repete no contexto');
});

test('no grupo, quem não é membro de agora não é atendido', async () => {
    const { enviarNoGrupo, solicitacoes, gravadas, publicados } = montar({ membros: [BRUNO_ID, 12] });
    await enviarNoGrupo('@IA cria uma atividade');
    assert.equal(solicitacoes.length, 0);
    assert.equal(gravadas.length, 0);
    assert.equal(publicados.length, 0);
});

test('no grupo, a resposta vai aos membros do fim do turno (quem saiu não recebe, quem entrou recebe)', async () => {
    let soltar!: () => void;
    const segurar = new Promise<void>((resolver) => { soltar = resolver; });
    const { enviarNoGrupo, membros, publicados } = montar({ segurar });
    const turno = enviarNoGrupo('@IA cria uma atividade');
    await new Promise((resolver) => setImmediate(resolver));
    membros.atuais = [4, 12, 21];
    soltar();
    await turno;
    assert.deepEqual(publicados.find((publicado) => publicado.evento.tipo === 'MENSAGEM')?.usuarioIds, [4, 12, 21]);
    assert.deepEqual(publicados.find((publicado) => publicado.evento.tipo === 'IA_DIGITANDO')?.usuarioIds, [4, BRUNO_ID, 12]);
});

test('no canal, a orientação diz de que demanda é o chat', async () => {
    const { enviarNoGrupo, solicitacoes } = montar();
    await enviarNoGrupo('@IA qual o status?', 4, TipoGrupoEnum.DEMANDA, 'Cadastro de clientes');
    assert.match(solicitacoes[0].instrucoes, /chat da demanda "Cadastro de clientes"/);
    assert.match(solicitacoes[0].instrucoes, /consultá-lo pelas ferramentas/);
});

test('no grupo, @IA sozinho responde a todos e a próxima mensagem de quem chamou é o pedido, mesmo com outros membros no meio', async () => {
    const { enviarNoGrupo, solicitacoes, publicados } = montar({
        anteriores: [mensagem({ texto: 'Quem pega o ajuste do relatório?', conversaId: 'G7', autorUsuarioId: 12 })],
        respostas: [resposta({ texto: 'Opa, chamou? Sobre quem pega o ajuste do relatório, quer que eu faça isso?' }), resposta({ texto: 'Feito.' })],
    });
    await enviarNoGrupo('@IA');
    assert.equal(solicitacoes.length, 1);
    assert.match(String(solicitacoes[0].mensagens[0].conteudo), /A mensagem anterior à chamada, de Carla Dias, é:\nQuem pega o ajuste do relatório\?/);
    assert.deepEqual(publicados.find((publicado) => publicado.evento.tipo === 'MENSAGEM')?.usuarioIds, [4, BRUNO_ID, 12]);
    await enviarNoGrupo('vocês viram o prazo?', BRUNO_ID);
    assert.equal(solicitacoes.length, 1);
    await enviarNoGrupo('quanto falta para a entrega?');
    assert.equal(solicitacoes.length, 2);
    assert.match(String(solicitacoes[1].mensagens[0].conteudo), /Pedido de Ana Lima:\nquanto falta para a entrega\?$/);
});

// --- a IA marca pessoas (task 328) -------------------------------------------

test('a orientação traz quem pode ser marcado e quando marcar', async () => {
    const { enviar, enviarNoGrupo, solicitacoes } = montar({ respostas: [resposta({ texto: 'ok' }), resposta({ texto: 'ok' })] });
    await enviar('@IA oi');
    await enviarNoGrupo('@IA oi');
    assert.match(solicitacoes[0].instrucoes ?? '', /exatamente como aparece aqui \(Ana Lima, Bruno Reis\)\. Marcar avisa/);
    assert.doesNotMatch(solicitacoes[0].instrucoes ?? '', /@todos marca/, 'na conversa a dois não há "todos"');
    assert.match(solicitacoes[0].instrucoes ?? '', /Marque só quando Ana Lima pedir/);
    assert.match(solicitacoes[1].instrucoes ?? '', /exatamente como aparece aqui \(Ana Lima, Bruno Reis, Carla Dias\); @todos marca todos os outros membros/);
});

test('a resposta que marca @Nome e @todos grava as menções e as publica (um a um)', async () => {
    const { enviar, gravadas } = montar({ respostas: [resposta({ texto: 'Avisei o @Bruno Reis. Chamei @todos também.' })] });
    await enviar('@IA avisa o Bruno');
    // @todos marca todos menos quem chamou: no um a um, só o Bruno.
    assert.deepEqual(gravadas[0].mencoes, [BRUNO_ID]);
});

test('no grupo, @todos marca todos os membros menos quem chamou, e @Nome marca um só', async () => {
    const { enviarNoGrupo, gravadas } = montar({ respostas: [resposta({ texto: '@todos: reunião às 15h.' }), resposta({ texto: 'Lembrete para @Carla Dias.' })] });
    await enviarNoGrupo('@IA chama todo mundo para a reunião das 15h');
    assert.deepEqual(gravadas[0].mencoes, [BRUNO_ID, 12]);
    await enviarNoGrupo('@IA lembra a Carla');
    assert.deepEqual(gravadas[1].mencoes, [12]);
});

test('só marca quem continua no grupo no fim do turno; quem saiu vira texto', async () => {
    let soltar!: () => void;
    const segurar = new Promise<void>((resolver) => { soltar = resolver; });
    const { enviarNoGrupo, membros, gravadas } = montar({ segurar, respostas: [resposta({ texto: 'Aviso para @Bruno Reis e @Carla Dias.' })] });
    const turno = enviarNoGrupo('@IA avisa o Bruno e a Carla');
    await new Promise((resolver) => setImmediate(resolver));
    membros.atuais = [4, 12, 21];
    soltar();
    await turno;
    assert.deepEqual(gravadas[0].mencoes, [12]);
});

test('resposta sem marcação não grava menções', async () => {
    const { enviar, gravadas } = montar();
    await enviar('@IA cria uma atividade');
    assert.deepEqual(gravadas[0].mencoes, []);
});
