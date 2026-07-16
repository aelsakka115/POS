import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { ThemeProvider } from "./theme-provider";

/**
 * Composition root for all app-wide providers (RFC-004 §6.2: React Query is
 * the ONLY cache for server data — no Zustand/Redux store duplicates it).
 * No domain-specific provider lives here; each feature owns its own hooks.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
