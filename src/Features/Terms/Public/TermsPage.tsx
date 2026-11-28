import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PublicReadPanel } from "../../../Components/PublicReadPanel";
import { useTerms } from "./TermsContext";
import { TermsProvider } from "./TermsProvider";
import { LegalHeader, LegalPending, LegalClosing } from "./LegalPageSections";
import { LegalReader } from "./LegalReader";
import { useLegalPageMotion } from "./useLegalMotion";
import "../../../Styles/home.css";
import "../../../Styles/legal.css";

function LegalPublication() {
  const { result, reload } = useTerms();
  const { t } = useTranslation("legal");
  const root = useRef<HTMLDivElement>(null);
  const navigate = useLegalPageMotion(root);
  const [progress, setProgress] = useState(0);
  const document = result.status === "success" && result.data.isActive && result.data.content.trim() ? result.data : null;
  const pending = (result.status === "error" && result.failure.status === 404) || (result.status === "success" && !document);
  return (
    <div ref={root} className="legal-page">
      {document && <div className="legal-reading-progress" role="progressbar" aria-label={t("reader.progress")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <span className="legal-progress-fill" />
      </div>}
      <LegalHeader document={document} />
      {pending ? <LegalPending reload={reload} /> :
        <div className="legal-content-state">
          <PublicReadPanel result={result} reload={reload}>
            {(detail) => <LegalReader key={detail.id} document={detail} navigate={navigate} onProgress={setProgress} />}
          </PublicReadPanel>
        </div>}
      <LegalClosing />
    </div>
  );
}

export default function TermsPage() {
  return <TermsProvider><LegalPublication /></TermsProvider>;
}
