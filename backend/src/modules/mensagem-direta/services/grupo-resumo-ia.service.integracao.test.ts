import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { AutorMensagemDiretaEnum, EstadoIaEnum, GrupoResumoIaDestinoEnum, LINHA_DE_RESUMO_POR_IA, MensagemDiretaEventoPublicarDto, TipoGrupoEnum, TipoPropostaIaEnum, TRECHO_DE_CODIGO_OMITIDO } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { AtividadeRepository } from '../../atividade/repositories/atividade.repository';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { ProjetoRepository } from '../../projeto/repositories/projeto.repository';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import { testarComBanco, ConexaoTeste } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarDemanda, criarDemandaUsuario, criarDesenvolvedor, criarGestor, criarProjeto } from '../../../testes/fabricas';
import { PropostaIaRepository } from '../../proposta-ia/repositories/proposta-ia.repository';
import { GrupoLeituraRepository } from '../repositories/grupo-leitura.repository';
import { GrupoResumoRepository } from '../repositories/grupo-resumo.repository';
import { GrupoRepository } from '../repositories/grupo.repository';
import { MensagemDiretaPostgresRepository } from '../repositories/mensagem-direta-postgres.repository';
import { MensagemDiretaSupervisaoRepository } from '../repositories/mensagem-direta-supervisao.repository';
import { CanalAcessoService } from './canal-acesso.service';
import { GrupoResumoIaService } from './grupo-resumo-ia.service';
import { GrupoSupervisaoService } from './grupo-supervisao.service';
import { GrupoService } from './grupo.service';

// O resumo de grupo e canal com a IA (task 249) ponta a ponta no que é nosso: banco real, armazenamento Postgres, a IA, os custos e as propostas em dublê que
// guardam o que receberam (é o que prova o que sai do servidor: código omitido, sem nome de autor, linha de IA, custo atribuído a quem pediu).

const como = (usuario: { id: number; login: string; tipo: unknown }) => ({ sub: usuario.id, login: usuario.login, tipo: usuario.tipo }) as never;

function montar(conexao: ConexaoTeste, estadoDaIa = EstadoIaEnum.NO_AR) {
    const eventos: MensagemDiretaEventoPublicarDto[] = [];
    const eventosService = { publicarParaUsuarios: async (dto: MensagemDiretaEventoPublicarDto) => { eventos.push(dto); }, listarUsuariosOnline: () => new Set<number>() };
    const recebido: { solicitacoes: Array<{ instrucoes?: string; mensagens: Array<{ conteudo: unknown }> }>; usos: Array<Record<string, unknown>>; propostas: Array<Record<string, unknown>>; confirmadas: number[]; recusadas: number[] } = {
        solicitacoes: [], usos: [], propostas: [], confirmadas: [], recusadas: [],
    };
    const iaService = {
        obterEstado: async () => estadoDaIa,
        gerar: async (solicitacao: { instrucoes?: string; mensagens: Array<{ conteudo: unknown }> }) => {
            recebido.solicitacoes.push(solicitacao);
            return { texto: `- resumo ${recebido.solicitacoes.length}`, blocos: [], nivel: 'RAPIDO', modelo: 'modelo-x', modeloPlanejado: 'modelo-x', tokens: { entrada: 100, saida: 20, cache: 0 }, motivoParada: 'fim' };
        },
    };
    const iaUsoService = { registrar: async (dto: Record<string, unknown>) => { recebido.usos.push(dto); } };
    const configuracaoIaService = {
        obterAtiva: async () => ({ cadeiaRapido: [{ modelo: 'modelo-x' }] }),
        listarPrecos: async () => [{ modelo: 'modelo-x', precoEntradaMilhao: 1, precoSaidaMilhao: 5, precoCacheMilhao: 0 }],
    };
    const propostaIaService = {
        // A proposta é gravada de verdade (o resumo guarda a chave dela); confirmar e recusar só registram, porque o executor é de outro módulo.
        criar: async (dto: Record<string, unknown>) => { recebido.propostas.push(dto); return criarRepositorio(PropostaIaRepository, conexao).criar(dto as never); },
        confirmar: async (id: number) => { recebido.confirmadas.push(id); return { sucesso: true }; },
        recusar: async (id: number) => { recebido.recusadas.push(id); return { sucesso: true }; },
    };
    const armazenamento = new MensagemDiretaPostgresRepository(conexao);
    const grupos = criarRepositorio(GrupoRepository, conexao);
    const canais = new CanalAcessoService(grupos, criarRepositorio(DemandaRepository, conexao), criarRepositorio(ProjetoRepository, conexao), criarRepositorio(UsuarioRepository, conexao));
    const supervisao = new GrupoSupervisaoService(armazenamento, grupos, criarRepositorio(MensagemDiretaSupervisaoRepository, conexao), criarRepositorio(UsuarioRepository, conexao), eventosService as never, canais);
    const grupoService = new GrupoService(
        armazenamento, grupos, criarRepositorio(GrupoLeituraRepository, conexao), criarRepositorio(UsuarioRepository, conexao), criarRepositorio(DemandaRepository, conexao),
        criarRepositorio(AtividadeRepository, conexao), eventosService as never, canais, supervisao,
    );
    const service = new GrupoResumoIaService(
        armazenamento, grupoService, criarRepositorio(GrupoResumoRepository, conexao), iaService as never, iaUsoService as never, configuracaoIaService as never,
        criarRepositorio(DemandaRepository, conexao), propostaIaService as never, eventosService as never,
    );
    return { service, grupoService, armazenamento, recebido, eventos, resumos: criarRepositorio(GrupoResumoRepository, conexao) };
}

