import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PosicaoPopupChatEnum, ReferenciaMensagemDiretaEnum, TipoUsuarioEnum } from '@project20/shared';
import { testarComBanco, ConexaoTeste } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarAtividade, criarDemanda, criarDemandaUsuario, criarDesenvolvedor, criarGestor, criarUsuario } from '../../../testes/fabricas';
import { AtividadeRepository } from '../../atividade/repositories/atividade.repository';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import { MensagemDiretaLeituraRepository } from '../repositories/mensagem-direta-leitura.repository';
import { MensagemDiretaPostgresRepository } from '../repositories/mensagem-direta-postgres.repository';
import { MensagemDiretaPreferenciaRepository } from '../repositories/mensagem-direta-preferencia.repository';
import { PublicadorEmMemoria } from '../publicadores/publicador-em-memoria';
import { MensagemDiretaEventosService } from './mensagem-direta-eventos.service';
import { MensagemDiretaService } from './mensagem-direta.service';

// A service do chat entre colaboradores ponta a ponta (task 208): usuários reais no banco de teste e o armazenamento Postgres provisório (207),
// sem dublê. Prova o que o dublê não prova: a leitura e as não lidas conversando entre si, o "Lida" na outra ponta, a busca restrita a quem busca.

function montar(conexao: ConexaoTeste) {
  return new MensagemDiretaService(
    new MensagemDiretaPostgresRepository(conexao),
    criarRepositorio(MensagemDiretaLeituraRepository, conexao),
    criarRepositorio(MensagemDiretaPreferenciaRepository, conexao),
    criarRepositorio(UsuarioRepository, conexao),
    criarRepositorio(DemandaRepository, conexao),
    criarRepositorio(AtividadeRepository, conexao),
    new MensagemDiretaEventosService(new PublicadorEmMemoria()),
  );
}

interface Pessoa { id: number; login: string; tipo: TipoUsuarioEnum }

const como = (usuario: Pessoa) => ({ sub: usuario.id, login: usuario.login, tipo: usuario.tipo }) as never;

async function enviar(service: MensagemDiretaService, remetente: Pessoa, destinatarioId: number, texto: string, extra: Record<string, unknown> = {}) {
  const resposta = await service.enviarMensagem({ destinatarioId, mensagemId: randomUUID(), texto, ...extra } as never, como(remetente));
  return resposta.dados!;
}

const CODIGO = 'Viu isto?\n\n```ts\nconst a = 1;\n```';

testarComBanco('enviar, receber, contar não lidas, marcar como lida e ver o "Lida" na outra ponta', async (conexao) => {
  const service = montar(conexao);
  const ana = await criarDesenvolvedor(conexao, { nomeCompleto: 'Ana Teste' });
  const bruno = await criarDesenvolvedor(conexao, { nomeCompleto: 'Bruno Teste' });

  const primeira = await enviar(service, ana, bruno.id, 'Bom dia, Bruno');
  const segunda = await enviar(service, ana, bruno.id, CODIGO);
  assert.equal(segunda.mensagem.contemCodigo, true);
  assert.equal(primeira.mensagem.contemCodigo, false);

  // Bruno vê a conversa com 2 não lidas; Ana (que enviou) vê 0.
  const listaDoBruno = (await service.listarConversas(como(bruno))).dados!.conversas;
  assert.equal(listaDoBruno.length, 1);
  assert.deepEqual(
    [listaDoBruno[0].usuarioId, listaDoBruno[0].usuarioNome, listaDoBruno[0].naoLidas, listaDoBruno[0].silenciada],
    [ana.id, 'Ana Teste', 2, false],
  );
  assert.equal(listaDoBruno[0].ultimaMensagem?.mensagemId, segunda.mensagem.mensagemId);
  assert.equal((await service.listarConversas(como(ana))).dados!.conversas[0].naoLidas, 0);

  // A conversa abre da mais nova para a mais antiga e o "Lida" do Bruno ainda não existe para a Ana.
  const aberta = (await service.listarConversa({ usuarioId: ana.id }, como(bruno))).dados!;
  assert.deepEqual(aberta.mensagens.map((mensagem) => mensagem.mensagemId), [segunda.mensagem.mensagemId, primeira.mensagem.mensagemId]);
  assert.equal(aberta.lidaAteDate, null);
  assert.equal((await service.listarConversa({ usuarioId: bruno.id }, como(ana))).dados!.lidaAteDate, null);

  // Bruno lê até a primeira: sobra 1 não lida. Depois lê até a segunda: zero. A Ana vê o "Lida" do Bruno.
  await service.alterarLeitura({ usuarioId: ana.id, lidaAteDate: primeira.mensagem.createdDate.toISOString() }, como(bruno));
  assert.equal((await service.listarConversas(como(bruno))).dados!.conversas[0].naoLidas, 1);

  await service.alterarLeitura({ usuarioId: ana.id, lidaAteDate: segunda.mensagem.createdDate.toISOString() }, como(bruno));
  assert.equal((await service.listarConversas(como(bruno))).dados!.conversas[0].naoLidas, 0);
  assert.equal(
    (await service.listarConversa({ usuarioId: bruno.id }, como(ana))).dados!.lidaAteDate?.toISOString(),
    segunda.mensagem.createdDate.toISOString(),
  );

  // Uma marcação atrasada não reabre as não lidas.
  await service.alterarLeitura({ usuarioId: ana.id, lidaAteDate: primeira.mensagem.createdDate.toISOString() }, como(bruno));
  assert.equal((await service.listarConversas(como(bruno))).dados!.conversas[0].naoLidas, 0);
});

