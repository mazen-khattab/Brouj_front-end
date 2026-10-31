import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProjectTimePlan } from '../../Components/Catalogue/ProjectTimePlan';
import { RouteHeading } from '../../Router/RouteFeedback';
import { routePaths } from '../../Router/routePaths';

export default function TimePlanPage() {
  const { projectId = '' } = useParams();
  const { t } = useTranslation('catalogue');
  return <div className="grid gap-7">
    <header className="grid gap-3"><RouteHeading>{t('timePlan')}</RouteHeading><Link className="justify-self-start underline" to={routePaths.project(projectId)}>{t('backProject')}</Link></header>
    <ProjectTimePlan projectId={projectId} />
  </div>;
}
