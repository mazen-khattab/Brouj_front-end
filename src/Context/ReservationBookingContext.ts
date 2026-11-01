import { createContext } from 'react';
import type { useReservationBookingController } from '../Hooks/useReservationBooking';

export const ReservationBookingContext = createContext<ReturnType<typeof useReservationBookingController> | null>(null);
