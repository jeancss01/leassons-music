import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { map } from 'rxjs/operators';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ScheduleApiService } from '../schedule-api/schedule-api.service';
import {
  CreateScheduleRequest,
  toTimeInputValue,
  UpdateScheduleRequest,
  WEEKDAY_LABELS,
  WEEKDAYS,
  Weekday,
} from '../schedule-api/schedule.model';
import { validUntilAfterFromValidator } from './schedule-form.validators';

@Component({
  selector: 'app-schedule-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  templateUrl: './schedule-form.html',
  styleUrl: './schedule-form.scss',
})
export class ScheduleForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly scheduleApi = inject(ScheduleApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly studentId = toSignal(this.route.paramMap.pipe(map((params) => params.get('id'))), {
    initialValue: null as string | null,
  });
  readonly scheduleId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('scheduleId'))),
    { initialValue: null as string | null },
  );
  readonly isEdit = computed(() => !!this.scheduleId());

  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly weekdays = WEEKDAYS;
  readonly weekdayLabels = WEEKDAY_LABELS;

  readonly form = this.fb.nonNullable.group(
    {
      weekday: ['MONDAY' as Weekday, Validators.required],
      startTime: [
        '',
        [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)],
      ],
      durationMinutes: [60, [Validators.required, Validators.min(1)]],
      validFrom: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]],
      validUntil: ['', [Validators.pattern(/^$|^\d{4}-\d{2}-\d{2}$/)]],
      active: [true],
    },
    { validators: [validUntilAfterFromValidator] },
  );

  ngOnInit(): void {
    const scheduleId = this.scheduleId();
    if (!scheduleId) {
      return;
    }

    const studentId = this.studentId();
    if (!studentId) {
      this.error.set('Aluno não encontrado.');
      return;
    }

    this.loading.set(true);
    this.scheduleApi.listByStudent(studentId).subscribe({
      next: (schedules) => {
        const schedule = schedules.find((item) => item.id === scheduleId);
        if (!schedule) {
          this.loading.set(false);
          this.error.set('Horário não encontrado.');
          return;
        }

        this.form.patchValue({
          weekday: schedule.weekday,
          startTime: toTimeInputValue(schedule.startTime),
          durationMinutes: schedule.durationMinutes,
          validFrom: schedule.validFrom,
          validUntil: schedule.validUntil ?? '',
          active: schedule.active,
        });
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Não foi possível carregar o horário.'));
      },
    });
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const studentId = this.studentId();
    if (!studentId) {
      this.error.set('Aluno não encontrado.');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();
    const scheduleId = this.scheduleId();
    const validUntil = raw.validUntil.trim() ? raw.validUntil.trim() : null;

    if (scheduleId) {
      const body: UpdateScheduleRequest = {
        weekday: raw.weekday,
        startTime: raw.startTime,
        durationMinutes: Number(raw.durationMinutes),
        validFrom: raw.validFrom,
        validUntil,
        active: raw.active,
      };

      this.scheduleApi.update(scheduleId, body).subscribe({
        next: () => {
          this.submitting.set(false);
          this.snackBar.open('Horário atualizado.', 'Fechar', { duration: 3000 });
          void this.router.navigate(['/students', studentId]);
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.error.set(apiErrorMessage(err, 'Não foi possível atualizar o horário.'));
        },
      });
      return;
    }

    const body: CreateScheduleRequest = {
      weekday: raw.weekday,
      startTime: raw.startTime,
      durationMinutes: Number(raw.durationMinutes),
      validFrom: raw.validFrom,
      active: raw.active,
    };

    if (validUntil !== null) {
      body.validUntil = validUntil;
    }

    this.scheduleApi.create(studentId, body).subscribe({
      next: () => {
        this.submitting.set(false);
        this.snackBar.open('Horário cadastrado.', 'Fechar', { duration: 3000 });
        void this.router.navigate(['/students', studentId]);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.error.set(apiErrorMessage(err, 'Não foi possível cadastrar o horário.'));
      },
    });
  }
}
