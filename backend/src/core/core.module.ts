import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { ResponseFormatInterceptor } from './interceptors/response-format.interceptor';

@Module({
  providers: [
    { provide: APP_FILTER,      useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseFormatInterceptor },
  ],
})
export class CoreModule {}
