import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { AutorMensagemDiretaEnum, MensagemDiretaEventoPublicarDto, TipoGrupoEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { AtividadeRepository } from '../../atividade/repositories/atividade.repository';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { ProjetoRepository } from '../../projeto/repositories/projeto.repository';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import { testarComBanco, ConexaoTeste } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarAdministrador, criarDemanda, criarDemandaUsuario, criarDesenvolvedor, criarGestor, criarProjeto, excluirLinha } from '../../../testes/fabricas';
import { MensagemDiretaReacaoRepository } from '../repositories/mensagem-direta-reacao.repository';
import { GrupoLeituraRepository } from '../repositories/grupo-leitura.repository';
import { GrupoRepository } from '../repositories/grupo.repository';
import { MensagemDiretaPostgresRepository } from '../repositories/mensagem-direta-postgres.repository';
import { MensagemDiretaSupervisaoRepository } from '../repositories/mensagem-direta-supervisao.repository';
import { CanalAcessoService } from './canal-acesso.service';
import { GrupoSupervisaoService } from './grupo-supervisao.service';
import { GrupoService } from './grupo.service';

// Os canais de demanda e de projeto (task 248) ponta a ponta: usuários, projetos, demandas e `demanda_usuario` reais no banco de teste, o armazenamento
// Postgres provisório e um registrador no lugar do barramento. Prova o que o dublê não prova: o acesso vem de `demanda_usuario` (e some quando a pessoa sai
// da demanda), o gestor lê pela supervisão e vira membro ao escrever, o canal é único e a supervisão o lê sempre.

const como = (usuario: { id: number; login: string; tipo: unknown }) => ({ sub: usuario.id, login: usuario.login, tipo: usuario.tipo }) as never;

function montar(conexao: ConexaoTeste) {
    const eventos: MensagemDiretaEventoPublicarDto[] = [];
    const eventosService = {
        publicarParaUsuarios: async (dto: MensagemDiretaEventoPublicarDto) => { eventos.push(dto); },
        listarUsuariosOnline: () => new Set<number>(),
    };
    const armazenamento = new MensagemDiretaPostgresRepository(conexao);
    const grupos = criarRepositorio(GrupoRepository, conexao);
    const canais = new CanalAcessoService(grupos, criarRepositorio(DemandaRepository, conexao), criarRepositorio(ProjetoRepository, conexao), criarRepositorio(UsuarioRepository, conexao));
    const supervisao = new GrupoSupervisaoService(armazenamento, grupos, criarRepositorio(MensagemDiretaSupervisaoRepository, conexao), criarRepositorio(UsuarioRepository, conexao), eventosService as never, canais);
    const service = new GrupoService(
        armazenamento,
        grupos,
        criarRepositorio(GrupoLeituraRepository, conexao),
        criarRepositorio(UsuarioRepository, conexao),
        criarRepositorio(DemandaRepository, conexao),
        criarRepositorio(AtividadeRepository, conexao),
        eventosService as never,
        canais,
        supervisao, criarRepositorio(MensagemDiretaReacaoRepository, conexao), { atenderSeChamada: async () => undefined } as never, {} as never);
    return { service, supervisao, eventos, armazenamento, grupos };
}

/** Um projeto com a demanda raiz (Ana e Bruno) e uma filha (só Carla); Davi está fora de tudo. */
async function cenario(conexao: ConexaoTeste) {
    const [ana, bruno, carla, davi] = [await criarDesenvolvedor(conexao), await criarDesenvolvedor(conexao), await criarDesenvolvedor(conexao), await criarDesenvolvedor(conexao)];
    const projeto = await criarProjeto(conexao, { nome: 'Portal do cliente' });
    const raiz = await criarDemanda(conexao, { projetoId: projeto.id, nome: 'Cadastro de clientes', estrutural: true });
    const filha = await criarDemanda(conexao, { projetoId: projeto.id, demandaPaiId: raiz.id, nome: 'Tela de busca' });
    await criarDemandaUsuario(conexao, { demandaId: raiz.id, usuarioId: ana.id, dataBase: '2026-10-01T10:00:00.000Z' });
    await criarDemandaUsuario(conexao, { demandaId: raiz.id, usuarioId: bruno.id, dataBase: '2026-10-02T10:00:00.000Z' });
    await criarDemandaUsuario(conexao, { demandaId: filha.id, usuarioId: carla.id, dataBase: '2026-10-03T10:00:00.000Z' });
    return { ana, bruno, carla, davi, projeto, raiz, filha };
}

