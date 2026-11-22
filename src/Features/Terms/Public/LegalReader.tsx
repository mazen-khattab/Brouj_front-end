import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { TermsDto } from "../../../Types/contracts";
import { indexLegalSections, type LegalSection } from "./legalSections";
import { useLegalReaderMotion } from "./useLegalMotion";

interface ReaderProps {
  document: TermsDto;
  navigate: (id: string) => void;
  onProgress: (value: number) => void;
}

function IndexLinks({ sections, title, active, navigate }: {
  sections: readonly LegalSection[];
  title: string;
  active: string;
  navigate: (id: string) => void;
}) {
  return <ol>{sections.map((section, index) => (
    <li key={section.id}>
      <a href={`#${section.id}`} aria-current={active === section.id ? "location" : undefined}
        onClick={(event) => {
          event.preventDefault();
          event.currentTarget.closest("details")?.removeAttribute("open");
          navigate(section.id);
        }}>
        <span className="legal-index-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <bdi dir="auto">{section.heading ?? title}</bdi>
      </a>
    </li>
  ))}</ol>;
}

/** Plain text only: even authored HTML is displayed literally, as in the original reader. */
function LegalText({ content }: { content: string }) {
  const blocks = content.split(/((?:\r?\n){2,})/);
  return <div className="legal-clause-body" dir="auto">
    {blocks.map((block, index) => /^(?:Important|Notice|Note|تنبيه|ملاحظة|هام)\s*[:：]/i.test(block.trimStart())
      ? <aside className="legal-callout" key={index}>{block}</aside>
      : <span key={index}>{block}</span>)}
  </div>;
}

export function LegalReader({ document, navigate, onProgress }: ReaderProps) {
  const { t } = useTranslation("legal");
  const root = useRef<HTMLDivElement>(null);
  const sections = useMemo(() => indexLegalSections(document.content), [document.content]);
  const active = useLegalReaderMotion(root, sections, onProgress);
  const links = <IndexLinks sections={sections} title={document.title} active={active} navigate={navigate} />;
  return (
    <div ref={root} className="home-container legal-reader-layout">
      <aside className="legal-desktop-index">
        <nav aria-label={t("reader.index")}>
          <p className="legal-eyebrow">{t("reader.index")}</p>
          <p className="legal-index-hint">{t("reader.indexHint")}</p>
          {links}
        </nav>
      </aside>
      <details className="legal-mobile-index">
        <summary><span>{t("reader.index")}</span><span className="legal-index-plus" aria-hidden="true" /></summary>
        <nav aria-label={t("reader.index")}>{links}</nav>
      </details>
      <article className="legal-document" aria-labelledby="legal-document-title">
        <header className="legal-document-header">
          <p className="legal-eyebrow">{t("reader.published")}</p>
          <h2 id="legal-document-title" dir="auto">{document.title}</h2>
          <p className="legal-document-note">{t("reader.note")}</p>
        </header>
        {sections.map((section, index) => (
          <section key={section.id} id={section.id} className="legal-clause" tabIndex={-1} aria-labelledby={`${section.id}-title`}>
            <div className="legal-clause-rule" aria-hidden="true" />
            <span className="legal-clause-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <div className="legal-clause-text">
              <h3 id={`${section.id}-title`} className={section.heading ? "" : "sr-only"} dir="auto">{section.heading ?? t("reader.documentText")}</h3>
              <LegalText content={section.heading ? section.content.slice(section.heading.length).replace(/^(?:\r\n|\n|\r)+/, "") : section.content} />
            </div>
          </section>
        ))}
        <p className="legal-end-mark"><span aria-hidden="true" />{t("reader.end")}<span aria-hidden="true" /></p>
      </article>
    </div>
  );
}
