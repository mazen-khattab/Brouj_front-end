import type { ReservationDto } from "../../../Types/contracts";
import { ReservationStatus } from "../../../Types/contracts";

export function canConvert(reservation: ReservationDto) {
  return reservation.status === ReservationStatus.Processing && reservation.orderId === null;
}
