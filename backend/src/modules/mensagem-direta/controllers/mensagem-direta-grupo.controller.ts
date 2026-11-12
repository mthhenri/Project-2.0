import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import {
    GrupoAlterarDto,
    GrupoCriarDto,
    GrupoLeituraAlterarDto,
    GrupoMembroAdicionarDto,
    GrupoMensagemEnviarDto,
    GrupoResumoIaCriarDto,
    GrupoResumoIaEstimarDto,
    GrupoResumoIaPropostaCriarDto,
    GrupoMensagemListarDto,
    GrupoSilencioAlterarDto,
    GrupoSupervisaoLerDto,
    GrupoSupervisaoListarDto,
    TipoGrupoEnum,
} from '@project20/shared';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { GestorOnly } from '../../autenticacao/decorators/gestor-only.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { GrupoSupervisaoService } from '../services/grupo-supervisao.service';
import { GrupoResumoIaService } from '../services/grupo-resumo-ia.service';
import { GrupoService } from '../services/grupo.service';

/**
 * Grupos do chat entre colaboradores (task 246): qualquer usuário autenticado, sempre como a pessoa do token. O `grupoId` da rota entra no DTO aqui; nunca vem do
 * corpo ou da query. A conversa um a um fica em `MensagemDiretaController`. As rotas `supervisao/*` são só de gestor.
 */
@Controller('mensagem-direta')
export class MensagemDiretaGrupoController {
    constructor(
        private readonly grupoService: GrupoService,
        private readonly supervisaoService: GrupoSupervisaoService,
        private readonly resumoService: GrupoResumoIaService,
    ) {}

    /** Supervisão: os grupos sem gestor nem administrador entre os membros atuais, somente leitura. */
    @GestorOnly()
    @Get('supervisao/grupos')
    listarGruposSupervisionados(@Query() dto: GrupoSupervisaoListarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
        return this.supervisaoService.listarGruposSupervisionados(dto, usuarioAtivo);
    }

    /** Abre um grupo de terceiros: grava a auditoria e, no máximo uma vez por dia, avisa os membros. */
    @GestorOnly()
    @Get('supervisao/grupo/:grupoId')
    lerGrupoSupervisionado(@Param('grupoId', ParseIntPipe) grupoId: number, @Query() dto: GrupoSupervisaoLerDto, @ActiveUser() usuarioAtivo: JwtPayload) {
        return this.supervisaoService.lerGrupoSupervisionado({ ...dto, grupoId }, usuarioAtivo);
    }

    /** O chat de uma demanda (`canal/demanda/:demandaId`) ou de um projeto (`canal/projeto/:projetoId`): recuperar devolve `grupo: null` se ainda não existe. */
    @Get('canal/demanda/:demandaId')
    recuperarCanalDaDemanda(@Param('demandaId', ParseIntPipe) demandaId: number, @ActiveUser() usuarioAtivo: JwtPayload) {
        return this.grupoService.recuperarCanal({ tipo: TipoGrupoEnum.DEMANDA, alvoId: demandaId }, usuarioAtivo);
    }

    @Get('canal/projeto/:projetoId')
    recuperarCanalDoProjeto(@Param('projetoId', ParseIntPipe) projetoId: number, @ActiveUser() usuarioAtivo: JwtPayload) {
        return this.grupoService.recuperarCanal({ tipo: TipoGrupoEnum.PROJETO, alvoId: projetoId }, usuarioAtivo);
    }

    /** "Criar chat": idempotente, devolve o canal que já existe. */
    @Post('canal/demanda/:demandaId')
    criarCanalDaDemanda(@Param('demandaId', ParseIntPipe) demandaId: number, @ActiveUser() usuarioAtivo: JwtPayload) {
        return this.grupoService.criarCanal({ tipo: TipoGrupoEnum.DEMANDA, alvoId: demandaId }, usuarioAtivo);
    }

    @Post('canal/projeto/:projetoId')
    criarCanalDoProjeto(@Param('projetoId', ParseIntPipe) projetoId: number, @ActiveUser() usuarioAtivo: JwtPayload) {
        return this.grupoService.criarCanal({ tipo: TipoGrupoEnum.PROJETO, alvoId: projetoId }, usuarioAtivo);
    }

    @Post('grupo')
    criarGrupo(@Body() dto: GrupoCriarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
        return this.grupoService.criarGrupo(dto, usuarioAtivo);
    }

    @Get('grupo/:grupoId')
    recuperarGrupo(@Param('grupoId', ParseIntPipe) grupoId: number, @ActiveUser() usuarioAtivo: JwtPayload) {
        return this.grupoService.recuperarGrupo(grupoId, usuarioAtivo);
    }

    /** Qualquer membro altera nome, cor e emoji. */
    @Patch('grupo/:grupoId')
    alterarGrupo(@Param('grupoId', ParseIntPipe) grupoId: number, @Body() dto: GrupoAlterarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
        return this.grupoService.alterarGrupo({ ...dto, grupoId }, usuarioAtivo);
    }

