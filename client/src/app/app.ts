import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LoadingService } from './core/services/loading.service';
import { NotificationService } from './core/services/notification.service';
import { SearchStore } from './search/search.store';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly searchStore = inject(SearchStore);
  protected readonly loadingService = inject(LoadingService);
  protected readonly notificationService = inject(NotificationService);
}