testarComBanco('reenviar o mesmo mensagemId devolve a mesma mensagem sem duplicar; o id de outra conversa é recusado', async (conexao) => {
  const service = montar(conexao);
  const ana = await criarDesenvolvedor(conexao);
  const bruno = await criarDesenvolvedor(conexao);
  const carla = await criarDesenvolvedor(conexao);
  const mensagemId = randomUUID().toUpperCase();

  const primeira = (await service.enviarMensagem({ destinatarioId: bruno.id, mensagemId, texto: 'oi' }, como(ana))).dados!;
  const repetida = (await service.enviarMensagem({ destinatarioId: bruno.id, mensagemId, texto: 'oi' }, como(ana))).dados!;
  assert.equal(primeira.jaExistia, false);
  assert.equal(repetida.jaExistia, true);
  assert.equal(repetida.mensagem.mensagemId, mensagemId.toLowerCase());
  assert.equal((await service.listarConversa({ usuarioId: bruno.id }, como(ana))).dados!.mensagens.length, 1);

  await assert.rejects(service.enviarMensagem({ destinatarioId: carla.id, mensagemId, texto: 'outra conversa' }, como(ana)));
  await assert.rejects(service.enviarMensagem({ destinatarioId: ana.id, mensagemId, texto: 'roubada' }, como(bruno)));
});

testarComBanco('a busca acha sem acento e só nas conversas de quem busca; cada pessoa só vê as próprias conversas', async (conexao) => {
  const service = montar(conexao);
  const ana = await criarDesenvolvedor(conexao);
  const bruno = await criarDesenvolvedor(conexao);
  const carla = await criarDesenvolvedor(conexao);
  await enviar(service, ana, bruno.id, 'A descrição do cadastro zqx9917 está confusa');
  await enviar(service, carla, ana.id, 'Outra conversa sobre zqx9917 também');

  const daAna = (await service.buscar({ texto: 'descricao zqx9917' }, como(ana))).dados!.mensagens;
  assert.equal(daAna.length, 1);
  assert.match(daAna[0].texto, /descrição do cadastro/);

  const doBruno = (await service.buscar({ texto: 'zqx9917' }, como(bruno))).dados!.mensagens;
  assert.equal(doBruno.length, 1, 'o Bruno só vê a conversa dele');
  assert.deepEqual((await service.buscar({ texto: 'zqx9917' }, como(await criarDesenvolvedor(conexao)))).dados!.mensagens, []);

  assert.equal((await service.listarConversas(como(carla))).dados!.conversas.length, 1);
  assert.equal((await service.listarConversas(como(bruno))).dados!.conversas.length, 1);
  assert.equal((await service.listarConversas(como(ana))).dados!.conversas.length, 2);
});

testarComBanco('silenciar mantém a conversa na lista e não zera as não lidas; destinatário inativo ou inexistente não recebe', async (conexao) => {
  const service = montar(conexao);
  const ana = await criarDesenvolvedor(conexao);
  const bruno = await criarDesenvolvedor(conexao);
  await enviar(service, ana, bruno.id, 'primeira');

  await service.alterarSilencio({ usuarioId: ana.id, silenciada: true }, como(bruno));
  const conversa = (await service.listarConversas(como(bruno))).dados!.conversas[0];
  assert.equal(conversa.silenciada, true);
  assert.equal(conversa.naoLidas, 1);

  const inativo = await criarUsuario(conexao, { statusCodigo: 'INATIVO' });
  await assert.rejects(service.enviarMensagem({ destinatarioId: inativo.id, mensagemId: randomUUID(), texto: 'oi' }, como(ana)));
  await assert.rejects(service.enviarMensagem({ destinatarioId: ana.id, mensagemId: randomUUID(), texto: 'oi' }, como(ana)));
  await assert.rejects(service.enviarMensagem({ destinatarioId: 987654321, mensagemId: randomUUID(), texto: 'oi' }, como(ana)));
});

