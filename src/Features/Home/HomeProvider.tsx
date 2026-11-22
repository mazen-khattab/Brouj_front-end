import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { HomeContext, type HomeCollection } from "./HomeContext";
import { useResourceRead } from "../../Hooks/useResourceRead";
import { usePublicContentInvalidation } from "../../Realtime/publicContentInvalidation";
import { getProjects } from "../../Services/Projects";
import { getActiveTermsAndConditions } from "../../Services/Terms";
import { ProjectType } from "../../Types/contracts";

function useCollection(projectType: ProjectType): HomeCollection {
  const [page, changePage] = useState(1);
  const loadProjects = useCallback(
    (signal: AbortSignal) => getProjects({ query: { projectType, pageNumber: page, pageSize: 3 } }, { signal }),
    [projectType, page],
  );
  const { result, reload } = useResourceRead(`home-projects:${projectType}:${page}`, loadProjects);
  return { result, reload, page, changePage };
}

export function HomeProvider({ children }: { children: ReactNode }) {
  const initiative = useCollection(ProjectType.Initiative);
  const regular = useCollection(ProjectType.Regular);
  const loadTerms = useCallback((signal: AbortSignal) => getActiveTermsAndConditions({ signal }), []);
  const { result: terms, reload: reloadTerms } = useResourceRead("home-terms", loadTerms);
  const { reload: reloadInitiative } = initiative;
  const { reload: reloadRegular } = regular;
  const reload = useCallback(() => {
    reloadInitiative();
    reloadRegular();
    reloadTerms();
  }, [reloadInitiative, reloadRegular, reloadTerms]);

  usePublicContentInvalidation(reload);

  return (
    <HomeContext
      value={{
        collections: { [ProjectType.Initiative]: initiative, [ProjectType.Regular]: regular },
        terms,
        reloadTerms,
      }}
    >
      {children}
    </HomeContext>
  );
}
