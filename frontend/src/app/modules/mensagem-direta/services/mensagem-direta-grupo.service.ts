import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
    GrupoAlteradoDto,
    GrupoCanalCriadoDto,
    GrupoCanalRecuperadoDto,
    GrupoCriadoDto,
    GrupoCriarDto,
    GrupoLeituraAlteradaDto,
    GrupoMembroAdicionadoDto,
    GrupoMensagemListadasDto,
    GrupoRecuperadoDto,
    GrupoSaidoDto,
    GrupoSilencioAlteradoDto,
    GrupoSupervisaoLidoDto,
    GrupoSupervisaoListadosDto,
    MensagemDiretaEnviadaDto,
    ReferenciaMensagemDto,
    StandardResponse,
    TipoGrupoEnum,
} from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import { comFeedbackProprioEErroTratado } from '../../../core/interceptors/loading.interceptor';

/** O que o formulário do grupo manda ao criar. */
export type NovoGrupo = Pick<GrupoCriarDto, 'nome' | 'corAvatar' | 'emojiAvatar' | 'membroUsuarioIds'>;

/** O que o grupo aceita alterar; ausente = como está, `null` limpa a cor ou o emoji. */
export interface AlteracaoDoGrupo {
    nome?: string;
    corAvatar?: string | null;
    emojiAvatar?: string | null;
}

export interface EnvioAoGrupo {
    mensagemId: string;
    texto: string;
    mencoes: number[];
    mencionaTodos?: boolean;
    referencias: ReferenciaMensagemDto[];
    respondeAMensagemId?: string;
}

/**
 * Grupos do chat entre colaboradores (task 247), a parte HTTP. Como a conversa um a um, o popup mostra os próprios erros e estados de carga: as chamadas não
 * acionam o overlay global nem o aviso global de erro. O stream de eventos é o mesmo (`MensagemDiretaEventosService`).
 */
@Injectable({ providedIn: 'root' })
export class MensagemDiretaGrupoService {
    private readonly httpClient = inject(HttpClient);
    private readonly urlBase = `${ambiente.apiUrl}/mensagem-direta/grupo`;
    private readonly urlSupervisao = `${ambiente.apiUrl}/mensagem-direta/supervisao`;

    criar(grupo: NovoGrupo): Observable<StandardResponse<GrupoCriadoDto>> {
        return this.httpClient.post<StandardResponse<GrupoCriadoDto>>(this.urlBase, grupo, comFeedbackProprioEErroTratado());
    }

    recuperar(grupoId: number): Observable<StandardResponse<GrupoRecuperadoDto>> {
        return this.httpClient.get<StandardResponse<GrupoRecuperadoDto>>(`${this.urlBase}/${grupoId}`, comFeedbackProprioEErroTratado());
    }

    alterar(grupoId: number, alteracao: AlteracaoDoGrupo): Observable<StandardResponse<GrupoAlteradoDto>> {
        return this.httpClient.patch<StandardResponse<GrupoAlteradoDto>>(`${this.urlBase}/${grupoId}`, alteracao, comFeedbackProprioEErroTratado());
    }

    adicionarMembros(grupoId: number, usuarioIds: number[]): Observable<StandardResponse<GrupoMembroAdicionadoDto>> {
        return this.httpClient.post<StandardResponse<GrupoMembroAdicionadoDto>>(`${this.urlBase}/${grupoId}/membros`, { usuarioIds }, comFeedbackProprioEErroTratado());
    }

    sair(grupoId: number): Observable<StandardResponse<GrupoSaidoDto>> {
        return this.httpClient.delete<StandardResponse<GrupoSaidoDto>>(`${this.urlBase}/${grupoId}/membro`, comFeedbackProprioEErroTratado());
    }

    /** Uma página da conversa do grupo, da mais nova para a mais antiga; `cursor` é o `proximoCursor` da página anterior. */
    listarMensagens(grupoId: number, cursor?: string | null): Observable<StandardResponse<GrupoMensagemListadasDto>> {
        let params = new HttpParams();
        if (cursor) params = params.set('cursor', cursor);
        return this.httpClient.get<StandardResponse<GrupoMensagemListadasDto>>(`${this.urlBase}/${grupoId}/mensagens`, { params, ...comFeedbackProprioEErroTratado() });
    }

