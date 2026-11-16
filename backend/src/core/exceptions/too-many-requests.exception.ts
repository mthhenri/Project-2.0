import { HttpException, HttpStatus } from '@nestjs/common';

/** Tentativas demais em pouco tempo (hoje: o login). Diz em segundos quando tentar de novo; a tela mostra a mensagem. */
export class TooManyRequestsException extends HttpException {
    constructor(readonly segundosParaTentar: number) {
        super(
            {
                sucesso: false,
                dados: null,
                mensagem: `Muitas tentativas de login. Tente de novo em ${segundosParaTentar} ${segundosParaTentar === 1 ? 'segundo' : 'segundos'}.`,
                erros: [],
            },
            HttpStatus.TOO_MANY_REQUESTS,
        );
    }
}
