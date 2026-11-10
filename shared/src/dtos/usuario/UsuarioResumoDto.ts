import { ApiProperty } from '@nestjs/swagger';
import { TipoUsuarioEnum } from '../../enums/tipo-usuario.enum';

export class UsuarioResumoDto {
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

    @ApiProperty({ example: '#1E3A8A', nullable: true, description: 'Cor da bolinha escolhida pela pessoa; null = cor padrão do tema' })
    corAvatar: string | null;

    @ApiProperty({ example: true, description: 'Indica se o usuário possui anotações registradas' })
    temAnotacoes: boolean;
}
