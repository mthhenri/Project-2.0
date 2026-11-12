import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
    GrupoAlteradoDto,
    GrupoMensagemBuscadasDto,
    GrupoMensagemDesafixadaDto,
    GrupoMensagemFixadaDto,
    GrupoMensagemFixadaListadasDto,
    GrupoResumoIaCriadoDto,
    GrupoResumoIaEstimadoDto,
    GrupoResumoIaPropostaConfirmadaDto,
    GrupoResumoIaPropostaCriadaDto,
    GrupoResumoIaPropostaRecusadaDto,
    GrupoResumoIaRecuperadoDto,
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

/** O período e a escolha do código de um resumo com a IA (task 249). */
export interface PedidoDeResumo {
    inicioData: Date;
    fimData: Date;
    enviaCodigo: boolean;
}

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

    /** O que abre o diálogo de resumo: o fim do último resumo do grupo e onde o resumo pode ser gravado. */
    recuperarOpcoesDoResumo(grupoId: number): Observable<StandardResponse<GrupoResumoIaRecuperadoDto>> {
        return this.httpClient.get<StandardResponse<GrupoResumoIaRecuperadoDto>>(`${this.urlBase}/${grupoId}/resumo`, comFeedbackProprioEErroTratado());
    }

    /** A estimativa do resumo; o servidor não chama o provedor de resumo. */
    estimarResumo(grupoId: number, pedido: PedidoDeResumo): Observable<StandardResponse<GrupoResumoIaEstimadoDto>> {
        return this.httpClient.post<StandardResponse<GrupoResumoIaEstimadoDto>>(`${this.urlBase}/${grupoId}/resumo/estimativa`, this.corpoDoResumo(pedido), comFeedbackProprioEErroTratado());
    }

    /** Gera o resumo (várias chamadas ao provedor num período grande: a resposta pode demorar). */
    resumir(grupoId: number, pedido: PedidoDeResumo): Observable<StandardResponse<GrupoResumoIaCriadoDto>> {
        return this.httpClient.post<StandardResponse<GrupoResumoIaCriadoDto>>(`${this.urlBase}/${grupoId}/resumo`, this.corpoDoResumo(pedido), comFeedbackProprioEErroTratado());
    }

    /** Cria a proposta de gravar o resumo na documentação da demanda (`demandaId` só no canal de projeto). */
    criarPropostaDoResumo(grupoId: number, resumoId: number, texto: string, demandaId?: number): Observable<StandardResponse<GrupoResumoIaPropostaCriadaDto>> {
        return this.httpClient.post<StandardResponse<GrupoResumoIaPropostaCriadaDto>>(
            `${this.urlBase}/${grupoId}/resumo/${resumoId}/proposta`,
            { texto, ...(demandaId ? { demandaId } : {}) },
            comFeedbackProprioEErroTratado(),
        );
    }

    confirmarPropostaDoResumo(grupoId: number, resumoId: number, propostaId: number): Observable<StandardResponse<GrupoResumoIaPropostaConfirmadaDto>> {
        return this.httpClient.post<StandardResponse<GrupoResumoIaPropostaConfirmadaDto>>(`${this.urlBase}/${grupoId}/resumo/${resumoId}/proposta/${propostaId}/confirmar`, {}, comFeedbackProprioEErroTratado());
    }

    recusarPropostaDoResumo(grupoId: number, resumoId: number, propostaId: number): Observable<StandardResponse<GrupoResumoIaPropostaRecusadaDto>> {
        return this.httpClient.post<StandardResponse<GrupoResumoIaPropostaRecusadaDto>>(`${this.urlBase}/${grupoId}/resumo/${resumoId}/proposta/${propostaId}/recusar`, {}, comFeedbackProprioEErroTratado());
    }

    private corpoDoResumo(pedido: PedidoDeResumo): { inicioData: string; fimData: string; enviaCodigo: boolean } {
        return { inicioData: pedido.inicioData.toISOString(), fimData: pedido.fimData.toISOString(), enviaCodigo: pedido.enviaCodigo };
    }

    /** As mensagens fixadas do grupo ou canal (task 250). */
    listarFixadas(grupoId: number): Observable<StandardResponse<GrupoMensagemFixadaListadasDto>> {
        return this.httpClient.get<StandardResponse<GrupoMensagemFixadaListadasDto>>(`${this.urlBase}/${grupoId}/fixadas`, comFeedbackProprioEErroTratado());
    }

    /** Fixa uma mensagem (idempotente). */
    fixarMensagem(grupoId: number, mensagemId: string): Observable<StandardResponse<GrupoMensagemFixadaDto>> {
        return this.httpClient.post<StandardResponse<GrupoMensagemFixadaDto>>(`${this.urlBase}/${grupoId}/fixadas/${mensagemId}`, {}, comFeedbackProprioEErroTratado());
    }

    desafixarMensagem(grupoId: number, mensagemId: string): Observable<StandardResponse<GrupoMensagemDesafixadaDto>> {
        return this.httpClient.delete<StandardResponse<GrupoMensagemDesafixadaDto>>(`${this.urlBase}/${grupoId}/fixadas/${mensagemId}`, comFeedbackProprioEErroTratado());
    }

    /** A busca dentro do grupo: só as mensagens dele. */
    buscarNoGrupo(grupoId: number, texto: string, somenteCodigo: boolean): Observable<StandardResponse<GrupoMensagemBuscadasDto>> {
        let params = new HttpParams().set('texto', texto);
        if (somenteCodigo) params = params.set('somenteCodigo', true);
        return this.httpClient.get<StandardResponse<GrupoMensagemBuscadasDto>>(`${this.urlBase}/${grupoId}/busca`, { params, ...comFeedbackProprioEErroTratado() });
    }

    /** Avisa os outros membros de que o usuário está digitando (nada é gravado). */
    avisarDigitacao(grupoId: number): Observable<StandardResponse<null>> {
        return this.httpClient.post<StandardResponse<null>>(`${this.urlBase}/${grupoId}/digitando`, {}, comFeedbackProprioEErroTratado());
    }
}
