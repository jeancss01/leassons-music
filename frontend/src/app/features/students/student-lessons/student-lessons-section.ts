import { DatePipe } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../../core/http/api-error';
import { LessonApiService } from '../lesson-api/lesson-api.service';
import {
  CANCELLATION_REASON_LABELS,
  formatTimeDisplay,
  Lesson,
  LESSON_STATUS_LABELS,
  LESSON_TYPE_LABELS,
} from '../lesson-api/lesson.model';

@Component({
  selector: 'app-student-lessons-section',
  imports: [
    RouterLink,
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './student-lessons-section.html',
  styleUrl: './student-lessons-section.scss',
})
export class StudentLessonsSection implements OnInit {
  private readonly lessonApi = inject(LessonApiService);

  readonly studentId = input.required<string>();

  readonly lessons = signal<Lesson[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly typeLabels = LESSON_TYPE_LABELS;
  readonly statusLabels = LESSON_STATUS_LABELS;
  readonly reasonLabels = CANCELLATION_REASON_LABELS;
  readonly formatTime = formatTimeDisplay;

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
        this.error.set(apiErrorMessage(err, 'Não foi possível carregar as aulas.'));
      },
    });
  }
}
