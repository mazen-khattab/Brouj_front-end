import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './Router/router';
import { PageLoading } from './Router/RouteFeedback';

export default function App() {
  return (
    <Suspense fallback={<PageLoading full />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
