import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { apiErrorMessage } from '../../../core/http/api-error';
import { MonthlyChargeApiService } from '../monthly-charge-api/monthly-charge-api.service';
import {
  currentReferenceMonth,
  formatReferenceMonth,
  MONTHLY_CHARGE_STATUS_LABELS,
  MonthlyCharge,
} from '../monthly-charge-api/monthly-charge.model';
import { CreateChargeDialog } from './create-charge-dialog';
import { EditChargeDialog } from './edit-charge-dialog';

@Component({
  selector: 'app-student-finance-section',
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './student-finance-section.html',
  styleUrl: './student-finance-section.scss',
})
export class StudentFinanceSection implements OnInit {
  private readonly chargeApi = inject(MonthlyChargeApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly studentId = input.required<string>();
  readonly monthlyFee = input.required<number>();
  readonly studentStatus = input.required<'ACTIVE' | 'INACTIVE'>();

  readonly charges = signal<MonthlyCharge[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actionInFlight = signal<string | null>(null);
  readonly generating = signal(false);
  readonly generateMonth = signal(currentReferenceMonth());

  readonly statusLabels = MONTHLY_CHARGE_STATUS_LABELS;
  readonly formatMonth = formatReferenceMonth;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.chargeApi.list({ studentId: this.studentId() }).subscribe({
      next: (charges) => {
        this.charges.set(charges);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.charges.set([]);
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Não foi possível carregar as mensalidades.'));
      },
    });
  }

  openCreate(): void {
    this.dialog
      .open(CreateChargeDialog, {
        data: {
          studentId: this.studentId(),
          monthlyFee: this.monthlyFee(),
          defaultReferenceMonth: this.generateMonth(),
        },
      })
      .afterClosed()
      .subscribe((body) => {
        if (!body) {
          return;
        }

        this.actionInFlight.set('create');
        this.chargeApi.create(body).subscribe({
          next: () => {
            this.actionInFlight.set(null);
            this.snackBar.open('Cobrança criada.', 'Fechar', { duration: 3000 });
            this.load();
          },
          error: (err: unknown) => {
            this.actionInFlight.set(null);
            this.snackBar.open(apiErrorMessage(err, 'Não foi possível criar a cobrança.'), 'Fechar', {
              duration: 5000,
            });
          },
        });
      });
  }

  generate(): void {
    const referenceMonth = this.generateMonth();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(referenceMonth)) {
      this.snackBar.open('Informe um mês válido (AAAA-MM).', 'Fechar', { duration: 4000 });
      return;
    }

    this.generating.set(true);
    this.chargeApi.generate({ referenceMonth }).subscribe({
      next: (result) => {
        this.generating.set(false);
        const studentId = this.studentId();
        let message: string;
        if (result.createdStudentIds.includes(studentId)) {
          message = `Cobrança de ${formatReferenceMonth(referenceMonth)} gerada para este aluno.`;
        } else if (result.skippedStudentIds.includes(studentId)) {
          message = `Este aluno já tinha cobrança em ${formatReferenceMonth(referenceMonth)}.`;
        } else if (this.studentStatus() !== 'ACTIVE') {
          message =
            'Geração concluída. Alunos inativos não entram na geração automática — use Nova cobrança se necessário.';
        } else {
          message = `Geração concluída (${result.created} criadas, ${result.alreadyExisted} já existiam).`;
        }
        this.snackBar.open(message, 'Fechar', { duration: 4500 });
        this.load();
      },
      error: (err: unknown) => {
        this.generating.set(false);
        this.snackBar.open(apiErrorMessage(err, 'Não foi possível gerar as cobranças.'), 'Fechar', {
          duration: 5000,
        });
      },
    });
  }

  pay(charge: MonthlyCharge): void {
    if (charge.status !== 'PENDING' || this.actionInFlight()) {
      return;
    }

    this.actionInFlight.set(charge.id);
    this.chargeApi.pay(charge.id).subscribe({
      next: (updated) => {
        this.replaceCharge(updated);
        this.actionInFlight.set(null);
        this.snackBar.open('Cobrança marcada como paga.', 'Fechar', { duration: 3000 });
      },
      error: (err: unknown) => {
        this.actionInFlight.set(null);
        this.snackBar.open(apiErrorMessage(err), 'Fechar', { duration: 5000 });
      },
    });
  }

  unpay(charge: MonthlyCharge): void {
    if (charge.status !== 'PAID' || this.actionInFlight()) {
      return;
    }

    this.actionInFlight.set(charge.id);
    this.chargeApi.unpay(charge.id).subscribe({
      next: (updated) => {
        this.replaceCharge(updated);
        this.actionInFlight.set(null);
        this.snackBar.open('Pagamento desfeito.', 'Fechar', { duration: 3000 });
      },
      error: (err: unknown) => {
        this.actionInFlight.set(null);
        this.snackBar.open(apiErrorMessage(err), 'Fechar', { duration: 5000 });
      },
    });
  }

  edit(charge: MonthlyCharge): void {
    if (charge.status === 'CANCELLED') {
      return;
    }

    this.dialog
      .open(EditChargeDialog, { data: { charge } })
      .afterClosed()
      .subscribe((body) => {
        if (!body) {
          return;
        }

        this.actionInFlight.set(charge.id);
        this.chargeApi.update(charge.id, body).subscribe({
          next: (updated) => {
            this.replaceCharge(updated);
            this.actionInFlight.set(null);
            this.snackBar.open('Cobrança atualizada.', 'Fechar', { duration: 3000 });
          },
          error: (err: unknown) => {
            this.actionInFlight.set(null);
            this.snackBar.open(apiErrorMessage(err), 'Fechar', { duration: 5000 });
          },
        });
      });
  }

  private replaceCharge(updated: MonthlyCharge): void {
    this.charges.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
  }
}
