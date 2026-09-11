import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog';
import { StudentApiService } from '../student-api/student-api.service';
import { Student, StudentListStatusFilter } from '../student-api/student.model';

@Component({
  selector: 'app-student-list',
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  templateUrl: './student-list.html',
  styleUrl: './student-list.scss',
})
export class StudentList implements OnInit {
  private readonly studentApi = inject(StudentApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly students = signal<Student[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly statusFilter = signal<StudentListStatusFilter>('ACTIVE');
  readonly actionInFlight = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  onStatusFilterChange(status: StudentListStatusFilter): void {
    this.statusFilter.set(status);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.studentApi.list({ status: this.statusFilter() }).subscribe({
      next: (students) => {
        this.students.set(students);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.students.set([]);
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Não foi possível carregar os alunos.'));
      },
    });
  }

  inactivate(student: Student, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: 'Inativar aluno',
          message: `Inativar ${student.name}? O histórico será preservado.`,
          confirmLabel: 'Inativar',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }

        this.actionInFlight.set(student.id);
        this.studentApi.inactivate(student.id).subscribe({
          next: () => {
            this.actionInFlight.set(null);
            this.snackBar.open('Aluno inativado.', 'Fechar', { duration: 3000 });
            this.load();
          },
          error: (err: unknown) => {
            this.actionInFlight.set(null);
            this.snackBar.open(apiErrorMessage(err), 'Fechar', { duration: 5000 });
          },
        });
      });
  }
}
