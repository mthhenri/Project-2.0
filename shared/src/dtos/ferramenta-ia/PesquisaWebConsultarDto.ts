import { IsString, MaxLength, MinLength } from 'class-validator';

/** Entrada da ferramenta `pesquisar_na_internet`: o que procurar (uma busca curta, como se digitaria num buscador). */
export class PesquisaWebConsultarDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  consulta!: string;
}

/** Um resultado da busca: título, endereço e um trecho da página, sem HTML. */
export interface PesquisaWebResultadoDto {
  titulo: string;
  url: string;
  trecho: string;
}

/** O que a ferramenta `pesquisar_na_internet` devolve à IA. */
export interface PesquisaWebConsultadaDto {
  consulta: string;
  resultados: PesquisaWebResultadoDto[];
  /** Lembrete ao modelo: o conteúdo vem de terceiros. */
  aviso: string;
}
