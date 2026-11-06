import { ApiProperty } from '@nestjs/swagger';
import { TipoUsuarioEnum } from '../../enums/tipo-usuario.enum';

export class UsuarioAlteradoDto {
    @ApiProperty({ example: 1 })
    id: number;

    @ApiProperty({ example: 'joao.silva' })
    login: string;

    @ApiProperty({ example: 'João Silva' })
    nomeCompleto: string;

    @ApiProperty({ example: 'Desenvolvedor Sênior' })
    cargoTitulo: string;

    @ApiProperty({ enum: TipoUsuarioEnum, example: TipoUsuarioEnum.DESENVOLVEDOR })
    tipo: TipoUsuarioEnum;

    @ApiProperty({ example: true })
    ativo: boolean;

    @ApiProperty({ example: 8 })
    horasDiariasNecessarias: number;

    @ApiProperty({ example: '#1E3A8A', nullable: true, description: 'Cor da bolinha escolhida; null = cor padrão' })
    corAvatar: string | null;

    @ApiProperty({ example: '2026-06-13T12:00:00.000Z' })
    createdDate: Date;
}
