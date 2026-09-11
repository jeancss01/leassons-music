import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CreateMonthlyChargeRequest } from '../monthly-charge-api/monthly-charge.model';

export interface CreateChargeDialogData {
  studentId: string;
  monthlyFee: number;
  defaultReferenceMonth: string;
}

export type CreateChargeDialogResult = CreateMonthlyChargeRequest;

@Component({
  selector: 'app-create-charge-dialog',
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>Nova cobrança</h2>
    <mat-dialog-content>
      <p class="hint">
        O valor será copiado da mensalidade atual
        ({{ data.monthlyFee | currency: 'BRL' : 'symbol' : '1.2-2' }}).
      </p>
      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline">
          <mat-label>Mês de referência</mat-label>
          <input matInput type="month" formControlName="referenceMonth" />
          @if (form.controls.referenceMonth.hasError('required')) {
            <mat-error>Mês é obrigatório.</mat-error>
          }
          @if (form.controls.referenceMonth.hasError('pattern')) {
            <mat-error>Use o formato AAAA-MM.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Vencimento (opcional)</mat-label>
          <input matInput type="date" formControlName="dueDate" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Observações</mat-label>
          <textarea matInput rows="3" formControlName="notes"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="dialogRef.close(null)">Cancelar</button>
      <button mat-flat-button color="primary" type="button" (click)="confirm()">Criar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .form {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: min(100%, 20rem);
    }
    mat-form-field {
      width: 100%;
    }
    .hint {
      margin: 0 0 0.75rem;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
  `,
})
export class CreateChargeDialog {
  readonly dialogRef = inject(MatDialogRef<CreateChargeDialog, CreateChargeDialogResult | null>);
  readonly data = inject<CreateChargeDialogData>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    referenceMonth: [
      this.data.defaultReferenceMonth,
      [Validators.required, Validators.pattern(/^\d{4}-(0[1-9]|1[0-2])$/)],
    ],
    dueDate: ['', [Validators.pattern(/^$|^\d{4}-\d{2}-\d{2}$/)]],
    notes: [''],
  });

  confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const body: CreateMonthlyChargeRequest = {
      studentId: this.data.studentId,
      referenceMonth: raw.referenceMonth,
    };
    if (raw.dueDate.trim()) {
      body.dueDate = raw.dueDate.trim();
    }
    if (raw.notes.trim()) {
      body.notes = raw.notes.trim();
    }
    this.dialogRef.close(body);
  }
}