const demanda = (alvoId: number) => ({ tipo: TipoGrupoEnum.DEMANDA as const, alvoId });
const projeto = (alvoId: number) => ({ tipo: TipoGrupoEnum.PROJETO as const, alvoId });
const recusaCom = (promessa: Promise<unknown>, tipo: new (...argumentos: never[]) => Error) => assert.rejects(promessa, (erro) => erro instanceof tipo);
const textos = (mensagens: { texto: string }[]) => mensagens.map((mensagem) => mensagem.texto);
const enviar = (service: GrupoService, grupoId: number, quem: { id: number; login: string; tipo: unknown }, texto: string, extra: Record<string, unknown> = {}) =>
    service.enviarMensagem({ grupoId, mensagemId: randomUUID(), texto, ...extra } as never, como(quem));

// --- criar e recuperar -----------------------------------------------------

testarComBanco('criarCanal da demanda: quem está nela abre, o nome é o da demanda, os membros vêm de demanda_usuario e a mensagem do sistema avisa', async (conexao) => {
    const { service, eventos } = montar(conexao);
    const { ana, bruno, carla, raiz } = await cenario(conexao);

    const criado = (await service.criarCanal(demanda(raiz.id), como(ana))).dados!;

    assert.equal(criado.jaExistia, false);
    assert.equal(criado.grupo.tipo, TipoGrupoEnum.DEMANDA);
    assert.equal(criado.grupo.nome, 'Cadastro de clientes');
    assert.deepEqual(criado.grupo.membros.map((membro) => membro.usuarioId).sort((primeiro, segundo) => primeiro - segundo), [ana.id, bruno.id].sort((primeiro, segundo) => primeiro - segundo), 'só a demanda, sem a filha');
    assert.equal(criado.grupo.membros.some((membro) => membro.usuarioId === carla.id), false);
    assert.equal(criado.grupo.privado, false, 'canal nunca é privado para a supervisão');
    assert.equal(criado.grupo.leituraPorSupervisao, false);
    assert.equal(criado.grupo.ultimaMensagem?.autor, AutorMensagemDiretaEnum.SISTEMA);
    assert.match(criado.grupo.ultimaMensagem!.texto, /abriu o chat da demanda/);
    assert.ok(eventos.some((evento) => evento.evento.tipo === 'SINCRONIZAR' && evento.usuarioIds.includes(bruno.id)), 'Bruno recebe o canal na lista sem recarregar');
});

testarComBanco('criarCanal é idempotente: o segundo pedido (de outra pessoa) devolve o mesmo canal sem nova mensagem', async (conexao) => {
    const { service } = montar(conexao);
    const { ana, bruno, raiz } = await cenario(conexao);

    const primeiro = (await service.criarCanal(demanda(raiz.id), como(ana))).dados!;
    const segundo = (await service.criarCanal(demanda(raiz.id), como(bruno))).dados!;

    assert.equal(segundo.jaExistia, true);
    assert.equal(segundo.grupo.grupoId, primeiro.grupo.grupoId);
    const conversa = await service.listarMensagens({ grupoId: primeiro.grupo.grupoId }, como(ana));
    assert.equal(conversa.dados!.mensagens.length, 1, 'só a mensagem de criação');
});

testarComBanco('criarCanal exige o acesso: o de fora da demanda recebe 403, demanda inexistente 404, gestor e administrador abrem qualquer um', async (conexao) => {
    const { service } = montar(conexao);
    const { davi, carla, raiz, projeto: projetoDoCenario } = await cenario(conexao);
    const gestor = await criarGestor(conexao);
    const administrador = await criarAdministrador(conexao);

    await recusaCom(service.criarCanal(demanda(raiz.id), como(davi)), UnauthorizedAccessException);
    await recusaCom(service.criarCanal(demanda(raiz.id), como(carla)), UnauthorizedAccessException);
    await recusaCom(service.criarCanal(projeto(projetoDoCenario.id), como(davi)), UnauthorizedAccessException);
    await recusaCom(service.criarCanal(demanda(999999), como(gestor)), ResourceNotFoundException);
    await recusaCom(service.criarCanal(projeto(999999), como(gestor)), ResourceNotFoundException);
    await recusaCom(service.recuperarCanal(demanda(raiz.id), como(davi)), UnauthorizedAccessException);

    assert.equal((await service.criarCanal(demanda(raiz.id), como(gestor))).dados!.grupo.tipo, TipoGrupoEnum.DEMANDA);
    assert.equal((await service.criarCanal(projeto(projetoDoCenario.id), como(administrador))).dados!.grupo.tipo, TipoGrupoEnum.PROJETO);
});

