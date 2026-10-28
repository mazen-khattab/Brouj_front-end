import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { routePaths } from "./routePaths";

const WelcomePage = lazy(() => import("../Pages/WelcomePage"));

// This single smoke route is replaced by the approved route trees in Part 05.
export const appRoutes: RouteObject[] = [
  {
    path: routePaths.home,
    element: <WelcomePage />,
  },
];
// The showcase and its fixtures are excluded from the production route tree and bundle.
if (import.meta.env.DEV) {
  const ComponentShowcase = lazy(() => import("../Pages/ComponentShowcase"));
  appRoutes.push({ path: "/__showcase", element: <ComponentShowcase /> });
}
export const router = createBrowserRouter(appRoutes);
