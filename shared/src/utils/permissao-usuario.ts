import { TipoUsuarioEnum } from '../enums/tipo-usuario.enum';

/**
 * Regra única de "tem poder de gestor?". Toda decisão de permissão passa por aqui; comparar o
 * tipo diretamente (`tipo === GESTOR`) espalha a regra e quebra quando surge um tipo novo.
 * O administrador é um gestor com mais permissões, portanto também passa. O auxiliar NÃO passa:
 * ele ganha só as ações listadas abaixo.
 */
export function temPermissaoDeGestor(tipo: TipoUsuarioEnum): boolean {
    return tipo === TipoUsuarioEnum.GESTOR || tipo === TipoUsuarioEnum.ADMINISTRADOR;
}

/** Permissões exclusivas do administrador (criar outros administradores, configurações da IA). */
export function temPermissaoDeAdministrador(tipo: TipoUsuarioEnum): boolean {
    return tipo === TipoUsuarioEnum.ADMINISTRADOR;
}

/**
 * Tipos que conduzem o trabalho: o auxiliar (desenvolvedor com permissões a mais), o gestor e o
 * administrador. É lista positiva de propósito: `tipo !== DESENVOLVEDOR` trataria um tipo novo como
 * condutor sem ninguém ter decidido isso.
 */
const TIPOS_QUE_CONDUZEM: readonly TipoUsuarioEnum[] = [
    TipoUsuarioEnum.AUXILIAR,
    TipoUsuarioEnum.GESTOR,
    TipoUsuarioEnum.ADMINISTRADOR,
];

function conduzOTrabalho(tipo: TipoUsuarioEnum): boolean {
    return TIPOS_QUE_CONDUZEM.includes(tipo);
}

/**
 * Vê todos os projetos, demandas e atividades por tipo, sem depender de `demanda_usuario`.
 * Quem não tem visão total (o desenvolvedor) só vê o que lhe foi atribuído.
 */
export function temVisibilidadeTotal(tipo: TipoUsuarioEnum): boolean {
    return conduzOTrabalho(tipo);
}

/**
 * Trabalha como desenvolvedor: tem atividades, ponto, horas diárias e a trava de uma execução ativa, e aparece na equipe como
 * tal. Desenvolvedor e auxiliar; gestor e administrador não.
 */
export function atuaComoDesenvolvedor(tipo: TipoUsuarioEnum): boolean {
    return tipo === TipoUsuarioEnum.DESENVOLVEDOR || tipo === TipoUsuarioEnum.AUXILIAR;
}

/** Entra em `demanda_usuario` (é atribuído como membro): quem atua como desenvolvedor. Gestor e administrador têm acesso por tipo. */
export function podeSerMembroDeDemanda(tipo: TipoUsuarioEnum): boolean {
    return atuaComoDesenvolvedor(tipo);
}

/** Edita qualquer demanda (nome, horas, previsão, status), cria demanda e sub-demanda, cria e remove conexões, conclui demanda. */
export function podeEditarDemanda(tipo: TipoUsuarioEnum): boolean {
    return conduzOTrabalho(tipo);
}

/** Atribui e remove membros e tags de qualquer pessoa, ele mesmo incluído. */
export function podeAtribuirMembroOuTag(tipo: TipoUsuarioEnum): boolean {
    return conduzOTrabalho(tipo);
}

/** Vê as atividades de todos, edita as dos outros e move atividade (inclusive pelo chat). */
export function podeEditarAtividadeDeOutro(tipo: TipoUsuarioEnum): boolean {
    return conduzOTrabalho(tipo);
}

/** Inicia e pausa a execução de atividade de outra pessoa. */
export function podeConduzirExecucaoDeOutro(tipo: TipoUsuarioEnum): boolean {
    return conduzOTrabalho(tipo);
}

/** Vê o histórico de execuções e o ponto de qualquer usuário. */
export function podeVerExecucaoEPontoDeOutro(tipo: TipoUsuarioEnum): boolean {
    return conduzOTrabalho(tipo);
}

/** Edita e exclui execução de qualquer pessoa. */
export function podeEditarExecucaoDeOutro(tipo: TipoUsuarioEnum): boolean {
    return conduzOTrabalho(tipo);
}

/** Cria, edita e exclui tags. */
export function podeGerenciarTag(tipo: TipoUsuarioEnum): boolean {
    return conduzOTrabalho(tipo);
}
