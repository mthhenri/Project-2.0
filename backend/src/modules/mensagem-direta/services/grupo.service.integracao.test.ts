import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { AutorMensagemDiretaEnum, MensagemDiretaEventoPublicarDto } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { AtividadeRepository } from '../../atividade/repositories/atividade.repository';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { ProjetoRepository } from '../../projeto/repositories/projeto.repository';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import { testarComBanco, ConexaoTeste } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarAdministrador, criarDesenvolvedor, criarGestor } from '../../../testes/fabricas';
import { MensagemDiretaReacaoRepository } from '../repositories/mensagem-direta-reacao.repository';
import { GrupoLeituraRepository } from '../repositories/grupo-leitura.repository';
import { GrupoRepository } from '../repositories/grupo.repository';
import { MensagemDiretaPostgresRepository } from '../repositories/mensagem-direta-postgres.repository';
import { MensagemDiretaSupervisaoRepository } from '../repositories/mensagem-direta-supervisao.repository';
import { CanalAcessoService } from './canal-acesso.service';
import { GrupoSupervisaoService } from './grupo-supervisao.service';
import { GrupoService } from './grupo.service';

// Os grupos do chat entre colaboradores (task 246) ponta a ponta: usuários reais no banco de teste, o armazenamento Postgres provisório e um registrador
// no lugar do barramento de eventos. Prova o que o dublê não prova: membros, histórico, não lidas desde a entrada, fim do grupo e a supervisão.

interface Pessoa { id: number; login: string; tipo: never }

const como = (usuario: { id: number; login: string; tipo: unknown }) => ({ sub: usuario.id, login: usuario.login, tipo: usuario.tipo }) as never;

function montar(conexao: ConexaoTeste) {
    const eventos: MensagemDiretaEventoPublicarDto[] = [];
    const eventosService = {
        publicarParaUsuarios: async (dto: MensagemDiretaEventoPublicarDto) => { eventos.push(dto); },
        listarUsuariosOnline: () => new Set<number>(),
    };
    // O `@IA` (task 326): o turno em si é testado na service da IA; aqui só se vê que o grupo a aciona com os membros certos.
    const chamadasDaIa: Array<{ mensagem: { texto: string; conversaId: string }; usuarioAtivo: { sub: number }; grupo?: { nome: string; lerMembrosIds: () => Promise<number[]> } }> = [];
    const iaChatDireto = { atenderSeChamada: async (dto: (typeof chamadasDaIa)[number]) => { chamadasDaIa.push(dto); } };
    const propostaIa = {
        recuperarParaParticipante: async (dto: { id: number; chamadaPorUsuarioId: number }, usuario: { sub: number }) => ({
            acessivel: usuario.sub !== 0,
            podeResolver: usuario.sub === dto.chamadaPorUsuarioId,
            proposta: null,
        }),
    };
    const armazenamento = new MensagemDiretaPostgresRepository(conexao);
    const grupos = criarRepositorio(GrupoRepository, conexao);
    const canais = new CanalAcessoService(
        grupos,
        criarRepositorio(DemandaRepository, conexao),
        criarRepositorio(ProjetoRepository, conexao),
        criarRepositorio(UsuarioRepository, conexao),
    );
    const supervisao = new GrupoSupervisaoService(
        armazenamento,
        grupos,
        criarRepositorio(MensagemDiretaSupervisaoRepository, conexao),
        criarRepositorio(UsuarioRepository, conexao),
        eventosService as never,
        canais,
    );
    const service = new GrupoService(
        armazenamento,
        grupos,
        criarRepositorio(GrupoLeituraRepository, conexao),
        criarRepositorio(UsuarioRepository, conexao),
        criarRepositorio(DemandaRepository, conexao),
        criarRepositorio(AtividadeRepository, conexao),
        eventosService as never,
        canais,
        supervisao, criarRepositorio(MensagemDiretaReacaoRepository, conexao), iaChatDireto as never, propostaIa as never);
    return { service, supervisao, eventos, armazenamento, chamadasDaIa };
}

async function trio(conexao: ConexaoTeste) {
    const [ana, bruno, carla] = [await criarDesenvolvedor(conexao), await criarDesenvolvedor(conexao), await criarDesenvolvedor(conexao)];
    return { ana, bruno, carla };
}

const textos = (mensagens: { texto: string }[]) => mensagens.map((mensagem) => mensagem.texto);

const recusaCom = (promessa: Promise<unknown>, tipo: new (...argumentos: never[]) => Error) => assert.rejects(promessa, (erro) => erro instanceof tipo);

// --- criar -----------------------------------------------------------------

testarComBanco('criarGrupo: o criador vira membro, os convidados entram, a mensagem do sistema avisa e todos sincronizam', async (conexao) => {
    const { service, eventos } = montar(conexao);
    const { ana, bruno, carla } = await trio(conexao);

    const criado = (await service.criarGrupo({ nome: '  Time   do backend ', membroUsuarioIds: [bruno.id, carla.id, bruno.id, ana.id] }, como(ana))).dados!.grupo;

    assert.equal(criado.nome, 'Time do backend', 'espaços sobrando saem');
    assert.equal(criado.conversaId, `G${criado.grupoId}`);
    assert.deepEqual(criado.membros.map((membro) => membro.usuarioId).sort(), [ana.id, bruno.id, carla.id].sort());
    assert.equal(criado.corAvatar, null);
    assert.equal(criado.emojiAvatar, null);
    assert.equal(criado.privado, false);
    assert.equal(criado.naoLidas, 0, 'a mensagem do sistema nunca é não lida');
    assert.match(criado.ultimaMensagem!.texto, /criou o grupo e adicionou/);
    assert.equal(criado.ultimaMensagem!.autor, AutorMensagemDiretaEnum.SISTEMA);

    const sincronizados = eventos.find((evento) => evento.evento.tipo === 'SINCRONIZAR');
    assert.deepEqual([...sincronizados!.usuarioIds].sort(), [ana.id, bruno.id, carla.id].sort());
    assert.deepEqual(sincronizados!.evento, { tipo: 'SINCRONIZAR', conversaId: criado.conversaId });
    assert.ok(eventos.some((evento) => evento.evento.tipo === 'MENSAGEM'));
});

