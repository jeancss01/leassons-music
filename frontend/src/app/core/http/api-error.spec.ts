import { apiErrorMessage } from './api-error';
import { HttpErrorResponse } from '@angular/common/http';

describe('apiErrorMessage', () => {
  it('reads Nest message string', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { message: 'Nome obrigatório' },
    });
    expect(apiErrorMessage(error)).toBe('Nome obrigatório');
  });

  it('joins Nest message arrays', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { message: ['a', 'b'] },
    });
    expect(apiErrorMessage(error)).toBe('a b');
  });

  it('uses fallback for unknown errors', () => {
    expect(apiErrorMessage(new Error('x'), 'fallback')).toBe('fallback');
  });
});
