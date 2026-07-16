import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";

/**
 * Router shell only — a single root route rendering an empty outlet.
 * No navigation, no sidebar, no feature routes. Routes are added per
 * feature when that feature is actually implemented (starting with Sales).
 */
const router = createBrowserRouter([
  {
    path: "/",
    element: <Outlet />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