testarComBanco('criarGrupo: recusa nome vazio ou grande demais, pessoa inativa ou inexistente e mais de 50 pessoas', async (conexao) => {
    const { service } = montar(conexao);
    const { ana, bruno } = await trio(conexao);
    const inativo = await criarDesenvolvedor(conexao, { ativo: false });

    await recusaCom(service.criarGrupo({ nome: '   ' }, como(ana)), BusinessException);
    await recusaCom(service.criarGrupo({ nome: 'x'.repeat(61) }, como(ana)), BusinessException);
    await service.criarGrupo({ nome: 'x'.repeat(60) }, como(ana));
    await recusaCom(service.criarGrupo({ nome: 'Com inativo', membroUsuarioIds: [inativo.id] }, como(ana)), BusinessException);
    await recusaCom(service.criarGrupo({ nome: 'Com ninguém', membroUsuarioIds: [999_999_999] }, como(ana)), BusinessException);
    await recusaCom(service.criarGrupo({ nome: 'Lotado', membroUsuarioIds: Array.from({ length: 50 }, (_, indice) => 900_000_000 + indice) }, como(bruno)), BusinessException);
});

testarComBanco('criarGrupo com cor e emoji: guarda os dois; cor inválida e mais de um emoji são recusados', async (conexao) => {
    const { service } = montar(conexao);
    const { ana } = await trio(conexao);

    const grupo = (await service.criarGrupo({ nome: 'Equipe', corAvatar: '#3366ff', emojiAvatar: '🚀' }, como(ana))).dados!.grupo;
    assert.equal(grupo.corAvatar, '#3366FF', 'a cor é normalizada em maiúsculas');
    assert.equal(grupo.emojiAvatar, '🚀');

    await recusaCom(service.criarGrupo({ nome: 'Cor ruim', corAvatar: 'azul' }, como(ana)), BusinessException);
    await recusaCom(service.criarGrupo({ nome: 'Dois emojis', emojiAvatar: '🚀🚀' }, como(ana)), BusinessException);
    await recusaCom(service.criarGrupo({ nome: 'Texto no emoji', emojiAvatar: 'oi' }, como(ana)), BusinessException);
    assert.equal((await service.criarGrupo({ nome: 'Emoji vazio', emojiAvatar: '  ' }, como(ana))).dados!.grupo.emojiAvatar, null);
});

// --- alterar ---------------------------------------------------------------

