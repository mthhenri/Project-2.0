/**
 * O dia (`yyyy-mm-dd`) de uma coluna `DATE`. O driver `pg` devolve `DATE` como um `Date` à meia-noite **local**, não como texto, embora os
 * DTOs declarem `string`; quem compara ou mostra o dia precisa normalizar. Aceita também o texto (um `yyyy-mm-dd` ou um ISO) e vazio.
 */
export function dataDoBancoComoTexto(valor: Date | string | null | undefined): string | null {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'string') return valor.slice(0, 10);
  if (Number.isNaN(valor.getTime())) return null;
  const doisDigitos = (numero: number): string => String(numero).padStart(2, '0');
  return `${valor.getFullYear()}-${doisDigitos(valor.getMonth() + 1)}-${doisDigitos(valor.getDate())}`;
}
