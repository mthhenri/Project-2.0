import { IsInt, IsOptional, Matches } from 'class-validator';
import { Type } from 'class-transformer';

/** Entrada da ferramenta `listar_conversas_do_desenvolvedor` (gestor): de quem, e opcionalmente o intervalo de dias (`yyyy-mm-dd`). */
export class ConversasDoDesenvolvedorListarDto {
  @Type(() => Number)
  @IsInt()
  usuarioId!: number;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  inicio?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fim?: string;
}

/** Uma conversa (um dia) do desenvolvedor, sem as mensagens. */
export interface ConversaDoDesenvolvedorDto {
  /** `yyyy-mm-dd`. */
  data: string;
  titulo: string;
  primeiraMensagem: string;
  quantidadeDeMensagens: number;
}

/** O que a ferramenta `listar_conversas_do_desenvolvedor` devolve à IA. */
export interface ConversasDoDesenvolvedorListadasDto {
  usuarioId: number;
  usuario: string;
  conversas: ConversaDoDesenvolvedorDto[];
  haMais: boolean;
}
