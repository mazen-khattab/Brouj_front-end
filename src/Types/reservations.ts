import type { CreateReservationRequest } from './contracts';

/** Requested reservation payload, pending the matching backend endpoint update. */
export interface ReservationBookingInput extends CreateReservationRequest {
  fullName: string;
  phone: string;
  identityNumber: string;
  ageGroup: '21-27' | '28-35' | '36+';
  placeOfResidence: string;
  preferredFinancialBracket: 350000 | 500000 | 650000;
  /** Number of months. */
  preferredRepaymentPeriod: 6 | 9 | 12;
  email?: string;
  password?: string;
}
