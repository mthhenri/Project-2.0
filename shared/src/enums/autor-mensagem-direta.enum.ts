/**
 * Quem escreveu uma mensagem direta entre colaboradores (task 205). `SISTEMA` é o aviso de que um gestor leu a conversa (task 214) ou de que a IA não pôde
 * responder; `IA` é a resposta da IA a quem a chamou com `@IA` (task 315).
 */
export enum AutorMensagemDiretaEnum {
    USUARIO = 'USUARIO',
    SISTEMA = 'SISTEMA',
    IA      = 'IA',
}
