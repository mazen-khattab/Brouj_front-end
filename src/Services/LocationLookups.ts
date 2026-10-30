import { apiRequest } from '../API';
import { locationLookupPaths } from '../Router/locationLookupPaths';
import type { LocationLookup, LocationLookupQuery } from '../Types/lookups';
import type { RequestOptions } from '../Types/transport';
import { approvedQuery } from './query';

/** Anonymous read; only Search is accepted by GetCitiesLookupParameters. */
export function getCitiesLookup(query: LocationLookupQuery = {}, options: RequestOptions = {}): Promise<ReadonlyArray<LocationLookup>> {
  return apiRequest({
    method: 'GET',
    path: locationLookupPaths.cities,
    query: approvedQuery(query, ['search']),
    metadata: { operation: 'GetCitiesLookup', authenticated: false, skipAuthenticationRecovery: options.skipAuthenticationRecovery === true, changesIdentity: false, sessionControl: options.sessionControl === true },
    ...(options.signal ? { signal: options.signal } : {}),
  });
}

/** The live area lookup is global: it accepts Search, with no CityId or paging fields. */
export function getAreasLookup(query: LocationLookupQuery = {}, options: RequestOptions = {}): Promise<ReadonlyArray<LocationLookup>> {
  return apiRequest({
    method: 'GET',
    path: locationLookupPaths.areas,
    query: approvedQuery(query, ['search']),
    metadata: { operation: 'GetAreasLookup', authenticated: false, skipAuthenticationRecovery: options.skipAuthenticationRecovery === true, changesIdentity: false, sessionControl: options.sessionControl === true },
    ...(options.signal ? { signal: options.signal } : {}),
  });
}
