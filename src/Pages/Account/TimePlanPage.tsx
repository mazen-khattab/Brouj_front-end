import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProjectTimePlan } from '../../Components/Catalogue/ProjectTimePlan';
import { RouteHeading } from '../../Router/RouteFeedback';
import { routePaths } from '../../Router/routePaths';

export default function TimePlanPage() {
  const { projectId = '' } = useParams();
  const { t } = useTranslation('catalogue');
  return <div className="grid gap-7">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <RouteHeading>{t('timePlan')}</RouteHeading>
      <Link
        className="group inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-light/30 px-4 py-1.5 text-xs font-medium text-primary transition-all hover:border-accent hover:bg-accent-light hover:text-primary-deep"
        to={routePaths.project(projectId)}
      >
        <span>{t('backProject')}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="size-3.5 text-accent transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5">
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
      </Link>
    </header>
    <ProjectTimePlan projectId={projectId} />
  </div>;
}
