const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * True for listings that exist in the database. The placeholder listings
 * shown when the table is empty (see MOCK_LISTINGS in lib/listings.ts) use
 * ids like "mock-1", so anything that persists — passes, tracking events,
 * paging exclusions — must skip them or the database would reject the row.
 */
export function isPersistedListingId(id: string): boolean {
  return isUuid(id);
}
