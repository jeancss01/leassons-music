import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog';
import { LessonApiService } from '../lesson-api/lesson-api.service';
import {
  CANCELLATION_REASON_LABELS,
  formatTimeDisplay,
  Lesson,
  LESSON_STATUS_LABELS,
  LESSON_TYPE_LABELS,
} from '../lesson-api/lesson.model';
import { ScheduleApiService } from '../schedule-api/schedule-api.service';
import {
  formatTimeDisplay as formatScheduleTime,
  WEEKDAY_LABELS,
} from '../schedule-api/schedule.model';
import { CancelLessonDialog } from './cancel-lesson-dialog';

@Component({
  selector: 'app-lesson-detail',
  imports: [
    RouterLink,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './lesson-detail.html',
  styleUrl: './lesson-detail.scss',
})
export class LessonDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly lessonApi = inject(LessonApiService);
  private readonly scheduleApi = inject(ScheduleApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);

  readonly studentId = toSignal(this.route.paramMap.pipe(map((params) => params.get('id'))), {
    initialValue: null as string | null,
  });
  readonly lessonId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('lessonId'))),
    { initialValue: null as string | null },
  );

  readonly lesson = signal<Lesson | null>(null);
  readonly scheduleLabel = signal<string | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actionInFlight = signal(false);

  readonly editingDiary = signal(false);
  readonly savingDiary = signal(false);
  readonly diaryError = signal<string | null>(null);

  readonly diaryForm = this.fb.nonNullable.group({
    content: [''],
    exercises: [''],
    observations: [''],
  });

  readonly typeLabels = LESSON_TYPE_LABELS;
  readonly statusLabels = LESSON_STATUS_LABELS;
  readonly reasonLabels = CANCELLATION_REASON_LABELS;
  readonly formatTime = formatTimeDisplay;

  readonly isScheduled = computed(() => this.lesson()?.status === 'SCHEDULED');
  readonly hasDiary = computed(() => {
    const current = this.lesson();
    if (!current) {
      return false;
    }
    return !!(current.content?.trim() || current.exercises?.trim() || current.observations?.trim());
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const studentId = this.studentId();
    const lessonId = this.lessonId();
    if (!studentId || !lessonId) {
      this.loading.set(false);
      this.error.set('Aula não encontrada.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.lessonApi.getById(lessonId).subscribe({
      next: (lesson) => {
        if (lesson.studentId !== studentId) {
          this.loading.set(false);
          this.error.set('Aula não pertence a este aluno.');
          return;
        }

        this.lesson.set(lesson);
        this.loading.set(false);
        this.loadScheduleLabel(studentId, lesson.scheduleId);
      },
      error: (err: unknown) => {
        this.lesson.set(null);
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Não foi possível carregar a aula.'));
      },
    });
  }

  startDiaryEdit(): void {
    const current = this.lesson();
    if (!current || this.savingDiary()) {
      return;
    }

    this.diaryForm.reset({
      content: current.content ?? '',
      exercises: current.exercises ?? '',
      observations: current.observations ?? '',
    });
    this.diaryError.set(null);
    this.editingDiary.set(true);
  }

  cancelDiaryEdit(): void {
    if (this.savingDiary()) {
      return;
    }

    if (!this.diaryForm.dirty) {
      this.editingDiary.set(false);
      this.diaryError.set(null);
      return;
    }

    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: 'Descartar alterações?',
          message: 'As mudanças no diário ainda não foram salvas.',
          confirmLabel: 'Descartar',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.editingDiary.set(false);
        this.diaryError.set(null);
        this.diaryForm.markAsPristine();
      });
  }

  saveDiary(): void {
    const current = this.lesson();
    if (!current || this.savingDiary()) {
      return;
    }

    this.savingDiary.set(true);
    this.diaryError.set(null);

    const raw = this.diaryForm.getRawValue();
    const body = {
      content: raw.content.trim() ? raw.content.trim() : null,
      exercises: raw.exercises.trim() ? raw.exercises.trim() : null,
      observations: raw.observations.trim() ? raw.observations.trim() : null,
    };

    this.lessonApi.update(current.id, body).subscribe({
      next: (lesson) => {
        this.lesson.set(lesson);
        this.savingDiary.set(false);
        this.editingDiary.set(false);
        this.diaryForm.markAsPristine();
        this.snackBar.open('Diário atualizado.', 'Fechar', { duration: 3000 });
      },
      error: (err: unknown) => {
        this.savingDiary.set(false);
        this.diaryError.set(apiErrorMessage(err, 'Não foi possível salvar o diário.'));
      },
    });
  }

  complete(): void {
    const current = this.lesson();
    if (!current || !this.isScheduled() || this.actionInFlight()) {
      return;
    }

    this.actionInFlight.set(true);
    this.lessonApi.complete(current.id).subscribe({
      next: (lesson) => {
        this.actionInFlight.set(false);
        this.lesson.set(lesson);
        this.snackBar.open('Aula marcada como concluída.', 'Fechar', { duration: 3000 });
      },
      error: (err: unknown) => {
        this.actionInFlight.set(false);
        this.snackBar.open(apiErrorMessage(err), 'Fechar', { duration: 5000 });
      },
    });
  }

  noShow(): void {
    const current = this.lesson();
    if (!current || !this.isScheduled() || this.actionInFlight()) {
      return;
    }

    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: 'Marcar falta',
          message: 'Registrar falta (no-show) nesta aula?',
          confirmLabel: 'Marcar falta',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }

        this.actionInFlight.set(true);
        this.lessonApi.noShow(current.id).subscribe({
          next: (lesson) => {
            this.actionInFlight.set(false);
            this.lesson.set(lesson);
            this.snackBar.open('Falta registrada.', 'Fechar', { duration: 3000 });
          },
          error: (err: unknown) => {
            this.actionInFlight.set(false);
            this.snackBar.open(apiErrorMessage(err), 'Fechar', { duration: 5000 });
          },
        });
      });
  }

  cancel(): void {
    const current = this.lesson();
    if (!current || !this.isScheduled() || this.actionInFlight()) {
      return;
    }

    this.dialog
      .open(CancelLessonDialog, {
        data: {
          lessonDateLabel: current.date,
        },
      })
      .afterClosed()
      .subscribe((reason) => {
        if (!reason) {
          return;
        }

        this.actionInFlight.set(true);
        this.lessonApi.cancel(current.id, { cancellationReason: reason }).subscribe({
          next: (lesson) => {
            this.actionInFlight.set(false);
            this.lesson.set(lesson);
            this.snackBar.open('Aula cancelada. Nenhuma reposição foi criada.', 'Fechar', {
              duration: 4000,
            });
          },
          error: (err: unknown) => {
            this.actionInFlight.set(false);
            this.snackBar.open(apiErrorMessage(err), 'Fechar', { duration: 5000 });
          },
        });
      });
  }

  private loadScheduleLabel(studentId: string, scheduleId: string | null): void {
    if (!scheduleId) {
      this.scheduleLabel.set(null);
      return;
    }

    this.scheduleApi.listByStudent(studentId).subscribe({
      next: (schedules) => {
        const schedule = schedules.find((item) => item.id === scheduleId);
        if (!schedule) {
          this.scheduleLabel.set('Horário vinculado (não encontrado na lista atual)');
          return;
        }
        this.scheduleLabel.set(
          `${WEEKDAY_LABELS[schedule.weekday]} ${formatScheduleTime(schedule.startTime)}`,
        );
      },
      error: () => this.scheduleLabel.set(null),
    });
  }
}
