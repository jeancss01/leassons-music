import { Component } from '@angular/core';

@Component({
  selector: 'app-home-page',
  template: `
    <h1>Início</h1>
    <p>Estrutura inicial pronta. As funcionalidades do domínio virão nas próximas etapas.</p>
  `,
  styles: `
    h1 {
      margin: 0 0 0.5rem;
      font: var(--mat-sys-headline-small);
    }

    p {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class HomePage {}