async function cenario(conexao: ConexaoTeste) {
    const [ana, bruno, davi] = [await criarDesenvolvedor(conexao), await criarDesenvolvedor(conexao), await criarDesenvolvedor(conexao)];
    const projeto = await criarProjeto(conexao);
    const raiz = await criarDemanda(conexao, { projetoId: projeto.id, nome: 'Cadastro', documentacao: 'Texto que já existe' });
    const outra = await criarDemanda(conexao, { projetoId: projeto.id, nome: 'Outra demanda' });
    const alheia = await criarDemanda(conexao, { nome: 'De outro projeto' });
    await criarDemandaUsuario(conexao, { demandaId: raiz.id, usuarioId: ana.id });
    await criarDemandaUsuario(conexao, { demandaId: raiz.id, usuarioId: bruno.id });
    await criarDemandaUsuario(conexao, { demandaId: outra.id, usuarioId: ana.id });
    return { ana, bruno, davi, projeto, raiz, outra, alheia };
}

const demanda = (alvoId: number) => ({ tipo: TipoGrupoEnum.DEMANDA as const, alvoId });
const projeto = (alvoId: number) => ({ tipo: TipoGrupoEnum.PROJETO as const, alvoId });
const recusaCom = (promessa: Promise<unknown>, tipo: new (...argumentos: never[]) => Error) => assert.rejects(promessa, (erro) => erro instanceof tipo);
const periodoAberto = { inicioData: '2020-01-01T00:00:00.000Z', fimData: '2099-01-01T00:00:00.000Z' };

async function escrever(armazenamento: MensagemDiretaPostgresRepository, grupoId: number, autorUsuarioId: number | null, texto: string) {
    await armazenamento.gravar({
        mensagemId: randomUUID(), conversaId: `G${grupoId}`, autor: autorUsuarioId === null ? AutorMensagemDiretaEnum.SISTEMA : AutorMensagemDiretaEnum.USUARIO, autorUsuarioId, texto,
        contemCodigo: texto.includes('```'), mencoes: [], referencias: [],
    });
}

