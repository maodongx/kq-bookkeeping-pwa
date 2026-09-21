/**
 * Read every row of a query, page by page.
 *
 * Supabase caps a single response at the project's `max_rows` setting (1000 by
 * default) and does so *silently* — you get a full page and no error. For the
 * snapshot and transaction tables that truncation is invisible but corrupting:
 * `asset_price_snapshots` and `exchange_rate_snapshots` are read with
 * `.order("date")` ascending, so the rows dropped are the **newest** ones. The
 * net-worth chart would quietly freeze at whatever date the cap landed on
 * while the 总资产 card (which reads live prices) kept moving, and the two
 * would disagree permanently with nothing logged.
 *
 * Advancing by the number of rows actually returned — rather than by a fixed
 * page size — keeps this correct whatever `max_rows` is set to.
 */
const PAGE_SIZE = 1000;

interface PageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<{ rows: T[]; error: string | null }> {
  const rows: T[] = [];

  for (let from = 0; ; ) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) return { rows, error: error.message };

    const got = data?.length ?? 0;
    if (got === 0) break;

    rows.push(...(data as T[]));
    from += got;
  }

  return { rows, error: null };
}
