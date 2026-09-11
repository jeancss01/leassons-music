import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CreateScheduleRequest, Schedule, UpdateScheduleRequest } from './schedule.model';

@Injectable({ providedIn: 'root' })
export class ScheduleApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl;

  listByStudent(studentId: string): Observable<Schedule[]> {
    return this.http.get<Schedule[]>(`${this.apiBaseUrl}/students/${studentId}/schedule`);
  }

  create(studentId: string, body: CreateScheduleRequest): Observable<Schedule> {
    return this.http.post<Schedule>(`${this.apiBaseUrl}/students/${studentId}/schedule`, body);
  }

  update(scheduleId: string, body: UpdateScheduleRequest): Observable<Schedule> {
    return this.http.patch<Schedule>(`${this.apiBaseUrl}/schedules/${scheduleId}`, body);
  }
}
