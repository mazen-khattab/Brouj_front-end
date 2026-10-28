import RoutePlaceholder from '../RoutePlaceholder';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NavigationLinks } from '../../Components/Navigation';
import { adminPages } from '../../Router/routeDefinitions';
// Kept behind the staff route boundary; later admin feature providers mount here.
export default function AdminPlaceholder({ title }: { title: string }) {
  const { pathname } = useLocation();
  const { t } = useTranslation('routing');
  const children = adminPages.filter((page) => page.path.startsWith(pathname + '/') && !page.path.slice(pathname.length + 1).includes('/') && !page.path.includes(':'));
  return <div className="grid gap-6">
    {!!children.length && <NavigationLinks items={children} label={t('adminNav')} />}
    <RoutePlaceholder title={title} />
  </div>;
}
