import { useTranslation } from 'react-i18next';
import { useCatalogueList } from '../../Hooks/useCatalogue';
import { useLocale } from '../../Hooks/useLocale';
import { formatNumber } from '../../i18n/format';
import { Select } from '../Fields';

export function CataloguePageSize() {
  const { t } = useTranslation('catalogue');
  const { params, update } = useCatalogueList();
  const { locale } = useLocale();
  const sizes = [...new Set([12, 24, 48, params.pageSize])].sort((left, right) => left - right);

  return <div className="w-full sm:w-auto sm:min-w-40">
    <Select id="catalogue-page-size" label={t('pageSize')} value={params.pageSize} onChange={(event) => update({ pageSize: Number(event.target.value) })}>
      {sizes.map((size) => <option key={size} value={size}>{formatNumber(size, locale)}</option>)}
    </Select>
  </div>;
}
