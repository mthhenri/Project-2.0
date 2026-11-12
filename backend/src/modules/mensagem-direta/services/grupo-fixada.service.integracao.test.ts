import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { AutorMensagemDiretaEnum, LIMITE_DE_FIXADAS_DO_GRUPO, MensagemDiretaEventoPublicarDto, TipoGrupoEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { AtividadeRepository } from '../../atividade/repositories/atividade.repository';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { ProjetoRepository } from '../../projeto/repositories/projeto.repository';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import { testarComBanco, ConexaoTeste } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarDemanda, criarDemandaUsuario, criarDesenvolvedor, criarGestor, criarProjeto } from '../../../testes/fabricas';
import { GrupoFixadaRepository } from '../repositories/grupo-fixada.repository';
import { MensagemDiretaReacaoRepository } from '../repositories/mensagem-direta-reacao.repository';
import { GrupoLeituraRepository } from '../repositories/grupo-leitura.repository';
import { GrupoRepository } from '../repositories/grupo.repository';
import { MensagemDiretaPostgresRepository } from '../repositories/mensagem-direta-postgres.repository';
import { MensagemDiretaSupervisaoRepository } from '../repositories/mensagem-direta-supervisao.repository';
import { CanalAcessoService } from './canal-acesso.service';
import { GrupoFixadaService } from './grupo-fixada.service';
import { GrupoSupervisaoService } from './grupo-supervisao.service';
import { GrupoService } from './grupo.service';

// As mensagens fixadas e a busca dentro do grupo (task 250) ponta a ponta: banco real e armazenamento Postgres. Prova a regra (só membro fixa, limite, idempotência,
// o tempo real) e o isolamento da busca (só o grupo pedido, nunca outro grupo nem conversa um a um).

const como = (usuario: { id: number; login: string; tipo: unknown }) => ({ sub: usuario.id, login: usuario.login, tipo: usuario.tipo }) as never;

function montar(conexao: ConexaoTeste) {
    const eventos: MensagemDiretaEventoPublicarDto[] = [];
    const eventosService = { publicarParaUsuarios: async (dto: MensagemDiretaEventoPublicarDto) => { eventos.push(dto); }, listarUsuariosOnline: () => new Set<number>() };
    const armazenamento = new MensagemDiretaPostgresRepository(conexao);
    const grupos = criarRepositorio(GrupoRepository, conexao);
    const canais = new CanalAcessoService(grupos, criarRepositorio(DemandaRepository, conexao), criarRepositorio(ProjetoRepository, conexao), criarRepositorio(UsuarioRepository, conexao));
    const supervisao = new GrupoSupervisaoService(armazenamento, grupos, criarRepositorio(MensagemDiretaSupervisaoRepository, conexao), criarRepositorio(UsuarioRepository, conexao), eventosService as never, canais);
    const grupoService = new GrupoService(
        armazenamento, grupos, criarRepositorio(GrupoLeituraRepository, conexao), criarRepositorio(UsuarioRepository, conexao), criarRepositorio(DemandaRepository, conexao),
        criarRepositorio(AtividadeRepository, conexao), eventosService as never, canais, supervisao, criarRepositorio(MensagemDiretaReacaoRepository, conexao), { atenderSeChamada: async () => undefined } as never, {} as never);
    const service = new GrupoFixadaService(armazenamento, grupoService, criarRepositorio(GrupoFixadaRepository, conexao), eventosService as never);
    return { service, grupoService, armazenamento, eventos };
}

