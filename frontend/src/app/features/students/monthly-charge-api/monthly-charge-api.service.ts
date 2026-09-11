import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateMonthlyChargeRequest,
  GenerateMonthlyChargesRequest,
  GenerateMonthlyChargesResponse,
  ListMonthlyChargesParams,
  MonthlyCharge,
  UpdateMonthlyChargeRequest,
} from './monthly-charge.model';

@Injectable({ providedIn: 'root' })
export class MonthlyChargeApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/monthly-charges`;

  list(params: ListMonthlyChargesParams = {}): Observable<MonthlyCharge[]> {
    let httpParams = new HttpParams();
    if (params.studentId) {
      httpParams = httpParams.set('studentId', params.studentId);
    }
    if (params.referenceMonth) {
      httpParams = httpParams.set('referenceMonth', params.referenceMonth);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    return this.http.get<MonthlyCharge[]>(this.baseUrl, { params: httpParams });
  }

  getById(id: string): Observable<MonthlyCharge> {
    return this.http.get<MonthlyCharge>(`${this.baseUrl}/${id}`);
  }

  create(body: CreateMonthlyChargeRequest): Observable<MonthlyCharge> {
    return this.http.post<MonthlyCharge>(this.baseUrl, body);
  }

  update(id: string, body: UpdateMonthlyChargeRequest): Observable<MonthlyCharge> {
    return this.http.patch<MonthlyCharge>(`${this.baseUrl}/${id}`, body);
  }

  generate(body: GenerateMonthlyChargesRequest): Observable<GenerateMonthlyChargesResponse> {
    return this.http.post<GenerateMonthlyChargesResponse>(`${this.baseUrl}/generate`, body);
  }

  pay(id: string): Observable<MonthlyCharge> {
    return this.http.post<MonthlyCharge>(`${this.baseUrl}/${id}/pay`, {});
  }

  unpay(id: string): Observable<MonthlyCharge> {
    return this.http.post<MonthlyCharge>(`${this.baseUrl}/${id}/unpay`, {});
  }
}
