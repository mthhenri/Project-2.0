import {
  AutorMensagemDiretaEnum,
  MensagemDiretaResumoDto,
  ReferenciaMensagemDto,
  formatarReferenciaDireta,
  lerConversaDiretaId,
  lerReferenciaDireta,
} from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';

/** A mensagem a gravar: o repository define só a data (`created_date`) e deriva os dois participantes do `conversaId`. */
export interface MensagemDiretaNova {
  /** UUID gerado pelo cliente; vira o `_id` do documento e dá idempotência ao reenvio. */
  mensagemId: string;
  /** `<menorUsuarioId>-<maiorUsuarioId>`. */
  conversaId: string;
  autor: AutorMensagemDiretaEnum;
  /** Quem escreveu; `null` quando o autor é o sistema. */
  autorUsuarioId: number | null;
  /** Markdown. */
  texto: string;
  contemCodigo: boolean;
  mencoes: number[];
  referencias: ReferenciaMensagemDto[];
}

/** Forma do documento no índice `mensagem-direta` (nomes da modelagem). */
export interface MensagemDiretaFonte {
  mensagem_id: string;
  conversa_id: string;
  /** Os dois ids da conversa, em ordem crescente. */
  participantes: number[];
  autor_usuario_id: number | null;
  autor: string;
  texto: string;
  contem_codigo: boolean;
  mencoes: number[];
  /** `DEMANDA:212`, `ATIVIDADE:57`. */
  referencias: string[];
  created_date: string;
}

export const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Confere que o documento a gravar é coerente. A service valida o pedido do usuário; isto é a defesa do armazenamento, para nunca
 * gravar uma mensagem que os leitores (que filtram por `participantes` e `autor_usuario_id`) interpretariam errado.
 */
export function validarMensagemDiretaNova(mensagem: MensagemDiretaNova): void {
  const participantes = lerConversaDiretaId(mensagem.conversaId);
  if (!participantes) throw new BusinessException('Conversa direta inválida');
  if (!REGEX_UUID.test(mensagem.mensagemId)) throw new BusinessException('O identificador da mensagem deve ser um UUID');
  if (!mensagem.texto || !mensagem.texto.trim()) throw new BusinessException('A mensagem não pode ser vazia');

  if (mensagem.autor === AutorMensagemDiretaEnum.USUARIO) {
    const participa = mensagem.autorUsuarioId === participantes.usuarioMenorId || mensagem.autorUsuarioId === participantes.usuarioMaiorId;
    if (!participa) throw new BusinessException('Quem escreve a mensagem precisa participar da conversa');
  } else if (mensagem.autorUsuarioId !== null) {
    throw new BusinessException('A mensagem do sistema não tem autor');
  }
}

/** O reenvio de um `mensagemId` só devolve o que já estava gravado se for o mesmo autor, na mesma conversa; senão vazaria a mensagem de outra pessoa. */
export function mesmaOrigemDaMensagem(existente: Pick<MensagemDiretaFonte, 'conversa_id' | 'autor' | 'autor_usuario_id'>, mensagem: MensagemDiretaNova): boolean {
  return existente.conversa_id === mensagem.conversaId && existente.autor === mensagem.autor && (existente.autor_usuario_id ?? null) === mensagem.autorUsuarioId;
}

export function paraFonteDireta(mensagem: MensagemDiretaNova, criadaEm: Date): MensagemDiretaFonte {
  const participantes = lerConversaDiretaId(mensagem.conversaId);
  if (!participantes) throw new BusinessException('Conversa direta inválida');
  return {
    mensagem_id: mensagem.mensagemId,
    conversa_id: mensagem.conversaId,
    participantes: [participantes.usuarioMenorId, participantes.usuarioMaiorId],
    autor_usuario_id: mensagem.autorUsuarioId,
    autor: mensagem.autor,
    texto: mensagem.texto,
    contem_codigo: mensagem.contemCodigo,
    mencoes: mensagem.mencoes,
    referencias: mensagem.referencias.map(formatarReferenciaDireta),
    created_date: criadaEm.toISOString(),
  };
}

export function deFonteDireta(fonte: MensagemDiretaFonte): MensagemDiretaResumoDto {
  return {
    mensagemId: fonte.mensagem_id,
    conversaId: fonte.conversa_id,
    autor: fonte.autor as AutorMensagemDiretaEnum,
    autorUsuarioId: fonte.autor_usuario_id ?? null,
    texto: fonte.texto,
    contemCodigo: fonte.contem_codigo,
    mencoes: fonte.mencoes ?? [],
    referencias: (fonte.referencias ?? []).flatMap((texto) => {
      const referencia = lerReferenciaDireta(texto);
      return referencia ? [referencia] : [];
    }),
    createdDate: new Date(fonte.created_date),
  };
}
