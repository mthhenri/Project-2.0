/** A versão do Project Desktop publicada para download (task 198); sem executável publicado, `disponivel` é falso e o resto vem nulo. */
export class DesktopVersaoRecuperadaDto {
  disponivel: boolean;
  /** `1.2.0`, sem o prefixo do nome do arquivo. */
  versao: string | null;
  nomeArquivo: string | null;
  tamanhoBytes: number | null;
}
