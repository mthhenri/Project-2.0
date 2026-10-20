/** Primeiro e último dia (YYYY-MM-DD) de um mês civil: o intervalo da visão "Volume do mês" (task 197). */
export function limitesDoMes(ano: number, mes: number): { dataInicio: string; dataFim: string } {
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const doisDigitos = (valor: number) => String(valor).padStart(2, '0');
  return { dataInicio: `${ano}-${doisDigitos(mes)}-01`, dataFim: `${ano}-${doisDigitos(mes)}-${doisDigitos(ultimoDia)}` };
}
