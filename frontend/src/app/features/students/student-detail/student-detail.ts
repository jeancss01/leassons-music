import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog';
import { StudentApiService } from '../student-api/student-api.service';
import { Student } from '../student-api/student.model';
import { StudentSchedulesSection } from '../student-schedules/student-schedules-section';
import { StudentLessonsSection } from '../student-lessons/student-lessons-section';
import { StudentFinanceSection } from '../student-finance/student-finance-section';

@Component({
  selector: 'app-student-detail',
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    StudentSchedulesSection,
    StudentLessonsSection,
    StudentFinanceSection,
  ],
  templateUrl: './student-detail.html',
  styleUrl: './student-detail.scss',
})
export class StudentDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly studentApi = inject(StudentApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly student = signal<Student | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actionInFlight = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      this.error.set('Aluno não encontrado.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.studentApi.getById(id).subscribe({
      next: (student) => {
        this.student.set(student);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.student.set(null);
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Não foi possível carregar o aluno.'));
      },
    });
  }

  inactivate(): void {
    const current = this.student();
    if (!current || this.actionInFlight()) {
      return;
    }

    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: 'Inativar aluno',
          message: `Inativar ${current.name}? O histórico será preservado.`,
          confirmLabel: 'Inativar',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }

        this.actionInFlight.set(true);
        this.studentApi.inactivate(current.id).subscribe({
          next: (student) => {
            this.actionInFlight.set(false);
            this.student.set(student);
            this.snackBar.open('Aluno inativado.', 'Fechar', { duration: 3000 });
          },
          error: (err: unknown) => {
            this.actionInFlight.set(false);
            this.snackBar.open(apiErrorMessage(err), 'Fechar', { duration: 5000 });
          },
        });
      });
  }

  activate(): void {
    const current = this.student();
    if (!current || this.actionInFlight()) {
      return;
    }

    this.actionInFlight.set(true);
    this.studentApi.activate(current.id).subscribe({
      next: (student) => {
        this.actionInFlight.set(false);
        this.student.set(student);
        this.snackBar.open('Aluno reativado.', 'Fechar', { duration: 3000 });
      },
      error: (err: unknown) => {
        this.actionInFlight.set(false);
        this.snackBar.open(apiErrorMessage(err), 'Fechar', { duration: 5000 });
      },
    });
  }

  edit(): void {
    const current = this.student();
    if (!current) {
      return;
    }
    void this.router.navigate(['/students', current.id, 'edit']);
  }
}
