import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './Router/router';
import { useTranslation } from 'react-i18next';
import { Loading } from './Components/Feedback';

export default function App() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<Loading label={t('loading')} />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
