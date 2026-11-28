import { useCallback } from "react";
import { getCitiesLookup, getAreasLookup } from "../Services/LocationLookups";
import { getCityById } from "../Services/Cities";
import { getAreaById } from "../Services/Areas";
import { useResourceRead } from "./useResourceRead";

export function useLocationLookup(field: "city" | "area", search: string, selectedId: string | null | undefined, open: boolean) {
  const load = useCallback(
    (signal: AbortSignal) => {
      const query = search ? { search } : {};
      return field === "city" ? getCitiesLookup(query, { signal }) : getAreasLookup(query, { signal });
    },
    [field, search],
  );
  const loadSelection = useCallback(
    async (signal: AbortSignal) => {
      // Deep links can contain a selection before the dropdown has ever been opened.
      const item = field === "city" ? await getCityById({ id: selectedId! }, { signal }) : await getAreaById({ id: selectedId! }, { signal });
      return { id: item.id, name: item.name };
    },
    [field, selectedId],
  );

  return {
    choices: useResourceRead(`lookup:${field}:${search}`, load, open),
    selection: useResourceRead(`lookup-selection:${field}:${selectedId ?? ""}`, loadSelection, Boolean(selectedId)),
  };
}
