import { DatePipe } from '@angular/common';
import { Component, input, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { inject } from '@angular/core';
import { apiErrorMessage } from '../../../core/http/api-error';
import { ScheduleApiService } from '../schedule-api/schedule-api.service';
import {
  formatTimeDisplay,
  Schedule,
  WEEKDAY_LABELS,
} from '../schedule-api/schedule.model';

@Component({
  selector: 'app-student-schedules-section',
  imports: [
    RouterLink,
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './student-schedules-section.html',
  styleUrl: './student-schedules-section.scss',
})
export class StudentSchedulesSection implements OnInit {
  private readonly scheduleApi = inject(ScheduleApiService);

  readonly studentId = input.required<string>();

  readonly schedules = signal<Schedule[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly weekdayLabels = WEEKDAY_LABELS;
  readonly formatTime = formatTimeDisplay;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.scheduleApi.listByStudent(this.studentId()).subscribe({
      next: (schedules) => {
        this.schedules.set(schedules);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.schedules.set([]);
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Não foi possível carregar os horários.'));
      },
    });
  }
}
