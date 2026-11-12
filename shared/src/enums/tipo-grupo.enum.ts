/**
 * O tipo de um grupo do chat entre colaboradores (task 246, tabela de referência `tipo_grupo`). `LIVRE` é o grupo entre pessoas; `PROJETO` e `DEMANDA`
 * são os canais ligados a um projeto ou a uma demanda (task 248).
 */
export enum TipoGrupoEnum {
    LIVRE   = 'LIVRE',
    PROJETO = 'PROJETO',
    DEMANDA = 'DEMANDA',
}