testarComBanco('alterarGrupo: qualquer membro renomeia e muda cor e emoji; cada mudança vira mensagem do sistema; sem mudança não grava nada', async (conexao) => {
    const { service, eventos } = montar(conexao);
    const { ana, bruno, carla } = await trio(conexao);
    const grupo = (await service.criarGrupo({ nome: 'Antigo', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo;

    const renomeado = (await service.alterarGrupo({ grupoId: grupo.grupoId, nome: 'Novo nome' }, como(bruno))).dados!.grupo;
    assert.equal(renomeado.nome, 'Novo nome');
    assert.match(renomeado.ultimaMensagem!.texto, /renomeou o grupo para “Novo nome”/);

    const pintado = (await service.alterarGrupo({ grupoId: grupo.grupoId, corAvatar: '#112233', emojiAvatar: '🎯' }, como(ana))).dados!.grupo;
    assert.equal(pintado.corAvatar, '#112233');
    assert.equal(pintado.emojiAvatar, '🎯');
    assert.equal(pintado.nome, 'Novo nome', 'o que não veio fica como estava');
    assert.match(pintado.ultimaMensagem!.texto, /alterou a cor e o emoji do grupo/);

    const limpo = (await service.alterarGrupo({ grupoId: grupo.grupoId, corAvatar: null, emojiAvatar: null }, como(ana))).dados!.grupo;
    assert.equal(limpo.corAvatar, null);
    assert.equal(limpo.emojiAvatar, null);

    const antes = eventos.length;
    const igual = await service.alterarGrupo({ grupoId: grupo.grupoId, nome: 'Novo nome' }, como(ana));
    assert.equal(igual.mensagem, 'Grupo sem alterações');
    assert.equal(eventos.length, antes, 'nada mudou, nada foi avisado');

    await recusaCom(service.alterarGrupo({ grupoId: grupo.grupoId, nome: 'Intruso' }, como(carla)), UnauthorizedAccessException);
    await recusaCom(service.alterarGrupo({ grupoId: grupo.grupoId, nome: '' }, como(ana)), BusinessException);
    await recusaCom(service.alterarGrupo({ grupoId: 999_999, nome: 'x' }, como(ana)), ResourceNotFoundException);
});

// --- membros ---------------------------------------------------------------

testarComBanco('adicionarMembros: qualquer membro adiciona, o novo vê todo o histórico e as não lidas começam na entrada', async (conexao) => {
    const { service } = montar(conexao);
    const { ana, bruno, carla } = await trio(conexao);
    const grupo = (await service.criarGrupo({ nome: 'Histórico', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo;
    for (const texto of ['primeira', 'segunda', 'terceira']) {
        await service.enviarMensagem({ grupoId: grupo.grupoId, mensagemId: randomUUID(), texto } as never, como(ana));
    }

    const adicionado = (await service.adicionarMembros({ grupoId: grupo.grupoId, usuarioIds: [carla.id, carla.id, bruno.id, ana.id] }, como(bruno))).dados!;
    assert.deepEqual(adicionado.adicionadosUsuarioIds, [carla.id], 'quem já era membro é ignorado');
    assert.equal(adicionado.grupo.membros.length, 3);

    const historico = (await service.listarMensagens({ grupoId: grupo.grupoId } as never, como(carla))).dados!;
    const vistas = textos(historico.mensagens);
    for (const texto of ['primeira', 'segunda', 'terceira']) assert.ok(vistas.includes(texto), `a Carla vê "${texto}"`);

    const daCarla = (await service.recuperarGrupo(grupo.grupoId, como(carla))).dados!.grupo;
    assert.equal(daCarla.naoLidas, 0, 'o histórico anterior à entrada não conta como não lido');

    await service.enviarMensagem({ grupoId: grupo.grupoId, mensagemId: randomUUID(), texto: 'depois da entrada' } as never, como(ana));
    assert.equal((await service.recuperarGrupo(grupo.grupoId, como(carla))).dados!.grupo.naoLidas, 1);

    assert.equal((await service.adicionarMembros({ grupoId: grupo.grupoId, usuarioIds: [carla.id] }, como(ana))).mensagem, 'Todas as pessoas já são membros');
    await recusaCom(service.adicionarMembros({ grupoId: grupo.grupoId, usuarioIds: [999_999_999] }, como(ana)), BusinessException);
});

testarComBanco('adicionarMembros: o limite de 50 pessoas vale para membros atuais mais os novos', async (conexao) => {
    const { service } = montar(conexao);
    const { ana } = await trio(conexao);
    const grupo = (await service.criarGrupo({ nome: 'Quase cheio' }, como(ana))).dados!.grupo;
    const gente = [];
    for (let indice = 0; indice < 49; indice += 1) gente.push((await criarDesenvolvedor(conexao)).id);
    await service.adicionarMembros({ grupoId: grupo.grupoId, usuarioIds: gente }, como(ana));
    assert.equal((await service.recuperarGrupo(grupo.grupoId, como(ana))).dados!.grupo.membros.length, 50);

    const extra = await criarDesenvolvedor(conexao);
    await recusaCom(service.adicionarMembros({ grupoId: grupo.grupoId, usuarioIds: [extra.id] }, como(ana)), BusinessException);
});

testarComBanco('sairDoGrupo: quem saiu não lê mais; readicionado volta a ler tudo; o último a sair encerra o grupo', async (conexao) => {
    const { service, eventos } = montar(conexao);
    const { ana, bruno, carla } = await trio(conexao);
    const grupo = (await service.criarGrupo({ nome: 'Saídas', membroUsuarioIds: [bruno.id, carla.id] }, como(ana))).dados!.grupo;
    await service.enviarMensagem({ grupoId: grupo.grupoId, mensagemId: randomUUID(), texto: 'antes da saída' } as never, como(ana));

    const saida = (await service.sairDoGrupo(grupo.grupoId, como(carla))).dados!;
    assert.deepEqual(saida, { grupoId: grupo.grupoId, grupoEncerrado: false });
    const naConversa = (await service.listarMensagens({ grupoId: grupo.grupoId } as never, como(ana))).dados!;
    assert.match(naConversa.mensagens[0].texto, /Usuário de Teste \d+ saiu do grupo/);
    const sincronizacao = [...eventos].reverse().find((evento) => evento.evento.tipo === 'SINCRONIZAR')!;
    assert.ok(sincronizacao.usuarioIds.includes(carla.id), 'quem saiu também sincroniza para a lista perder o grupo');

    await recusaCom(service.listarMensagens({ grupoId: grupo.grupoId } as never, como(carla)), UnauthorizedAccessException);
    await recusaCom(service.enviarMensagem({ grupoId: grupo.grupoId, mensagemId: randomUUID(), texto: 'fora' } as never, como(carla)), UnauthorizedAccessException);
    await recusaCom(service.sairDoGrupo(grupo.grupoId, como(carla)), UnauthorizedAccessException);
    assert.deepEqual((await service.listarResumos(como(carla))).map((resumo) => resumo.grupoId), [], 'o grupo some da lista de quem saiu');

    await service.adicionarMembros({ grupoId: grupo.grupoId, usuarioIds: [carla.id] }, como(bruno));
    const relido = (await service.listarMensagens({ grupoId: grupo.grupoId } as never, como(carla))).dados!;
    assert.ok(textos(relido.mensagens).includes('antes da saída'), 'readicionado, volta a ler tudo');

    await service.sairDoGrupo(grupo.grupoId, como(carla));
    await service.sairDoGrupo(grupo.grupoId, como(bruno));
    const ultimo = (await service.sairDoGrupo(grupo.grupoId, como(ana))).dados!;
    assert.equal(ultimo.grupoEncerrado, true);
    await recusaCom(service.recuperarGrupo(grupo.grupoId, como(ana)), ResourceNotFoundException);
    assert.deepEqual(await service.listarResumos(como(ana)), []);
});

// --- mensagens -------------------------------------------------------------

testarComBanco('enviarMensagem: só membro envia, o reenvio é idempotente e todos os membros recebem o evento', async (conexao) => {
    const { service, eventos } = montar(conexao);
    const { ana, bruno, carla } = await trio(conexao);
    const grupo = (await service.criarGrupo({ nome: 'Conversa', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo;
    const mensagemId = randomUUID();

    const antes = eventos.length;
    const enviada = (await service.enviarMensagem({ grupoId: grupo.grupoId, mensagemId: mensagemId.toUpperCase(), texto: 'Oi, pessoal' } as never, como(bruno))).dados!;
    assert.equal(enviada.mensagem.autorUsuarioId, bruno.id);
    assert.equal(enviada.mensagem.conversaId, grupo.conversaId);
    assert.equal(enviada.mensagem.mensagemId, mensagemId, 'o id é gravado em minúsculas');
    assert.equal(eventos.length, antes + 1);
    assert.deepEqual([...eventos[eventos.length - 1].usuarioIds].sort(), [ana.id, bruno.id].sort());

    const repetida = await service.enviarMensagem({ grupoId: grupo.grupoId, mensagemId, texto: 'texto diferente' } as never, como(bruno));
    assert.equal(repetida.dados!.jaExistia, true);
    assert.equal(repetida.dados!.mensagem.texto, 'Oi, pessoal');
    assert.equal(eventos.length, antes + 1, 'o reenvio não avisa de novo');

    await recusaCom(service.enviarMensagem({ grupoId: grupo.grupoId, mensagemId: randomUUID(), texto: 'intruso' } as never, como(carla)), UnauthorizedAccessException);
    await recusaCom(service.enviarMensagem({ grupoId: 999_999, mensagemId: randomUUID(), texto: 'x' } as never, como(ana)), ResourceNotFoundException);
});

testarComBanco('enviarMensagem: @pessoa vale só para membro e @todos expande nos membros atuais, menos o autor', async (conexao) => {
    const { service } = montar(conexao);
    const { ana, bruno, carla } = await trio(conexao);
    const grupo = (await service.criarGrupo({ nome: 'Menções', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo;
    const enviar = (extra: Record<string, unknown>, quem: Pessoa | { id: number; login: string; tipo: unknown }) =>
        service.enviarMensagem({ grupoId: grupo.grupoId, mensagemId: randomUUID(), texto: 'oi', ...extra } as never, como(quem));

    assert.deepEqual((await enviar({ mencoes: [bruno.id, bruno.id] }, ana)).dados!.mensagem.mencoes, [bruno.id]);
    await recusaCom(enviar({ mencoes: [carla.id] }, ana), BusinessException);
    assert.deepEqual((await enviar({ mencionaTodos: true }, bruno)).dados!.mensagem.mencoes, [ana.id], '@todos não menciona o autor');
    assert.deepEqual((await enviar({ mencionaTodos: true, mencoes: [bruno.id] }, ana)).dados!.mensagem.mencoes, [bruno.id]);
});

testarComBanco('enviarMensagem: responder cita a mensagem do grupo e recusa a de outra conversa e a do sistema', async (conexao) => {
    const { service } = montar(conexao);
    const { ana, bruno } = await trio(conexao);
    const grupo = (await service.criarGrupo({ nome: 'Respostas', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo;
    const original = (await service.enviarMensagem({ grupoId: grupo.grupoId, mensagemId: randomUUID(), texto: 'Pode revisar?' } as never, como(ana))).dados!.mensagem;

    const resposta = (await service.enviarMensagem({ grupoId: grupo.grupoId, mensagemId: randomUUID(), texto: 'Revisei', respondeAMensagemId: original.mensagemId } as never, como(bruno))).dados!.mensagem;
    assert.deepEqual(resposta.respondeA, { mensagemId: original.mensagemId, autorUsuarioId: ana.id, trecho: 'Pode revisar?' });

    const doSistema = (await service.listarMensagens({ grupoId: grupo.grupoId, limite: 50 } as never, como(ana))).dados!.mensagens.find((mensagem) => mensagem.autor === AutorMensagemDiretaEnum.SISTEMA)!;
    await recusaCom(service.enviarMensagem({ grupoId: grupo.grupoId, mensagemId: randomUUID(), texto: 'x', respondeAMensagemId: doSistema.mensagemId } as never, como(ana)), BusinessException);
    await recusaCom(service.enviarMensagem({ grupoId: grupo.grupoId, mensagemId: randomUUID(), texto: 'x', respondeAMensagemId: randomUUID() } as never, como(ana)), BusinessException);
});

testarComBanco('listarMensagens: pagina com cursor e só para membro', async (conexao) => {
    const { service } = montar(conexao);
    const { ana, bruno, carla } = await trio(conexao);
    const grupo = (await service.criarGrupo({ nome: 'Páginas', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo;
    for (let indice = 1; indice <= 4; indice += 1) {
        await service.enviarMensagem({ grupoId: grupo.grupoId, mensagemId: randomUUID(), texto: `mensagem ${indice}` } as never, como(ana));
    }
    const primeira = (await service.listarMensagens({ grupoId: grupo.grupoId, limite: 2 } as never, como(bruno))).dados!;
    assert.equal(primeira.mensagens.length, 2);
    assert.ok(primeira.proximoCursor);
    const segunda = (await service.listarMensagens({ grupoId: grupo.grupoId, limite: 2, cursor: primeira.proximoCursor! } as never, como(bruno))).dados!;
    assert.equal(segunda.mensagens.length, 2);
    assert.equal(new Set([...primeira.mensagens, ...segunda.mensagens].map((mensagem) => mensagem.mensagemId)).size, 4, 'sem repetir nem pular');
    await recusaCom(service.listarMensagens({ grupoId: grupo.grupoId } as never, como(carla)), UnauthorizedAccessException);
});

// --- leitura, silêncio, digitação ------------------------------------------

testarComBanco('leitura e silêncio: as não lidas descem ao ler, a leitura nunca recua e o silêncio fica na lista; o evento de leitura vai aos membros', async (conexao) => {
    const { service, eventos } = montar(conexao);
    const { ana, bruno, carla } = await trio(conexao);
    const grupo = (await service.criarGrupo({ nome: 'Leitura', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo;
    const enviadas = [];
    for (const texto of ['um', 'dois', 'três']) {
        enviadas.push((await service.enviarMensagem({ grupoId: grupo.grupoId, mensagemId: randomUUID(), texto } as never, como(ana))).dados!.mensagem);
    }
    assert.equal((await service.recuperarGrupo(grupo.grupoId, como(bruno))).dados!.grupo.naoLidas, 3);
    assert.equal((await service.recuperarGrupo(grupo.grupoId, como(ana))).dados!.grupo.naoLidas, 0, 'as minhas nunca são não lidas');

    const lida = (await service.alterarLeitura({ grupoId: grupo.grupoId, lidaAteData: enviadas[1].createdDate.toISOString() }, como(bruno))).dados!;
    assert.equal(lida.lidaAteData.getTime(), enviadas[1].createdDate.getTime());
    assert.equal((await service.recuperarGrupo(grupo.grupoId, como(bruno))).dados!.grupo.naoLidas, 1);
    const evento = [...eventos].reverse().find((item) => item.evento.tipo === 'LEITURA')!;
    assert.deepEqual([...evento.usuarioIds].sort(), [ana.id, bruno.id].sort());
    assert.deepEqual({ ...evento.evento }, { tipo: 'LEITURA', conversaId: grupo.conversaId, usuarioId: bruno.id, lidaAteDate: lida.lidaAteData });

    const atrasada = (await service.alterarLeitura({ grupoId: grupo.grupoId, lidaAteData: enviadas[0].createdDate.toISOString() }, como(bruno))).dados!;
    assert.equal(atrasada.lidaAteData.getTime(), enviadas[1].createdDate.getTime(), 'a leitura não recua');

    assert.equal((await service.alterarSilencio({ grupoId: grupo.grupoId, silenciada: true }, como(bruno))).dados!.silenciada, true);
    assert.equal((await service.listarResumos(como(bruno)))[0].silenciada, true);
    assert.equal((await service.listarResumos(como(ana)))[0].silenciada, false, 'o silêncio é de cada um');
    await recusaCom(service.alterarLeitura({ grupoId: grupo.grupoId, lidaAteData: new Date().toISOString() }, como(carla)), UnauthorizedAccessException);
    await recusaCom(service.alterarSilencio({ grupoId: grupo.grupoId, silenciada: true }, como(carla)), UnauthorizedAccessException);
});

testarComBanco('avisarDigitacao: avisa os outros membros e nunca quem digita', async (conexao) => {
    const { service, eventos } = montar(conexao);
    const { ana, bruno, carla } = await trio(conexao);
    const grupo = (await service.criarGrupo({ nome: 'Digitando', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo;

    await service.avisarDigitacao(grupo.grupoId, como(ana));
    const aviso = eventos[eventos.length - 1];
    assert.deepEqual(aviso.usuarioIds, [bruno.id]);
    assert.deepEqual(aviso.evento, { tipo: 'DIGITANDO', conversaId: grupo.conversaId, usuarioId: ana.id });
    await recusaCom(service.avisarDigitacao(grupo.grupoId, como(carla)), UnauthorizedAccessException);
});

// --- lista -----------------------------------------------------------------

testarComBanco('listarResumos: o grupo com mensagem mais recente vem primeiro e o sem mensagem fica por último', async (conexao) => {
    const { service } = montar(conexao);
    const { ana, bruno } = await trio(conexao);
    const velho = (await service.criarGrupo({ nome: 'Velho', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo;
    const novo = (await service.criarGrupo({ nome: 'Novo', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo;
    await new Promise((resolver) => setTimeout(resolver, 20));
    await service.enviarMensagem({ grupoId: velho.grupoId, mensagemId: randomUUID(), texto: 'mais recente' } as never, como(ana));

    assert.deepEqual((await service.listarResumos(como(bruno))).map((resumo) => resumo.grupoId), [velho.grupoId, novo.grupoId]);
    assert.deepEqual(await service.listarResumos(como(await criarDesenvolvedor(conexao))), []);
    assert.deepEqual((await service.listarGrupoIdsDoUsuario(como(bruno))).sort((primeiro, segundo) => primeiro - segundo), [velho.grupoId, novo.grupoId].sort((primeiro, segundo) => primeiro - segundo), 'a busca olha os grupos de que a pessoa é membro');
});

// --- privacidade e supervisão ---------------------------------------------

testarComBanco('entrar gestor ou administrador torna o grupo privado, com aviso só na virada', async (conexao) => {
    const { service } = montar(conexao);
    const { ana, bruno } = await trio(conexao);
    const gestor = await criarGestor(conexao);
    const administrador = await criarAdministrador(conexao);
    const grupo = (await service.criarGrupo({ nome: 'Reservado', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo;
    assert.equal(grupo.privado, false);

    const comGestor = (await service.adicionarMembros({ grupoId: grupo.grupoId, usuarioIds: [gestor.id] }, como(ana))).dados!.grupo;
    assert.equal(comGestor.privado, true);
    const mensagens = textos((await service.listarMensagens({ grupoId: grupo.grupoId, limite: 50 } as never, como(ana))).dados!.mensagens);
    assert.equal(mensagens.filter((texto) => /conversa agora é privada/.test(texto)).length, 1);
    assert.ok(mensagens.some((texto) => /\(gestor\) entrou no grupo/.test(texto)));

    await service.adicionarMembros({ grupoId: grupo.grupoId, usuarioIds: [administrador.id] }, como(ana));
    const depois = textos((await service.listarMensagens({ grupoId: grupo.grupoId, limite: 50 } as never, como(ana))).dados!.mensagens);
    assert.equal(depois.filter((texto) => /conversa agora é privada/.test(texto)).length, 1, 'já era privado: não repete o aviso');

    const criadoJaComGestor = (await service.criarGrupo({ nome: 'Já privado', membroUsuarioIds: [gestor.id] }, como(ana))).dados!.grupo;
    assert.equal(criadoJaComGestor.privado, true);
});

testarComBanco('supervisão: o gestor lista e abre só grupos sem gestor entre os membros atuais; abrir audita e avisa uma vez por dia', async (conexao) => {
    const { service, supervisao } = montar(conexao);
    const { ana, bruno, carla } = await trio(conexao);
    const gestor = await criarGestor(conexao);
    const outroGestor = await criarGestor(conexao);
    const aberto = (await service.criarGrupo({ nome: 'Aberto', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo;
    const privado = (await service.criarGrupo({ nome: 'Privado', membroUsuarioIds: [carla.id, outroGestor.id] }, como(ana))).dados!.grupo;
    const comHistorico = (await service.criarGrupo({ nome: 'Com conversa', membroUsuarioIds: [carla.id] }, como(ana))).dados!.grupo;
    await service.enviarMensagem({ grupoId: comHistorico.grupoId, mensagemId: randomUUID(), texto: 'conteúdo supervisionável' } as never, como(carla));

    const lista = (await supervisao.listarGruposSupervisionados({}, como(gestor))).dados!;
    const idsListados = lista.grupos.map((grupo) => grupo.grupoId);
    assert.ok(idsListados.includes(aberto.grupoId));
    assert.ok(idsListados.includes(comHistorico.grupoId));
    assert.ok(!idsListados.includes(privado.grupoId), 'grupo com gestor entre os membros é privado');
    const doHistorico = lista.grupos.find((grupo) => grupo.grupoId === comHistorico.grupoId)!;
    assert.equal(doHistorico.nome, 'Com conversa');
    assert.deepEqual(doHistorico.membros.map((membro) => membro.usuarioId).sort(), [ana.id, carla.id].sort());
    assert.equal(doHistorico.ultimaMensagem.texto, 'conteúdo supervisionável');

    const filtrada = (await supervisao.listarGruposSupervisionados({ texto: 'supervisionável' }, como(gestor))).dados!;
    assert.deepEqual(filtrada.grupos.map((grupo) => grupo.grupoId), [comHistorico.grupoId]);

    const aberta = (await supervisao.lerGrupoSupervisionado({ grupoId: comHistorico.grupoId } as never, como(gestor))).dados!;
    assert.equal(aberta.membrosAvisados, true);
    assert.ok(textos(aberta.mensagens).includes('conteúdo supervisionável'));
    const segunda = (await supervisao.lerGrupoSupervisionado({ grupoId: comHistorico.grupoId } as never, como(gestor))).dados!;
    assert.equal(segunda.membrosAvisados, false, 'um aviso por leitor, grupo e dia');
    const noGrupo = textos((await service.listarMensagens({ grupoId: comHistorico.grupoId, limite: 50 } as never, como(ana))).dados!.mensagens);
    assert.equal(noGrupo.filter((texto) => /gestor, leu este grupo/.test(texto)).length, 1);

    await recusaCom(supervisao.lerGrupoSupervisionado({ grupoId: privado.grupoId } as never, como(gestor)), UnauthorizedAccessException);
    await recusaCom(supervisao.lerGrupoSupervisionado({ grupoId: privado.grupoId } as never, como(outroGestor)), UnauthorizedAccessException);
    await recusaCom(supervisao.lerGrupoSupervisionado({ grupoId: 999_999 } as never, como(gestor)), ResourceNotFoundException);
    await recusaCom(supervisao.listarGruposSupervisionados({}, como(ana)), UnauthorizedAccessException);
    await recusaCom(supervisao.lerGrupoSupervisionado({ grupoId: aberto.grupoId } as never, como(ana)), UnauthorizedAccessException);
});

testarComBanco('supervisão: a elegibilidade é a de agora; o gestor sair do grupo o torna legível de novo e entrar o esconde', async (conexao) => {
    const { service, supervisao } = montar(conexao);
    const { ana, bruno } = await trio(conexao);
    const gestor = await criarGestor(conexao);
    const leitor = await criarGestor(conexao);
    const grupo = (await service.criarGrupo({ nome: 'Vira e volta', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo;
    const visivel = async () => (await supervisao.listarGruposSupervisionados({}, como(leitor))).dados!.grupos.some((item) => item.grupoId === grupo.grupoId);

    assert.equal(await visivel(), true);
    await service.adicionarMembros({ grupoId: grupo.grupoId, usuarioIds: [gestor.id] }, como(ana));
    assert.equal(await visivel(), false, 'entrou gestor: privado');
    await service.sairDoGrupo(grupo.grupoId, como(gestor));
    assert.equal(await visivel(), true, 'o gestor saiu: legível de novo');
});

testarComBanco('supervisão: o gestor que é membro não abre o próprio grupo pela supervisão; grupo encerrado e sem mensagens não aparece', async (conexao) => {
    const { service, supervisao } = montar(conexao);
    const { ana } = await trio(conexao);
    const gestor = await criarGestor(conexao);
    const grupoDoGestor = (await service.criarGrupo({ nome: 'Do gestor', membroUsuarioIds: [ana.id] }, como(gestor))).dados!.grupo;
    await recusaCom(supervisao.lerGrupoSupervisionado({ grupoId: grupoDoGestor.grupoId } as never, como(gestor)), UnauthorizedAccessException);

    const efemero = (await service.criarGrupo({ nome: 'Efêmero' }, como(ana))).dados!.grupo;
    await service.sairDoGrupo(efemero.grupoId, como(ana));
    const leitor = await criarGestor(conexao);
    assert.ok(!(await supervisao.listarGruposSupervisionados({}, como(leitor))).dados!.grupos.some((item) => item.grupoId === efemero.grupoId));
    await recusaCom(supervisao.lerGrupoSupervisionado({ grupoId: efemero.grupoId } as never, como(leitor)), ResourceNotFoundException);
});


// --- editar, reagir e o @IA no grupo (task 326) ------------------------------

const enviarNoGrupo = (service: GrupoService, grupoId: number, autor: { id: number; login: string; tipo: unknown }, texto: string, extras: Partial<Parameters<GrupoService['enviarMensagem']>[0]> = {}) =>
    service.enviarMensagem({ grupoId, mensagemId: randomUUID(), texto, ...extras }, como(autor));

testarComBanco('alterarMensagem: o autor membro edita; os membros recebem EDICAO; não membro, outro autor e prazo vencido recusam', async (conexao) => {
    const { service, eventos, armazenamento } = montar(conexao);
    const { ana, bruno, carla } = await trio(conexao);
    const fora = await criarDesenvolvedor(conexao);
    const { grupoId } = (await service.criarGrupo({ nome: 'Time', membroUsuarioIds: [bruno.id, carla.id] }, como(ana))).dados!.grupo;
    const enviada = (await enviarNoGrupo(service, grupoId, ana, 'texto antigo')).dados!.mensagem;

    eventos.length = 0;
    const editada = (await service.alterarMensagem({ grupoId, mensagemId: enviada.mensagemId, texto: 'texto novo' }, como(ana))).dados!.mensagem;
    assert.equal(editada.texto, 'texto novo');
    assert.ok(editada.editadaDate, 'ganha a marca de editada');
    assert.equal(editada.createdDate.getTime(), enviada.createdDate.getTime(), 'a data de envio não muda');
    const edicao = eventos.find((evento) => evento.evento.tipo === 'EDICAO')!;
    assert.deepEqual([...edicao.usuarioIds].sort(), [ana.id, bruno.id, carla.id].sort());

    eventos.length = 0;
    const igual = await service.alterarMensagem({ grupoId, mensagemId: enviada.mensagemId, texto: 'texto novo' }, como(ana));
    assert.equal(igual.mensagem, 'Mensagem sem alterações');
    assert.equal(eventos.length, 0, 'texto igual não grava nem avisa');

    await recusaCom(service.alterarMensagem({ grupoId, mensagemId: enviada.mensagemId, texto: 'do Bruno' }, como(bruno)), UnauthorizedAccessException);
    await recusaCom(service.alterarMensagem({ grupoId, mensagemId: enviada.mensagemId, texto: 'de fora' }, como(fora)), UnauthorizedAccessException);
    await recusaCom(service.alterarMensagem({ grupoId, mensagemId: randomUUID(), texto: 'não existe' }, como(ana)), ResourceNotFoundException);

    await conexao.raw(`
        UPDATE mensagem_direta
        SET
            created_date = NOW() - INTERVAL '2 hours'
        WHERE
            mensagem_id = ?
    `, [enviada.mensagemId]);
    await recusaCom(service.alterarMensagem({ grupoId, mensagemId: enviada.mensagemId, texto: 'tarde demais' }, como(ana)), BusinessException);
    assert.equal((await armazenamento.recuperarMensagem({ conversaId: `G${grupoId}`, mensagemId: enviada.mensagemId }))?.texto, 'texto novo');
});

testarComBanco('alterarMensagem: não edita a mensagem de outro grupo, a do sistema nem a da IA', async (conexao) => {
    const { service, armazenamento } = montar(conexao);
    const { ana, bruno } = await trio(conexao);
    const primeiro = (await service.criarGrupo({ nome: 'Um', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo.grupoId;
    const segundo = (await service.criarGrupo({ nome: 'Dois', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo.grupoId;
    const doSegundo = (await enviarNoGrupo(service, segundo, ana, 'só no segundo')).dados!.mensagem;
    await recusaCom(service.alterarMensagem({ grupoId: primeiro, mensagemId: doSegundo.mensagemId, texto: 'trocada' }, como(ana)), ResourceNotFoundException);

    const doSistema = (await service.listarMensagens({ grupoId: primeiro }, como(ana))).dados!.mensagens.find((mensagem) => mensagem.autor === AutorMensagemDiretaEnum.SISTEMA)!;
    await recusaCom(service.alterarMensagem({ grupoId: primeiro, mensagemId: doSistema.mensagemId, texto: 'trocada' }, como(ana)), BusinessException);

    const daIa = (await armazenamento.gravar({
        mensagemId: randomUUID(), conversaId: `G${primeiro}`, autor: AutorMensagemDiretaEnum.IA, autorUsuarioId: null, texto: 'resposta', contemCodigo: false, mencoes: [], referencias: [],
        chamadaPorUsuarioId: ana.id, propostaIds: [],
    })).mensagem;
    await recusaCom(service.alterarMensagem({ grupoId: primeiro, mensagemId: daIa.mensagemId, texto: 'trocada' }, como(ana)), BusinessException);
});

testarComBanco('reagirMensagem: membro reage a mensagem de pessoa, troca e remove; todos os membros recebem REACAO e as reações voltam na lista', async (conexao) => {
    const { service, eventos } = montar(conexao);
    const { ana, bruno, carla } = await trio(conexao);
    const { grupoId } = (await service.criarGrupo({ nome: 'Time', membroUsuarioIds: [bruno.id, carla.id] }, como(ana))).dados!.grupo;
    const enviada = (await enviarNoGrupo(service, grupoId, ana, 'bom dia')).dados!.mensagem;

    eventos.length = 0;
    const primeira = (await service.reagirMensagem({ grupoId, mensagemId: enviada.mensagemId, reacao: '👍' }, como(bruno))).dados!;
    assert.deepEqual(primeira.reacoes, [{ usuarioId: bruno.id, reacao: '👍' }]);
    const evento = eventos.find((item) => item.evento.tipo === 'REACAO')!;
    assert.deepEqual([...evento.usuarioIds].sort(), [ana.id, bruno.id, carla.id].sort());
    assert.deepEqual(evento.evento, {
        tipo: 'REACAO', conversaId: `G${grupoId}`, mensagemId: enviada.mensagemId, reacoes: primeira.reacoes, reatorUsuarioId: bruno.id, autorUsuarioId: ana.id, reacao: '👍',
    });

    await service.reagirMensagem({ grupoId, mensagemId: enviada.mensagemId, reacao: '❤️' }, como(carla));
    const trocada = (await service.reagirMensagem({ grupoId, mensagemId: enviada.mensagemId, reacao: '😂' }, como(bruno))).dados!;
    assert.deepEqual(trocada.reacoes.map((item) => [item.usuarioId, item.reacao]), [[bruno.id, '😂'], [carla.id, '❤️']], 'trocar mantém o lugar na ordem');

    const lista = (await service.listarMensagens({ grupoId }, como(ana))).dados!.mensagens.find((mensagem) => mensagem.mensagemId === enviada.mensagemId)!;
    assert.equal(lista.reacoes.length, 2, 'a lista do grupo traz as reações');

    const removida = (await service.reagirMensagem({ grupoId, mensagemId: enviada.mensagemId, reacao: '😂' }, como(bruno))).dados!;
    assert.deepEqual(removida.reacoes.map((item) => item.usuarioId), [carla.id], 'o mesmo emoji de novo remove');
    const nula = (await service.reagirMensagem({ grupoId, mensagemId: enviada.mensagemId, reacao: null }, como(carla))).dados!;
    assert.deepEqual(nula.reacoes, []);
});

testarComBanco('reagirMensagem: recusa não membro, emoji inválido, mensagem de outro grupo, do sistema e da IA; a reação do grupo não tem conversa', async (conexao) => {
    const { service, armazenamento } = montar(conexao);
    const { ana, bruno } = await trio(conexao);
    const fora = await criarDesenvolvedor(conexao);
    const grupoId = (await service.criarGrupo({ nome: 'Time', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo.grupoId;
    const outroId = (await service.criarGrupo({ nome: 'Outro', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo.grupoId;
    const enviada = (await enviarNoGrupo(service, grupoId, ana, 'oi')).dados!.mensagem;
    const doOutro = (await enviarNoGrupo(service, outroId, ana, 'no outro')).dados!.mensagem;

    await recusaCom(service.reagirMensagem({ grupoId, mensagemId: enviada.mensagemId, reacao: '👍' }, como(fora)), UnauthorizedAccessException);
    await recusaCom(service.reagirMensagem({ grupoId, mensagemId: enviada.mensagemId, reacao: 'oi' }, como(bruno)), BusinessException);
    await recusaCom(service.reagirMensagem({ grupoId, mensagemId: doOutro.mensagemId, reacao: '👍' }, como(bruno)), ResourceNotFoundException);
    const doSistema = (await service.listarMensagens({ grupoId }, como(ana))).dados!.mensagens.find((mensagem) => mensagem.autor === AutorMensagemDiretaEnum.SISTEMA)!;
    await recusaCom(service.reagirMensagem({ grupoId, mensagemId: doSistema.mensagemId, reacao: '👍' }, como(bruno)), BusinessException);
    const daIa = (await armazenamento.gravar({
        mensagemId: randomUUID(), conversaId: `G${grupoId}`, autor: AutorMensagemDiretaEnum.IA, autorUsuarioId: null, texto: 'resposta', contemCodigo: false, mencoes: [], referencias: [],
        chamadaPorUsuarioId: ana.id, propostaIds: [],
    })).mensagem;
    await recusaCom(service.reagirMensagem({ grupoId, mensagemId: daIa.mensagemId, reacao: '👍' }, como(bruno)), BusinessException);

    await service.reagirMensagem({ grupoId, mensagemId: enviada.mensagemId, reacao: '👍' }, como(bruno));
    const linha = (await conexao.raw(`
        SELECT
            grupo_id,
            conversa_id
        FROM
            mensagem_direta_reacao
        WHERE
            mensagem_id = ?
    `, [enviada.mensagemId])).rows[0];
    assert.deepEqual([linha.grupo_id, linha.conversa_id], [grupoId, null], 'a reação do grupo guarda o grupo, não a conversa');
});

testarComBanco('enviarMensagem aciona a IA com os membros de agora; a do reenvio não', async (conexao) => {
    const { service, chamadasDaIa } = montar(conexao);
    const { ana, bruno, carla } = await trio(conexao);
    const { grupoId } = (await service.criarGrupo({ nome: 'Time', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo;
    const mensagemId = randomUUID();
    await service.enviarMensagem({ grupoId, mensagemId, texto: '@IA resume' }, como(ana));
    await service.enviarMensagem({ grupoId, mensagemId, texto: '@IA resume' }, como(ana));
    assert.equal(chamadasDaIa.length, 1, 'o reenvio não chama de novo');
    assert.equal(chamadasDaIa[0].grupo?.nome, 'Time');
    assert.equal(chamadasDaIa[0].usuarioAtivo.sub, ana.id);
    assert.deepEqual((await chamadasDaIa[0].grupo!.lerMembrosIds()).sort(), [ana.id, bruno.id].sort());

    await service.adicionarMembros({ grupoId, usuarioIds: [carla.id] }, como(ana));
    assert.deepEqual((await chamadasDaIa[0].grupo!.lerMembrosIds()).sort(), [ana.id, bruno.id, carla.id].sort(), 'os membros são lidos de novo a cada chamada');
});

testarComBanco('recuperarProposta: só da resposta da IA deste grupo; membro vê, quem não é membro recebe 403, proposta alheia dá 404', async (conexao) => {
    const { service, armazenamento } = montar(conexao);
    const { ana, bruno } = await trio(conexao);
    const fora = await criarDesenvolvedor(conexao);
    const grupoId = (await service.criarGrupo({ nome: 'Time', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo.grupoId;
    const outroId = (await service.criarGrupo({ nome: 'Outro', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo.grupoId;
    const daIa = (await armazenamento.gravar({
        mensagemId: randomUUID(), conversaId: `G${grupoId}`, autor: AutorMensagemDiretaEnum.IA, autorUsuarioId: null, texto: 'proposta', contemCodigo: false, mencoes: [], referencias: [],
        chamadaPorUsuarioId: ana.id, propostaIds: [71, 72],
    })).mensagem;

    const paraQuemChamou = (await service.recuperarProposta({ grupoId, mensagemId: daIa.mensagemId, propostaId: 71 }, como(ana))).dados!;
    assert.deepEqual([paraQuemChamou.acessivel, paraQuemChamou.podeResolver], [true, true]);
    const paraOutro = (await service.recuperarProposta({ grupoId, mensagemId: daIa.mensagemId, propostaId: 72 }, como(bruno))).dados!;
    assert.deepEqual([paraOutro.acessivel, paraOutro.podeResolver], [true, false], 'só quem chamou resolve');

    await recusaCom(service.recuperarProposta({ grupoId, mensagemId: daIa.mensagemId, propostaId: 99 }, como(ana)), ResourceNotFoundException);
    await recusaCom(service.recuperarProposta({ grupoId: outroId, mensagemId: daIa.mensagemId, propostaId: 71 }, como(ana)), ResourceNotFoundException);
    await recusaCom(service.recuperarProposta({ grupoId, mensagemId: daIa.mensagemId, propostaId: 71 }, como(fora)), UnauthorizedAccessException);
});

// --- resposta da IA do Chat IA enviada ao grupo (task 329) ------------------

testarComBanco('enviarRespostaDaIa: grava como IA chamada pelo remetente, com a nota antes; só membro envia e o reenvio não duplica', async (conexao) => {
    const { service, eventos } = montar(conexao);
    const { ana, bruno, carla } = await trio(conexao);
    const grupo = (await service.criarGrupo({ nome: 'Time', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo;
    const mensagemId = randomUUID();
    const notaMensagemId = randomUUID();

    const antes = eventos.length;
    const enviada = (await service.enviarRespostaDaIa({ grupoId: grupo.grupoId, mensagemId, texto: 'Valide no service.', nota: 'olha isso', notaMensagemId }, como(bruno))).dados!;

    assert.equal(enviada.jaExistia, false);
    assert.equal(enviada.mensagem.autor, AutorMensagemDiretaEnum.IA);
    assert.equal(enviada.mensagem.autorUsuarioId, null);
    assert.equal(enviada.mensagem.chamadaPorUsuarioId, bruno.id);
    assert.deepEqual(enviada.mensagem.propostaIds, []);
    assert.equal(eventos.length, antes + 2, 'a nota e a resposta avisam os membros');
    assert.deepEqual([...eventos[eventos.length - 1].usuarioIds].sort(), [ana.id, bruno.id].sort());

    const lidas = (await service.listarMensagens({ grupoId: grupo.grupoId } as never, como(ana))).dados!.mensagens.map((mensagem) => `${mensagem.autor}:${mensagem.texto}`);
    assert.deepEqual(lidas.slice(0, 2).reverse(), ['USUARIO:olha isso', 'IA:Valide no service.'], 'a listagem vem da mais nova para a mais antiga');

    const repetida = (await service.enviarRespostaDaIa({ grupoId: grupo.grupoId, mensagemId, texto: 'outro texto' }, como(bruno))).dados!;
    assert.equal(repetida.jaExistia, true);
    assert.equal(repetida.mensagem.texto, 'Valide no service.');

    await recusaCom(service.enviarRespostaDaIa({ grupoId: grupo.grupoId, mensagemId: randomUUID(), texto: 'intruso' }, como(carla)), UnauthorizedAccessException);
    await recusaCom(service.enviarRespostaDaIa({ grupoId: 999_999, mensagemId: randomUUID(), texto: 'x' }, como(ana)), ResourceNotFoundException);
});
