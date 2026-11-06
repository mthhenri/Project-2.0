import { ApiProperty } from '@nestjs/swagger';

export class UsuarioCorAlteradaDto {
    @ApiProperty({ example: '#1E3A8A', nullable: true })
    corAvatar: string | null;
}
