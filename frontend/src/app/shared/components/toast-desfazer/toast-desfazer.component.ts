import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DesfazerService } from '../../../core/services/desfazer.service';

/** Toast de exclusão com "Desfazer" (task 99), montado uma vez no layout. */
@Component({
  selector: 'app-toast-desfazer',
  standalone: true,
  imports: [ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toast-desfazer.component.html',
  styleUrl: './toast-desfazer.component.scss',
})
export class ToastDesfazerComponent {
  readonly desfazer = inject(DesfazerService);
}
