import type { ReactNode } from "react";
import { ReservationBookingContext } from "./BookingContext";
import { useReservationBookingController } from "./useReservationBooking";

/** Keep booking outcomes through unit reloads and the guest's own registration. */
export default function BookingScope({ children }: { children: ReactNode }) {
  const booking = useReservationBookingController();
  return <ReservationBookingContext value={booking}>{children}</ReservationBookingContext>;
}
