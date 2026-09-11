import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateStudentRequest,
  ListStudentsParams,
  Student,
  UpdateStudentRequest,
} from './student.model';

@Injectable({ providedIn: 'root' })
export class StudentApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/students`;

  list(params: ListStudentsParams = {}): Observable<Student[]> {
    let httpParams = new HttpParams();
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    return this.http.get<Student[]>(this.baseUrl, { params: httpParams });
  }

  getById(id: string): Observable<Student> {
    return this.http.get<Student>(`${this.baseUrl}/${id}`);
  }

  create(body: CreateStudentRequest): Observable<Student> {
    return this.http.post<Student>(this.baseUrl, body);
  }

  update(id: string, body: UpdateStudentRequest): Observable<Student> {
    return this.http.patch<Student>(`${this.baseUrl}/${id}`, body);
  }

  inactivate(id: string): Observable<Student> {
    return this.http.patch<Student>(`${this.baseUrl}/${id}/inactivate`, {});
  }

  /** No dedicated activate endpoint — uses PATCH status=ACTIVE (docs/api.md). */
  activate(id: string): Observable<Student> {
    return this.update(id, { status: 'ACTIVE' });
  }
}
