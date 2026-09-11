import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import {
  CANCELLATION_REASON_LABELS,
  CANCELLATION_REASONS,
  CancellationReason,
} from '../lesson-api/lesson.model';

export interface CancelLessonDialogData {
  lessonDateLabel: string;
}

@Component({
  selector: 'app-cancel-lesson-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Cancelar aula</h2>
    <mat-dialog-content>
      <p>
        Cancelar a aula de {{ data.lessonDateLabel }}? O cancelamento
        <strong>não cria reposição</strong> automaticamente.
      </p>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Motivo</mat-label>
          <mat-select formControlName="cancellationReason">
            @for (reason of reasons; track reason) {
              <mat-option [value]="reason">{{ reasonLabels[reason] }}</mat-option>
            }
          </mat-select>
          @if (form.controls.cancellationReason.hasError('required')) {
            <mat-error>Motivo é obrigatório.</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="dialogRef.close(null)">Voltar</button>
      <button mat-flat-button color="warn" type="button" (click)="confirm()">Cancelar aula</button>
    </mat-dialog-actions>
  `,
  styles: `
    .full-width {
      width: 100%;
      margin-top: 0.5rem;
    }
    p {
      margin: 0 0 0.75rem;
    }
  `,
})
export class CancelLessonDialog {
  readonly dialogRef = inject(MatDialogRef<CancelLessonDialog, CancellationReason | null>);
  readonly data = inject<CancelLessonDialogData>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  readonly reasons = CANCELLATION_REASONS;
  readonly reasonLabels = CANCELLATION_REASON_LABELS;
  readonly submitted = signal(false);

  readonly form = this.fb.nonNullable.group({
    cancellationReason: ['' as CancellationReason | '', Validators.required],
  });

  confirm(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.controls.cancellationReason.value as CancellationReason);
  }
}