    /** Qualquer membro adiciona pessoas; ninguém remove ninguém. */
    @Post('grupo/:grupoId/membros')
    adicionarMembros(@Param('grupoId', ParseIntPipe) grupoId: number, @Body() dto: GrupoMembroAdicionarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
        return this.grupoService.adicionarMembros({ ...dto, grupoId }, usuarioAtivo);
    }

    /** Cada um só sai por conta própria; o último a sair encerra o grupo. */
    @Delete('grupo/:grupoId/membro')
    sairDoGrupo(@Param('grupoId', ParseIntPipe) grupoId: number, @ActiveUser() usuarioAtivo: JwtPayload) {
        return this.grupoService.sairDoGrupo(grupoId, usuarioAtivo);
    }

    @Get('grupo/:grupoId/mensagens')
    listarMensagens(@Param('grupoId', ParseIntPipe) grupoId: number, @Query() dto: GrupoMensagemListarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
        return this.grupoService.listarMensagens({ ...dto, grupoId }, usuarioAtivo);
    }

    @Post('grupo/:grupoId/mensagem')
    enviarMensagem(@Param('grupoId', ParseIntPipe) grupoId: number, @Body() dto: GrupoMensagemEnviarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
        return this.grupoService.enviarMensagem({ ...dto, grupoId }, usuarioAtivo);
    }

    @Put('grupo/:grupoId/leitura')
    alterarLeitura(@Param('grupoId', ParseIntPipe) grupoId: number, @Body() dto: GrupoLeituraAlterarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
        return this.grupoService.alterarLeitura({ ...dto, grupoId }, usuarioAtivo);
    }

    @Put('grupo/:grupoId/silencio')
    alterarSilencio(@Param('grupoId', ParseIntPipe) grupoId: number, @Body() dto: GrupoSilencioAlterarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
        return this.grupoService.alterarSilencio({ ...dto, grupoId }, usuarioAtivo);
    }

    /** Resumo com a IA (task 249): o que abre o diálogo, a estimativa (sem chamar o provedor), o resumo e a proposta de gravar na documentação. */
    @Get('grupo/:grupoId/resumo')
    recuperarOpcoesDoResumo(@Param('grupoId', ParseIntPipe) grupoId: number, @ActiveUser() usuarioAtivo: JwtPayload) {
        return this.resumoService.recuperarOpcoes({ grupoId }, usuarioAtivo);
    }

    @Post('grupo/:grupoId/resumo/estimativa')
    estimarResumo(@Param('grupoId', ParseIntPipe) grupoId: number, @Body() dto: GrupoResumoIaEstimarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
        return this.resumoService.estimar({ ...dto, grupoId }, usuarioAtivo);
    }

    @Post('grupo/:grupoId/resumo')
    resumir(@Param('grupoId', ParseIntPipe) grupoId: number, @Body() dto: GrupoResumoIaCriarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
        return this.resumoService.resumir({ ...dto, grupoId }, usuarioAtivo);
    }

    @Post('grupo/:grupoId/resumo/:resumoId/proposta')
    criarPropostaDoResumo(
        @Param('grupoId', ParseIntPipe) grupoId: number,
        @Param('resumoId', ParseIntPipe) resumoId: number,
        @Body() dto: GrupoResumoIaPropostaCriarDto,
        @ActiveUser() usuarioAtivo: JwtPayload,
    ) {
        return this.resumoService.criarProposta({ ...dto, grupoId, resumoId }, usuarioAtivo);
    }

    @Post('grupo/:grupoId/resumo/:resumoId/proposta/:propostaId/confirmar')
    confirmarPropostaDoResumo(
        @Param('grupoId', ParseIntPipe) grupoId: number,
        @Param('resumoId', ParseIntPipe) resumoId: number,
        @Param('propostaId', ParseIntPipe) propostaId: number,
        @ActiveUser() usuarioAtivo: JwtPayload,
    ) {
        return this.resumoService.confirmarProposta({ grupoId, resumoId, propostaId }, usuarioAtivo);
    }

    @Post('grupo/:grupoId/resumo/:resumoId/proposta/:propostaId/recusar')
    recusarPropostaDoResumo(
        @Param('grupoId', ParseIntPipe) grupoId: number,
        @Param('resumoId', ParseIntPipe) resumoId: number,
        @Param('propostaId', ParseIntPipe) propostaId: number,
        @ActiveUser() usuarioAtivo: JwtPayload,
    ) {
        return this.resumoService.recusarProposta({ grupoId, resumoId, propostaId }, usuarioAtivo);
    }

    /** O aviso de que o usuário está digitando para o grupo; nada é gravado. */
    @Post('grupo/:grupoId/digitando')
    avisarDigitacao(@Param('grupoId', ParseIntPipe) grupoId: number, @ActiveUser() usuarioAtivo: JwtPayload) {
        return this.grupoService.avisarDigitacao(grupoId, usuarioAtivo);
    }
}
