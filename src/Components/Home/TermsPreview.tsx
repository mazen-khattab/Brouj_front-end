import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useHome } from '../../Hooks/useHome';
import { routePaths } from '../../Router/routePaths';
import { CatalogueFeedback } from '../Catalogue/CatalogueFeedback';

export function TermsPreview() {
  const { t } = useTranslation('home');
  const { terms, reloadTerms } = useHome();

  return <section aria-labelledby="home-terms-title" className="home-section">
    <div className="overflow-hidden rounded-ui border border-accent/40 bg-accent-light text-primary lg:grid lg:grid-cols-[1fr_2fr]">
      <div className="flex flex-col items-start p-7 sm:p-10 lg:border-e lg:border-primary/15 lg:p-12">
        <p className="home-eyebrow text-primary!">{t('terms.eyebrow')}</p>
        <h2 id="home-terms-title" className="home-title">{t('terms.title')}</h2>
        <p className="mt-4 leading-8">{t('terms.description')}</p>
        <Link to={routePaths.terms} className="mt-8 inline-flex items-center rounded-ui bg-primary px-6 py-3 text-sm text-white no-underline hover:bg-primary-deep">{t('seeAll')}</Link>
      </div>
      <div className="min-w-0 p-7 pt-0 sm:p-10 sm:pt-0 lg:p-12">
        <CatalogueFeedback result={terms} reload={reloadTerms} terms>
          {(data) => <article dir="auto">
            <h3 className="border-b border-primary/20 pb-5 text-2xl font-medium">{data.title}</h3>
            {/* Terms are one plain-text document. Preview its first three paragraphs without rewriting legal content. */}
            <div className="mt-5 space-y-5 whitespace-pre-wrap leading-8">
              {data.content.split(/\r?\n\s*\r?\n/).filter((paragraph) => paragraph.trim()).slice(0, 3).map((paragraph, index) => <p key={index} className="line-clamp-4">{paragraph}</p>)}
            </div>
          </article>}
        </CatalogueFeedback>
      </div>
    </div>
  </section>;
}