testarComBanco('referências e menções: o desenvolvedor só referencia o que vê; o gestor referencia qualquer uma', async (conexao) => {
  const service = montar(conexao);
  const ana = await criarDesenvolvedor(conexao);
  const bruno = await criarDesenvolvedor(conexao);
  const gestor = await criarGestor(conexao);
  const demandaDaAna = await criarDemanda(conexao);
  await criarDemandaUsuario(conexao, { demandaId: demandaDaAna.id, usuarioId: ana.id });
  const demandaAlheia = await criarDemanda(conexao);
  const atividadeAlheia = await criarAtividade(conexao, { demandaId: demandaAlheia.id, usuarioId: bruno.id });

  const ok = await enviar(service, ana, bruno.id, 'olha a demanda', {
    referencias: [{ tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: demandaDaAna.id }],
    mencoes: [bruno.id],
  });
  assert.deepEqual(ok.mensagem.referencias, [{ tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: demandaDaAna.id }]);
  assert.deepEqual(ok.mensagem.mencoes, [bruno.id]);

  const recusa = (parcial: Record<string, unknown>) =>
    assert.rejects(service.enviarMensagem({ destinatarioId: bruno.id, mensagemId: randomUUID(), texto: 'x', ...parcial } as never, como(ana)));
  await recusa({ referencias: [{ tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: demandaAlheia.id }] });
  await recusa({ referencias: [{ tipo: ReferenciaMensagemDiretaEnum.ATIVIDADE, id: atividadeAlheia.id }] });
  await recusa({ referencias: [{ tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: 987654321 }] });
  await recusa({ mencoes: [gestor.id] });

  const doGestor = await enviar(service, gestor, ana.id, 'a alheia', {
    referencias: [{ tipo: ReferenciaMensagemDiretaEnum.ATIVIDADE, id: atividadeAlheia.id }],
  });
  assert.equal(doGestor.mensagem.referencias.length, 1);
});

testarComBanco('preferências: o padrão do shared até a primeira alteração, depois o que a pessoa gravou, só para ela', async (conexao) => {
  const service = montar(conexao);
  const ana = await criarDesenvolvedor(conexao);
  const bruno = await criarDesenvolvedor(conexao);

  const padrao = (await service.recuperarPreferencia(como(ana))).dados!;
  assert.equal(padrao.avisosAtivos, true);
  assert.equal(padrao.silenciadoAteDate, null);

  await service.alterarPreferencia(
    { avisosAtivos: false, avisoDesktopAtivo: false, somAtivo: true, silenciadoAteDate: '2026-10-21T16:00:00.000Z', atalhoGlobal: 'Alt+F1', posicaoPopup: PosicaoPopupChatEnum.CANTO_SUPERIOR_DIREITO },
    como(ana),
  );
  const gravada = (await service.recuperarPreferencia(como(ana))).dados!;
  assert.deepEqual([gravada.avisosAtivos, gravada.somAtivo, gravada.atalhoGlobal, gravada.posicaoPopup], [false, true, 'Alt+F1', PosicaoPopupChatEnum.CANTO_SUPERIOR_DIREITO]);

  // Linha anterior à task 221: a coluna da posição é nula e vale o padrão do shared.
  await conexao.raw('UPDATE mensagem_direta_preferencia SET posicao_popup = NULL WHERE usuario_id = ?', [ana.id]);
  assert.equal((await service.recuperarPreferencia(como(ana))).dados!.posicaoPopup, PosicaoPopupChatEnum.CANTO_INFERIOR_DIREITO);
  assert.equal(gravada.silenciadoAteDate?.toISOString(), '2026-10-21T16:00:00.000Z');
  assert.deepEqual((await service.recuperarPreferencia(como(bruno))).dados, padrao);
});

testarComBanco('conversa com pessoa excluída: continua legível e o contador zera; enviar a ela é recusado', async (conexao) => {
  const service = montar(conexao);
  const ana = await criarDesenvolvedor(conexao);
  const bruno = await criarDesenvolvedor(conexao, { nomeCompleto: 'Bruno Removido' });
  const mensagem = await enviar(service, bruno, ana.id, 'antes de sair');
  await criarRepositorio(UsuarioRepository, conexao).excluir({ id: bruno.id });

  const conversa = (await service.listarConversas(como(ana))).dados!.conversas[0];
  assert.deepEqual([conversa.usuarioNome, conversa.naoLidas], ['Usuário removido', 1]);
  assert.equal((await service.listarConversa({ usuarioId: bruno.id }, como(ana))).dados!.mensagens.length, 1);

  await service.alterarLeitura({ usuarioId: bruno.id, lidaAteDate: mensagem.mensagem.createdDate.toISOString() }, como(ana));
  assert.equal((await service.listarConversas(como(ana))).dados!.conversas[0].naoLidas, 0);
  await service.alterarSilencio({ usuarioId: bruno.id, silenciada: true }, como(ana));
  await assert.rejects(service.enviarMensagem({ destinatarioId: bruno.id, mensagemId: randomUUID(), texto: 'oi' }, como(ana)));
});