    enviarMensagem(grupoId: number, envio: EnvioAoGrupo): Observable<StandardResponse<MensagemDiretaEnviadaDto>> {
        return this.httpClient.post<StandardResponse<MensagemDiretaEnviadaDto>>(`${this.urlBase}/${grupoId}/mensagem`, envio, comFeedbackProprioEErroTratado());
    }

    alterarLeitura(grupoId: number, lidaAteData: Date): Observable<StandardResponse<GrupoLeituraAlteradaDto>> {
        return this.httpClient.put<StandardResponse<GrupoLeituraAlteradaDto>>(`${this.urlBase}/${grupoId}/leitura`, { lidaAteData: lidaAteData.toISOString() }, comFeedbackProprioEErroTratado());
    }

    alterarSilencio(grupoId: number, silenciada: boolean): Observable<StandardResponse<GrupoSilencioAlteradoDto>> {
        return this.httpClient.put<StandardResponse<GrupoSilencioAlteradoDto>>(`${this.urlBase}/${grupoId}/silencio`, { silenciada }, comFeedbackProprioEErroTratado());
    }

    /** Supervisão (só gestor): os grupos sem gestor nem administrador entre os membros atuais. */
    listarGruposSupervisionados(filtros: { texto?: string; somenteCodigo?: boolean; pagina: number; porPagina: number }): Observable<StandardResponse<GrupoSupervisaoListadosDto>> {
        let params = new HttpParams().set('pagina', filtros.pagina).set('porPagina', filtros.porPagina);
        if (filtros.texto) params = params.set('texto', filtros.texto);
        if (filtros.somenteCodigo) params = params.set('somenteCodigo', true);
        return this.httpClient.get<StandardResponse<GrupoSupervisaoListadosDto>>(`${this.urlSupervisao}/grupos`, { params, ...comFeedbackProprioEErroTratado() });
    }

    /** Supervisão: abre um grupo de terceiros (a primeira página grava a auditoria e avisa os membros; com `cursor` só lê as anteriores). */
    lerGrupoSupervisionado(grupoId: number, cursor?: string | null): Observable<StandardResponse<GrupoSupervisaoLidoDto>> {
        let params = new HttpParams();
        if (cursor) params = params.set('cursor', cursor);
        return this.httpClient.get<StandardResponse<GrupoSupervisaoLidoDto>>(`${this.urlSupervisao}/grupo/${grupoId}`, { params, ...comFeedbackProprioEErroTratado() });
    }

    /** O chat de uma demanda (`DEMANDA`) ou de um projeto (`PROJETO`); `grupo` vem `null` quando ainda não foi criado. 403 = sem acesso, 404 = não existe. */
    recuperarCanal(tipo: TipoGrupoEnum.DEMANDA | TipoGrupoEnum.PROJETO, alvoId: number): Observable<StandardResponse<GrupoCanalRecuperadoDto>> {
        return this.httpClient.get<StandardResponse<GrupoCanalRecuperadoDto>>(this.urlDoCanal(tipo, alvoId), comFeedbackProprioEErroTratado());
    }

    /** "Criar chat": idempotente, devolve o chat que já existe. */
    criarCanal(tipo: TipoGrupoEnum.DEMANDA | TipoGrupoEnum.PROJETO, alvoId: number): Observable<StandardResponse<GrupoCanalCriadoDto>> {
        return this.httpClient.post<StandardResponse<GrupoCanalCriadoDto>>(this.urlDoCanal(tipo, alvoId), {}, comFeedbackProprioEErroTratado());
    }

    private urlDoCanal(tipo: TipoGrupoEnum.DEMANDA | TipoGrupoEnum.PROJETO, alvoId: number): string {
        return `${ambiente.apiUrl}/mensagem-direta/canal/${tipo === TipoGrupoEnum.DEMANDA ? 'demanda' : 'projeto'}/${alvoId}`;
    }

    /** Avisa os outros membros de que o usuário está digitando (nada é gravado). */
    avisarDigitacao(grupoId: number): Observable<StandardResponse<null>> {
        return this.httpClient.post<StandardResponse<null>>(`${this.urlBase}/${grupoId}/digitando`, {}, comFeedbackProprioEErroTratado());
    }
}
