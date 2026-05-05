export async function refreshAllPrices(): Promise<{
  priceErrors: string[];
  rateErrors: string[];
}> {
  const [priceRes, rateRes] = await Promise.all([
    fetch("/api/prices", { method: "POST" }),
    fetch("/api/exchange-rates", { method: "POST" }),
  ]);

  const priceData = priceRes.ok ? await priceRes.json() : { errors: ["Price API failed"] };
  const rateData = rateRes.ok ? await rateRes.json() : { errors: ["Exchange rate API failed"] };

  // /api/prices returns { errors: [{ assetId, error }] }; flatten to strings.
  const priceErrors: string[] =
    priceData.errors?.map((e: { error?: string }) => e.error ?? "Unknown error") ?? [];
  const rateErrors: string[] = rateData.errors ?? [];

  return { priceErrors, rateErrors };
}
