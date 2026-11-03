import { Injectable } from '@nestjs/common';
import {
    LIMITE_AJUDA_TIPO_TEXTO,
    StandardResponse,
    TipoUsuarioAjudaAlteradaDto,
    TipoUsuarioAjudaInternoAlterarDto,
    TipoUsuarioAjudaResumoDto,
    temPermissaoDeAdministrador,
} from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { TipoUsuarioAjudaRepository } from '../repositories/tipo-usuario-ajuda.repository';

/** O texto que a tela de Usuários mostra para explicar cada tipo (task 308); só o administrador o altera. */
@Injectable()
export class TipoUsuarioAjudaService {
    constructor(private readonly ajudaRepositorio: TipoUsuarioAjudaRepository) {}

    /** Os textos de todos os tipos (a rota é do gestor, como a própria tela). */
    async listar(): Promise<StandardResponse<TipoUsuarioAjudaResumoDto[]>> {
        const ajudas = await this.ajudaRepositorio.listar();
        return { sucesso: true, dados: ajudas, mensagem: 'Textos de ajuda dos tipos listados com sucesso' };
    }

    /** Troca o texto de um tipo. Só o administrador; o texto é ajuda, nunca muda o que o tipo pode fazer. */
    async alterar(dto: TipoUsuarioAjudaInternoAlterarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<TipoUsuarioAjudaAlteradaDto>> {
        if (!temPermissaoDeAdministrador(usuarioAtivo.tipo)) {
            throw new UnauthorizedAccessException('Somente o administrador altera os textos dos tipos de usuário');
        }

        const texto = dto.texto.trim();
        if (texto.length === 0) throw new BusinessException('Escreva o texto deste tipo de usuário');
        if (texto.length > LIMITE_AJUDA_TIPO_TEXTO) throw new BusinessException(`O texto aceita até ${LIMITE_AJUDA_TIPO_TEXTO} caracteres`);

        const existe = await this.ajudaRepositorio.alterar({ tipo: dto.tipo, texto });
        if (!existe) throw new ResourceNotFoundException('Tipo de usuário não encontrado');

        return {
            sucesso: true,
            dados: { tipo: dto.tipo, texto },
            mensagem: 'Texto do tipo de usuário alterado com sucesso',
        };
    }
}
