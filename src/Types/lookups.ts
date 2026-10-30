import type { Guid } from './contracts';

/** Brouj.Application.Common.DTOs.LookupDto; the lookup response is an array, not a paginated list. */
export interface LocationLookup {
  id: Guid;
  name: string;
}

export interface LocationLookupQuery {
  search?: string;
}