async function cenario(conexao: ConexaoTeste) {
    const [ana, bruno, davi] = [await criarDesenvolvedor(conexao), await criarDesenvolvedor(conexao), await criarDesenvolvedor(conexao)];
    const contexto = montar(conexao);
    const grupo = (await contexto.grupoService.criarGrupo({ nome: 'Time', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo;
    return { ana, bruno, davi, grupo, ...contexto };
}

const recusaCom = (promessa: Promise<unknown>, tipo: new (...argumentos: never[]) => Error) => assert.rejects(promessa, (erro) => erro instanceof tipo);

async function escrever(armazenamento: MensagemDiretaPostgresRepository, grupoId: number, autorUsuarioId: number | null, texto: string, contemCodigo = false) {
    const mensagemId = randomUUID();
    await armazenamento.gravar({
        mensagemId, conversaId: `G${grupoId}`, autor: autorUsuarioId === null ? AutorMensagemDiretaEnum.SISTEMA : AutorMensagemDiretaEnum.USUARIO, autorUsuarioId, texto,
        contemCodigo, mencoes: [], referencias: [],
    });
    return mensagemId;
}

testarComBanco('qualquer membro fixa; a fixada volta com o texto e quem fixou; fixar de novo é idempotente; os membros são avisados para reler', async (conexao) => {
    const { service, armazenamento, eventos, ana, bruno, grupo } = await cenario(conexao);
    const mensagemId = await escrever(armazenamento, grupo.grupoId, ana.id, 'Regras do deploy: sexta não');

    const fixada = (await service.fixarMensagem({ grupoId: grupo.grupoId, mensagemId }, como(bruno))).dados!;
    assert.equal(fixada.jaEstavaFixada, false);
    assert.equal(fixada.fixada.mensagem.texto, 'Regras do deploy: sexta não');
    assert.equal(fixada.fixada.fixadaPorUsuarioId, bruno.id);
    assert.ok(eventos.some((evento) => evento.evento.tipo === 'SINCRONIZAR' && evento.usuarioIds.includes(ana.id) && evento.usuarioIds.includes(bruno.id)), 'todos os membros relêem o grupo');

    const quantidadeDeEventos = eventos.length;
    const repetida = (await service.fixarMensagem({ grupoId: grupo.grupoId, mensagemId }, como(ana))).dados!;
    assert.equal(repetida.jaEstavaFixada, true);
    assert.equal(repetida.fixada.fixadaPorUsuarioId, bruno.id, 'a fixação original fica');
    assert.equal(eventos.length, quantidadeDeEventos, 'repetir não avisa de novo');

    const lista = (await service.listarFixadas({ grupoId: grupo.grupoId }, como(ana))).dados!;
    assert.deepEqual(lista.fixadas.map((item) => item.mensagem.mensagemId), [mensagemId]);
});

testarComBanco('quem não é membro não fixa, não desafixa e não lista; quem saiu do grupo também não', async (conexao) => {
    const { service, grupoService, armazenamento, ana, bruno, davi, grupo } = await cenario(conexao);
    const mensagemId = await escrever(armazenamento, grupo.grupoId, ana.id, 'algo importante');
    await service.fixarMensagem({ grupoId: grupo.grupoId, mensagemId }, como(ana));

    await recusaCom(service.fixarMensagem({ grupoId: grupo.grupoId, mensagemId }, como(davi)), UnauthorizedAccessException);
    await recusaCom(service.desafixarMensagem({ grupoId: grupo.grupoId, mensagemId }, como(davi)), UnauthorizedAccessException);
    await recusaCom(service.listarFixadas({ grupoId: grupo.grupoId }, como(davi)), UnauthorizedAccessException);

    await grupoService.sairDoGrupo(grupo.grupoId, como(bruno));
    await recusaCom(service.listarFixadas({ grupoId: grupo.grupoId }, como(bruno)), UnauthorizedAccessException);
});

testarComBanco('só mensagem de pessoa deste grupo se fixa: a do sistema, a de outro grupo e a inexistente são recusadas', async (conexao) => {
    const { service, grupoService, armazenamento, ana, grupo } = await cenario(conexao);
    const outro = (await grupoService.criarGrupo({ nome: 'Outro' }, como(ana))).dados!.grupo;
    const doSistema = await escrever(armazenamento, grupo.grupoId, null, 'Fulano entrou');
    const doOutroGrupo = await escrever(armazenamento, outro.grupoId, ana.id, 'de outro grupo');

    await recusaCom(service.fixarMensagem({ grupoId: grupo.grupoId, mensagemId: doSistema }, como(ana)), BusinessException);
    await recusaCom(service.fixarMensagem({ grupoId: grupo.grupoId, mensagemId: doOutroGrupo }, como(ana)), ResourceNotFoundException);
    await recusaCom(service.fixarMensagem({ grupoId: grupo.grupoId, mensagemId: randomUUID() }, como(ana)), ResourceNotFoundException);
});

testarComBanco('o limite de fixadas por grupo é respeitado; desafixar libera vaga e some para todos', async (conexao) => {
    const { service, armazenamento, eventos, ana, bruno, grupo } = await cenario(conexao);
    const ids: string[] = [];
    for (let indice = 0; indice < LIMITE_DE_FIXADAS_DO_GRUPO; indice++) {
        const mensagemId = await escrever(armazenamento, grupo.grupoId, ana.id, `mensagem ${indice}`);
        ids.push(mensagemId);
        await service.fixarMensagem({ grupoId: grupo.grupoId, mensagemId }, como(ana));
    }
    const excedente = await escrever(armazenamento, grupo.grupoId, ana.id, 'a décima primeira');
    await recusaCom(service.fixarMensagem({ grupoId: grupo.grupoId, mensagemId: excedente }, como(ana)), BusinessException);

    const quantidadeDeEventos = eventos.length;
    const desafixada = (await service.desafixarMensagem({ grupoId: grupo.grupoId, mensagemId: ids[0] }, como(bruno))).dados!;
    assert.equal(desafixada.estavaFixada, true);
    assert.ok(eventos.length > quantidadeDeEventos, 'desafixar avisa os membros');
    assert.equal((await service.listarFixadas({ grupoId: grupo.grupoId }, como(ana))).dados!.fixadas.length, LIMITE_DE_FIXADAS_DO_GRUPO - 1);
    assert.equal((await service.desafixarMensagem({ grupoId: grupo.grupoId, mensagemId: ids[0] }, como(bruno))).dados!.estavaFixada, false, 'desafixar de novo é inofensivo');

    await service.fixarMensagem({ grupoId: grupo.grupoId, mensagemId: excedente }, como(ana));
});

testarComBanco('a busca dentro do grupo acha texto sem acento e código e não traz mensagem de outro grupo nem de conversa um a um', async (conexao) => {
    const { service, grupoService, armazenamento, ana, bruno, davi, grupo } = await cenario(conexao);
    const outro = (await grupoService.criarGrupo({ nome: 'Outro', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo;
    const marca = `zq${Date.now()}`;
    await escrever(armazenamento, grupo.grupoId, ana.id, `Reunião de planejamento ${marca}`);
    await escrever(armazenamento, grupo.grupoId, bruno.id, `trecho ${marca}:\n\`\`\`ts\nconst a = 1;\n\`\`\``, true);
    await escrever(armazenamento, outro.grupoId, ana.id, `Reunião de planejamento ${marca} no outro grupo`);
    await armazenamento.gravar({ mensagemId: randomUUID(), conversaId: `${Math.min(ana.id, bruno.id)}-${Math.max(ana.id, bruno.id)}`, autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId: ana.id, texto: `Reunião de planejamento ${marca} um a um`, contemCodigo: false, mencoes: [], referencias: [] });

    const achadas = (await service.buscarNoGrupo({ grupoId: grupo.grupoId, texto: `reuniao planejamento ${marca}` }, como(ana))).dados!;
    assert.equal(achadas.mensagens.length, 1, 'sem acento, e só deste grupo');
    assert.equal(achadas.mensagens[0].conversaId, `G${grupo.grupoId}`);

    const comCodigo = (await service.buscarNoGrupo({ grupoId: grupo.grupoId, texto: `trecho ${marca}`, somenteCodigo: true }, como(bruno))).dados!;
    assert.equal(comCodigo.mensagens.length, 1);
    assert.equal((await service.buscarNoGrupo({ grupoId: grupo.grupoId, texto: `planejamento ${marca}`, somenteCodigo: true }, como(bruno))).dados!.mensagens.length, 0);

    await recusaCom(service.buscarNoGrupo({ grupoId: grupo.grupoId, texto: marca }, como(davi)), UnauthorizedAccessException);
});

testarComBanco('quem saiu do grupo não busca mais nele', async (conexao) => {
    const { service, grupoService, armazenamento, ana, bruno, grupo } = await cenario(conexao);
    await escrever(armazenamento, grupo.grupoId, ana.id, 'segredo do grupo');
    await grupoService.sairDoGrupo(grupo.grupoId, como(bruno));
    await recusaCom(service.buscarNoGrupo({ grupoId: grupo.grupoId, texto: 'segredo' }, como(bruno)), UnauthorizedAccessException);
});

testarComBanco('no canal: o membro por demanda_usuario fixa e busca; o gestor que só lê por tipo vê as fixadas mas não fixa nem busca', async (conexao) => {
    const { service, grupoService, armazenamento } = montar(conexao);
    const [ana, davi] = [await criarDesenvolvedor(conexao), await criarDesenvolvedor(conexao)];
    const gestor = await criarGestor(conexao);
    const projeto = await criarProjeto(conexao);
    const raiz = await criarDemanda(conexao, { projetoId: projeto.id, nome: 'Cadastro' });
    await criarDemandaUsuario(conexao, { demandaId: raiz.id, usuarioId: ana.id });
    const canal = (await grupoService.criarCanal({ tipo: TipoGrupoEnum.DEMANDA, alvoId: raiz.id }, como(ana))).dados!.grupo;
    const mensagemId = await escrever(armazenamento, canal.grupoId, ana.id, 'decisão do canal');

    await service.fixarMensagem({ grupoId: canal.grupoId, mensagemId }, como(ana));
    assert.equal((await service.buscarNoGrupo({ grupoId: canal.grupoId, texto: 'decisao' }, como(ana))).dados!.mensagens.length, 1);

    assert.equal((await service.listarFixadas({ grupoId: canal.grupoId }, como(gestor))).dados!.fixadas.length, 1, 'o gestor lê as fixadas por tipo');
    await recusaCom(service.fixarMensagem({ grupoId: canal.grupoId, mensagemId }, como(gestor)), UnauthorizedAccessException);
    await recusaCom(service.buscarNoGrupo({ grupoId: canal.grupoId, texto: 'decisao' }, como(gestor)), UnauthorizedAccessException);
    await recusaCom(service.listarFixadas({ grupoId: canal.grupoId }, como(davi)), UnauthorizedAccessException);

    await conexao.raw(`
        UPDATE demanda_usuario
        SET
            is_deleted = true,
            deleted_date = NOW()
        WHERE
            demanda_id = :demandaId
            AND usuario_id = :usuarioId
    `, { demandaId: raiz.id, usuarioId: ana.id });
    await recusaCom(service.listarFixadas({ grupoId: canal.grupoId }, como(ana)), UnauthorizedAccessException);
});
