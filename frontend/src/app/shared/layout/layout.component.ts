import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MensagemDiretaPopupComponent } from '../../modules/mensagem-direta/components/mensagem-direta-popup/mensagem-direta-popup.component';
import { CheckinJanelinhaComponent } from '../../modules/checkin/components/checkin-janelinha/checkin-janelinha.component';
import { ToastDesfazerComponent } from '../components/toast-desfazer/toast-desfazer.component';
import { IaRetornoAvisoComponent } from './ia-retorno-aviso/ia-retorno-aviso.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { LoadingSpinnerComponent } from '../components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, LoadingSpinnerComponent, ToastModule, ToastDesfazerComponent, CheckinJanelinhaComponent, IaRetornoAvisoComponent, MensagemDiretaPopupComponent],
  templateUrl: './layout.component.html',
})
export class LayoutComponent {}
