import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { MonthlyChargeApiService } from './monthly-charge-api.service';
import { MonthlyCharge } from './monthly-charge.model';

describe('MonthlyChargeApiService', () => {
  let service: MonthlyChargeApiService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiBaseUrl}/monthly-charges`;
  const studentId = '11111111-1111-4111-8111-111111111111';
  const chargeId = '55555555-5555-4555-8555-555555555555';

  const charge: MonthlyCharge = {
    id: chargeId,
    studentId,
    referenceMonth: '2026-09',
    amount: 200,
    dueDate: '2026-09-10',
    status: 'PENDING',
    paidAt: null,
    notes: null,
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MonthlyChargeApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists charges with student filter', () => {
    let result: MonthlyCharge[] | undefined;
    service.list({ studentId }).subscribe((charges) => {
      result = charges;
    });

    const req = httpMock.expectOne(`${baseUrl}?studentId=${studentId}`);
    expect(req.request.method).toBe('GET');
    req.flush([charge]);
    expect(result).toEqual([charge]);
  });

  it('gets a charge by id', () => {
    let result: MonthlyCharge | undefined;
    service.getById(chargeId).subscribe((value) => {
      result = value;
    });

    const req = httpMock.expectOne(`${baseUrl}/${chargeId}`);
    expect(req.request.method).toBe('GET');
    req.flush(charge);
    expect(result).toEqual(charge);
  });

  it('creates a charge without amount', () => {
    const body = {
      studentId,
      referenceMonth: '2026-09',
      dueDate: '2026-09-10',
    };

    let result: MonthlyCharge | undefined;
    service.create(body).subscribe((value) => {
      result = value;
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    expect(req.request.body.amount).toBeUndefined();
    req.flush(charge);
    expect(result).toEqual(charge);
  });

  it('updates dueDate and notes only', () => {
    let result: MonthlyCharge | undefined;
    service.update(chargeId, { dueDate: '2026-09-15', notes: 'Pix' }).subscribe((value) => {
      result = value;
    });

    const req = httpMock.expectOne(`${baseUrl}/${chargeId}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ dueDate: '2026-09-15', notes: 'Pix' });
    req.flush({ ...charge, dueDate: '2026-09-15', notes: 'Pix' });
    expect(result?.notes).toBe('Pix');
  });

  it('generates charges for a reference month', () => {
    const response = {
      referenceMonth: '2026-09',
      activeStudents: 1,
      created: 1,
      alreadyExisted: 0,
      createdStudentIds: [studentId],
      skippedStudentIds: [] as string[],
    };

    let result: typeof response | undefined;
    service.generate({ referenceMonth: '2026-09' }).subscribe((value) => {
      result = value;
    });

    const req = httpMock.expectOne(`${baseUrl}/generate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ referenceMonth: '2026-09' });
    req.flush(response);
    expect(result).toEqual(response);
  });

  it('pays a charge', () => {
    let result: MonthlyCharge | undefined;
    service.pay(chargeId).subscribe((value) => {
      result = value;
    });

    const req = httpMock.expectOne(`${baseUrl}/${chargeId}/pay`);
    expect(req.request.method).toBe('POST');
    req.flush({
      ...charge,
      status: 'PAID',
      paidAt: '2026-09-11T12:00:00.000Z',
    });
    expect(result?.status).toBe('PAID');
  });

  it('unpays a charge', () => {
    let result: MonthlyCharge | undefined;
    service.unpay(chargeId).subscribe((value) => {
      result = value;
    });

    const req = httpMock.expectOne(`${baseUrl}/${chargeId}/unpay`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...charge, status: 'PENDING', paidAt: null });
    expect(result?.status).toBe('PENDING');
  });

  it('propagates HTTP errors', () => {
    let status: number | undefined;
    service.pay(chargeId).subscribe({
      next: () => undefined,
      error: (err: { status: number }) => {
        status = err.status;
      },
    });

    httpMock
      .expectOne(`${baseUrl}/${chargeId}/pay`)
      .flush({ message: 'Cannot pay a CANCELLED monthly charge' }, {
        status: 400,
        statusText: 'Bad Request',
      });
    expect(status).toBe(400);
  });
});
