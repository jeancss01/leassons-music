import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { map } from 'rxjs/operators';
import { apiErrorMessage } from '../../../core/http/api-error';
import { LessonApiService } from '../lesson-api/lesson-api.service';
import {
  CreateLessonRequest,
  LESSON_TYPE_LABELS,
  LESSON_TYPES,
  LessonType,
  toTimeInputValue,
  UpdateLessonRequest,
} from '../lesson-api/lesson.model';
import { ScheduleApiService } from '../schedule-api/schedule-api.service';
import {
  formatTimeDisplay,
  Schedule,
  WEEKDAY_LABELS,
} from '../schedule-api/schedule.model';

@Component({
  selector: 'app-lesson-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  templateUrl: './lesson-form.html',
  styleUrl: './lesson-form.scss',
})
export class LessonForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly lessonApi = inject(LessonApiService);
  private readonly scheduleApi = inject(ScheduleApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly studentId = toSignal(this.route.paramMap.pipe(map((params) => params.get('id'))), {
    initialValue: null as string | null,
  });
  readonly lessonId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('lessonId'))),
    { initialValue: null as string | null },
  );
  readonly isEdit = computed(() => !!this.lessonId());

  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly schedules = signal<Schedule[]>([]);

  readonly types = LESSON_TYPES;
  readonly typeLabels = LESSON_TYPE_LABELS;
  readonly weekdayLabels = WEEKDAY_LABELS;
  readonly formatTime = formatTimeDisplay;

  readonly form = this.fb.nonNullable.group({
    date: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]],
    startTime: ['', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]],
    durationMinutes: [60, [Validators.required, Validators.min(1)]],
    type: ['REGULAR' as LessonType, Validators.required],
    scheduleId: [''],
    content: [''],
    exercises: [''],
    observations: [''],
  });

  ngOnInit(): void {
    const studentId = this.studentId();
    if (!studentId) {
      this.error.set('Aluno não encontrado.');
      return;
    }

    this.scheduleApi.listByStudent(studentId).subscribe({
      next: (schedules) => this.schedules.set(schedules),
      error: () => this.schedules.set([]),
    });

    const lessonId = this.lessonId();
    if (!lessonId) {
      return;
    }

    this.loading.set(true);
    this.lessonApi.getById(lessonId).subscribe({
      next: (lesson) => {
        if (lesson.studentId !== studentId) {
          this.loading.set(false);
          this.error.set('Aula não pertence a este aluno.');
          return;
        }

        this.form.patchValue({
          date: lesson.date,
          startTime: toTimeInputValue(lesson.startTime),
          durationMinutes: lesson.durationMinutes,
          type: lesson.type,
          scheduleId: lesson.scheduleId ?? '',
          content: lesson.content ?? '',
          exercises: lesson.exercises ?? '',
          observations: lesson.observations ?? '',
        });
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Não foi possível carregar a aula.'));
      },
    });
  }

  scheduleLabel(schedule: Schedule): string {
    return `${this.weekdayLabels[schedule.weekday]} ${this.formatTime(schedule.startTime)}`;
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
    const scheduleId = raw.scheduleId.trim() ? raw.scheduleId.trim() : null;
    const lessonId = this.lessonId();

    if (lessonId) {
      const body: UpdateLessonRequest = {
        date: raw.date,
        startTime: raw.startTime,
        durationMinutes: Number(raw.durationMinutes),
        type: raw.type,
        scheduleId,
        content: raw.content.trim() ? raw.content.trim() : null,
        exercises: raw.exercises.trim() ? raw.exercises.trim() : null,
        observations: raw.observations.trim() ? raw.observations.trim() : null,
      };

      this.lessonApi.update(lessonId, body).subscribe({
        next: (lesson) => {
          this.submitting.set(false);
          this.snackBar.open('Aula atualizada.', 'Fechar', { duration: 3000 });
          void this.router.navigate(['/students', studentId, 'lesson', lesson.id]);
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.error.set(apiErrorMessage(err, 'Não foi possível atualizar a aula.'));
        },
      });
      return;
    }

    const body: CreateLessonRequest = {
      studentId,
      date: raw.date,
      startTime: raw.startTime,
      durationMinutes: Number(raw.durationMinutes),
      type: raw.type,
    };

    if (scheduleId) {
      body.scheduleId = scheduleId;
    }
    if (raw.content.trim()) {
      body.content = raw.content.trim();
    }
    if (raw.exercises.trim()) {
      body.exercises = raw.exercises.trim();
    }
    if (raw.observations.trim()) {
      body.observations = raw.observations.trim();
    }

    this.lessonApi.create(body).subscribe({
      next: (lesson) => {
        this.submitting.set(false);
        this.snackBar.open('Aula registrada.', 'Fechar', { duration: 3000 });
        void this.router.navigate(['/students', studentId, 'lesson', lesson.id]);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.error.set(apiErrorMessage(err, 'Não foi possível registrar a aula.'));
      },
    });
  }
}
