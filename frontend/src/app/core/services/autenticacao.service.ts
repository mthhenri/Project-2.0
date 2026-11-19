import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, catchError, finalize, map, of, shareReplay, tap, timeout } from 'rxjs';
import { AutenticacaoLoginDto, AutenticacaoTokenDto, StandardResponse, UsuarioRecuperadoDto } from '@project20/shared';
import { UsuarioSessaoService } from './usuario-sessao.service';
import { ExecucaoAtivaService } from './execucao-ativa.service';
import { comErroTratadoPelaTela, parametrosRetorno } from '../interceptors/error-handler.interceptor';
import { comLeituraDeFundo } from '../interceptors/loading.interceptor';
import { ambiente } from '../../../environments/environment';

/** Quanto a primeira navegação espera a conferência do tipo no servidor antes de seguir com o que está guardado (backend fora, rede lenta). */
const ESPERA_MAXIMA_DA_CONFERENCIA_MS = 3000;
/** Intervalo mínimo entre duas reconferências disparadas por 403. */
const INTERVALO_MINIMO_APOS_ACESSO_NEGADO_MS = 5000;

@Injectable({ providedIn: 'root' })
export class AutenticacaoService {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly sessao = inject(UsuarioSessaoService);
    private readonly execucaoAtiva = inject(ExecucaoAtivaService);
    private readonly injector = inject(Injector);
    private conferenciaEmCurso$: Observable<void> | null = null;
    private conferidaNestaAbertura = false;
    private ultimaReconferenciaPorAcessoNegadoEm = 0;

    login(dto: AutenticacaoLoginDto): Observable<StandardResponse<AutenticacaoTokenDto>> {
        return this.http.post<StandardResponse<AutenticacaoTokenDto>>(
            `${ambiente.apiUrl}/autenticacao/login`,
            dto,
            comErroTratadoPelaTela(),
        ).pipe(
            tap((resposta) => {
                if (resposta.sucesso && resposta.dados) {
                    localStorage.setItem('access_token', resposta.dados.accessToken);
                    this.sessao.definirUsuario(resposta.dados.usuario as unknown as UsuarioRecuperadoDto);
                }
            }),
        );
    }

    logout(): void {
        this.encerrarSessao();
    }

    /**
   * O único caminho que encerra a sessão: o logout, o 401 do interceptor e o do stream do chat passam por aqui, para o próximo login na mesma aba
   * não herdar o usuário nem a execução ativa de quem saiu. `expirada` (o servidor recusou o token) leva ao login guardando a tela de origem em
   * `returnUrl`; o logout pedido pela pessoa não guarda.
   */
    encerrarSessao(opcoes: { expirada?: boolean } = {}): void {
        const urlDeOrigem = this.router.url;
        localStorage.removeItem('access_token');
        this.sessao.limpar();
        this.execucaoAtiva.limpar();
        // O próximo login confere o tipo de novo na primeira navegação, e uma conferência a caminho não vale para a conta seguinte.
        this.conferenciaEmCurso$ = null;
        this.conferidaNestaAbertura = false;
        this.ultimaReconferenciaPorAcessoNegadoEm = 0;
        void this.router.navigate(['/autenticacao'], opcoes.expirada ? { queryParams: parametrosRetorno(urlDeOrigem) } : {});
    }

    /**
   * Troca o usuário guardado no login pelo atual do servidor (P-062): o token dura dias, e uma mudança de tipo ou de nome
   * nesse intervalo não chegaria aos menus. O backend já confere o tipo atual em cada requisição, então aqui só a tela
   * alcança a verdade. Falha de rede ou demora deixa a sessão como está (a conferência nunca erra); 401 segue o redirecionamento global.
   * Quem pede enquanto outra conferência está a caminho recebe a mesma. Se o tipo mudou, a tela aberta é reavaliada pelos guards da rota.
   */
    conferirSessao(): Observable<void> {
        const usuario = this.sessao.usuarioAtual();
        if (!usuario || !this.estaAutenticado()) return of(undefined);

        if (!this.conferenciaEmCurso$) {
            this.conferenciaEmCurso$ = this.http.get<StandardResponse<UsuarioRecuperadoDto>>(`${ambiente.apiUrl}/usuario/${usuario.id}`, comLeituraDeFundo()).pipe(
                timeout(ESPERA_MAXIMA_DA_CONFERENCIA_MS),
                tap((resposta) => {
                    // O usuário pode ter saído (ou trocado de conta) enquanto a resposta voltava.
                    if (!resposta.sucesso || !resposta.dados || this.sessao.id() !== resposta.dados.id) return;
                    const tipoMudou = usuario.tipo !== resposta.dados.tipo;
                    this.sessao.definirUsuario(resposta.dados);
                    if (tipoMudou) this.reavaliarTelaAtual();
                }),
                map(() => undefined),
                catchError(() => of(undefined)),
                finalize(() => {
                    this.conferenciaEmCurso$ = null;
                    this.conferidaNestaAbertura = true;
                }),
                shareReplay({ bufferSize: 1, refCount: false }),
            );
        }
        return this.conferenciaEmCurso$;
    }

    /** Conferência de fire-and-forget (a casca não espera a resposta). */
    atualizarSessao(): void {
        this.conferirSessao().subscribe();
    }

    /** Para o guard da primeira navegação: espera a conferência uma vez por abertura do app; as navegações seguintes passam direto. */
    garantirSessaoConferida(): Observable<void> {
        return this.conferidaNestaAbertura ? of(undefined) : this.conferirSessao();
    }

    /** Um 403 pode ser o tipo que mudou: reconfere, no máximo uma vez a cada poucos segundos (uma rajada de 403 não vira uma rajada de leituras). */
    reconferirAposAcessoNegado(): void {
        const agora = Date.now();
        if (agora - this.ultimaReconferenciaPorAcessoNegadoEm < INTERVALO_MINIMO_APOS_ACESSO_NEGADO_MS) return;
        this.ultimaReconferenciaPorAcessoNegadoEm = agora;
        this.atualizarSessao();
    }

    /** O tipo mudou com uma tela aberta: roda de novo os guards síncronos da rota ativa e, se algum nega, leva à raiz. Menus já seguem os sinais. */
    private reavaliarTelaAtual(): void {
        const estado = this.router.routerState.snapshot;
        for (let rota: ActivatedRouteSnapshot | null = estado.root; rota; rota = rota.firstChild) {
            for (const guard of rota.routeConfig?.canActivate ?? []) {
                if (typeof guard !== 'function') continue;
                const resultado = runInInjectionContext(this.injector, () => (guard as CanActivateFn)(rota!, estado));
                if (resultado === false || resultado instanceof UrlTree) {
                    this.router.navigate(['/']);
                    return;
                }
            }
        }
    }

    estaAutenticado(): boolean {
        return !!localStorage.getItem('access_token');
    }
}
