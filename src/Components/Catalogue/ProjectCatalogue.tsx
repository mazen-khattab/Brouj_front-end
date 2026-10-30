import { CatalogueFilters } from './CatalogueFilters';
import { CatalogueListing } from './CatalogueListing';

export function ProjectCatalogue() {
  return <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8">
    <CatalogueFilters projects locations sidebar />
    <div className="min-w-0"><CatalogueListing sidebar /></div>
  </div>;
}
