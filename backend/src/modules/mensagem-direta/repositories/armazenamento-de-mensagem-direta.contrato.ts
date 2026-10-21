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
  limpar: (usuarioIds: number[]) => Promise<void>,
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
    const marca = `zq${base}`;
    const conversaAnaBruno = `${ana}-${bruno}`;
    const conversaAnaCarla = `${ana}-${carla}`;
    const conversaAnaGestor = `${ana}-${gestor}`;
    const conversaBrunoCarla = `${bruno}-${carla}`;
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
      await limpar([ana, bruno, carla, gestor]);
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
  });
}
