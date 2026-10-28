import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import RootLayout from './RootLayout';
import { AccessGuard } from './AccessGuard';
import { RouteErrorView, RouteMessage } from './RouteFeedback';
import { accountPages, adminPages, publicPages, memberPage } from './routeDefinitions';
import { routePaths } from './routePaths';

const PublicLayout = lazy(() => import('../Layouts/PublicLayout'));
const AccountLayout = lazy(() => import('../Layouts/AccountLayout'));
const AdminLayout = lazy(() => import('../Layouts/AdminLayout'));
const WelcomePage = lazy(() => import('../Pages/WelcomePage'));
const Placeholder = lazy(() => import('../Pages/RoutePlaceholder'));
const AdminPlaceholder = lazy(() => import('../Pages/Admin/AdminPlaceholder'));
const DashboardPage = lazy(() => import('../Pages/Admin/DashboardPage'));
const CustomerLoginPage = lazy(() => import('../Pages/Auth/CustomerLoginPage'));
const CustomerRegistrationPage = lazy(() => import('../Pages/Auth/CustomerRegistrationPage'));
const StaffLoginPage = lazy(() => import('../Pages/Auth/StaffLoginPage'));

const adminChildren: RouteObject[] = adminPages.map((page) => ({
  ...(page.path === '/admin' ? { index: true as const } : { path: page.path.slice('/admin/'.length) }),
  handle: page, errorElement: <RouteErrorView />,
  element: page.path === '/admin' ? <DashboardPage /> : <AdminPlaceholder title={page.title} />,
}));
const staffChildren = adminChildren.filter((route) => route.handle.access !== 'superAdmin');
const superAdminChildren = adminChildren.filter((route) => route.handle.access === 'superAdmin');

export const appRoutes: RouteObject[] = [{
  element: <RootLayout />, errorElement: <RouteErrorView />,
  children: [
    {
      element: <PublicLayout />, errorElement: <RouteErrorView />,
      children: [
        ...publicPages.map((page) => ({ path: page.path, handle: page, errorElement: <RouteErrorView />,
          element: page.path === '/' ? <WelcomePage /> : <Placeholder title={page.title} /> })),
        { element: <AccessGuard access="member" />, children: [
          { path: memberPage.path, handle: memberPage, element: <Placeholder title={memberPage.title} />, errorElement: <RouteErrorView /> },
        ] },
        { path: routePaths.account, element: <AccessGuard access="customer" />, children: [
          { element: <AccountLayout />, children: [
            ...accountPages.map((page) => ({
              ...(page.path === '/account' ? { index: true as const } : { path: page.path.slice('/account/'.length) }),
              handle: page, element: <Placeholder title={page.title} />, errorElement: <RouteErrorView />,
            })),
            { path: '*', element: <RouteMessage /> },
          ] },
        ] },
        { path: '*', element: <RouteMessage /> },
      ],
    },
    { element: <AccessGuard access="anonymous" />, children: [
      { path: routePaths.login, element: <CustomerLoginPage />, errorElement: <RouteErrorView /> },
      { path: routePaths.register, element: <CustomerRegistrationPage />, errorElement: <RouteErrorView /> },
      { path: routePaths.staffLogin, element: <StaffLoginPage />, errorElement: <RouteErrorView /> },
    ] },
    { path: routePaths.admin.home, element: <AccessGuard access="staff" />, children: [
      { element: <AdminLayout />, children: [
        ...staffChildren,
        { element: <AccessGuard access="superAdmin" />, children: superAdminChildren },
        { path: '*', element: <RouteMessage /> },
      ] },
    ] },
  ],
}];

// Development fixtures never enter the production route tree or chunks.
if (import.meta.env.DEV) {
  const ComponentShowcase = lazy(() => import('../Pages/ComponentShowcase'));
  const AuthPreview = lazy(() => import('../Pages/AuthPreview'));
  appRoutes[0]!.children!.push({ path: '/__showcase', element: <ComponentShowcase /> }, { path: '/__auth', element: <AuthPreview /> });
}
export const router = createBrowserRouter(appRoutes);
