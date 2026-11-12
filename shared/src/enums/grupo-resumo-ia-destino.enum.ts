/**
 * Para onde o resumo de um grupo ou canal pode ir (task 249): `DEMANDA` grava na documentação da demanda do canal; `PROJETO` pede uma demanda do projeto
 * como destino; `NENHUM` só gera o texto para copiar (grupo livre, ou quem não pode editar a demanda).
 */
export enum GrupoResumoIaDestinoEnum {
    NENHUM  = 'NENHUM',
    DEMANDA = 'DEMANDA',
    PROJETO = 'PROJETO',
}
