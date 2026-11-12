import { IsDateString } from 'class-validator';

/** Marca o grupo como lido até a mensagem mais nova que quem lê já viu: o corpo traz a data dessa mensagem, não o instante da leitura. */
export class GrupoLeituraAlterarDto {
    /** Vem da rota e é preenchido pela controller; nunca pelo corpo. */
    grupoId: number;

    @IsDateString()
    lidaAteData: string;
}
