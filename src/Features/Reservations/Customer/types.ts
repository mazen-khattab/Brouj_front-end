import type { CreateReservationRequest, RegisterCustomerInput } from "../../../Types/contracts";

export interface ReservationBookingInput {
  reservation: CreateReservationRequest;
  registration?: RegisterCustomerInput;
}
