import { Inject, Module, Global, OnApplicationShutdown } from '@nestjs/common';
import { Knex } from 'knex';
import { DATABASE_CONNECTION, databaseProvider } from './database.provider';

@Global()
@Module({
  providers: [databaseProvider],
  exports:   [databaseProvider],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_CONNECTION) private readonly conexaoBancoDados: Knex) {}

  /**
   * Fecha o pool depois de todos os `onModuleDestroy` (os streams do chat e a escuta do banco já saíram): sem isso as conexões ociosas do pool
   * seguram o processo vivo e a parada por SIGTERM nunca termina (a task 215 achou: o contêiner só saía no SIGKILL).
   */
  async onApplicationShutdown(): Promise<void> {
    await this.conexaoBancoDados.destroy();
  }
}
