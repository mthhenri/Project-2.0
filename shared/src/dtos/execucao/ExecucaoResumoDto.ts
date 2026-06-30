import { PaginatedResult } from '../../interfaces/paginated-result.interface';
import { ExecucaoItemDto } from './ExecucaoItemDto';

export class ExecucaoResumoDto extends PaginatedResult<ExecucaoItemDto> {
  totalMinutosDia: number;
}
