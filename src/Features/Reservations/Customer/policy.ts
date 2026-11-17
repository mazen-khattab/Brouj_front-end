import type { ReservationDto } from "../../../Types/contracts";

export function canCancel(reservation: ReservationDto) {
  return reservation.status === 0 && reservation.orderId === null;
}
