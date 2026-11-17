import { useTranslation } from "react-i18next";
import { PrivateReadPanel } from "../../../Components/PrivateReadPanel";
import { useAuth } from "../../../Hooks/useAuth";
import { RouteHeading } from "../../../Router/RouteFeedback";
import { CustomerActionProvider } from "./ActionProvider";
import { ProfileDataProvider } from "./DataProvider";
import ProfileForms from "./ProfileForms";
import { useProfileData } from "./DataContext";

import { ActionFeedback } from "./ActionFeedback";

function Content() {
  const { result, reload } = useProfileData();
  return (
    <PrivateReadPanel result={result} reload={reload}>
      {(data) => <ProfileForms profile={data} />}
    </PrivateReadPanel>
  );
}

export default function ProfilePage() {
  const kind = "profile";
  const { t } = useTranslation("routing");
  const account = useTranslation("account");
  const auth = useAuth();
  const scope = auth.actor ? `${auth.profile.id}:${auth.generation}` : "anonymous";
  return (
    <div className="grid gap-7">
      <header className="grid gap-3">
        <RouteHeading>{t(kind)}</RouteHeading>
        <p className="text-white/80">{account.t("intro")}</p>
      </header>
      <CustomerActionProvider key={`${scope}:${kind}`}>
        <ProfileDataProvider>
          <ActionFeedback />
          <Content />
        </ProfileDataProvider>
      </CustomerActionProvider>
    </div>
  );
}
