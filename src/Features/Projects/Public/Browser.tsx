import { Filters } from "./Filters";
import { Listing } from "./Listing";
import { ListProvider } from "./ListProvider";
export function ProjectCatalogue() {
  return (
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8">
      <Filters />
      <div className="min-w-0">
        <Listing sidebar />
      </div>
    </div>
  );
}
/** Integration boundary: callers supply a relation, while the domain owns query state. */
export function Browser({ areaId }: { areaId?: string }) {
  return (
    <ListProvider scopeId={areaId}>
      <ProjectCatalogue />
    </ListProvider>
  );
}
