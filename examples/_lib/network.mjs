/**
 * A minimal mock x402 merchant network used by the examples.
 *
 * Each merchant answers its protected paths with HTTP 402 "Payment Required"
 * until the retried request carries an X-Payment header, at which point it
 * returns the resource plus an X-Payment-Transaction proof header.
 */
export function createMockNetwork(merchants) {
  const byHost = new Map(merchants.map((m) => [m.host, m]));

  return async function networkFetch(request) {
    const url = new URL(request.url);
    const merchant = byHost.get(url.host);
    if (!merchant) {
      return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
    }

    const price = merchant.prices[url.pathname] ?? "0.05";
    const requirement = {
      amount: price,
      currency: merchant.currency ?? "USDC",
      merchant: url.host,
      network: "base",
      resource: url.pathname,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };

    if (!request.headers.has("X-Payment")) {
      return new Response(JSON.stringify(requirement), {
        status: 402,
        headers: {
          "content-type": "application/json",
          "x-request-payment": JSON.stringify(requirement),
        },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, merchant: url.host, resource: url.pathname, price }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "X-Payment-Transaction": `0xsettled_${Date.now().toString(36)}`,
        },
      },
    );
  };
}

/**
 * The settlement hook: attach x402 payment proof, then retry the request.
 * In a real deployment this is where an x402 client / facilitator signs and
 * settles the reservation (e.g. an ERC-7710 relay on Base).
 */
export async function mockPayer(request) {
  request.paymentHeaders.set("X-Payment", "mock-x402-proof");
  return request.fetch(request.paymentHeaders);
}