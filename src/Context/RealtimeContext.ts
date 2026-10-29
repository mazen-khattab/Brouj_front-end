import { createContext } from 'react';
import type { RealtimeSession } from '../Realtime/session';

// Optional for isolated feature previews; the application always mounts RealtimeProvider.
export const RealtimeContext = createContext<RealtimeSession | undefined>(undefined);
