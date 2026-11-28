import { PrivateReadPanel } from "../../../Components/PrivateReadPanel";
import { useAuth } from "../../../Hooks/useAuth";
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
  const auth = useAuth();
  const scope = auth.actor ? `${auth.profile.id}:${auth.generation}` : "anonymous";
  return (
    <div className="account-profile">
      <CustomerActionProvider key={scope}>
        <ProfileDataProvider>
          <ActionFeedback />
          <Content />
        </ProfileDataProvider>
      </CustomerActionProvider>
    </div>
  );
}
