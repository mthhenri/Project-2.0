import { TooManyRequestsException } from '../../../core/exceptions/too-many-requests.exception';

/** Falhas seguidas com o mesmo login até o bloqueio começar. */
export const LIMITE_DE_FALHAS_POR_LOGIN = 5;
/** Falhas seguidas vindas do mesmo IP (qualquer login) até o bloqueio começar. */
export const LIMITE_DE_FALHAS_POR_IP = 20;
/** O primeiro bloqueio dura isto; cada falha seguinte dobra o tempo. */
export const ATRASO_BASE_EM_SEGUNDOS = 30;
/** O bloqueio nunca passa disto. */
export const ATRASO_MAXIMO_EM_SEGUNDOS = 15 * 60;
/** Sem falha nova por este tempo (e sem bloqueio ativo), a contagem recomeça. */
export const JANELA_DE_ESQUECIMENTO_EM_SEGUNDOS = 15 * 60;

const TAMANHO_PARA_LIMPEZA = 5000;

interface Registro {
    falhas: number;
    ultimaFalhaEm: number;
    bloqueadoAte: number;
}

export interface TentativaDeLoginDto {
    login: string;
    ip: string;
}

/**
 * Limite de tentativas da rota pública de login (task 421): por login e por IP, com atraso progressivo. É da aplicação, em memória: vale por
 * processo (uma instância do backend) e recomeça quando ele reinicia. Conta o login digitado exista ele ou não, para a resposta não revelar quem existe.
 * Um login certo zera a contagem do login; a do IP só se esgota com o tempo.
 */
export class LimiteDeTentativasDeLogin {
    private readonly porLogin = new Map<string, Registro>();
    private readonly porIp = new Map<string, Registro>();

    constructor(private readonly agora: () => number = Date.now) {}

    /** Antes de conferir a senha: lança 429 se o login ou o IP está bloqueado. A tentativa bloqueada não conta como falha nova. */
    verificar(tentativa: TentativaDeLoginDto): void {
        const agora = this.agora();
        const bloqueadoAte = Math.max(this.bloqueioDe(this.porLogin, tentativa.login, agora), this.bloqueioDe(this.porIp, tentativa.ip, agora));
        if (bloqueadoAte > agora) throw new TooManyRequestsException(Math.ceil((bloqueadoAte - agora) / 1000));
    }

    registrarFalha(tentativa: TentativaDeLoginDto): void {
        const agora = this.agora();
        this.somarFalha(this.porLogin, tentativa.login, LIMITE_DE_FALHAS_POR_LOGIN, agora);
        this.somarFalha(this.porIp, tentativa.ip, LIMITE_DE_FALHAS_POR_IP, agora);
        if (this.porLogin.size + this.porIp.size > TAMANHO_PARA_LIMPEZA) this.limpar(agora);
    }

    registrarSucesso(tentativa: TentativaDeLoginDto): void {
        this.porLogin.delete(tentativa.login);
    }

    private bloqueioDe(registros: Map<string, Registro>, chave: string, agora: number): number {
        const registro = registros.get(chave);
        return registro && registro.bloqueadoAte > agora ? registro.bloqueadoAte : 0;
    }

    private somarFalha(registros: Map<string, Registro>, chave: string, limite: number, agora: number): void {
        const anterior = registros.get(chave);
        const esquecido = !anterior || (anterior.bloqueadoAte <= agora && agora - anterior.ultimaFalhaEm > JANELA_DE_ESQUECIMENTO_EM_SEGUNDOS * 1000);
        const falhas = (esquecido ? 0 : anterior.falhas) + 1;
        const excedentes = falhas - limite;
        const atrasoEmSegundos = excedentes >= 0 ? Math.min(ATRASO_BASE_EM_SEGUNDOS * 2 ** excedentes, ATRASO_MAXIMO_EM_SEGUNDOS) : 0;
        registros.set(chave, { falhas, ultimaFalhaEm: agora, bloqueadoAte: atrasoEmSegundos > 0 ? agora + atrasoEmSegundos * 1000 : 0 });
    }

    private limpar(agora: number): void {
        for (const registros of [this.porLogin, this.porIp]) {
            for (const [chave, registro] of registros) {
                if (registro.bloqueadoAte <= agora && agora - registro.ultimaFalhaEm > JANELA_DE_ESQUECIMENTO_EM_SEGUNDOS * 1000) registros.delete(chave);
            }
        }
    }
}
