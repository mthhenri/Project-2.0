import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { AutorMensagemDiretaEnum, montarConversaDiretaId } from '@project20/shared';
import { MensagemDiretaFonte, MensagemDiretaNova, paraFonteDireta, validarMensagemDiretaNova } from '../../modules/mensagem-direta/domain/mensagem-direta.documento';

export const LOGINS_SEED_CONVERSAS = [
  'dev.mateus.henrique', 'dev.mateus.caranguejo', 'dev.mateus.nebuloso',
  'dev.mateus.parafuso', 'dev.mateus.trovao', 'dev.mateus.abacaxi',
  'gestor.inicial',
] as const;

/** Projeção local do resultado SQL para uma fixture, sem contrato novo de aplicação. */
export interface UsuarioSeedConversa {
  id: number;
  login: string;
  tipo: string;
  createdDate: Date;
}

export function validarMensagemSeedExistente(esperada: MensagemDiretaFonte, encontrada: unknown): void {
  if (!isDeepStrictEqual(esperada, encontrada)) {
    throw new Error('Mensagem do seed diverge do cenário atual. Confira o destino e use --limpar-opensearch somente se deseja apagar o histórico local.');
  }
}

function gerarIdentificador(chave: string): string {
  const hexadecimal = createHash('sha256').update(`project20-seed-conversas-v1:${chave}`).digest('hex');
  return `${hexadecimal.slice(0, 8)}-${hexadecimal.slice(8, 12)}-4${hexadecimal.slice(13, 16)}-a${hexadecimal.slice(17, 20)}-${hexadecimal.slice(20, 32)}`;
}

export function montarConversasSeed(usuarios: UsuarioSeedConversa[]): MensagemDiretaFonte[] {
  const ordenados = LOGINS_SEED_CONVERSAS.map((login, indice) => {
    const usuario = usuarios.find((candidato) => candidato.login === login);
    if (!usuario || !Number.isInteger(usuario.id) || usuario.id < 1 ||
        (indice < 6 ? usuario.tipo !== 'DESENVOLVEDOR' : !['GESTOR', 'ADMINISTRADOR'].includes(usuario.tipo))) {
      throw new Error(`Participante do seed ausente ou com tipo incompatível: ${login}`);
    }
    return usuario;
  });
  const documentos: MensagemDiretaFonte[] = [];
  for (let indice = 0; indice < 6; indice++) {
    const desenvolvedor = ordenados[indice];
    for (const comGestor of [false, true]) {
      const destinatario = comGestor ? ordenados[6] : ordenados[(indice + 1) % 6];
      const conversaId = montarConversaDiretaId(desenvolvedor.id, destinatario.id);
      const assunto = ['Portal do Cliente', 'Estoque Inteligente', 'Agenda da Equipe'][indice % 3];
      const textos = comGestor ? [
        `Bom dia! Como está a entrega do ${assunto}?`,
        'O fluxo principal está pronto. Estou validando os cenários de erro antes da revisão.',
        '**Prioridade de hoje:** fechar os testes e registrar o que falta na demanda.',
        'Combinado. Encontrei um ajuste na validação e já reservei a tarde para corrigir.',
        'Pode seguir. Se houver bloqueio, me avise para ajustarmos o planejamento.',
        'Testes concluídos e documentação revisada. A entrega está pronta para sua avaliação.',
      ] : [
        `Você consegue revisar comigo a entrega do ${assunto}?`,
        'Consigo sim. Qual parte precisa de mais atenção?',
        'Principalmente o estado vazio e a mensagem de erro. O formulário já está pronto.',
        'O caso que usei foi este:\n\n```typescript\nconst itens = [];\nconst podeSalvar = itens.length > 0;\n```',
        'Boa! Vou acrescentar esse cenário nos testes de integração.',
        'Revisei novamente e ficou bom. Podemos seguir para a próxima entrega.',
      ];
      // O administrador é recriado pela migration com data atual; o cenário histórico se ancora nos devs do seed.
      const inicio = +new Date(desenvolvedor.createdDate) + (77 + indice) * 86_400_000;
      if (!Number.isFinite(inicio) || inicio + 5 * 300_000 > Date.now()) {
        throw new Error('O cenário histórico exige os usuários do seed 273 criados há pelo menos 83 dias.');
      }
      const mensagens: MensagemDiretaNova[] = [];
      for (let numero = 0; numero < textos.length; numero++) {
        const autor = numero % 2 === 0 ? (comGestor ? destinatario : desenvolvedor) : (comGestor ? desenvolvedor : destinatario);
        const anterior = mensagens[numero - 1];
        const mensagem: MensagemDiretaNova = {
          mensagemId: gerarIdentificador(`${desenvolvedor.login}:${destinatario.login}:${numero}`),
          conversaId, autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId: autor.id,
          texto: textos[numero], contemCodigo: !comGestor && numero === 3, mencoes: [], referencias: [],
          ...(numero === 4 ? { respondeA: { mensagemId: anterior.mensagemId, autorUsuarioId: anterior.autorUsuarioId!, trecho: anterior.texto.slice(0, 150) } } : {}),
        };
        validarMensagemDiretaNova(mensagem);
        mensagens.push(mensagem);
        documentos.push(paraFonteDireta(mensagem, new Date(inicio + numero * 300_000)));
      }
    }
  }
  return documentos;
}
