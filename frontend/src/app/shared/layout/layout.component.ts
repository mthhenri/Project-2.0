import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ToastDesfazerComponent } from '../components/toast-desfazer/toast-desfazer.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { LoadingSpinnerComponent } from '../components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, LoadingSpinnerComponent, ToastModule, ToastDesfazerComponent],
  templateUrl: './layout.component.html',
})
export class LayoutComponent {}
