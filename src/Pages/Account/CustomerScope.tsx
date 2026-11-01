import type { ReactNode } from 'react';
import { ReservationBookingContext } from '../../Context/ReservationBookingContext';
import { useReservationBookingController } from '../../Hooks/useReservationBooking';

/** Keep booking outcomes through unit reloads and the guest's own registration. */
export default function CustomerScope({ children }: { children: ReactNode }) {
  const booking = useReservationBookingController();
  return <ReservationBookingContext value={booking}>{children}</ReservationBookingContext>;
}
