/** Produção em containers (task 499): o Nginx serve o front e repassa `/api` à API na mesma origem. */
export const ambiente = {
    producao: true,
    apiUrl: '/api/v1',
    /** Mesmo valor de `APP_TIMEZONE` do backend: "hoje" e as horas exibidas seguem o servidor, não o navegador. */
    fusoHorario: 'America/Sao_Paulo',
    intervaloMinimoMinutos: 15,
};
