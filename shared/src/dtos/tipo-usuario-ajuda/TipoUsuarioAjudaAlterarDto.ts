import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Limite do texto de ajuda de um tipo de usuário (task 308); o `shared` o guarda para o dialog e a API dizerem o mesmo. */
export const LIMITE_AJUDA_TIPO_TEXTO = 2000;

/** Corpo de `PUT /tipo-usuario-ajuda/:tipo` (só administrador). O tipo vem da rota, a controller o injeta no DTO interno. */
export class TipoUsuarioAjudaAlterarDto {
    @ApiProperty({ example: 'Quem conduz o trabalho.\n\n### Pode\n✓ Ver todos os projetos\n\n### Não pode\n✕ Gerenciar usuários' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(LIMITE_AJUDA_TIPO_TEXTO)
    texto: string;
}