testarComBanco('resumir: lê as mensagens de pessoa do período, resume, termina com a linha de IA, não manda nome de autor e atribui o custo a quem pediu', async (conexao) => {
    const { service, grupoService, armazenamento, recebido, resumos } = montar(conexao);
    const { ana, bruno, raiz } = await cenario(conexao);
    const canal = (await grupoService.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;
    await escrever(armazenamento, canal.grupoId, ana.id, 'Vamos usar a fila nova');
    await escrever(armazenamento, canal.grupoId, bruno.id, 'Combinado, eu cuido do deploy');

    const criado = (await service.resumir({ grupoId: canal.grupoId, ...periodoAberto, enviaCodigo: false }, como(ana))).dados!;

    assert.equal(criado.quantidadeMensagens, 2, 'só mensagem de pessoa: a do sistema (abertura do chat) não conta');
    assert.ok(criado.texto.endsWith(LINHA_DE_RESUMO_POR_IA));
    assert.equal(recebido.solicitacoes.length, 1);
    const enviado = JSON.stringify(recebido.solicitacoes[0]);
    assert.ok(enviado.includes('Vamos usar a fila nova') && enviado.includes('eu cuido do deploy'));
    assert.ok(!enviado.includes('Ana') && !enviado.includes('Bruno') && !enviado.includes(String(ana.id) + '"'), 'o autor não vai ao provedor');
    assert.equal(recebido.usos.length, 1);
    assert.equal(recebido.usos[0].usuarioId, ana.id);
    assert.equal(recebido.usos[0].demandaId, raiz.id);
    assert.equal(recebido.usos[0].tokensEntrada, 100);
    const ultimo = await resumos.recuperarUltimoResumo({ grupoId: canal.grupoId });
    assert.equal(ultimo?.quantidadeMensagens, 2);
    assert.equal(ultimo?.modelo, 'modelo-x');
});

testarComBanco('com o envio de código desligado nenhum bloco de código chega ao provedor; ligado, chega', async (conexao) => {
    const { service, grupoService, armazenamento, recebido } = montar(conexao);
    const { ana, raiz } = await cenario(conexao);
    const canal = (await grupoService.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;
    await escrever(armazenamento, canal.grupoId, ana.id, 'olha:\n```ts\nconst chave = "segredo-123";\n```\nfunciona');

    await service.resumir({ grupoId: canal.grupoId, ...periodoAberto, enviaCodigo: false }, como(ana));
    const semCodigo = JSON.stringify(recebido.solicitacoes[0]);
    assert.ok(!semCodigo.includes('segredo-123'));
    assert.ok(semCodigo.includes(TRECHO_DE_CODIGO_OMITIDO));

    await service.resumir({ grupoId: canal.grupoId, ...periodoAberto, enviaCodigo: true }, como(ana));
    assert.ok(JSON.stringify(recebido.solicitacoes[1]).includes('segredo-123'));
});

testarComBanco('o período corta as mensagens e um período sem mensagens é recusado', async (conexao) => {
    const { service, grupoService, armazenamento } = montar(conexao);
    const { ana, raiz } = await cenario(conexao);
    const canal = (await grupoService.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;
    await escrever(armazenamento, canal.grupoId, ana.id, 'agora');

    const passado = { inicioData: '2020-01-01T00:00:00.000Z', fimData: '2020-01-02T00:00:00.000Z' };
    await recusaCom(service.resumir({ grupoId: canal.grupoId, ...passado, enviaCodigo: false }, como(ana)), BusinessException);
    assert.equal((await service.estimar({ grupoId: canal.grupoId, ...passado, enviaCodigo: false }, como(ana))).dados!.quantidadeMensagens, 0);
    assert.equal((await service.estimar({ grupoId: canal.grupoId, ...periodoAberto, enviaCodigo: false }, como(ana))).dados!.quantidadeMensagens, 1);
});

testarComBanco('muitas mensagens viram vários blocos, cada um resumido, e uma chamada final fecha num texto só; a estimativa avisa antes', async (conexao) => {
    const { service, grupoService, armazenamento, recebido } = montar(conexao);
    const { ana, raiz } = await cenario(conexao);
    const canal = (await grupoService.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;
    for (let indice = 0; indice < 6; indice++) await escrever(armazenamento, canal.grupoId, ana.id, `mensagem ${indice} ${'x'.repeat(5000)}`);

    const estimativa = (await service.estimar({ grupoId: canal.grupoId, ...periodoAberto, enviaCodigo: false }, como(ana))).dados!;
    assert.equal(estimativa.quantidadeMensagens, 6);
    assert.ok(estimativa.quantidadeBlocos >= 3);
    assert.equal(estimativa.quantidadeChamadas, estimativa.quantidadeBlocos + 1);
    assert.equal(estimativa.custoEstimadoDolar !== null && estimativa.custoEstimadoDolar > 0, true);
    assert.equal(recebido.solicitacoes.length, 0, 'estimar não chama o provedor');

    const criado = (await service.resumir({ grupoId: canal.grupoId, ...periodoAberto, enviaCodigo: false }, como(ana))).dados!;
    assert.equal(recebido.solicitacoes.length, estimativa.quantidadeChamadas);
    assert.ok(JSON.stringify(recebido.solicitacoes[recebido.solicitacoes.length - 1]).includes('Resumo parcial 1'), 'o fechamento recebe os resumos parciais');
    assert.equal(criado.tokensEntrada, 100 * estimativa.quantidadeChamadas);
    assert.equal(recebido.usos[0].tokensEntrada, 100 * estimativa.quantidadeChamadas, 'todas as chamadas entram no custo, numa mensagem de uso só');
});

testarComBanco('sem a IA no ar o resumo recusa com mensagem clara; só membro resume', async (conexao) => {
    const foraDoAr = montar(conexao, EstadoIaEnum.FORA_DO_AR);
    const { ana, davi, raiz } = await cenario(conexao);
    const canal = (await foraDoAr.grupoService.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;
    await escrever(foraDoAr.armazenamento, canal.grupoId, ana.id, 'oi');
    await assert.rejects(foraDoAr.service.resumir({ grupoId: canal.grupoId, ...periodoAberto, enviaCodigo: false }, como(ana)), (erro) => erro instanceof BusinessException && /fora do ar/.test(JSON.stringify((erro as BusinessException).getResponse())));

    await recusaCom(foraDoAr.service.estimar({ grupoId: canal.grupoId, ...periodoAberto, enviaCodigo: false }, como(davi)), UnauthorizedAccessException);
    await recusaCom(foraDoAr.service.recuperarOpcoes({ grupoId: canal.grupoId }, como(davi)), UnauthorizedAccessException);
});

testarComBanco('recuperarOpcoes: o fim do último resumo e o destino conforme o tipo do grupo', async (conexao) => {
    const { service, grupoService, armazenamento } = montar(conexao);
    const { ana, bruno, projeto: projetoDoCenario, raiz } = await cenario(conexao);
    const daDemanda = (await grupoService.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;
    const doProjeto = (await grupoService.criarCanal(projeto(projetoDoCenario.id), como(ana))).dados!.grupo;
    const livre = (await grupoService.criarGrupo({ nome: 'Almoço', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo;

    const antes = (await service.recuperarOpcoes({ grupoId: daDemanda.grupoId }, como(ana))).dados!;
    assert.equal(antes.ultimoResumoData, null);
    assert.equal(antes.destino, GrupoResumoIaDestinoEnum.DEMANDA);
    assert.equal(antes.demandaId, raiz.id);
    assert.equal((await service.recuperarOpcoes({ grupoId: doProjeto.grupoId }, como(ana))).dados!.destino, GrupoResumoIaDestinoEnum.PROJETO);
    assert.equal((await service.recuperarOpcoes({ grupoId: livre.grupoId }, como(ana))).dados!.destino, GrupoResumoIaDestinoEnum.NENHUM);

    await escrever(armazenamento, daDemanda.grupoId, ana.id, 'algo');
    await service.resumir({ grupoId: daDemanda.grupoId, ...periodoAberto, fimData: '2026-11-10T00:00:00.000Z', inicioData: '2020-01-01T00:00:00.000Z', enviaCodigo: false }, como(ana)).catch(() => undefined);
    await service.resumir({ grupoId: daDemanda.grupoId, ...periodoAberto, enviaCodigo: false }, como(ana));
    assert.ok((await service.recuperarOpcoes({ grupoId: daDemanda.grupoId }, como(ana))).dados!.ultimoResumoData instanceof Date);
});

testarComBanco('grupo livre só gera o texto: pedir proposta de gravar é recusado', async (conexao) => {
    const { service, grupoService, armazenamento } = montar(conexao);
    const { ana, bruno } = await cenario(conexao);
    const livre = (await grupoService.criarGrupo({ nome: 'Almoço', membroUsuarioIds: [bruno.id] }, como(ana))).dados!.grupo;
    await escrever(armazenamento, livre.grupoId, ana.id, 'vamos ao restaurante novo');
    const criado = (await service.resumir({ grupoId: livre.grupoId, ...periodoAberto, enviaCodigo: false }, como(ana))).dados!;

    await recusaCom(service.criarProposta({ grupoId: livre.grupoId, resumoId: criado.resumoId, texto: criado.texto }, como(ana)), BusinessException);
});

testarComBanco('proposta no canal de demanda: acrescenta ao fim da documentação com período e data; só quem gerou; confirmar grava e avisa o chat com o cartão da demanda', async (conexao) => {
    const { service, grupoService, armazenamento, recebido, eventos } = montar(conexao);
    const { ana, bruno, raiz } = await cenario(conexao);
    const canal = (await grupoService.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;
    await escrever(armazenamento, canal.grupoId, ana.id, 'decidimos usar a fila');
    const criado = (await service.resumir({ grupoId: canal.grupoId, ...periodoAberto, enviaCodigo: false }, como(ana))).dados!;

    await recusaCom(service.criarProposta({ grupoId: canal.grupoId, resumoId: criado.resumoId, texto: criado.texto }, como(bruno)), UnauthorizedAccessException);

    const proposta = (await service.criarProposta({ grupoId: canal.grupoId, resumoId: criado.resumoId, texto: criado.texto }, como(ana))).dados!;
    assert.equal(proposta.demandaId, raiz.id);
    assert.ok(proposta.textoAcrescentado.startsWith('## Resumo do chat ('));
    assert.ok(proposta.textoAcrescentado.includes(criado.texto));
    assert.equal(recebido.propostas[0].tipo, TipoPropostaIaEnum.ALTERAR_DEMANDA);
    assert.deepEqual((recebido.propostas[0].dados as { demandaId: number }).demandaId, raiz.id);
    assert.equal((recebido.propostas[0].dados as { acrescentarDocumentacao: string }).acrescentarDocumentacao, proposta.textoAcrescentado);
    assert.equal(recebido.confirmadas.length, 0, 'a proposta só grava ao confirmar');

    await recusaCom(service.confirmarProposta({ grupoId: canal.grupoId, resumoId: criado.resumoId, propostaId: 99999 }, como(ana)), BusinessException);
    const gravado = (await service.confirmarProposta({ grupoId: canal.grupoId, resumoId: criado.resumoId, propostaId: proposta.propostaId }, como(ana))).dados!;
    assert.equal(gravado.demandaId, raiz.id);
    assert.deepEqual(recebido.confirmadas, [proposta.propostaId]);

    const conversa = await grupoService.listarMensagens({ grupoId: canal.grupoId }, como(bruno));
    const aviso = conversa.dados!.mensagens.find((mensagem) => /Resumo gravado na demanda/.test(mensagem.texto));
    assert.ok(aviso, 'o canal recebe a mensagem do sistema');
    assert.deepEqual(aviso.referencias.map((referencia) => referencia.id), [raiz.id], 'com o cartão da demanda');
    assert.ok(eventos.some((evento) => evento.evento.tipo === 'MENSAGEM' && evento.usuarioIds.includes(bruno.id)));

    await recusaCom(service.criarProposta({ grupoId: canal.grupoId, resumoId: criado.resumoId, texto: criado.texto }, como(ana)), BusinessException);
});

testarComBanco('recusar a proposta não grava nada e o resumo pode virar proposta de novo', async (conexao) => {
    const { service, grupoService, armazenamento, recebido } = montar(conexao);
    const { ana, raiz } = await cenario(conexao);
    const canal = (await grupoService.criarCanal(demanda(raiz.id), como(ana))).dados!.grupo;
    await escrever(armazenamento, canal.grupoId, ana.id, 'conversa');
    const criado = (await service.resumir({ grupoId: canal.grupoId, ...periodoAberto, enviaCodigo: false }, como(ana))).dados!;
    const proposta = (await service.criarProposta({ grupoId: canal.grupoId, resumoId: criado.resumoId, texto: criado.texto }, como(ana))).dados!;

    await service.recusarProposta({ grupoId: canal.grupoId, resumoId: criado.resumoId, propostaId: proposta.propostaId }, como(ana));

    assert.deepEqual(recebido.recusadas, [proposta.propostaId]);
    assert.equal(recebido.confirmadas.length, 0);
    assert.ok((await service.criarProposta({ grupoId: canal.grupoId, resumoId: criado.resumoId, texto: criado.texto }, como(ana))).dados!.propostaId > proposta.propostaId);
});

testarComBanco('canal de projeto: a demanda de destino é obrigatória e precisa ser do projeto e editável por quem pede', async (conexao) => {
    const { service, grupoService, armazenamento } = montar(conexao);
    const { ana, bruno, projeto: projetoDoCenario, raiz, outra, alheia } = await cenario(conexao);
    const canal = (await grupoService.criarCanal(projeto(projetoDoCenario.id), como(ana))).dados!.grupo;
    await escrever(armazenamento, canal.grupoId, ana.id, 'conversa do projeto');
    const criado = (await service.resumir({ grupoId: canal.grupoId, ...periodoAberto, enviaCodigo: false }, como(ana))).dados!;
    const pedir = (quem: { id: number; login: string; tipo: unknown }, demandaId?: number) =>
        service.criarProposta({ grupoId: canal.grupoId, resumoId: criado.resumoId, texto: criado.texto, ...(demandaId ? { demandaId } : {}) }, como(quem));

    await recusaCom(pedir(ana), BusinessException);
    await recusaCom(pedir(ana, alheia.id), BusinessException);
    assert.equal((await pedir(ana, outra.id)).dados!.demandaId, outra.id);

    const doBruno = (await service.resumir({ grupoId: canal.grupoId, ...periodoAberto, enviaCodigo: false }, como(bruno))).dados!;
    await recusaCom(service.criarProposta({ grupoId: canal.grupoId, resumoId: doBruno.resumoId, texto: doBruno.texto, demandaId: outra.id }, como(bruno)), UnauthorizedAccessException);
    assert.equal((await service.criarProposta({ grupoId: canal.grupoId, resumoId: doBruno.resumoId, texto: doBruno.texto, demandaId: raiz.id }, como(bruno))).dados!.demandaId, raiz.id);
});

testarComBanco('o gestor que escreveu no canal resume e grava em qualquer demanda do projeto', async (conexao) => {
    const { service, grupoService, armazenamento } = montar(conexao);
    const { ana, projeto: projetoDoCenario, outra } = await cenario(conexao);
    const gestor = await criarGestor(conexao);
    const canal = (await grupoService.criarCanal(projeto(projetoDoCenario.id), como(ana))).dados!.grupo;
    await grupoService.enviarMensagem({ grupoId: canal.grupoId, mensagemId: randomUUID(), texto: 'oi, gestor aqui' } as never, como(gestor));
    await escrever(armazenamento, canal.grupoId, ana.id, 'mais uma');

    const criado = (await service.resumir({ grupoId: canal.grupoId, ...periodoAberto, enviaCodigo: false }, como(gestor))).dados!;
    assert.equal((await service.criarProposta({ grupoId: canal.grupoId, resumoId: criado.resumoId, texto: criado.texto, demandaId: outra.id }, como(gestor))).dados!.demandaId, outra.id);
});
