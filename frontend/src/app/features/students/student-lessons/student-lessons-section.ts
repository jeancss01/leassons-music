import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../core/http/api-error';
import { localDateIso } from '../../dashboard/dashboard.utils';
import { LessonApiService } from '../lesson-api/lesson-api.service';
import {
  CANCELLATION_REASON_LABELS,
  formatTimeDisplay,
  Lesson,
  LESSON_STATUS_LABELS,
  LESSON_TYPE_LABELS,
} from '../lesson-api/lesson.model';
import {
  findNextLesson,
  groupLessonsForDiary,
  hasLessonPedagogy,
  lessonPedagogyPreview,
} from './lesson-diary.utils';

@Component({
  selector: 'app-student-lessons-section',
  imports: [
    RouterLink,
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './student-lessons-section.html',
  styleUrl: './student-lessons-section.scss',
})
export class StudentLessonsSection implements OnInit {
  private readonly lessonApi = inject(LessonApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly studentId = input.required<string>();

  readonly lessons = signal<Lesson[]>([]);
  readonly loading = signal(true);
  readonly generating = signal(false);
  readonly error = signal<string | null>(null);
  readonly todayIso = localDateIso();

  readonly typeLabels = LESSON_TYPE_LABELS;
  readonly statusLabels = LESSON_STATUS_LABELS;
  readonly reasonLabels = CANCELLATION_REASON_LABELS;
  readonly formatTime = formatTimeDisplay;
  readonly hasPedagogy = hasLessonPedagogy;
  readonly pedagogyPreview = lessonPedagogyPreview;

  readonly groups = computed(() => groupLessonsForDiary(this.lessons(), this.todayIso));
  readonly nextLesson = computed(() => findNextLesson(this.lessons(), this.todayIso));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.lessonApi.list({ studentId: this.studentId() }).subscribe({
      next: (lessons) => {
        this.lessons.set(lessons);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.lessons.set([]);
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Não foi possível carregar o diário pedagógico.'));
      },
    });
  }

  generateUpcoming(): void {
    if (this.generating()) {
      return;
    }

    this.generating.set(true);
    this.lessonApi.generate({ studentId: this.studentId() }).subscribe({
      next: (result) => {
        this.generating.set(false);
        if (result.created === 0) {
          this.snackBar.open(
            'Nenhuma aula nova foi criada. As próximas aulas já estavam cadastradas.',
            'Fechar',
            { duration: 4500 },
          );
        } else {
          this.snackBar.open(
            `${result.created} aulas criadas. ${result.alreadyExisted} já existiam.`,
            'Fechar',
            { duration: 4500 },
          );
        }
        this.load();
      },
      error: (err: unknown) => {
        this.generating.set(false);
        this.snackBar.open(
          apiErrorMessage(err, 'Não foi possível gerar as próximas aulas.'),
          'Fechar',
          { duration: 5000 },
        );
      },
    });
  }

  lessonDetailLink(lesson: Lesson): string[] {
    return ['/students', this.studentId(), 'lesson', lesson.id];
  }

  planQueryParams(): Record<string, string> {
    return { plan: '1' };
  }
}
