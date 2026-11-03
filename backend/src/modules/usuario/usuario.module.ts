import { Module, OnModuleInit } from '@nestjs/common';
import { UsuarioController } from './controllers/usuario.controller';
import { TipoUsuarioAjudaController } from './controllers/tipo-usuario-ajuda.controller';
import { TipoUsuarioAjudaService } from './services/tipo-usuario-ajuda.service';
import { TipoUsuarioAjudaRepository } from './repositories/tipo-usuario-ajuda.repository';
import { UsuarioService } from './services/usuario.service';
import { UsuarioRepository } from './repositories/usuario.repository';
import { FerramentaIaModule } from '../ferramenta-ia/ferramenta-ia.module';
import { FerramentaIaRegistro } from '../ferramenta-ia/services/ferramenta-ia.registro';
import { ListarUsuariosFerramenta } from './ferramentas/listar-usuarios.ferramenta';

@Module({
    imports:     [FerramentaIaModule],
    controllers: [UsuarioController, TipoUsuarioAjudaController],
    providers:   [UsuarioService, UsuarioRepository, TipoUsuarioAjudaService, TipoUsuarioAjudaRepository, ListarUsuariosFerramenta],
    exports:     [UsuarioService, UsuarioRepository],
})
export class UsuarioModule implements OnModuleInit {
    constructor(
        private readonly registroDeFerramentas: FerramentaIaRegistro,
        private readonly listarUsuarios: ListarUsuariosFerramenta,
    ) {}

    /** A ferramenta de IA dos usuários se registra aqui (só o gestor a vê). */
    onModuleInit(): void {
        this.registroDeFerramentas.registrar(this.listarUsuarios);
    }
}
