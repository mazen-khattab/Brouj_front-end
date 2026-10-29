import type { ReactNode } from 'react';
import { CustomerActionProvider } from '../../Context/CustomerActionProvider';
/** The public unit page mounts this lazy private scope only after customer identity succeeds. */
export default function CustomerScope({ children }: { children: ReactNode }) { return <CustomerActionProvider>{children}</CustomerActionProvider>; }
