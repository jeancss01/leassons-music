import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { apiErrorMessage } from '../../../core/http/api-error';
import { StudentApiService } from '../student-api/student-api.service';
import { CreateStudentRequest, UpdateStudentRequest } from '../student-api/student.model';

@Component({
  selector: 'app-student-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './student-form.html',
  styleUrl: './student-form.scss',
})
export class StudentForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly studentApi = inject(StudentApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly studentId = toSignal(this.route.paramMap.pipe(map((params) => params.get('id'))), {
    initialValue: null as string | null,
  });
  readonly isEdit = computed(() => !!this.studentId());

  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(1)]],
    email: ['', [Validators.email]],
    phone: [''],
    startDate: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]],
    monthlyFee: [0, [Validators.required, Validators.min(0)]],
    notes: [''],
  });

  ngOnInit(): void {
    const id = this.studentId();
    if (!id) {
      return;
    }

    this.loading.set(true);
    this.studentApi.getById(id).subscribe({
      next: (student) => {
        this.form.patchValue({
          name: student.name,
          email: student.email ?? '',
          phone: student.phone ?? '',
          startDate: student.startDate,
          monthlyFee: student.monthlyFee,
          notes: student.notes ?? '',
        });
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Não foi possível carregar o aluno.'));
      },
    });
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();
    const id = this.studentId();

    if (id) {
      const body: UpdateStudentRequest = {
        name: raw.name.trim(),
        email: raw.email.trim() ? raw.email.trim() : null,
        phone: raw.phone.trim() ? raw.phone.trim() : null,
        startDate: raw.startDate,
        monthlyFee: Number(raw.monthlyFee),
        notes: raw.notes.trim() ? raw.notes.trim() : null,
      };

      this.studentApi.update(id, body).subscribe({
        next: (student) => {
          this.submitting.set(false);
          this.snackBar.open('Aluno atualizado.', 'Fechar', { duration: 3000 });
          void this.router.navigate(['/students', student.id]);
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.error.set(apiErrorMessage(err, 'Não foi possível atualizar o aluno.'));
        },
      });
      return;
    }

    const body: CreateStudentRequest = {
      name: raw.name.trim(),
      startDate: raw.startDate,
      monthlyFee: Number(raw.monthlyFee),
    };

    if (raw.email.trim()) {
      body.email = raw.email.trim();
    }
    if (raw.phone.trim()) {
      body.phone = raw.phone.trim();
    }
    if (raw.notes.trim()) {
      body.notes = raw.notes.trim();
    }

    this.studentApi.create(body).subscribe({
      next: (student) => {
        this.submitting.set(false);
        this.snackBar.open('Aluno cadastrado.', 'Fechar', { duration: 3000 });
        void this.router.navigate(['/students', student.id]);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.error.set(apiErrorMessage(err, 'Não foi possível cadastrar o aluno.'));
      },
    });
  }
}
