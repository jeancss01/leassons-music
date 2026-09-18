import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CancelLessonRequest,
  CreateLessonRequest,
  GenerateLessonsRequest,
  GenerateLessonsResponse,
  Lesson,
  ListLessonsParams,
  UpdateLessonRequest,
} from './lesson.model';

@Injectable({ providedIn: 'root' })
export class LessonApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/lessons`;

  list(params: ListLessonsParams = {}): Observable<Lesson[]> {
    let httpParams = new HttpParams();
    if (params.studentId) {
      httpParams = httpParams.set('studentId', params.studentId);
    }
    if (params.from) {
      httpParams = httpParams.set('from', params.from);
    }
    if (params.to) {
      httpParams = httpParams.set('to', params.to);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    return this.http.get<Lesson[]>(this.baseUrl, { params: httpParams });
  }

  getById(id: string): Observable<Lesson> {
    return this.http.get<Lesson>(`${this.baseUrl}/${id}`);
  }

  create(body: CreateLessonRequest): Observable<Lesson> {
    return this.http.post<Lesson>(this.baseUrl, body);
  }

  generate(body: GenerateLessonsRequest = {}): Observable<GenerateLessonsResponse> {
    return this.http.post<GenerateLessonsResponse>(`${this.baseUrl}/generate`, body);
  }

  update(id: string, body: UpdateLessonRequest): Observable<Lesson> {
    return this.http.patch<Lesson>(`${this.baseUrl}/${id}`, body);
  }

  complete(id: string): Observable<Lesson> {
    return this.http.post<Lesson>(`${this.baseUrl}/${id}/complete`, {});
  }

  noShow(id: string): Observable<Lesson> {
    return this.http.post<Lesson>(`${this.baseUrl}/${id}/no-show`, {});
  }

  cancel(id: string, body: CancelLessonRequest): Observable<Lesson> {
    return this.http.post<Lesson>(`${this.baseUrl}/${id}/cancel`, body);
  }
}
