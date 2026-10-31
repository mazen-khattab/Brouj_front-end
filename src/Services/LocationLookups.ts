import { getCitiesLookup as readCities } from './Cities';
import { getAreasLookup as readAreas } from './Areas';
import type { LocationLookup, LocationLookupQuery } from '../Types/lookups';
import type { RequestOptions } from '../Types/transport';

/** Anonymous read; only Search is accepted by GetCitiesLookupParameters. */
export function getCitiesLookup(query: LocationLookupQuery = {}, options: RequestOptions = {}): Promise<ReadonlyArray<LocationLookup>> {
  return readCities({ query }, options);
}

/** The live area lookup is global: it accepts Search, with no CityId or paging fields. */
export function getAreasLookup(query: LocationLookupQuery = {}, options: RequestOptions = {}): Promise<ReadonlyArray<LocationLookup>> {
  return readAreas({ query }, options);
}