testarComBanco('recuperarCanal devolve null enquanto o chat não existe e o canal depois de criado', async (conexao) => {
    const { service } = montar(conexao);
    const { ana, raiz } = await cenario(conexao);

    assert.equal((await service.recuperarCanal(demanda(raiz.id), como(ana))).dados!.grupo, null);
    const criado = (await service.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;
    assert.equal((await service.recuperarCanal(demanda(raiz.id), como(ana))).dados!.grupo?.grupoId, criado.grupoId);
});

testarComBanco('o canal do projeto reúne quem está em qualquer demanda dele, e a demanda filha tem canal próprio', async (conexao) => {
    const { service } = montar(conexao);
    const { ana, bruno, carla, davi, projeto: projetoDoCenario, raiz, filha } = await cenario(conexao);

    const doProjeto = (await service.criarCanal(projeto(projetoDoCenario.id), como(carla))).dados!.grupo;
    const daFilha = (await service.criarCanal(demanda(filha.id), como(carla))).dados!.grupo;
    const daRaiz = (await service.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;

    assert.deepEqual(doProjeto.membros.map((membro) => membro.usuarioId).sort((primeiro, segundo) => primeiro - segundo), [ana.id, bruno.id, carla.id].sort((primeiro, segundo) => primeiro - segundo));
    assert.equal(doProjeto.nome, 'Portal do cliente');
    assert.deepEqual(daFilha.membros.map((membro) => membro.usuarioId), [carla.id], 'a filha tem o canal só de quem está nela');
    assert.equal(new Set([doProjeto.grupoId, daFilha.grupoId, daRaiz.grupoId]).size, 3, 'um canal por demanda e por projeto');
    assert.deepEqual((await service.listarResumos(como(davi))), [], 'quem está fora não vê canal nenhum');
});

// --- mensagens e acesso ----------------------------------------------------

testarComBanco('quem está na demanda lê e escreve; quem não está recebe 403 em tudo', async (conexao) => {
    const { service } = montar(conexao);
    const { ana, bruno, davi, raiz } = await cenario(conexao);
    const canal = (await service.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;

    await enviar(service, canal.grupoId, ana, 'Subi o PR do cadastro');
    const lidas = await service.listarMensagens({ grupoId: canal.grupoId }, como(bruno));
    assert.ok(textos(lidas.dados!.mensagens).includes('Subi o PR do cadastro'));
    assert.equal((await service.listarResumos(como(bruno)))[0].naoLidas, 1, 'a mensagem da Ana conta como não lida para o Bruno');

    await recusaCom(service.listarMensagens({ grupoId: canal.grupoId }, como(davi)), UnauthorizedAccessException);
    await recusaCom(enviar(service, canal.grupoId, davi, 'oi'), UnauthorizedAccessException);
    await recusaCom(service.alterarLeitura({ grupoId: canal.grupoId, lidaAteData: new Date().toISOString() }, como(davi)), UnauthorizedAccessException);
    await recusaCom(service.alterarSilencio({ grupoId: canal.grupoId, silenciada: true }, como(davi)), UnauthorizedAccessException);
    await recusaCom(service.recuperarGrupo(canal.grupoId, como(davi)), UnauthorizedAccessException);
});

testarComBanco('tirar a pessoa de demanda_usuario faz o canal e o histórico sumirem para ela na hora; atribuí-la de novo devolve tudo', async (conexao) => {
    const { service } = montar(conexao);
    const { ana, bruno, raiz } = await cenario(conexao);
    const canal = (await service.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;
    await enviar(service, canal.grupoId, ana, 'Antes de o Bruno sair');
    assert.equal((await service.listarResumos(como(bruno))).length, 1);

    await conexao.raw(`
        UPDATE demanda_usuario
        SET
            is_deleted = true,
            deleted_date = NOW()
        WHERE
            demanda_id = :demandaId
            AND usuario_id = :usuarioId
    `, { demandaId: raiz.id, usuarioId: bruno.id });

    assert.deepEqual(await service.listarResumos(como(bruno)), [], 'o canal some da lista');
    assert.deepEqual(await service.listarGrupoIdsDoUsuario(como(bruno)), [], 'e da busca');
    await recusaCom(service.listarMensagens({ grupoId: canal.grupoId }, como(bruno)), UnauthorizedAccessException);
    await recusaCom(enviar(service, canal.grupoId, bruno, 'ainda aqui?'), UnauthorizedAccessException);
    const restantes = (await service.recuperarGrupo(canal.grupoId, como(ana))).dados!.grupo.membros.map((membro) => membro.usuarioId);
    assert.deepEqual(restantes, [ana.id], 'os membros do canal acompanham a demanda');

    await criarDemandaUsuario(conexao, { demandaId: raiz.id, usuarioId: bruno.id, dataBase: '2026-11-05T10:00:00.000Z' });
    assert.equal((await service.listarResumos(como(bruno))).length, 1, 'a atribuição devolve o canal');
});

testarComBanco('@todos num canal alcança os membros da demanda (menos quem escreve) e a menção a quem está fora é recusada', async (conexao) => {
    const { service, armazenamento } = montar(conexao);
    const { ana, bruno, carla, raiz } = await cenario(conexao);
    const canal = (await service.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;

    const enviada = (await enviar(service, canal.grupoId, ana, 'Reunião às 15h @todos', { mencionaTodos: true })).dados!;
    assert.deepEqual(enviada.mensagem.mencoes, [bruno.id]);
    await recusaCom(enviar(service, canal.grupoId, ana, 'olha, @carla', { mencoes: [carla.id] }), BusinessException);
    assert.ok(await armazenamento.recuperarMensagem({ conversaId: canal.conversaId, mensagemId: enviada.mensagem.mensagemId }));
});

testarComBanco('o nome do canal acompanha a renomeação da demanda e o canal some quando a demanda é excluída', async (conexao) => {
    const { service } = montar(conexao);
    const { ana, raiz } = await cenario(conexao);
    const canal = (await service.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;

    await conexao.raw(`
        UPDATE demanda
        SET
            nome = 'Cadastro de pessoas',
            updated_date = NOW()
        WHERE
            id = :id
    `, { id: raiz.id });
    assert.equal((await service.listarResumos(como(ana)))[0].nome, 'Cadastro de pessoas');

    await excluirLinha(conexao, 'demanda', raiz.id);
    assert.deepEqual(await service.listarResumos(como(ana)), [], 'sem demanda não há canal');
    await recusaCom(service.listarMensagens({ grupoId: canal.grupoId }, como(ana)), ResourceNotFoundException);
});

testarComBanco('canal não se renomeia, não recebe membros e não tem saída', async (conexao) => {
    const { service } = montar(conexao);
    const { ana, davi, raiz } = await cenario(conexao);
    const canal = (await service.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;

    await recusaCom(service.alterarGrupo({ grupoId: canal.grupoId, nome: 'Outro nome' }, como(ana)), BusinessException);
    await recusaCom(service.adicionarMembros({ grupoId: canal.grupoId, usuarioIds: [davi.id] }, como(ana)), BusinessException);
    await recusaCom(service.sairDoGrupo(canal.grupoId, como(ana)), BusinessException);
});

testarComBanco('o silêncio do canal é de cada membro e a leitura zera as não lidas', async (conexao) => {
    const { service } = montar(conexao);
    const { ana, bruno, raiz } = await cenario(conexao);
    const canal = (await service.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;
    await enviar(service, canal.grupoId, ana, 'uma');
    await service.alterarSilencio({ grupoId: canal.grupoId, silenciada: true }, como(bruno));

    const resumo = (await service.listarResumos(como(bruno)))[0];
    assert.equal(resumo.silenciada, true);
    assert.equal(resumo.naoLidas, 1);
    await service.alterarLeitura({ grupoId: canal.grupoId, lidaAteData: new Date().toISOString() }, como(bruno));
    assert.equal((await service.listarResumos(como(bruno)))[0].naoLidas, 0);
    assert.equal((await service.listarResumos(como(ana)))[0].silenciada, false);
});

// --- gestor e administrador ------------------------------------------------

testarComBanco('o gestor lê o canal sem ser membro (auditado e avisado, uma vez por dia) e não aparece na lista dos membros', async (conexao) => {
    const { service } = montar(conexao);
    const { ana, bruno, raiz } = await cenario(conexao);
    const gestor = await criarGestor(conexao);
    const canal = (await service.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;
    await enviar(service, canal.grupoId, ana, 'Segredo industrial');

    const resumoDoGestor = (await service.recuperarGrupo(canal.grupoId, como(gestor))).dados!.grupo;
    assert.equal(resumoDoGestor.leituraPorSupervisao, true);
    assert.equal(resumoDoGestor.membros.some((membro) => membro.usuarioId === gestor.id), false);

    const lidas = await service.listarMensagens({ grupoId: canal.grupoId }, como(gestor));
    assert.ok(textos(lidas.dados!.mensagens).includes('Segredo industrial'));
    const conversaDeAna = await service.listarMensagens({ grupoId: canal.grupoId }, como(ana));
    assert.equal(textos(conversaDeAna.dados!.mensagens).filter((texto) => /leu este canal/.test(texto)).length, 1, 'o aviso aos membros sai');
    await service.listarMensagens({ grupoId: canal.grupoId }, como(gestor));
    const depois = await service.listarMensagens({ grupoId: canal.grupoId }, como(bruno));
    assert.equal(textos(depois.dados!.mensagens).filter((texto) => /leu este canal/.test(texto)).length, 1, 'no máximo um aviso por leitor e dia');

    const auditoria = await conexao.raw(`
        SELECT
            COUNT(*)::int AS total
        FROM
            mensagem_direta_supervisao
        WHERE
            leitor_usuario_id = :id
            AND grupo_id = :grupoId
            AND is_deleted = false
    `, { id: gestor.id, grupoId: canal.grupoId });
    assert.equal(auditoria.rows[0].total, 2, 'cada abertura é auditada');
    assert.equal((await service.alterarLeitura({ grupoId: canal.grupoId, lidaAteData: new Date().toISOString() }, como(gestor))).sucesso, true, 'marcar como lido por tipo é inofensivo');
    assert.deepEqual(await service.listarResumos(como(gestor)), [], 'ler por tipo não põe o canal na lista do gestor');
});

testarComBanco('o gestor que escreve vira membro: o canal entra na lista dele, a entrada é avisada e ele passa a valer para @todos e para as não lidas', async (conexao) => {
    const { service } = montar(conexao);
    const { ana, bruno, raiz } = await cenario(conexao);
    const gestor = await criarGestor(conexao);
    const canal = (await service.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;
    await enviar(service, canal.grupoId, ana, 'Antes de o gestor entrar');

    await enviar(service, canal.grupoId, gestor, 'Pessoal, prioridade no cadastro');

    const doGestor = await service.listarResumos(como(gestor));
    assert.equal(doGestor.length, 1);
    assert.equal(doGestor[0].leituraPorSupervisao, false, 'agora ele é membro');
    assert.equal(doGestor[0].naoLidas, 0, 'as não lidas contam a partir da entrada, não do histórico');
    assert.equal(doGestor[0].membros.some((membro) => membro.usuarioId === gestor.id), true);
    assert.equal(doGestor[0].privado, false, 'canal com gestor continua legível pela supervisão');
    const conversa = await service.listarMensagens({ grupoId: canal.grupoId }, como(bruno));
    assert.ok(textos(conversa.dados!.mensagens).some((texto) => /\(gestor\) entrou no chat/.test(texto)));

    const comTodos = (await enviar(service, canal.grupoId, ana, 'Confirma @todos', { mencionaTodos: true })).dados!;
    assert.deepEqual([...comTodos.mensagem.mencoes].sort((primeiro, segundo) => primeiro - segundo), [bruno.id, gestor.id].sort((primeiro, segundo) => primeiro - segundo));
    assert.equal((await service.listarResumos(como(gestor)))[0].naoLidas, 1, 'a mensagem da Ana, depois da entrada, é não lida para ele');
    await recusaCom(service.sairDoGrupo(canal.grupoId, como(gestor)), BusinessException);
});

testarComBanco('o administrador também lê por tipo e o canal em que um gestor escreveu continua na supervisão de outro gestor', async (conexao) => {
    const { service, supervisao } = montar(conexao);
    const { ana, raiz } = await cenario(conexao);
    const gestor = await criarGestor(conexao);
    const administrador = await criarAdministrador(conexao);
    const canal = (await service.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;
    await enviar(service, canal.grupoId, gestor, 'Mensagem do gestor');

    const lista = (await supervisao.listarGruposSupervisionados({}, como(administrador))).dados!;
    assert.deepEqual(lista.grupos.map((item) => item.grupoId), [canal.grupoId]);
    assert.equal(lista.grupos[0].tipo, TipoGrupoEnum.DEMANDA);
    assert.equal(lista.grupos[0].nome, 'Cadastro de clientes');
    const lido = (await supervisao.lerGrupoSupervisionado({ grupoId: canal.grupoId }, como(administrador))).dados!;
    assert.equal(lido.tipo, TipoGrupoEnum.DEMANDA);
    assert.ok(textos(lido.mensagens).includes('Mensagem do gestor'));
});

// --- supervisão ------------------------------------------------------------

testarComBanco('a supervisão lista os canais com mensagem (sem os de que o leitor é membro) e recusa o de que ele é membro', async (conexao) => {
    const { service, supervisao } = montar(conexao);
    const { ana, raiz, filha, carla } = await cenario(conexao);
    const gestor = await criarGestor(conexao);
    const daRaiz = (await service.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;
    const daFilha = (await service.criarCanal(demanda(filha.id), como(carla))).dados!.grupo;
    await enviar(service, daFilha.grupoId, gestor, 'Eu escrevi aqui');

    const lista = (await supervisao.listarGruposSupervisionados({}, como(gestor))).dados!;
    assert.deepEqual(lista.grupos.map((item) => item.grupoId), [daRaiz.grupoId], 'o canal em que o gestor é membro não é supervisão');
    await recusaCom(supervisao.lerGrupoSupervisionado({ grupoId: daFilha.grupoId }, como(gestor)), UnauthorizedAccessException);
});

testarComBanco('canal cuja demanda foi excluída sai da supervisão e não pode mais ser lido', async (conexao) => {
    const { service, supervisao } = montar(conexao);
    const { ana, raiz } = await cenario(conexao);
    const gestor = await criarGestor(conexao);
    const canal = (await service.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;
    await enviar(service, canal.grupoId, ana, 'oi');
    assert.equal((await supervisao.listarGruposSupervisionados({}, como(gestor))).dados!.grupos.length, 1);

    await excluirLinha(conexao, 'demanda', raiz.id);

    assert.equal((await supervisao.listarGruposSupervisionados({}, como(gestor))).dados!.grupos.length, 0);
    await recusaCom(supervisao.lerGrupoSupervisionado({ grupoId: canal.grupoId }, como(gestor)), ResourceNotFoundException);
});

testarComBanco('o canal do desenvolvedor aparece na lista dele junto com o grupo livre, do mais novo ao mais antigo', async (conexao) => {
    const { service } = montar(conexao);
    const { ana, bruno, raiz } = await cenario(conexao);
    const livre = (await service.criarGrupo({ nome: 'Almoço', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo;
    const canal = (await service.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;
    await enviar(service, livre.grupoId, ana, 'mais recente que o canal');

    const lista = await service.listarResumos(como(ana));
    assert.deepEqual(lista.map((item) => item.grupoId), [livre.grupoId, canal.grupoId]);
    assert.deepEqual(lista.map((item) => item.tipo), [TipoGrupoEnum.LIVRE, TipoGrupoEnum.DEMANDA]);
});

// --- achados da revisão ------------------------------------------------------

testarComBanco('excluir o projeto fecha o canal das demandas dele: lista, leitura, escrita, supervisão e criar deixam de valer', async (conexao) => {
    const { service, supervisao } = montar(conexao);
    const { ana, raiz, projeto: projetoDoCenario } = await cenario(conexao);
    const gestor = await criarGestor(conexao);
    const canal = (await service.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;
    await enviar(service, canal.grupoId, ana, 'oi');

    await excluirLinha(conexao, 'projeto', projetoDoCenario.id);

    assert.deepEqual(await service.listarResumos(como(ana)), []);
    await recusaCom(service.listarMensagens({ grupoId: canal.grupoId }, como(ana)), ResourceNotFoundException);
    await recusaCom(enviar(service, canal.grupoId, ana, 'ainda?'), ResourceNotFoundException);
    await recusaCom(service.criarCanal(demanda(raiz.id), como(gestor)), ResourceNotFoundException);
    assert.equal((await supervisao.listarGruposSupervisionados({}, como(gestor))).dados!.grupos.length, 0);
});

testarComBanco('o gestor só vira membro se a mensagem passa nas validações (resposta a mensagem inexistente não o põe no canal)', async (conexao) => {
    const { service } = montar(conexao);
    const { ana, raiz } = await cenario(conexao);
    const gestor = await criarGestor(conexao);
    const canal = (await service.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;

    await recusaCom(enviar(service, canal.grupoId, gestor, 'respondendo', { respondeAMensagemId: randomUUID() }), BusinessException);

    assert.deepEqual(await service.listarResumos(como(gestor)), [], 'não entrou');
    const conversa = await service.listarMensagens({ grupoId: canal.grupoId }, como(ana));
    assert.equal(textos(conversa.dados!.mensagens).some((texto) => /entrou no chat/.test(texto)), false);
});

testarComBanco('o gestor inativado deixa de contar como membro do canal (e de @todos)', async (conexao) => {
    const { service } = montar(conexao);
    const { ana, raiz } = await cenario(conexao);
    const gestor = await criarGestor(conexao);
    const canal = (await service.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;
    await enviar(service, canal.grupoId, gestor, 'passei por aqui');
    assert.equal((await service.recuperarGrupo(canal.grupoId, como(ana))).dados!.grupo.membros.some((membro) => membro.usuarioId === gestor.id), true);

    await conexao.raw(`
        UPDATE usuario
        SET
            ativo = false
        WHERE
            id = :id
    `, { id: gestor.id });

    assert.equal((await service.recuperarGrupo(canal.grupoId, como(ana))).dados!.grupo.membros.some((membro) => membro.usuarioId === gestor.id), false);
});

testarComBanco('a busca do gestor não alcança o canal cuja demanda foi excluída', async (conexao) => {
    const { service } = montar(conexao);
    const { ana, raiz } = await cenario(conexao);
    const gestor = await criarGestor(conexao);
    const canal = (await service.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;
    await enviar(service, canal.grupoId, gestor, 'texto');
    assert.deepEqual(await service.listarGrupoIdsDoUsuario(como(gestor)), [canal.grupoId]);

    await excluirLinha(conexao, 'demanda', raiz.id);

    assert.deepEqual(await service.listarGrupoIdsDoUsuario(como(gestor)), []);
});

// --- resposta da IA do Chat IA enviada ao canal (task 329) ------------------

testarComBanco('enviarRespostaDaIa no canal: membro da demanda envia, de fora recebe 403 e o gestor que envia vira membro', async (conexao) => {
    const { service } = montar(conexao);
    const { ana, bruno, davi, raiz } = await cenario(conexao);
    const gestor = await criarGestor(conexao);
    const canal = (await service.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;

    const deAna = (await service.enviarRespostaDaIa({ grupoId: canal.grupoId, mensagemId: randomUUID(), texto: 'Resposta da IA', nota: 'veja', notaMensagemId: randomUUID() }, como(ana))).dados!;
    assert.equal(deAna.mensagem.autor, AutorMensagemDiretaEnum.IA);
    assert.equal(deAna.mensagem.chamadaPorUsuarioId, ana.id);

    await recusaCom(service.enviarRespostaDaIa({ grupoId: canal.grupoId, mensagemId: randomUUID(), texto: 'fora' }, como(davi)), UnauthorizedAccessException);

    const membrosAntes = (await service.recuperarGrupo(canal.grupoId, como(ana))).dados!.grupo.membros.map((membro) => membro.usuarioId);
    assert.equal(membrosAntes.includes(gestor.id), false);
    await service.enviarRespostaDaIa({ grupoId: canal.grupoId, mensagemId: randomUUID(), texto: 'Do gestor' }, como(gestor));
    const membrosDepois = (await service.recuperarGrupo(canal.grupoId, como(ana))).dados!.grupo.membros.map((membro) => membro.usuarioId);
    assert.equal(membrosDepois.includes(gestor.id), true, 'o gestor que escreve num canal passa a ser membro');
    assert.deepEqual(membrosDepois.filter((id) => id === bruno.id), [bruno.id]);

    const textosLidos = (await service.listarMensagens({ grupoId: canal.grupoId } as never, como(ana))).dados!.mensagens.filter((mensagem) => mensagem.autor !== AutorMensagemDiretaEnum.SISTEMA).map((mensagem) => mensagem.texto);
    assert.deepEqual(textosLidos.reverse(), ['veja', 'Resposta da IA', 'Do gestor'], 'a listagem vem da mais nova para a mais antiga');
});
