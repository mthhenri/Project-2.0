/**
 * De onde vem a mensagem do chat entre colaboradores (task 246): `DIRETA` é a conversa um a um (`conversaId` `<menor>-<maior>`) e `GRUPO` é a de um
 * grupo (`conversaId` `G<id do grupo>`). Documento anterior à task, sem o campo, vale como `DIRETA`.
 */
export enum ConversaTipoMensagemDiretaEnum {
    DIRETA = 'DIRETA',
    GRUPO  = 'GRUPO',
}
