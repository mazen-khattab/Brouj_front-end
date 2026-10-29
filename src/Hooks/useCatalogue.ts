import { useContext } from 'react';
import { CatalogueListContext } from '../Context/CatalogueListContext';
import { CatalogueDetailContext } from '../Context/CatalogueDetailContext';
export function useCatalogueList() {
  const value = useContext(CatalogueListContext);
  if (!value) throw new Error('useCatalogueList requires CatalogueListProvider.');
  return value;
}
export function useCatalogueDetail() {
  const value = useContext(CatalogueDetailContext);
  if (!value) throw new Error('useCatalogueDetail requires CatalogueDetailProvider.');
  return value;
}
