import { describe, it, after } from 'node:test';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { AutorMensagemDiretaEnum, MensagemDiretaResumoDto, ReferenciaMensagemDiretaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { CONTRATO_LIGADO } from '../../chat/repositories/armazenamento-de-chat.contrato';
import { MensagemDiretaNova } from '../domain/mensagem-direta.documento';
import { ArmazenamentoDeMensagemDireta } from './armazenamento-de-mensagem-direta';

const espera = (milissegundos: number) => new Promise((resolver) => setTimeout(resolver, milissegundos));

/**
 * A mesma lista de cenários para toda implementação de `ArmazenamentoDeMensagemDireta` (task 206): é o que garante que trocar o armazenamento
 * (OpenSearch no desenvolvimento, Postgres na produção de teste, Elasticsearch na de verdade) não muda o que o chat enxerga. Roda contra o
 * serviço real e fica desligada por padrão (`CHAT_INTEGRACAO=1` a liga); a do Postgres, que usa o banco de teste local, roda sempre. É ela, e não os testes com cliente em dublê, que prova as consultas:
 * ordenação com `search_after`, agregação por conversa, `filters`, `bucket_sort` e `cardinality`.
 *
 * Cada execução usa usuários próprios (números altos e aleatórios) e uma palavra única (`marca`) em todo texto, para a supervisão, que lê
 * conversas de qualquer pessoa, poder isolar só as desta execução. `limpar` apaga o que foi gravado.
 */
export function registrarContratoDeArmazenamentoDeMensagemDireta(
    nome: string,
    criar: () => Promise<ArmazenamentoDeMensagemDireta>,
    limpar: (usuarioIds: number[], conversaIds: string[]) => Promise<void>,
    /** `sempreLigado`: o armazenamento roda no banco de teste local (Postgres), sem serviço externo, então não espera `CHAT_INTEGRACAO=1`. */
    opcoes: { sempreLigado?: boolean } = {},
): void {
    const pular = !CONTRATO_LIGADO && !opcoes.sempreLigado && 'defina CHAT_INTEGRACAO=1 (usa o serviço real)';
    describe(`contrato do armazenamento das mensagens diretas: ${nome}`, { skip: pular }, () => {
        const base = 900_000_000 + Math.floor(Math.random() * 90_000_000);
        const ana = base;
        const bruno = base + 1;
        const carla = base + 2;
        const gestor = base + 3;
        const davi = base + 4;
        const marca = `zq${base}`;
        const conversaAnaBruno = `${ana}-${bruno}`;
        const conversaAnaCarla = `${ana}-${carla}`;
        const conversaAnaGestor = `${ana}-${gestor}`;
        const conversaBrunoCarla = `${bruno}-${carla}`;
        const conversaAnaDavi = `${ana}-${davi}`;
        // Os grupos (task 246): a mensagem de grupo não tem participantes e o `conversaId` é `G<id>`.
        const grupoUm = base + 100;
        const grupoDois = base + 101;
        const conversaGrupoUm = `G${grupoUm}`;
        const conversaGrupoDois = `G${grupoDois}`;
        let armazenamento: ArmazenamentoDeMensagemDireta;

        const mensagem = (conversaId: string, autorUsuarioId: number | null, texto: string, extras: Partial<MensagemDiretaNova> = {}): MensagemDiretaNova => ({
            mensagemId: randomUUID(),
            conversaId,
            autor: autorUsuarioId === null ? AutorMensagemDiretaEnum.SISTEMA : AutorMensagemDiretaEnum.USUARIO,
            autorUsuarioId,
            texto: `${texto} ${marca}`,
            contemCodigo: false,
            mencoes: [],
            referencias: [],
            ...extras,
        });

        const ids = (mensagens: MensagemDiretaResumoDto[]) => mensagens.map((item) => item.mensagemId);

        // Guardadas entre os cenários (rodam em ordem).
        let primeira: MensagemDiretaResumoDto;
        let segunda: MensagemDiretaResumoDto;
        const daAnaECarla: MensagemDiretaResumoDto[] = []; // da mais antiga para a mais nova

        after(async () => {
            await limpar([ana, bruno, carla, gestor, davi], [conversaGrupoUm, conversaGrupoDois]);
        });

        it('grava e lê a conversa da mais nova para a mais antiga, com todos os campos', async () => {
            armazenamento = await criar();
            const gravada = await armazenamento.gravar(
                mensagem(conversaAnaBruno, ana, 'Bom dia, preciso da descrição do cadastro', { mencoes: [bruno], referencias: [{ tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: 212 }] }),
            );
            assert.equal(gravada.jaExistia, false);
            await espera(15);
            const resposta = await armazenamento.gravar(mensagem(conversaAnaBruno, bruno, 'Claro, olha esse trecho', { contemCodigo: true }));
            primeira = gravada.mensagem;
            segunda = resposta.mensagem;

            const pagina = await armazenamento.listarConversa({ conversaId: conversaAnaBruno, limite: 10 });
            assert.deepEqual(ids(pagina.mensagens), [segunda.mensagemId, primeira.mensagemId]);
            assert.equal(pagina.proximoCursor, null);
            const lida = pagina.mensagens[1];
            assert.equal(lida.conversaId, conversaAnaBruno);
            assert.equal(lida.autor, AutorMensagemDiretaEnum.USUARIO);
            assert.equal(lida.autorUsuarioId, ana);
            assert.equal(lida.texto, primeira.texto);
            assert.equal(lida.contemCodigo, false);
            assert.deepEqual(lida.mencoes, [bruno]);
            assert.deepEqual(lida.referencias, [{ tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: 212 }]);
            assert.ok(lida.createdDate instanceof Date && lida.createdDate <= pagina.mensagens[0].createdDate);
            assert.equal(pagina.mensagens[0].contemCodigo, true);
        });

        it('é idempotente pelo mensagemId: reenviar devolve a mesma mensagem, sem duplicar', async () => {
            const repetida = await armazenamento.gravar({
                mensagemId: primeira.mensagemId,
                conversaId: conversaAnaBruno,
                autor: AutorMensagemDiretaEnum.USUARIO,
                autorUsuarioId: ana,
                texto: 'texto diferente no reenvio',
                contemCodigo: false,
                mencoes: [],
                referencias: [],
            });
            assert.equal(repetida.jaExistia, true);
            assert.equal(repetida.mensagem.texto, primeira.texto, 'vale o que já estava gravado');
            assert.equal(repetida.mensagem.createdDate.getTime(), primeira.createdDate.getTime());
            const pagina = await armazenamento.listarConversa({ conversaId: conversaAnaBruno, limite: 10 });
            assert.equal(pagina.mensagens.length, 2);
        });

        it('recusa um mensagemId já usado por outro autor ou em outra conversa, sem devolver a mensagem alheia', async () => {
            const deOutroAutor = { ...mensagem(conversaAnaBruno, bruno, 'quero a mensagem da Ana'), mensagemId: primeira.mensagemId };
            await assert.rejects(armazenamento.gravar(deOutroAutor), (erro) => erro instanceof BusinessException);
            const emOutraConversa = { ...mensagem(conversaAnaCarla, ana, 'mesmo id, outra conversa'), mensagemId: primeira.mensagemId };
            await assert.rejects(armazenamento.gravar(emOutraConversa), (erro) => erro instanceof BusinessException);
        });

        it('recusa mensagem incoerente: conversa inválida, autor fora da conversa e sistema com autor', async () => {
            await assert.rejects(armazenamento.gravar(mensagem('9-4', ana, 'conversa fora de ordem')), (erro) => erro instanceof BusinessException);
            await assert.rejects(armazenamento.gravar(mensagem(conversaAnaBruno, carla, 'carla não participa')), (erro) => erro instanceof BusinessException);
            await assert.rejects(
                armazenamento.gravar({ ...mensagem(conversaAnaBruno, null, 'sistema com autor'), autorUsuarioId: ana }),
                (erro) => erro instanceof BusinessException,
            );
        });

        it('pagina a conversa com cursor opaco: sem repetir nem pular, e o último cursor é nulo', async () => {
            const autores = [carla, ana, carla, carla, ana];
            for (const [indice, autor] of autores.entries()) {
                daAnaECarla.push((await armazenamento.gravar(mensagem(conversaAnaCarla, autor, `mensagem ${indice + 1}`))).mensagem);
                await espera(15);
            }
            const esperado = [...daAnaECarla].reverse().map((item) => item.mensagemId);

            const primeiraPagina = await armazenamento.listarConversa({ conversaId: conversaAnaCarla, limite: 2 });
            assert.deepEqual(ids(primeiraPagina.mensagens), esperado.slice(0, 2));
            assert.ok(primeiraPagina.proximoCursor, 'há páginas mais antigas');
            const segundaPagina = await armazenamento.listarConversa({ conversaId: conversaAnaCarla, limite: 2, cursor: primeiraPagina.proximoCursor! });
            assert.deepEqual(ids(segundaPagina.mensagens), esperado.slice(2, 4));
            assert.ok(segundaPagina.proximoCursor);
            const terceiraPagina = await armazenamento.listarConversa({ conversaId: conversaAnaCarla, limite: 2, cursor: segundaPagina.proximoCursor! });
            assert.deepEqual(ids(terceiraPagina.mensagens), esperado.slice(4));
            assert.equal(terceiraPagina.proximoCursor, null);

            const exata = await armazenamento.listarConversa({ conversaId: conversaAnaCarla, limite: 5 });
            assert.equal(exata.mensagens.length, 5);
            assert.equal(exata.proximoCursor, null, 'uma página que cabe tudo não tem cursor');
        });

        it('recusa cursor adulterado, limite fora da faixa e conversa inválida', async () => {
            await assert.rejects(armazenamento.listarConversa({ conversaId: conversaAnaCarla, limite: 2, cursor: 'lixo' }), (erro) => erro instanceof BusinessException);
            await assert.rejects(armazenamento.listarConversa({ conversaId: conversaAnaCarla, limite: 0 }), (erro) => erro instanceof BusinessException);
            await assert.rejects(armazenamento.listarConversa({ conversaId: conversaAnaCarla, limite: 101 }), (erro) => erro instanceof BusinessException);
            await assert.rejects(armazenamento.listarConversa({ conversaId: 'nao-e-conversa', limite: 10 }), (erro) => erro instanceof BusinessException);
        });

        it('lista as conversas da pessoa, da que teve mensagem mais recente, com o total e a última mensagem', async () => {
            const daAna = await armazenamento.listarConversasDoUsuario({ usuarioId: ana });
            assert.deepEqual(daAna.map((conversa) => conversa.conversaId), [conversaAnaCarla, conversaAnaBruno]);
            assert.equal(daAna[0].totalMensagens, 5);
            assert.equal(daAna[0].ultimaMensagem.mensagemId, daAnaECarla[4].mensagemId);
            assert.deepEqual(daAna[0].participantes, [ana, carla]);
            assert.equal(daAna[1].totalMensagens, 2);
            assert.equal(daAna[1].ultimaMensagem.mensagemId, segunda.mensagemId);

            assert.deepEqual((await armazenamento.listarConversasDoUsuario({ usuarioId: carla })).map((conversa) => conversa.conversaId), [conversaAnaCarla]);
            assert.deepEqual(await armazenamento.listarConversasDoUsuario({ usuarioId: gestor }), [], 'quem não participa de nada não vê nada');
        });

        it('conta as não lidas por conversa: só mensagem do outro, depois do marcador, nunca a minha nem a do sistema', async () => {
            await espera(15);
            await armazenamento.gravar(mensagem(conversaAnaCarla, null, 'Fulano leu esta conversa')); // aviso do sistema, nunca "não lido"

            const semMarcador = await armazenamento.contarNaoLidas({
                usuarioId: ana,
                marcadores: [
                    { conversaId: conversaAnaBruno, lidaAteDate: null },
                    { conversaId: conversaAnaCarla, lidaAteDate: null },
                    { conversaId: conversaBrunoCarla, lidaAteDate: null },
                ],
            });
            assert.deepEqual(semMarcador, { [conversaAnaBruno]: 1, [conversaAnaCarla]: 3, [conversaBrunoCarla]: 0 });

            const vistaAteATerceira = await armazenamento.contarNaoLidas({
                usuarioId: ana,
                marcadores: [
                    { conversaId: conversaAnaBruno, lidaAteDate: segunda.createdDate },
                    { conversaId: conversaAnaCarla, lidaAteDate: daAnaECarla[2].createdDate },
                ],
            });
            assert.deepEqual(vistaAteATerceira, { [conversaAnaBruno]: 0, [conversaAnaCarla]: 1 }, 'a mensagem do marcador já foi vista: só conta o que veio depois');

            const daCarla = await armazenamento.contarNaoLidas({ usuarioId: carla, marcadores: [{ conversaId: conversaAnaCarla, lidaAteDate: null }] });
            assert.deepEqual(daCarla, { [conversaAnaCarla]: 2 }, 'as da Ana são as não lidas da Carla');

            assert.deepEqual(await armazenamento.contarNaoLidas({ usuarioId: ana, marcadores: [] }), {});
        });

        it('a busca ignora acento, exige todas as palavras e fica restrita às conversas da pessoa', async () => {
            assert.equal((await armazenamento.buscar({ usuarioId: ana, texto: `descricao ${marca}` })).length, 1);
            assert.equal((await armazenamento.buscar({ usuarioId: ana, texto: `descrição cadastro ${marca}` })).length, 1);
            assert.equal((await armazenamento.buscar({ usuarioId: ana, texto: `cadastro inexistentexyz ${marca}` })).length, 0);
            assert.equal((await armazenamento.buscar({ usuarioId: carla, texto: `cadastro ${marca}` })).length, 0, 'a Carla não participa da conversa do cadastro');
            assert.equal((await armazenamento.buscar({ usuarioId: bruno, texto: `cadastro ${marca}` })).length, 1);
            await assert.rejects(armazenamento.buscar({ usuarioId: ana, texto: '   ' }), (erro) => erro instanceof BusinessException);
        });

        it('a busca respeita o período e o filtro de código', async () => {
            const ontem = new Date(Date.now() - 24 * 3_600_000);
            const amanha = new Date(Date.now() + 24 * 3_600_000);
            assert.equal((await armazenamento.buscar({ usuarioId: ana, texto: `cadastro ${marca}`, inicio: ontem, fim: amanha })).length, 1);
            assert.equal((await armazenamento.buscar({ usuarioId: ana, texto: `cadastro ${marca}`, inicio: amanha })).length, 0);
            assert.equal((await armazenamento.buscar({ usuarioId: ana, texto: `cadastro ${marca}`, fim: ontem })).length, 0);

            assert.equal((await armazenamento.buscar({ usuarioId: ana, texto: `trecho ${marca}`, somenteCodigo: true })).length, 1);
            assert.equal((await armazenamento.buscar({ usuarioId: ana, texto: `cadastro ${marca}`, somenteCodigo: true })).length, 0, 'a mensagem do cadastro não tem código');
            assert.equal((await armazenamento.buscar({ usuarioId: ana, texto: `trecho ${marca}`, somenteCodigo: false })).length, 1);
        });

        it('a supervisão lista as conversas sem as que envolvem gestor ou administrador, pagina e conta o total', async () => {
            await armazenamento.gravar(mensagem(conversaAnaGestor, gestor, 'conversa com o gestor'));

            const semGestor = await armazenamento.listarTodasConversas({ usuarioIdsExcluidos: [gestor], texto: marca, pagina: 1, porPagina: 100 });
            assert.equal(semGestor.total, 2);
            assert.deepEqual(semGestor.conversas.map((conversa) => conversa.conversaId), [conversaAnaCarla, conversaAnaBruno]);

            const comTodas = await armazenamento.listarTodasConversas({ usuarioIdsExcluidos: [], texto: marca, pagina: 1, porPagina: 100 });
            assert.equal(comTodas.total, 3);
            assert.deepEqual(comTodas.conversas.map((conversa) => conversa.conversaId), [conversaAnaGestor, conversaAnaCarla, conversaAnaBruno]);

            const todosExcluidos = await armazenamento.listarTodasConversas({ usuarioIdsExcluidos: [ana], texto: marca, pagina: 1, porPagina: 100 });
            assert.equal(todosExcluidos.total, 0);
            assert.deepEqual(todosExcluidos.conversas, []);

            const primeiraPagina = await armazenamento.listarTodasConversas({ usuarioIdsExcluidos: [gestor], texto: marca, pagina: 1, porPagina: 1 });
            const segundaPagina = await armazenamento.listarTodasConversas({ usuarioIdsExcluidos: [gestor], texto: marca, pagina: 2, porPagina: 1 });
            const terceiraPagina = await armazenamento.listarTodasConversas({ usuarioIdsExcluidos: [gestor], texto: marca, pagina: 3, porPagina: 1 });
            assert.deepEqual(primeiraPagina.conversas.map((conversa) => conversa.conversaId), [conversaAnaCarla]);
            assert.deepEqual(segundaPagina.conversas.map((conversa) => conversa.conversaId), [conversaAnaBruno]);
            assert.deepEqual(terceiraPagina.conversas, []);
            assert.equal(primeiraPagina.total, 2, 'o total não depende da página');
        });

        it('a supervisão filtra por código e por período, e recusa página inválida', async () => {
            const comCodigo = await armazenamento.listarTodasConversas({ usuarioIdsExcluidos: [gestor], texto: marca, somenteCodigo: true, pagina: 1, porPagina: 100 });
            assert.deepEqual(comCodigo.conversas.map((conversa) => conversa.conversaId), [conversaAnaBruno]);
            assert.equal(comCodigo.total, 1);
            assert.equal(comCodigo.conversas[0].ultimaMensagem.mensagemId, segunda.mensagemId, 'com filtro, a última mensagem é a última que casou');

            const amanha = new Date(Date.now() + 24 * 3_600_000);
            const futuras = await armazenamento.listarTodasConversas({ usuarioIdsExcluidos: [gestor], texto: marca, inicio: amanha, pagina: 1, porPagina: 100 });
            assert.equal(futuras.total, 0);

            await assert.rejects(armazenamento.listarTodasConversas({ usuarioIdsExcluidos: [], pagina: 0, porPagina: 10 }), (erro) => erro instanceof BusinessException);
            await assert.rejects(armazenamento.listarTodasConversas({ usuarioIdsExcluidos: [], pagina: 1, porPagina: 101 }), (erro) => erro instanceof BusinessException);
        });

        it('grava a resposta com a citação, devolve-a na leitura e no reenvio, e deixa a mensagem comum sem citação', async () => {
            const original = (await armazenamento.gravar(mensagem(conversaAnaDavi, ana, 'Pode revisar o cadastro?'))).mensagem;
            await espera(15);
            const citacao = { mensagemId: original.mensagemId, autorUsuarioId: ana, trecho: 'Pode revisar o cadastro?' };
            const resposta = await armazenamento.gravar(mensagem(conversaAnaDavi, davi, 'Respondendo a você', { respondeA: citacao }));
            assert.equal(resposta.jaExistia, false);
            assert.deepEqual(resposta.mensagem.respondeA, citacao);

            const pagina = await armazenamento.listarConversa({ conversaId: conversaAnaDavi, limite: 10 });
            const lida = pagina.mensagens.find((item) => item.mensagemId === resposta.mensagem.mensagemId)!;
            assert.deepEqual(lida.respondeA, citacao, 'a citação sobrevive à leitura');
            assert.equal(pagina.mensagens.find((item) => item.mensagemId === original.mensagemId)!.respondeA, null, 'a mensagem comum não tem citação');

            const repetida = await armazenamento.gravar({ ...mensagem(conversaAnaDavi, davi, 'texto no reenvio'), mensagemId: resposta.mensagem.mensagemId });
            assert.equal(repetida.jaExistia, true);
            assert.deepEqual(repetida.mensagem.respondeA, citacao, 'o reenvio devolve a citação já gravada');

            const total = await armazenamento.listarConversasDoUsuario({ usuarioId: davi });
            const daConversa = total.find((conversa) => conversa.conversaId === conversaAnaDavi)!;
            assert.deepEqual(daConversa.ultimaMensagem.respondeA, citacao, 'a última mensagem da lista traz a citação');
        });

        it('recuperarMensagem devolve a mensagem só se for da conversa pedida', async () => {
            const achada = await armazenamento.recuperarMensagem({ conversaId: conversaAnaBruno, mensagemId: primeira.mensagemId });
            assert.equal(achada?.mensagemId, primeira.mensagemId);
            assert.equal(achada?.texto, primeira.texto);
            assert.equal((await armazenamento.recuperarMensagem({ conversaId: conversaAnaBruno, mensagemId: primeira.mensagemId.toUpperCase() }))?.mensagemId, primeira.mensagemId);
            assert.equal(await armazenamento.recuperarMensagem({ conversaId: conversaAnaCarla, mensagemId: primeira.mensagemId }), null, 'de outra conversa');
            assert.equal(await armazenamento.recuperarMensagem({ conversaId: conversaAnaBruno, mensagemId: randomUUID() }), null, 'inexistente');
            assert.equal(await armazenamento.recuperarMensagem({ conversaId: conversaAnaBruno, mensagemId: 'nao-e-uuid' }), null);
            await assert.rejects(armazenamento.recuperarMensagem({ conversaId: 'nao-e-conversa', mensagemId: primeira.mensagemId }), (erro) => erro instanceof BusinessException);
        });

        it('alterarMensagem: troca o texto do autor e marca "editada", sem mudar a data de envio, a ordem nem a resposta; quem não é o autor não altera', async () => {
            const original = (await armazenamento.gravar(mensagem(conversaAnaDavi, ana, 'Texto antes da edição'))).mensagem;
            await espera(15);
            const citacao = { mensagemId: original.mensagemId, autorUsuarioId: ana, trecho: 'Texto antes da edição' };
            const resposta = (await armazenamento.gravar(mensagem(conversaAnaDavi, davi, 'Resposta do Davi', { respondeA: citacao }))).mensagem;
            assert.equal(original.editadaDate, null);
            const antes = await armazenamento.listarConversa({ conversaId: conversaAnaDavi, limite: 50 });
            const totalAntes = (await armazenamento.listarConversasDoUsuario({ usuarioId: ana })).find((conversa) => conversa.conversaId === conversaAnaDavi)!.totalMensagens;

            const editada = await armazenamento.alterarMensagem({
                mensagemId: original.mensagemId,
                conversaId: conversaAnaDavi,
                autorUsuarioId: ana,
                texto: `Texto depois da edição ${marca}`,
                contemCodigo: true,
                mencoes: [davi],
                referencias: [{ tipo: ReferenciaMensagemDiretaEnum.ATIVIDADE, id: 57 }],
            });
            assert.ok(editada);
            assert.equal(editada.texto, `Texto depois da edição ${marca}`);
            assert.ok(editada.editadaDate instanceof Date);
            assert.equal(editada.createdDate.getTime(), original.createdDate.getTime(), 'a data de envio não muda');

            const pagina = await armazenamento.listarConversa({ conversaId: conversaAnaDavi, limite: 50 });
            assert.deepEqual(ids(pagina.mensagens), ids(antes.mensagens), 'a ordem não muda');
            const lida = pagina.mensagens.find((item) => item.mensagemId === original.mensagemId)!;
            assert.equal(lida.texto, `Texto depois da edição ${marca}`);
            assert.equal(lida.contemCodigo, true, 'o que deriva do texto é recalculado');
            assert.deepEqual(lida.mencoes, [davi]);
            assert.deepEqual(lida.referencias, [{ tipo: ReferenciaMensagemDiretaEnum.ATIVIDADE, id: 57 }]);
            assert.ok(lida.editadaDate instanceof Date, 'a leitura traz a data da edição');
            assert.equal(pagina.mensagens.find((item) => item.mensagemId === resposta.mensagemId)!.editadaDate, null, 'a outra continua sem edição');
            assert.deepEqual(pagina.mensagens.find((item) => item.mensagemId === resposta.mensagemId)!.respondeA, citacao, 'a citação da resposta não é reescrita');

            assert.equal((await armazenamento.buscar({ usuarioId: ana, texto: `depois da edição ${marca}` })).length, 1, 'a busca vê o texto novo');
            assert.equal((await armazenamento.buscar({ usuarioId: ana, texto: `antes da edição ${marca}` })).length, 0, 'e não o antigo');

            const total = (await armazenamento.listarConversasDoUsuario({ usuarioId: ana })).find((conversa) => conversa.conversaId === conversaAnaDavi)!;
            assert.equal(total.totalMensagens, totalAntes, 'editar não cria mensagem nova');

            const base = { mensagemId: original.mensagemId, conversaId: conversaAnaDavi, texto: 'tentativa', contemCodigo: false, mencoes: [], referencias: [] };
            assert.equal(await armazenamento.alterarMensagem({ ...base, autorUsuarioId: davi }), null, 'só o autor altera');
            assert.equal(await armazenamento.alterarMensagem({ ...base, autorUsuarioId: ana, conversaId: conversaAnaCarla }), null, 'de outra conversa');
            assert.equal(await armazenamento.alterarMensagem({ ...base, autorUsuarioId: ana, mensagemId: randomUUID() }), null, 'inexistente');
            await assert.rejects(armazenamento.alterarMensagem({ ...base, autorUsuarioId: ana, texto: '  ' }), (erro) => erro instanceof BusinessException);
            assert.equal((await armazenamento.recuperarMensagem({ conversaId: conversaAnaDavi, mensagemId: original.mensagemId }))?.texto, `Texto depois da edição ${marca}`, 'a tentativa recusada não gravou');
        });

        it('grava a resposta da IA (task 315) com quem a chamou e as propostas, lê de volta e deixa as outras mensagens sem esses campos', async () => {
            const daIa = (await armazenamento.gravar(mensagem(conversaAnaDavi, null, 'Criei a proposta', { autor: AutorMensagemDiretaEnum.IA, chamadaPorUsuarioId: davi, propostaIds: [41, 42] }))).mensagem;
            assert.equal(daIa.autor, AutorMensagemDiretaEnum.IA);
            assert.equal(daIa.autorUsuarioId, null);
            assert.equal(daIa.chamadaPorUsuarioId, davi);
            assert.deepEqual(daIa.propostaIds, [41, 42]);
            const semProposta = (await armazenamento.gravar(mensagem(conversaAnaDavi, null, 'Só respondi', { autor: AutorMensagemDiretaEnum.IA, chamadaPorUsuarioId: ana, propostaIds: [] }))).mensagem;

            const pagina = await armazenamento.listarConversa({ conversaId: conversaAnaDavi, limite: 50 });
            const lida = pagina.mensagens.find((item) => item.mensagemId === daIa.mensagemId)!;
            assert.equal(lida.autor, AutorMensagemDiretaEnum.IA);
            assert.equal(lida.chamadaPorUsuarioId, davi);
            assert.deepEqual(lida.propostaIds, [41, 42]);
            assert.deepEqual(pagina.mensagens.find((item) => item.mensagemId === semProposta.mensagemId)!.propostaIds, []);
            const daPessoa = pagina.mensagens.find((item) => item.autor === AutorMensagemDiretaEnum.USUARIO)!;
            assert.equal(daPessoa.chamadaPorUsuarioId, null);
            assert.deepEqual(daPessoa.propostaIds, []);
            assert.equal((await armazenamento.recuperarMensagem({ conversaId: conversaAnaDavi, mensagemId: daIa.mensagemId }))?.chamadaPorUsuarioId, davi);

            const naoLidas = await armazenamento.contarNaoLidas({ usuarioId: ana, marcadores: [{ conversaId: conversaAnaDavi, lidaAteDate: null }] });
            assert.equal(naoLidas[conversaAnaDavi] ?? 0, pagina.mensagens.filter((item) => item.autor === AutorMensagemDiretaEnum.USUARIO && item.autorUsuarioId !== ana).length, 'a resposta da IA não conta como não lida');

            const base = { conversaId: conversaAnaDavi, autor: AutorMensagemDiretaEnum.IA, autorUsuarioId: null };
            await assert.rejects(armazenamento.gravar(mensagem(conversaAnaDavi, null, 'sem quem chamou', { ...base, chamadaPorUsuarioId: null })), (erro) => erro instanceof BusinessException);
            await assert.rejects(armazenamento.gravar(mensagem(conversaAnaDavi, null, 'fora da conversa', { ...base, chamadaPorUsuarioId: carla })), (erro) => erro instanceof BusinessException);
            await assert.rejects(armazenamento.gravar(mensagem(conversaAnaDavi, null, 'com autor', { ...base, autorUsuarioId: ana, chamadaPorUsuarioId: ana })), (erro) => erro instanceof BusinessException);
            await assert.rejects(armazenamento.gravar(mensagem(conversaAnaDavi, ana, 'pessoa com proposta', { propostaIds: [3] })), (erro) => erro instanceof BusinessException);
            await assert.rejects(armazenamento.gravar(mensagem(conversaAnaDavi, null, 'proposta inválida', { ...base, chamadaPorUsuarioId: ana, propostaIds: [0] })), (erro) => erro instanceof BusinessException);
            assert.equal(
                await armazenamento.alterarMensagem({ mensagemId: daIa.mensagemId, conversaId: conversaAnaDavi, autorUsuarioId: davi, texto: 'tentativa', contemCodigo: false, mencoes: [], referencias: [] }),
                null,
                'ninguém edita a resposta da IA',
            );
        });

        describe('grupos (task 246)', () => {
            const daConversaDoGrupoUm: MensagemDiretaResumoDto[] = []; // da mais antiga para a mais nova
            let doGrupoDois: MensagemDiretaResumoDto;

            it('grava e lê a conversa de um grupo: sem participantes, qualquer membro escreve, o sistema avisa e o reenvio é idempotente', async () => {
                const entrada = (await armazenamento.gravar(mensagem(conversaGrupoUm, null, 'Bruno entrou no grupo'))).mensagem;
                await espera(15);
                const daAna = (await armazenamento.gravar(mensagem(conversaGrupoUm, ana, 'Bem-vindos ao balanço do trimestre'))).mensagem;
                await espera(15);
                const doBruno = (await armazenamento.gravar(mensagem(conversaGrupoUm, bruno, 'Trecho do relatório', { contemCodigo: true, mencoes: [ana] }))).mensagem;
                await espera(15);
                const daCarla = (await armazenamento.gravar(mensagem(conversaGrupoUm, carla, 'Vou revisar hoje'))).mensagem;
                daConversaDoGrupoUm.push(entrada, daAna, doBruno, daCarla);
                await espera(15);
                doGrupoDois = (await armazenamento.gravar(mensagem(conversaGrupoDois, davi, 'Outro grupo, outra conversa'))).mensagem;

                const pagina = await armazenamento.listarConversa({ conversaId: conversaGrupoUm, limite: 10 });
                assert.deepEqual(ids(pagina.mensagens), [daCarla, doBruno, daAna, entrada].map((item) => item.mensagemId));
                assert.equal(pagina.proximoCursor, null);
                assert.equal(pagina.mensagens[3].autor, AutorMensagemDiretaEnum.SISTEMA);
                assert.equal(pagina.mensagens[3].autorUsuarioId, null);
                assert.equal(pagina.mensagens[1].contemCodigo, true);
                assert.deepEqual(pagina.mensagens[1].mencoes, [ana]);
                assert.equal(pagina.mensagens[1].conversaId, conversaGrupoUm);

                const primeiraPagina = await armazenamento.listarConversa({ conversaId: conversaGrupoUm, limite: 3 });
                const segundaPagina = await armazenamento.listarConversa({ conversaId: conversaGrupoUm, limite: 3, cursor: primeiraPagina.proximoCursor! });
                assert.deepEqual(ids(segundaPagina.mensagens), [entrada.mensagemId]);
                assert.equal(segundaPagina.proximoCursor, null);

                const repetida = await armazenamento.gravar({ ...mensagem(conversaGrupoUm, ana, 'texto diferente'), mensagemId: daAna.mensagemId });
                assert.equal(repetida.jaExistia, true);
                assert.equal(repetida.mensagem.texto, daAna.texto);
                await assert.rejects(armazenamento.gravar({ ...mensagem(conversaGrupoUm, bruno, 'id da Ana'), mensagemId: daAna.mensagemId }), (erro) => erro instanceof BusinessException);
                await assert.rejects(armazenamento.gravar({ ...mensagem(conversaGrupoDois, ana, 'outro grupo'), mensagemId: daAna.mensagemId }), (erro) => erro instanceof BusinessException);
            });

            it('recusa mensagem de grupo incoerente: grupo inválido, usuário sem id, sistema com autor e a IA (ainda não responde em grupo)', async () => {
                await assert.rejects(armazenamento.gravar(mensagem('G0', ana, 'grupo zero')), (erro) => erro instanceof BusinessException);
                await assert.rejects(armazenamento.gravar(mensagem('Gx', ana, 'grupo inválido')), (erro) => erro instanceof BusinessException);
                await assert.rejects(
                    armazenamento.gravar({ ...mensagem(conversaGrupoUm, null, 'usuário sem id'), autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId: null }),
                    (erro) => erro instanceof BusinessException,
                );
                await assert.rejects(
                    armazenamento.gravar({ ...mensagem(conversaGrupoUm, null, 'sistema com autor'), autorUsuarioId: ana }),
                    (erro) => erro instanceof BusinessException,
                );
                await assert.rejects(
                    armazenamento.gravar(mensagem(conversaGrupoUm, null, 'ia em grupo', { autor: AutorMensagemDiretaEnum.IA, chamadaPorUsuarioId: ana, propostaIds: [] })),
                    (erro) => erro instanceof BusinessException,
                );
                await assert.rejects(armazenamento.listarConversa({ conversaId: 'G0', limite: 10 }), (erro) => erro instanceof BusinessException);
            });

            it('a lista um a um nunca traz o grupo; a lista dos grupos traz cada um, o mais recente primeiro, com participantes vazios', async () => {
                const umAUm = await armazenamento.listarConversasDoUsuario({ usuarioId: ana });
                assert.ok(umAUm.every((conversa) => !conversa.conversaId.startsWith('G')), 'a lista um a um não traz conversa de grupo');

                const grupos = await armazenamento.listarConversasDeGrupos({ grupoIds: [grupoUm, grupoDois] });
                assert.deepEqual(grupos.map((conversa) => conversa.conversaId), [conversaGrupoDois, conversaGrupoUm]);
                assert.deepEqual(grupos[0].participantes, []);
                assert.equal(grupos[0].totalMensagens, 1);
                assert.equal(grupos[0].ultimaMensagem.mensagemId, doGrupoDois.mensagemId);
                assert.equal(grupos[1].totalMensagens, 4);
                assert.equal(grupos[1].ultimaMensagem.mensagemId, daConversaDoGrupoUm[3].mensagemId);

                assert.deepEqual((await armazenamento.listarConversasDeGrupos({ grupoIds: [grupoUm] })).map((conversa) => conversa.conversaId), [conversaGrupoUm]);
                assert.deepEqual(await armazenamento.listarConversasDeGrupos({ grupoIds: [] }), []);
                assert.deepEqual(await armazenamento.listarConversasDeGrupos({ grupoIds: [base + 999] }), [], 'grupo sem mensagem não aparece');
                await assert.rejects(armazenamento.listarConversasDeGrupos({ grupoIds: [0] }), (erro) => erro instanceof BusinessException);
            });

            it('conta as não lidas do grupo a partir do marcador: só mensagem de pessoa, nunca a minha nem a do sistema, e a conversa um a um não conta grupo', async () => {
                const desdeOInicio = await armazenamento.contarNaoLidasDeGrupos({
                    usuarioId: ana,
                    marcadores: [
                        { conversaId: conversaGrupoUm, lidaAteDate: null },
                        { conversaId: conversaGrupoDois, lidaAteDate: null },
                    ],
                });
                assert.deepEqual(desdeOInicio, { [conversaGrupoUm]: 2, [conversaGrupoDois]: 1 }, 'Bruno e Carla no grupo um; Davi no dois');

                const aposAEntrada = await armazenamento.contarNaoLidasDeGrupos({
                    usuarioId: carla,
                    marcadores: [{ conversaId: conversaGrupoUm, lidaAteDate: daConversaDoGrupoUm[1].createdDate }],
                });
                assert.deepEqual(aposAEntrada, { [conversaGrupoUm]: 1 }, 'a Carla entrou depois da mensagem da Ana: só conta o que veio depois dela, menos a dela própria');

                const aposTudo = await armazenamento.contarNaoLidasDeGrupos({ usuarioId: ana, marcadores: [{ conversaId: conversaGrupoUm, lidaAteDate: daConversaDoGrupoUm[3].createdDate }] });
                assert.deepEqual(aposTudo, { [conversaGrupoUm]: 0 });
                assert.deepEqual(await armazenamento.contarNaoLidasDeGrupos({ usuarioId: ana, marcadores: [] }), {});

                const pelaConversaDireta = await armazenamento.contarNaoLidas({ usuarioId: ana, marcadores: [{ conversaId: conversaGrupoUm, lidaAteDate: null }] });
                assert.deepEqual(pelaConversaDireta, { [conversaGrupoUm]: 0 }, 'a contagem um a um não enxerga o grupo');
            });

            it('a busca só olha o grupo quando a service o manda: sem grupoIds nunca, com grupoIds só os dele', async () => {
                assert.equal((await armazenamento.buscar({ usuarioId: ana, texto: `balanço ${marca}` })).length, 0, 'sem grupoIds o grupo não aparece');
                const noGrupoUm = await armazenamento.buscar({ usuarioId: ana, grupoIds: [grupoUm], texto: `balanco ${marca}` });
                assert.deepEqual(ids(noGrupoUm), [daConversaDoGrupoUm[1].mensagemId], 'sem acento, como na conversa um a um');
                assert.equal((await armazenamento.buscar({ usuarioId: ana, grupoIds: [grupoDois], texto: `balanco ${marca}` })).length, 0, 'o grupo dois não tem a palavra');
                assert.equal((await armazenamento.buscar({ usuarioId: ana, grupoIds: [grupoUm, grupoDois], texto: `entrou ${marca}` })).length, 1, 'olha vários grupos de uma vez');
                const comAConversaDireta = await armazenamento.buscar({ usuarioId: ana, grupoIds: [grupoUm], texto: `cadastro ${marca}` });
                assert.ok(comAConversaDireta.length >= 1, 'com grupoIds a conversa um a um continua na busca');
                assert.equal((await armazenamento.buscar({ usuarioId: ana, grupoIds: [grupoUm], texto: `trecho ${marca}`, somenteCodigo: true })).length >= 1, true);
                await assert.rejects(armazenamento.buscar({ usuarioId: ana, grupoIds: [-1], texto: marca }), (erro) => erro instanceof BusinessException);
            });

            it('a busca dentro do grupo (somenteGrupos) traz só as mensagens dele: nunca a conversa um a um nem outro grupo', async () => {
                const soGrupoUm = await armazenamento.buscar({ usuarioId: ana, grupoIds: [grupoUm], somenteGrupos: true, texto: `balanco ${marca}` });
                assert.deepEqual(ids(soGrupoUm), [daConversaDoGrupoUm[1].mensagemId], 'sem acento, como na busca geral');
                assert.ok(soGrupoUm.every((achada) => achada.conversaId === conversaGrupoUm));
                assert.equal((await armazenamento.buscar({ usuarioId: ana, grupoIds: [grupoUm], somenteGrupos: true, texto: `cadastro ${marca}` })).length, 0, 'a conversa um a um não entra');
                assert.equal((await armazenamento.buscar({ usuarioId: ana, grupoIds: [grupoDois], somenteGrupos: true, texto: `balanco ${marca}` })).length, 0, 'o grupo dois não tem a palavra');
                assert.equal((await armazenamento.buscar({ usuarioId: ana, grupoIds: [grupoUm], somenteGrupos: true, texto: `trecho ${marca}`, somenteCodigo: true })).length >= 1, true, 'com o filtro de código');
                assert.equal((await armazenamento.buscar({ usuarioId: ana, grupoIds: [grupoUm], somenteGrupos: true, texto: `balanco ${marca}`, inicio: new Date(Date.now() + 86_400_000) })).length, 0, 'com o período');
                await assert.rejects(armazenamento.buscar({ usuarioId: ana, somenteGrupos: true, texto: marca }), (erro) => erro instanceof BusinessException, 'sem grupo não há busca no grupo');
            });

            it('a supervisão um a um nunca lista grupo, e a supervisão dos grupos lista só os grupos pedidos, pagina, conta e filtra', async () => {
                const umAUm = await armazenamento.listarTodasConversas({ usuarioIdsExcluidos: [], texto: marca, pagina: 1, porPagina: 100 });
                assert.ok(umAUm.conversas.every((conversa) => !conversa.conversaId.startsWith('G')), 'o grupo tem participantes vazios e passaria no filtro de exclusão');

                const grupos = await armazenamento.listarGruposSupervisionados({ grupoIds: [grupoUm, grupoDois], texto: marca, pagina: 1, porPagina: 100 });
                assert.equal(grupos.total, 2);
                assert.deepEqual(grupos.conversas.map((conversa) => conversa.conversaId), [conversaGrupoDois, conversaGrupoUm]);

                const soUm = await armazenamento.listarGruposSupervisionados({ grupoIds: [grupoUm], texto: marca, pagina: 1, porPagina: 100 });
                assert.deepEqual(soUm.conversas.map((conversa) => conversa.conversaId), [conversaGrupoUm]);
                assert.equal(soUm.total, 1);

                const primeira = await armazenamento.listarGruposSupervisionados({ grupoIds: [grupoUm, grupoDois], texto: marca, pagina: 1, porPagina: 1 });
                const segunda = await armazenamento.listarGruposSupervisionados({ grupoIds: [grupoUm, grupoDois], texto: marca, pagina: 2, porPagina: 1 });
                assert.deepEqual(primeira.conversas.map((conversa) => conversa.conversaId), [conversaGrupoDois]);
                assert.deepEqual(segunda.conversas.map((conversa) => conversa.conversaId), [conversaGrupoUm]);
                assert.equal(primeira.total, 2);

                const comCodigo = await armazenamento.listarGruposSupervisionados({ grupoIds: [grupoUm, grupoDois], texto: marca, somenteCodigo: true, pagina: 1, porPagina: 100 });
                assert.deepEqual(comCodigo.conversas.map((conversa) => conversa.conversaId), [conversaGrupoUm]);
                assert.equal(comCodigo.conversas[0].ultimaMensagem.mensagemId, daConversaDoGrupoUm[2].mensagemId, 'com filtro, a última mensagem é a última que casou');

                const futuras = await armazenamento.listarGruposSupervisionados({ grupoIds: [grupoUm], texto: marca, inicio: new Date(Date.now() + 24 * 3_600_000), pagina: 1, porPagina: 100 });
                assert.equal(futuras.total, 0);

                const semGrupos = await armazenamento.listarGruposSupervisionados({ grupoIds: [], pagina: 1, porPagina: 10 });
                assert.deepEqual(semGrupos, { conversas: [], total: 0 });
                await assert.rejects(armazenamento.listarGruposSupervisionados({ grupoIds: [grupoUm], pagina: 0, porPagina: 10 }), (erro) => erro instanceof BusinessException);
                await assert.rejects(armazenamento.listarGruposSupervisionados({ grupoIds: [grupoUm], pagina: 1, porPagina: 101 }), (erro) => erro instanceof BusinessException);
            });

            it('recuperarMensagem e alterarMensagem valem no grupo: só do grupo pedido, e só o autor edita', async () => {
                const daAna = daConversaDoGrupoUm[1];
                assert.equal((await armazenamento.recuperarMensagem({ conversaId: conversaGrupoUm, mensagemId: daAna.mensagemId }))?.texto, daAna.texto);
                assert.equal(await armazenamento.recuperarMensagem({ conversaId: conversaGrupoDois, mensagemId: daAna.mensagemId }), null, 'de outro grupo');

                const base = { mensagemId: daAna.mensagemId, conversaId: conversaGrupoUm, texto: `Texto novo do grupo ${marca}`, contemCodigo: false, mencoes: [], referencias: [] };
                assert.equal(await armazenamento.alterarMensagem({ ...base, autorUsuarioId: bruno }), null, 'só o autor edita');
                const editada = await armazenamento.alterarMensagem({ ...base, autorUsuarioId: ana });
                assert.equal(editada?.texto, `Texto novo do grupo ${marca}`);
                assert.ok(editada?.editadaDate instanceof Date);
                const pagina = await armazenamento.listarConversa({ conversaId: conversaGrupoUm, limite: 10 });
                assert.deepEqual(ids(pagina.mensagens), daConversaDoGrupoUm.map((item) => item.mensagemId).reverse(), 'a ordem não muda');
            });
        });
    });
}
