import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import {
    GrupoAlterarDto,
    GrupoCriarDto,
    GrupoLeituraAlterarDto,
    GrupoMembroAdicionarDto,
    GrupoMensagemEnviarDto,
    GrupoMensagemListarDto,
    GrupoSilencioAlterarDto,
    GrupoSupervisaoLerDto,
    GrupoSupervisaoListarDto,
} from '@project20/shared';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { GestorOnly } from '../../autenticacao/decorators/gestor-only.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { GrupoSupervisaoService } from '../services/grupo-supervisao.service';
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

    /** O aviso de que o usuário está digitando para o grupo; nada é gravado. */
    @Post('grupo/:grupoId/digitando')
    avisarDigitacao(@Param('grupoId', ParseIntPipe) grupoId: number, @ActiveUser() usuarioAtivo: JwtPayload) {
        return this.grupoService.avisarDigitacao(grupoId, usuarioAtivo);
    }
}
