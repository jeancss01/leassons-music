import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../core/http/api-error';
import { LessonApiService } from '../students/lesson-api/lesson-api.service';
import {
  formatTimeDisplay,
  Lesson,
  LESSON_STATUS_LABELS,
  LESSON_TYPE_LABELS,
} from '../students/lesson-api/lesson.model';
import { MonthlyChargeApiService } from '../students/monthly-charge-api/monthly-charge-api.service';
import {
  formatReferenceMonth,
  MONTHLY_CHARGE_STATUS_LABELS,
  MonthlyCharge,
} from '../students/monthly-charge-api/monthly-charge.model';
import { StudentApiService } from '../students/student-api/student-api.service';
import { Student } from '../students/student-api/student.model';
import { isPaidInLocalMonth, localDateIso, sumAmounts } from './dashboard.utils';

interface SectionState<T> {
  loading: boolean;
  error: string | null;
  data: T;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage implements OnInit {
  private readonly studentApi = inject(StudentApiService);
  private readonly lessonApi = inject(LessonApiService);
  private readonly chargeApi = inject(MonthlyChargeApiService);

  readonly todayIso = localDateIso();

  readonly studentsState = signal<SectionState<Student[]>>({
    loading: true,
    error: null,
    data: [],
  });
  readonly lessonsState = signal<SectionState<Lesson[]>>({
    loading: true,
    error: null,
    data: [],
  });
  readonly pendingChargesState = signal<SectionState<MonthlyCharge[]>>({
    loading: true,
    error: null,
    data: [],
  });
  readonly paidChargesState = signal<SectionState<MonthlyCharge[]>>({
    loading: true,
    error: null,
    data: [],
  });

  readonly studentNames = computed(() => {
    const map = new Map<string, string>();
    for (const student of this.studentsState().data) {
      map.set(student.id, student.name);
    }
    return map;
  });

  readonly activeStudentsCount = computed(
    () => this.studentsState().data.filter((student) => student.status === 'ACTIVE').length,
  );

  readonly todayLessons = computed(() =>
    this.lessonsState()
      .data.filter((lesson) => lesson.date === this.todayIso)
      .slice()
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  );

  readonly upcomingLessons = computed(() =>
    this.lessonsState()
      .data.filter((lesson) => lesson.date > this.todayIso)
      .slice()
      .sort((a, b) => {
        const byDate = a.date.localeCompare(b.date);
        return byDate !== 0 ? byDate : a.startTime.localeCompare(b.startTime);
      })
      .slice(0, 5),
  );

  readonly pendingCharges = computed(() =>
    this.pendingChargesState()
      .data.slice()
      .sort((a, b) => {
        if (a.dueDate && b.dueDate) {
          return a.dueDate.localeCompare(b.dueDate);
        }
        if (a.dueDate) {
          return -1;
        }
        if (b.dueDate) {
          return 1;
        }
        return a.referenceMonth.localeCompare(b.referenceMonth);
      }),
  );

  readonly pendingAmount = computed(() =>
    sumAmounts(this.pendingCharges().map((charge) => charge.amount)),
  );

  readonly receivedThisMonth = computed(() =>
    sumAmounts(
      this.paidChargesState()
        .data.filter((charge) => charge.paidAt && isPaidInLocalMonth(charge.paidAt))
        .map((charge) => charge.amount),
    ),
  );

  readonly typeLabels = LESSON_TYPE_LABELS;
  readonly statusLabels = LESSON_STATUS_LABELS;
  readonly chargeStatusLabels = MONTHLY_CHARGE_STATUS_LABELS;
  readonly formatTime = formatTimeDisplay;
  readonly formatMonth = formatReferenceMonth;

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loadStudents();
    this.loadLessons();
    this.loadPendingCharges();
    this.loadPaidCharges();
  }

  loadStudents(): void {
    this.studentsState.set({ loading: true, error: null, data: this.studentsState().data });
    this.studentApi.list({ status: 'ALL' }).subscribe({
      next: (students) => {
        this.studentsState.set({ loading: false, error: null, data: students });
      },
      error: (err: unknown) => {
        this.studentsState.set({
          loading: false,
          error: apiErrorMessage(err, 'Não foi possível carregar os alunos.'),
          data: [],
        });
      },
    });
  }

  loadLessons(): void {
    this.lessonsState.set({ loading: true, error: null, data: this.lessonsState().data });
    this.lessonApi.list({ from: this.todayIso }).subscribe({
      next: (lessons) => {
        this.lessonsState.set({ loading: false, error: null, data: lessons });
      },
      error: (err: unknown) => {
        this.lessonsState.set({
          loading: false,
          error: apiErrorMessage(err, 'Não foi possível carregar as aulas.'),
          data: [],
        });
      },
    });
  }

  loadPendingCharges(): void {
    this.pendingChargesState.set({
      loading: true,
      error: null,
      data: this.pendingChargesState().data,
    });
    this.chargeApi.list({ status: 'PENDING' }).subscribe({
      next: (charges) => {
        this.pendingChargesState.set({ loading: false, error: null, data: charges });
      },
      error: (err: unknown) => {
        this.pendingChargesState.set({
          loading: false,
          error: apiErrorMessage(err, 'Não foi possível carregar as mensalidades pendentes.'),
          data: [],
        });
      },
    });
  }

  loadPaidCharges(): void {
    this.paidChargesState.set({
      loading: true,
      error: null,
      data: this.paidChargesState().data,
    });
    this.chargeApi.list({ status: 'PAID' }).subscribe({
      next: (charges) => {
        this.paidChargesState.set({ loading: false, error: null, data: charges });
      },
      error: (err: unknown) => {
        this.paidChargesState.set({
          loading: false,
          error: apiErrorMessage(err, 'Não foi possível carregar os pagamentos do mês.'),
          data: [],
        });
      },
    });
  }

  studentName(studentId: string): string {
    return this.studentNames().get(studentId) ?? 'Aluno';
  }
}
