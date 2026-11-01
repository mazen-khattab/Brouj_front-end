import { useContext, useEffect, useRef, useState } from "react";
import { ReservationBookingContext } from "../Context/ReservationBookingContext";
import { useAuth } from "./useAuth";
import { createReservation } from "../Services/Reservations";
import { sessionBoundary } from "../Security/sessionBoundary";
import { isGuid } from "../Catalogue/query";
import { uncertainWrite } from "../Account/policy";
import { ApiError } from "../Types/failures";
import { SessionActionError } from "../Types/auth";
import type { ReservationBookingInput } from "../Types/reservations";

interface BookingState {
  pending: boolean;
  failure?: ApiError | SessionActionError;
  uncertain?: boolean;
  registrationFailure?: boolean;
}

/** Registration establishes the customer session before the protected reservation write. */
export function useReservationBookingController() {
  const auth = useAuth();
  const [state, setState] = useState<BookingState>({ pending: false });
  const active = useRef(false);
  const locked = useRef(false);
  const blocked = useRef(false);
  const registering = useRef(false);
  const registeredGeneration = useRef<number | undefined>(undefined);
  const controller = useRef<AbortController | undefined>(undefined);
  const expectedGeneration = useRef<number | undefined>(undefined);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!registering.current && expectedGeneration.current !== undefined && expectedGeneration.current !== auth.generation) {
      controller.current?.abort();
      blocked.current = false;
      setState({ pending: false });
    }
  }, [auth.generation]);

  async function submit(
    input: ReservationBookingInput,
    onRegistered: () => void,
  ): Promise<{ id: string } | { failure: ApiError | SessionActionError; reservationSent: boolean } | undefined> {
    const guest = auth.status === "anonymous" && !auth.logoutRequired;

    if (locked.current || blocked.current || auth.pending || (!guest && auth.actor !== "customer")) {
      return;
    }

    locked.current = true;
    const request = new AbortController();
    controller.current = request;
    expectedGeneration.current = auth.generation;
    setState({ pending: true });
    let reservationSent = false;

    try {
      if (guest) {
        registering.current = true;
        const parts = input.fullName.split(" ");
        await auth.registerCustomer(
          {
            fName: parts[0]!,
            lName: parts.slice(1).join(" "),
            phone: input.phone,
            identityNumber: input.identityNumber,
            email: input.email!,
            password: input.password!,
          },
          request.signal,
        );
        registeredGeneration.current = sessionBoundary.stamp()?.generation;
        expectedGeneration.current = registeredGeneration.current;
        registering.current = false;
        if (active.current) {
          onRegistered();
        }
      }
      if (!active.current || request.signal.aborted) {
        return;
      }
      const stamp = sessionBoundary.stamp();
      if (stamp && expectedGeneration.current !== stamp.generation) {
        throw new ApiError("canceled");
      }
      reservationSent = true;
      // The generated service forwards this extended, typed body unchanged.
      const id = await createReservation({ body: input }, { signal: request.signal });

      if (!active.current || request.signal.aborted || (stamp && sessionBoundary.stamp()?.generation !== stamp.generation)) {
        return;
      }

      if (!isGuid(id)) {
        throw new ApiError("transport", { status: 200 });
      }

      setState({ pending: false });
      return {
        id,
      };
    } catch (error: unknown) {
      const failure = error instanceof ApiError || error instanceof SessionActionError ? error : new ApiError("unknown");
      const uncertain = reservationSent && failure instanceof ApiError && uncertainWrite(failure);
      if (active.current && !request.signal.aborted) {
        blocked.current = uncertain;
        setState({ pending: false, failure, uncertain, registrationFailure: !reservationSent });
        return { failure, reservationSent };
      }
    } finally {
      registering.current = false;
      locked.current = false;
      if (controller.current === request) {
        controller.current = undefined;
      }
      if (active.current) {
        setState((current) => ({ ...current, pending: false }));
      }
    }
  }

  return {
    ...state,
    submit,
    preservesDraft: (generation: number) => registering.current || registeredGeneration.current === generation,
    reset: () => {
      if (!locked.current && !blocked.current) {
        setState({ pending: false });
      }
    },
  };
}

export function useReservationBooking() {
  const value = useContext(ReservationBookingContext);
  if (!value) {
    throw new Error("Reservation booking scope is required.");
  }
  return value;
}
