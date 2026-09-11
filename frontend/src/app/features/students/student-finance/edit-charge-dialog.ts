import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  MonthlyCharge,
  UpdateMonthlyChargeRequest,
} from '../monthly-charge-api/monthly-charge.model';

export interface EditChargeDialogData {
  charge: MonthlyCharge;
}

export type EditChargeDialogResult = UpdateMonthlyChargeRequest;

@Component({
  selector: 'app-edit-charge-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Editar cobrança</h2>
    <mat-dialog-content>
      <p class="hint">Somente vencimento e observações. Valor e status não são editáveis aqui.</p>
      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline">
          <mat-label>Vencimento</mat-label>
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
      <button mat-flat-button color="primary" type="button" (click)="confirm()">Salvar</button>
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
export class EditChargeDialog {
  readonly dialogRef = inject(MatDialogRef<EditChargeDialog, EditChargeDialogResult | null>);
  readonly data = inject<EditChargeDialogData>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    dueDate: [
      this.data.charge.dueDate ?? '',
      [Validators.pattern(/^$|^\d{4}-\d{2}-\d{2}$/)],
    ],
    notes: [this.data.charge.notes ?? ''],
  });

  confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.dialogRef.close({
      dueDate: raw.dueDate.trim() ? raw.dueDate.trim() : null,
      notes: raw.notes.trim() ? raw.notes.trim() : null,
    });
  }
}
