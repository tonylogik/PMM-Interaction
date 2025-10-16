'use client';

import { PMMProvider } from './pmm-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return <PMMProvider>{children}</PMMProvider>;
}
