import { AppProviders } from "./app/providers";
import { AppRouter } from "./app/router";

/**
 * Root composition only. No layout, no navigation, no sidebar —
 * those are product implementation, out of scope for Bootstrap.
 */
export function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
