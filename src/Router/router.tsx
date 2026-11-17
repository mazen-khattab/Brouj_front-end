import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import RootLayout from "./RootLayout";
import { AccessGuard } from "./AccessGuard";
import { RouteErrorView, RouteMessage } from "./RouteFeedback";
import { accountPages, adminPages, publicPages, timePlanPage } from "./routeDefinitions";
import { routePaths } from "./routePaths";

const PublicLayout = lazy(() => import("../Layouts/PublicLayout"));
const AccountLayout = lazy(() => import("../Layouts/AccountLayout"));
const AdminLayout = lazy(() => import("../Layouts/AdminLayout"));
const HomePage = lazy(() => import("../Features/Home/HomePage"));
const AboutPage = lazy(() => import("../Features/About/AboutPage"));
const PublicCityPage = lazy(() => import("../Features/Cities/Public/CityPage"));
const PublicAreaPage = lazy(() => import("../Features/Areas/Public/AreaPage"));
const PublicProjectPage = lazy(() => import("../Features/Projects/Public/ProjectPage"));
const PublicUnitPage = lazy(() => import("../Features/Units/Public/UnitPage"));
const AccountPage = lazy(() => import("../Features/Profile/Customer/ProfilePage"));
const TimePlanPage = lazy(() => import("../Features/Planning/Public/TimePlanPage"));
const StaffPage = lazy(() => import("../Features/Staff/Admin/StaffPage"));
const StaffProfilePage = lazy(() => import("../Features/Profile/Staff/ProfilePage"));
const TermsAdminPage = lazy(() => import("../Features/Terms/Admin/TermsPage"));
const ActivityLogsPage = lazy(() => import("../Features/ActivityLogs/Admin/ActivityLogsPage"));
const TermsPage = lazy(() => import("../Features/Terms/Public/TermsPage"));
const CityPage = lazy(() => import("../Features/Cities/Admin/CityPage"));
const AreaPage = lazy(() => import("../Features/Areas/Admin/AreaPage"));
const ProjectPage = lazy(() => import("../Features/Projects/Admin/ProjectPage"));
const UnitPage = lazy(() => import("../Features/Units/Admin/UnitPage"));
const CustomerPage = lazy(() => import("../Features/Customers/Admin/CustomerPage"));
const ReservationAdminPage = lazy(() => import("../Features/Reservations/Admin/ReservationPage"));
const ReservationsPage = lazy(() => import("../Features/Reservations/Customer/ReservationsPage"));
const OrderAdminPage = lazy(() => import("../Features/Orders/Admin/OrderPage"));
const OrdersPage = lazy(() => import("../Features/Orders/Customer/OrdersPage"));
const AdminPlanningPage = lazy(() => import("../Features/Planning/PlanningPage"));
const DashboardPage = lazy(() => import("../Features/Dashboard/DashboardPage"));
const CustomerLoginPage = lazy(() => import("../Features/Authentication/Customer/LoginPage"));
const CustomerRegistrationPage = lazy(() => import("../Features/Authentication/Customer/RegistrationPage"));
const StaffLoginPage = lazy(() => import("../Features/Authentication/Staff/LoginPage"));

const adminChildren: RouteObject[] = adminPages.map((page) => ({
  ...(page.path === "/admin" ? { index: true as const } : { path: page.path.slice("/admin/".length) }),
  handle: page,
  errorElement: <RouteErrorView />,
  element:
    page.path === "/admin" ? (
      <DashboardPage />
    ) : page.path.startsWith("/admin/cities") ? (
      <CityPage />
    ) : page.path.startsWith("/admin/areas") ? (
      <AreaPage />
    ) : page.path.startsWith("/admin/projects") ? (
      <ProjectPage />
    ) : page.path.startsWith("/admin/units") ? (
      <UnitPage />
    ) : page.path.startsWith("/admin/customers") ? (
      <CustomerPage />
    ) : page.path.startsWith("/admin/reservations") ? (
      <ReservationAdminPage />
    ) : page.path.startsWith("/admin/orders") ? (
      <OrderAdminPage />
    ) : page.path.startsWith("/admin/users") ? (
      <StaffPage />
    ) : page.path === routePaths.admin.account ? (
      <StaffProfilePage />
    ) : page.phase === 10 ? (
      <AdminPlanningPage title={page.title} />
    ) : page.path.startsWith("/admin/terms") ? (
      <TermsAdminPage />
    ) : (
      <ActivityLogsPage />
    ),
}));

const staffChildren = adminChildren.filter((route) => route.handle.access !== "superAdmin");

const superAdminChildren = adminChildren.filter((route) => route.handle.access === "superAdmin");

export const appRoutes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteErrorView />,
    children: [
      {
        element: <PublicLayout />,
        errorElement: <RouteErrorView />,
        children: [
          ...publicPages.map((page) => ({
            path: page.path,
            handle: page,
            errorElement: <RouteErrorView />,
            element:
              page.path === "/" ? (
                <HomePage />
              ) : page.path === routePaths.about ? (
                <AboutPage />
              ) : page.path === routePaths.terms ? (
                <TermsPage />
              ) : page.title === "city" || page.title === "cities" ? (
                <PublicCityPage />
              ) : page.title === "area" || page.title === "areas" ? (
                <PublicAreaPage />
              ) : page.title === "unit" ? (
                <PublicUnitPage />
              ) : (
                <PublicProjectPage />
              ),
          })),
          {
            path: timePlanPage.path,
            handle: timePlanPage,
            element: <TimePlanPage />,
            errorElement: <RouteErrorView />,
          },
          {
            path: routePaths.account,
            element: <AccessGuard access="customer" />,
            children: [
              {
                element: <AccountLayout />,
                children: [
                  ...accountPages.map((page) => ({
                    ...(page.path === "/account" ? { index: true as const } : { path: page.path.slice("/account/".length) }),
                    handle: page,
                    element:
                      page.title === "reservations" || page.title === "reservation" ? (
                        <ReservationsPage />
                      ) : page.title === "orders" || page.title === "order" ? (
                        <OrdersPage />
                      ) : (
                        <AccountPage />
                      ),
                    errorElement: <RouteErrorView />,
                  })),
                  { path: "*", element: <RouteMessage /> },
                ],
              },
            ],
          },
          { path: "*", element: <RouteMessage /> },
        ],
      },
      {
        element: <AccessGuard access="anonymous" />,
        children: [
          {
            path: routePaths.login,
            element: <CustomerLoginPage />,
            errorElement: <RouteErrorView />,
          },
          {
            path: routePaths.register,
            element: <CustomerRegistrationPage />,
            errorElement: <RouteErrorView />,
          },
          {
            path: routePaths.staffLogin,
            element: <StaffLoginPage />,
            errorElement: <RouteErrorView />,
          },
        ],
      },
      {
        path: routePaths.admin.home,
        element: <AccessGuard access="staff" />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              ...staffChildren,
              {
                element: <AccessGuard access="superAdmin" />,
                children: superAdminChildren,
              },
              { path: "*", element: <RouteMessage /> },
            ],
          },
        ],
      },
    ],
  },
];

// Development fixtures never enter the production route tree or chunks.
if (import.meta.env.DEV) {
  const ComponentShowcase = lazy(() => import("../Features/Development/ComponentShowcase"));
  const AuthPreview = lazy(() => import("../Features/Development/AuthPreview"));
  appRoutes[0]!.children!.push({ path: "/__showcase", element: <ComponentShowcase /> }, { path: "/__auth", element: <AuthPreview /> });
}

export const router = createBrowserRouter(appRoutes);
