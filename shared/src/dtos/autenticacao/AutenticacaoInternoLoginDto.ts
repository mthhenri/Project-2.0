import { AutenticacaoLoginDto } from './AutenticacaoLoginDto';

/** Interno (controller → service): o login com o IP de quem chamou, para o limite de tentativas (task 421). */
export class AutenticacaoInternoLoginDto extends AutenticacaoLoginDto {
    ip: string;
}
