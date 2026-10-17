/** Mesma regra de "vazio efetivo" do backend (`temAnotacoes`): HTML sem texto, `&nbsp;` e espaços não contam. */
export function anotacaoTemTexto(html: string | null | undefined): boolean {
  return (html ?? '').replace(/<[^>]*>|&nbsp;|&#160;|\s+/gi, '') !== '';
}

/** `Editado há 3 min` a partir de um instante e do "agora". */
export function tempoDecorrido(data: Date | string, agora: Date): string {
  const segundos = Math.max(0, Math.floor((agora.getTime() - new Date(data).getTime()) / 1000));
  if (segundos < 60) return 'agora há pouco';
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
}
