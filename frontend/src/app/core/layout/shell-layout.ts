import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-shell-layout',
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './shell-layout.html',
  styleUrl: './shell-layout.scss',
})
export class ShellLayout {
  private readonly auth = inject(AuthService);
  private readonly breakpoint = inject(BreakpointObserver);

  readonly isHandset = toSignal(
    this.breakpoint.observe('(max-width: 799px)').pipe(map((result) => result.matches)),
    { initialValue: false },
  );

  readonly sidenavOpen = signal(false);

  logout(): void {
    this.auth.logout();
  }

  toggleSidenav(): void {
    this.sidenavOpen.update((open) => !open);
  }

  closeSidenavOnMobile(): void {
    if (this.isHandset()) {
      this.sidenavOpen.set(false);
    }
  }
}
