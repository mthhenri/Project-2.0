import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { ignorarErrosHttpJaTratados } from './app/core/config/rxjs-erros-http';

ignorarErrosHttpJaTratados();

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err),
);
