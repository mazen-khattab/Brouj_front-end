import { Filters } from "./Filters";
import { Listing } from "./Listing";
import { ListProvider } from "./ListProvider";
import { AreaDirectory } from "./AreaDirectory";
import "../../../Styles/projects.css";
import "../../../Styles/area-directory.css";

export function AreaCatalogue({ editorial = false }: { editorial?: boolean }) {
  if (editorial) return <AreaDirectory />;
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
export function Browser({ cityId, editorial = false }: { cityId?: string; editorial?: boolean }) {
  return (
    <ListProvider scopeId={cityId}>
      <AreaCatalogue editorial={editorial} />
    </ListProvider>
  );
}
