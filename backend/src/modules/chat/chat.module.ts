import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { ConfiguracaoIaModule } from '../configuracao-ia/configuracao-ia.module';
import { FerramentaIaModule } from '../ferramenta-ia/ferramenta-ia.module';
import { FerramentaIaRegistro } from '../ferramenta-ia/services/ferramenta-ia.registro';
import { IaModule } from '../ia/ia.module';
import { PlanoModule } from '../plano/plano.module';
import { PromptModule } from '../prompt/prompt.module';
import { PropostaIaModule } from '../proposta-ia/proposta-ia.module';
import { UsuarioModule } from '../usuario/usuario.module';
import { ChatController } from './controllers/chat.controller';
import { BuscarNasConversasDoDesenvolvedorFerramenta } from './ferramentas/buscar-nas-conversas-do-desenvolvedor.ferramenta';
import { BuscarNasMinhasConversasFerramenta } from './ferramentas/buscar-nas-minhas-conversas.ferramenta';
import { ConsultarConversaDoDesenvolvedorFerramenta } from './ferramentas/consultar-conversa-do-desenvolvedor.ferramenta';
import { ConsultarMinhaConversaFerramenta } from './ferramentas/consultar-minha-conversa.ferramenta';
import { ListarConversasDoDesenvolvedorFerramenta } from './ferramentas/listar-conversas-do-desenvolvedor.ferramenta';
import { ARMAZENAMENTO_DE_CHAT, armazenamentoDeChatProvider } from './repositories/armazenamento-de-chat';
import { ChatDesenvolvedorService } from './services/chat-desenvolvedor.service';
import { ChatMinhasConversasService } from './services/chat-minhas-conversas.service';
import { ChatPlanoService } from './services/chat-plano.service';
import { ChatService } from './services/chat.service';

@Module({
    imports:     [ConfiguracaoIaModule, IaModule, PromptModule, FerramentaIaModule, PropostaIaModule, UsuarioModule, forwardRef(() => PlanoModule)],
    controllers: [ChatController],
    providers:   [
        armazenamentoDeChatProvider,
        ChatService,
        ChatDesenvolvedorService,
        ChatMinhasConversasService,
        ChatPlanoService,
        ListarConversasDoDesenvolvedorFerramenta,
        ConsultarConversaDoDesenvolvedorFerramenta,
        BuscarNasConversasDoDesenvolvedorFerramenta,
        BuscarNasMinhasConversasFerramenta,
        ConsultarMinhaConversaFerramenta,
    ],
    exports:     [ARMAZENAMENTO_DE_CHAT, ChatService],
})
export class ChatModule implements OnModuleInit {
    constructor(
        private readonly registroDeFerramentas: FerramentaIaRegistro,
        private readonly listarConversasDoDesenvolvedor: ListarConversasDoDesenvolvedorFerramenta,
        private readonly consultarConversaDoDesenvolvedor: ConsultarConversaDoDesenvolvedorFerramenta,
        private readonly buscarNasConversasDoDesenvolvedor: BuscarNasConversasDoDesenvolvedorFerramenta,
        private readonly buscarNasMinhasConversas: BuscarNasMinhasConversasFerramenta,
        private readonly consultarMinhaConversa: ConsultarMinhaConversaFerramenta,
    ) {}

    /** As ferramentas do gestor sobre as conversas dos desenvolvedores e as de cada pessoa sobre as próprias conversas se registram aqui. */
    onModuleInit(): void {
        this.registroDeFerramentas.registrar(this.listarConversasDoDesenvolvedor);
        this.registroDeFerramentas.registrar(this.consultarConversaDoDesenvolvedor);
        this.registroDeFerramentas.registrar(this.buscarNasConversasDoDesenvolvedor);
        this.registroDeFerramentas.registrar(this.buscarNasMinhasConversas);
        this.registroDeFerramentas.registrar(this.consultarMinhaConversa);
    }
}
