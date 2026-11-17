import { createContext } from "react";
import type { useReservationBookingController } from "./useReservationBooking";

export const ReservationBookingContext = createContext<ReturnType<typeof useReservationBookingController> | null>(null);
