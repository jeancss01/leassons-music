import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(
  error: unknown,
  fallback = 'Não foi possível concluir a operação.',
): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  const body = error.error as { message?: string | string[] } | string | null;

  if (typeof body === 'string' && body.trim()) {
    return body;
  }

  if (body && typeof body === 'object' && body.message !== undefined) {
    if (Array.isArray(body.message)) {
      return body.message.join(' ');
    }
    if (typeof body.message === 'string' && body.message.trim()) {
      return body.message;
    }
  }

  if (error.status === 0) {
    return 'Não foi possível conectar ao servidor.';
  }

  if (error.status === 401) {
    return 'Sessão expirada. Faça login novamente.';
  }

  if (error.status === 404) {
    return 'Registro não encontrado.';
  }

  return fallback;
}
