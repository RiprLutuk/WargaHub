import type { createApiClient } from './api';

type ApiClient = ReturnType<typeof createApiClient>;

export interface ManualPaymentInput {
  amount: number;
  method: 'BANK_TRANSFER' | 'CASH';
  proofFileId?: string;
  note?: string;
}

export function createManualPayment<T = unknown>(
  client: ApiClient,
  billId: string,
  input: ManualPaymentInput,
  idempotencyKey: string,
): Promise<T> {
  return client.post<T>(`/bills/${billId}/payments`, input, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
}
